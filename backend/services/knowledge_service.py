import os
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_community.vectorstores import FAISS
import random
import numpy as np
from langchain_google_vertexai import ChatVertexAI
from langchain_core.prompts import PromptTemplate
from models import domain

# The directory where FAISS index will be saved
FAISS_INDEX_PATH = "faiss_index"

def get_embeddings_model():
    # Use LangChain's Vertex AI embeddings wrapper
    # Project is inferred from GOOGLE_APPLICATION_CREDENTIALS
    return VertexAIEmbeddings(model_name="text-embedding-004")

def get_knowledge_documents(db, module_id: int):
    return db.query(domain.KnowledgeDocument).filter(domain.KnowledgeDocument.module_id == module_id).all()

def get_knowledge_document(db, doc_id: int):
    return db.query(domain.KnowledgeDocument).filter(domain.KnowledgeDocument.id == doc_id).first()

def delete_knowledge_document(db, doc: domain.KnowledgeDocument):
    db.delete(doc)
    db.commit()

def process_and_store_pdf(db=None, module_id=None, file_content: bytes = None, source_filename: str = ""):
    # 1. Extract Text from PDF using PyMuPDF from memory stream
    doc = fitz.open(stream=file_content, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text() + "\n"
    
    if not full_text.strip():
        raise ValueError("No extractable text found in the PDF.")
    
    # 2. Chunk the text
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=100,
    )
    chunks = text_splitter.split_text(full_text)
    
    # We also want to store metadata so we know which module this chunk belongs to
    metadatas = [{"module_id": module_id, "source": source_filename}] * len(chunks)
    
    # 3. Generate embeddings and save to FAISS local vector store
    embeddings_model = get_embeddings_model()
    
    # Check if index already exists
    if os.path.exists(FAISS_INDEX_PATH):
        # Load existing and add new
        vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings_model, allow_dangerous_deserialization=True)
        vector_store.add_texts(texts=chunks, metadatas=metadatas)
    else:
        # Create new index
        vector_store = FAISS.from_texts(texts=chunks, embedding=embeddings_model, metadatas=metadatas)
        
    # Save the index locally
    vector_store.save_local(FAISS_INDEX_PATH)
    
    return len(chunks)

