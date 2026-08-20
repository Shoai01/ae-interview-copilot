import os
import random
import numpy as np
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field
from models import domain
from ai.base import get_embeddings_model, get_chat_model
from services.knowledge_service import FAISS_INDEX_PATH

class GeneratedQuestion(BaseModel):
    topic: str = Field(description="1-3 words describing the core concept")
    question: str = Field(description="The generated interview question")
    ideal_answer: str = Field(description="Bullet points of what a good answer should include")

def generate_dynamic_questions_for_session(db, module_id: int, count: int = 5, set_name: str = "AI Generated Set"):
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
    all_docs = [doc for doc in docstore.values() if doc.metadata.get('module_id') == module_id]
    
    def is_good_chunk(text: str) -> bool:
        if len(text.strip()) < 150:
            return False
        # Calculate ratio of alphanumeric + space characters
        alnum_space = sum(1 for c in text if c.isalnum() or c.isspace())
        if alnum_space / max(1, len(text)) < 0.75:
            return False
        return True
        
    docs = [doc for doc in all_docs if is_good_chunk(doc.page_content)]
    
    # Fallback to all_docs if filtering was too aggressive and we don't have enough
    if len(docs) < count:
        docs = all_docs
    
    if not docs:
        print(f"No documents found for module_id {module_id}")
        return []

    def score_chunk(text: str) -> float:
        score = len(text) / 1000.0  # Length factor
        lower_text = text.lower()
        procedural_words = ["how", "step", "first", "then", "process", "configure", "setup"]
        if any(word in lower_text for word in procedural_words):
            score += 0.5
        comparison_words = ["versus", "vs", "compared", "difference", "however", "although", "while", "advantage", "tradeoff"]
        if any(word in lower_text for word in comparison_words):
            score += 0.8
        words = lower_text.split()
        if words:
            score += len(set(words)) / len(words) # Density
        return score

    scored_docs = [(doc, score_chunk(doc.page_content)) for doc in docs]
    scored_docs.sort(key=lambda x: x[1]) # ascending
    
    n = len(scored_docs)
    easy_docs = [d[0] for d in scored_docs[:max(1, n//3)]]
    medium_docs = [d[0] for d in scored_docs[max(1, n//3):max(2, 2*n//3)]]
    hard_docs = [d[0] for d in scored_docs[max(2, 2*n//3):]]
    
    if not easy_docs: easy_docs = docs
    if not medium_docs: medium_docs = docs
    if not hard_docs: hard_docs = docs
    
    # Fetch the module name to pass to the prompt
    module = db.query(domain.TrainingModule).filter(domain.TrainingModule.id == module_id).first()
    module_name = module.name if module else "General"

    # Initialize LLM
    llm = get_chat_model(temperature=0.7)
    
    prompt = PromptTemplate.from_template(
        "You are a friendly technical interviewer. Based on the following knowledge base extract, generate exactly ONE simple, conversational interview question to ask a candidate. "
        "The candidate is being interviewed for the '{module_name}' training module. "
        "You MUST generate a question that matches a '{target_difficulty}' difficulty level for this concept.\n\n"
        "DIFFICULTY DEFINITIONS:\n"
        "- EASY: recall a fact or definition.\n"
        "- MEDIUM: explain how/why something works, or apply it to a stated scenario.\n"
        "- HARD: compare, evaluate tradeoffs, or reason about an edge case.\n\n"
        "CRITICAL RULES:\n"
        "- The question MUST be short, natural, and easy to understand when spoken aloud.\n"
        "- DO NOT combine multiple questions into one. Ask about ONE specific concept only.\n"
        "- Keep the question under 20 words.\n"
        "- Do NOT ask about any concepts covered in the previous questions listed below.\n"
        "- You MUST format the question using the following style/format: {target_style}\n\n"
        "PREVIOUS QUESTIONS IN THIS SESSION:\n{previous_questions}\n\n"
        "Extract:\n{context}\n"
    )
    
    generated_questions = []
    seen_texts_with_embs = []
    seen_topics_with_embs = []
    previous_questions_list = []
    
    # Target styles to ensure variety (no two consecutive questions have the same style)
    question_styles = [
        "Definition (e.g., 'What is X?')",
        "Functional (e.g., 'How does X work?' or 'How is X used?')",
        "Scenario/applied (e.g., 'When would you use X?' or 'In what situation would you choose X?')",
        "Comparative (e.g., 'How is X different from Y?' or 'Why use X over Y?')"
    ]
    random.shuffle(question_styles)
    
    # Target difficulty distribution for a standard 5-question session
    # We create enough targets in case we need more
    target_difficulties = [
        domain.DifficultyLevel.EASY,
        domain.DifficultyLevel.MEDIUM,
        domain.DifficultyLevel.EASY,
        domain.DifficultyLevel.MEDIUM,
        domain.DifficultyLevel.HARD
    ]
    # If count is more than 5, repeat the pattern
    while len(target_difficulties) < count + 10:
        target_difficulties.extend([domain.DifficultyLevel.MEDIUM, domain.DifficultyLevel.HARD])
        
    def process_and_add_question(text: str, difficulty: domain.DifficultyLevel, topic: str = "", ideal_answer: str = "") -> bool:
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
        
        # Topic-level deduplication
        if topic:
            try:
                topic_emb = embeddings_model.embed_query(topic)
                for seen_topic, seen_emb in seen_topics_with_embs:
                    if cosine_similarity(topic_emb, seen_emb) > 0.85:
                        print(f"Topic duplicate rejected: '{topic}' is too similar to '{seen_topic}'")
                        return False
                seen_topics_with_embs.append((topic, topic_emb))
            except Exception as e:
                print("Topic embedding failed, skipping topic check:", e)
        
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
            ideal_answer=ideal_answer,
            difficulty=difficulty,
            set_name=set_name,
            is_active=True
        )
        db.add(qb_item)
        db.commit()
        db.refresh(qb_item)
        generated_questions.append(qb_item)
        previous_questions_list.append(qb_item.text)
        return True

    for i in range(count):
        try:
            target_diff = target_difficulties[len(generated_questions)]
            if target_diff == domain.DifficultyLevel.EASY:
                doc = random.choice(easy_docs)
            elif target_diff == domain.DifficultyLevel.MEDIUM:
                doc = random.choice(medium_docs)
            else:
                doc = random.choice(hard_docs)
                
            target_style = question_styles[len(generated_questions) % len(question_styles)]
            structured_llm = llm.with_structured_output(GeneratedQuestion)
            chain = prompt | structured_llm
            prev_q_str = "\n".join([f"- {q}" for q in previous_questions_list]) if previous_questions_list else "None"
            response = chain.invoke({
                "context": doc.page_content, 
                "module_name": module_name, 
                "previous_questions": prev_q_str,
                "target_difficulty": target_diff.value,
                "target_style": target_style
            })
            
            q_text = response.question.strip()
            q_topic = response.topic.strip()
            q_ideal_answer = response.ideal_answer.strip()
            
            process_and_add_question(q_text, target_diff, q_topic, q_ideal_answer)
        except Exception as e:
            print("Failed to generate question from chunk:", e)
            db.rollback()
            continue
            
    # If we still need more questions (e.g. docs was smaller than count or duplicates skipped), retry
    retries = 0
    max_retries = 10
    while len(generated_questions) < count and docs and retries < max_retries:
        try:
            target_diff = target_difficulties[len(generated_questions)]
            if target_diff == domain.DifficultyLevel.EASY:
                doc = random.choice(easy_docs)
            elif target_diff == domain.DifficultyLevel.MEDIUM:
                doc = random.choice(medium_docs)
            else:
                doc = random.choice(hard_docs)
                
            target_style = question_styles[len(generated_questions) % len(question_styles)]
            structured_llm = llm.with_structured_output(GeneratedQuestion)
            chain = prompt | structured_llm
            prev_q_str = "\n".join([f"- {q}" for q in previous_questions_list]) if previous_questions_list else "None"
            response = chain.invoke({
                "context": doc.page_content, 
                "module_name": module_name, 
                "previous_questions": prev_q_str,
                "target_difficulty": target_diff.value,
                "target_style": target_style
            })
            
            q_text = response.question.strip()
            q_topic = response.topic.strip()
            q_ideal_answer = response.ideal_answer.strip()
            
            added = process_and_add_question(q_text, target_diff, q_topic, q_ideal_answer)
            if not added:
                retries += 1
        except Exception:
            db.rollback()
            retries += 1
            continue
            
    return generated_questions
