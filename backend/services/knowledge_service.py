import os
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_community.vectorstores import FAISS
import random
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

    embeddings_model = get_embeddings_model()
    try:
        vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings_model, allow_dangerous_deserialization=True)
    except Exception as e:
        print("Failed to load FAISS index:", e)
        return []

    # Get all docs matching module_id
    docstore = vector_store.docstore._dict
    docs = [doc for doc in docstore.values() if doc.metadata.get('module_id') == module_id]
    
    if not docs:
        print(f"No documents found for module_id {module_id}")
        return []

    # Randomly select chunks
    selected_docs = random.sample(docs, min(count, len(docs)))
    
    # Initialize LLM
    llm = ChatVertexAI(model_name="gemini-2.5-flash", temperature=0.7)
    
    prompt = PromptTemplate.from_template(
        "You are a friendly technical interviewer. Based on the following knowledge base extract, generate exactly ONE simple, conversational interview question to ask a candidate.\n\n"
        "CRITICAL RULES:\n"
        "- The question MUST be short, natural, and easy to understand when spoken aloud.\n"
        "- DO NOT combine multiple questions into one. Ask about ONE specific concept only.\n"
        "- Keep the question under 20 words.\n\n"
        "Extract:\n{context}\n\n"
        "Return ONLY the question text. Do not include answers, preambles, or difficulty."
    )
    
    generated_questions = []
    difficulties = [domain.DifficultyLevel.EASY, domain.DifficultyLevel.MEDIUM, domain.DifficultyLevel.HARD]
    
    for doc in selected_docs:
        try:
            chain = prompt | llm
            response = chain.invoke({"context": doc.page_content})
            question_text = response.content.strip()
            
            # Basic cleanup if model outputted quotes or "Question:"
            if question_text.startswith("Question:"):
                question_text = question_text.replace("Question:", "").strip()
            
            # Save to QuestionBank
            qb_item = domain.QuestionBank(
                module_id=module_id,
                text=question_text,
                difficulty=random.choice(difficulties), # Randomly assign or could ask LLM
                question_type="VOICE",
                is_active=True
            )
            db.add(qb_item)
            db.commit()
            db.refresh(qb_item)
            generated_questions.append(qb_item)
            
        except Exception as e:
            print("Failed to generate question from chunk:", e)
            continue
            
    # If we still need more questions (e.g. docs was smaller than count), we could sample again.
    retries = 0
    max_retries = 10
    while len(generated_questions) < count and docs and retries < max_retries:
        doc = random.choice(docs)
        try:
            chain = prompt | llm
            response = chain.invoke({"context": doc.page_content})
            question_text = response.content.strip()
            if question_text.startswith("Question:"):
                question_text = question_text.replace("Question:", "").strip()
                
            qb_item = domain.QuestionBank(
                module_id=module_id,
                text=question_text,
                difficulty=random.choice(difficulties),
                question_type="VOICE",
                is_active=True
            )
            db.add(qb_item)
            db.commit()
            db.refresh(qb_item)
            generated_questions.append(qb_item)
        except Exception:
            retries += 1
            continue
            
    return generated_questions