def generate_dynamic_questions_for_session(db, module_id: int, count: int = 5):
    """
    Dynamically generates questions using the FAISS index for a specific module.
    Saves them to QuestionBank and returns the list of generated QuestionBank objects.
    """
    if not os.path.exists(FAISS_INDEX_PATH):
        print(f"No knowledge base found. Falling back to default questions if any.")
        return []

    try:
        embeddings_model = get_embeddings_model()
        vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings_model, allow_dangerous_deserialization=True)
    except Exception as e:
        print("Failed to initialize embeddings or load FAISS index:", e)
        return []

    def cosine_similarity(v1, v2):
        if np.linalg.norm(v1) == 0 or np.linalg.norm(v2) == 0: return 0.0
        return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

    # Pre-embed existing questions for semantic deduplication
    existing_qbs = db.query(domain.QuestionBank).filter(domain.QuestionBank.module_id == module_id).all()
    existing_texts = [qb.text for qb in existing_qbs]
    existing_embeddings = []
    if existing_texts:
        try:
            existing_embeddings = embeddings_model.embed_documents(existing_texts)
        except Exception as e:
            print("Failed to pre-embed existing questions:", e)

    # Get all docs matching module_id
    docstore = vector_store.docstore._dict
    docs = [doc for doc in docstore.values() if doc.metadata.get('module_id') == module_id]
    
    if not docs:
        print(f"No documents found for module_id {module_id}")
        return []

    # Randomly select chunks
    selected_docs = random.sample(docs, min(count, len(docs)))
    
    # Fetch the module name to pass to the prompt
    module = db.query(domain.TrainingModule).filter(domain.TrainingModule.id == module_id).first()
    module_name = module.name if module else "General"

    # Initialize LLM
    llm = ChatVertexAI(model_name="gemini-2.5-flash", temperature=0.7)
    
    prompt = PromptTemplate.from_template(
        "You are a friendly technical interviewer. Based on the following knowledge base extract, generate exactly ONE simple, conversational interview question to ask a candidate. "
        "The candidate is being interviewed for the '{module_name}' training module. Ensure the question's depth is appropriate for this level. "
        "You must also judge the difficulty of the question based on the concept (EASY, MEDIUM, or HARD).\n\n"
        "CRITICAL RULES:\n"
        "- The question MUST be short, natural, and easy to understand when spoken aloud.\n"
        "- DO NOT combine multiple questions into one. Ask about ONE specific concept only.\n"
        "- Keep the question under 20 words.\n"
        "- Do NOT ask about any concepts covered in the previous questions listed below.\n\n"
        "PREVIOUS QUESTIONS IN THIS SESSION:\n{previous_questions}\n\n"
        "Extract:\n{context}\n\n"
        "Return your response EXACTLY in this format, with no other text:\n"
        "DIFFICULTY: [EASY, MEDIUM, or HARD]\n"
        "QUESTION: [Your generated question here]"
    )
    
    generated_questions = []
    seen_texts_with_embs = []
    previous_questions_list = []
    
    def process_and_add_question(text: str, difficulty: domain.DifficultyLevel) -> bool:
        # Basic cleanup
        if text.startswith("Question:"):
            text = text.replace("Question:", "").strip()
            
        # Validation Checks
        if not text.endswith("?"):
            print(f"Validation failed: Question does not end with '?': {text}")
            return False
            
        word_count = len(text.split())
        if word_count > 25:
            print(f"Validation failed: Question too long ({word_count} words): {text}")
            return False
            
        lower_text = text.lower()
        if "answer:" in lower_text or "here is" in lower_text or "sure" in lower_text:
            print(f"Validation failed: Question contains preamble or answer leak: {text}")
            return False
            
        text_lower = lower_text
        
        # Exact string match fallback
        if any(seen_text.lower() == text_lower for seen_text, _ in seen_texts_with_embs):
            return False

        # Semantic duplicate check
        try:
            new_emb = embeddings_model.embed_query(text)
            
            # Check against seen_texts in this session
            for seen_text, seen_emb in seen_texts_with_embs:
                if cosine_similarity(new_emb, seen_emb) > 0.85:
                    return False
                    
            # Check against DB
            for i, db_emb in enumerate(existing_embeddings):
                if cosine_similarity(new_emb, db_emb) > 0.85:
                    # Semantic duplicate found in DB! Re-use it
                    existing_qb = existing_qbs[i]
                    if existing_qb not in generated_questions:
                        generated_questions.append(existing_qb)
                        previous_questions_list.append(existing_qb.text)
                    seen_texts_with_embs.append((text, new_emb))
                    return True
                    
            seen_texts_with_embs.append((text, new_emb))
        except Exception as e:
            print("Semantic check failed, falling back to exact match:", e)
            seen_texts_with_embs.append((text, []))
            
            existing_qb = db.query(domain.QuestionBank).filter(
                domain.QuestionBank.module_id == module_id,
                domain.QuestionBank.text.ilike(text)
            ).first()
            if existing_qb:
                generated_questions.append(existing_qb)
                previous_questions_list.append(existing_qb.text)
                return True
            
        # Create new entry if it doesn't exist
        qb_item = domain.QuestionBank(
            module_id=module_id,
            text=text,
            difficulty=difficulty,
            is_active=True
        )
        db.add(qb_item)
        db.commit()
        db.refresh(qb_item)
        generated_questions.append(qb_item)
        previous_questions_list.append(qb_item.text)
        return True

    for doc in selected_docs:
        try:
            chain = prompt | llm
            prev_q_str = "\n".join([f"- {q}" for q in previous_questions_list]) if previous_questions_list else "None"
            response = chain.invoke({"context": doc.page_content, "module_name": module_name, "previous_questions": prev_q_str})
            output = response.content.strip()
            
            q_text = ""
            q_diff = domain.DifficultyLevel.MEDIUM
            
            for line in output.split('\n'):
                line = line.strip()
                if line.upper().startswith("DIFFICULTY:"):
                    diff_str = line.split(":", 1)[1].strip().upper()
                    if diff_str in ["EASY", "MEDIUM", "HARD"]:
                        q_diff = domain.DifficultyLevel(diff_str)
                elif line.upper().startswith("QUESTION:"):
                    q_text = line.split(":", 1)[1].strip()
                    
            if not q_text:
                q_text = output.replace("Question:", "").strip()
                
            process_and_add_question(q_text, q_diff)
        except Exception as e:
            print("Failed to generate question from chunk:", e)
            db.rollback()
            continue
            
    # If we still need more questions (e.g. docs was smaller than count or duplicates skipped), retry
    retries = 0
    max_retries = 10
    while len(generated_questions) < count and docs and retries < max_retries:
        doc = random.choice(docs)
        try:
            chain = prompt | llm
            prev_q_str = "\n".join([f"- {q}" for q in previous_questions_list]) if previous_questions_list else "None"
            response = chain.invoke({"context": doc.page_content, "module_name": module_name, "previous_questions": prev_q_str})
            output = response.content.strip()
            
            q_text = ""
            q_diff = domain.DifficultyLevel.MEDIUM
            
            for line in output.split('\n'):
                line = line.strip()
                if line.upper().startswith("DIFFICULTY:"):
                    diff_str = line.split(":", 1)[1].strip().upper()
                    if diff_str in ["EASY", "MEDIUM", "HARD"]:
                        q_diff = domain.DifficultyLevel(diff_str)
                elif line.upper().startswith("QUESTION:"):
                    q_text = line.split(":", 1)[1].strip()
                    
            if not q_text:
                q_text = output.replace("Question:", "").strip()
            
            added = process_and_add_question(q_text, q_diff)
            if not added:
                retries += 1
        except Exception:
            db.rollback()
            retries += 1
            continue
            
    return generated_questions
