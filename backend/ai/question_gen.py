import os
import random
import re
from typing import Optional
import numpy as np
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field
from models import domain
from models.domain import LLMCallSite
from ai.base import get_embeddings_model, get_chat_model
from ai.text_quality import is_good_chunk
from services.knowledge_service import FAISS_INDEX_PATH
from services.llm_usage_service import track_llm_call

SEMANTIC_DUPLICATE_THRESHOLD = 0.85
DIVERSITY_TOLERANCE = 0.02  # how close to the "most diverse" candidate still counts as a tie
PREAMBLE_LEAK_WORDS = ("answer:", "here is", "sure")

class GeneratedQuestion(BaseModel):
    topic: str = Field(description="1-3 words describing the core concept")
    question: str = Field(description="The generated interview question")
    ideal_answer: str = Field(description="Bullet points of what a good answer should include")

def _reconstruct_vector(vector_store: FAISS, index_pos: int):
    """Pull a chunk's embedding straight out of the FAISS index (already computed
    at ingestion time) instead of re-embedding it. Returns None if the index
    type doesn't support reconstruction (e.g. some IVF variants)."""
    try:
        return np.array(vector_store.index.reconstruct(int(index_pos)))
    except Exception:
        return None

def _get_docs_for_module(vector_store: FAISS, module_id: int):
    """Fetch all (doc, embedding) pairs for a module using the public docstore
    API instead of the private _dict. The embedding lets callers pick chunks
    for topical diversity without paying for a fresh embedding call."""
    docs = []
    for index_pos, doc_id in vector_store.index_to_docstore_id.items():
        doc = vector_store.docstore.search(doc_id)
        if doc is not None and doc.metadata.get('module_id') == module_id:
            docs.append((doc, _reconstruct_vector(vector_store, index_pos)))
    return docs

def generate_dynamic_questions_for_session(db, module_id: int, count: int = 5, set_name: str = "AI Generated Set", session_id: Optional[int] = None, triggered_by_user_id: Optional[int] = None):
    """
    Dynamically generates questions using the FAISS index for a specific module.
    Saves them to QuestionBank and returns the list of generated QuestionBank objects.
    """
    if not os.path.exists(FAISS_INDEX_PATH):
        print(f"No knowledge base found. Falling back to default questions if any.")
        return []

    try:
        embeddings_model = get_embeddings_model(db=db, module_id=module_id, user_id=triggered_by_user_id)
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

    # Get all (doc, embedding) pairs matching module_id (via public docstore API)
    all_docs = _get_docs_for_module(vector_store, module_id)

    docs = [pair for pair in all_docs if is_good_chunk(pair[0].page_content)]

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

    scored_docs = [(pair, score_chunk(pair[0].page_content)) for pair in docs]
    scored_docs.sort(key=lambda x: x[1]) # ascending

    n = len(scored_docs)
    easy_docs = [d[0] for d in scored_docs[:max(1, n//3)]]
    medium_docs = [d[0] for d in scored_docs[max(1, n//3):max(2, 2*n//3)]]
    hard_docs = [d[0] for d in scored_docs[max(2, 2*n//3):]]

    if not easy_docs: easy_docs = docs
    if not medium_docs: medium_docs = docs
    if not hard_docs: hard_docs = docs

    # Track which docs (by identity) have already been sent to the LLM this run,
    # so we don't keep re-sampling the same chunk once its pool still has alternatives.
    used_doc_ids = set()
    # Embeddings of chunks already picked this run — used to steer future picks
    # toward topically different content instead of clustering on one subtopic.
    used_vectors = []

    def pick_doc(pool):
        """Pick a (doc, vector) pair from pool, preferring one not yet used and,
        among those, the one least similar to chunks already picked this run —
        this spreads generated questions across distinct concepts in the module
        instead of letting random chance repeatedly sample the same subtopic."""
        candidates = [pair for pair in pool if id(pair[0]) not in used_doc_ids]
        if not candidates:
            # Every doc in this pool has been used at least once; allow reuse.
            candidates = pool

        if used_vectors:
            scored = []
            for pair in candidates:
                _, vec = pair
                if vec is None:
                    continue
                max_sim = max(cosine_similarity(vec, uv) for uv in used_vectors)
                scored.append((pair, max_sim))
            if scored:
                min_sim = min(sim for _, sim in scored)
                most_diverse = [pair for pair, sim in scored if sim <= min_sim + DIVERSITY_TOLERANCE]
                chosen = random.choice(most_diverse)
            else:
                # No candidate had a usable embedding — fall back to random.
                chosen = random.choice(candidates)
        else:
            chosen = random.choice(candidates)

        doc, vec = chosen
        used_doc_ids.add(id(doc))
        if vec is not None:
            used_vectors.append(vec)
        return doc

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

    # Built once and reused across all attempts — neither depends on loop state.
    # include_raw=True so each call's usage_metadata (token counts) is available
    # for the usage analytics dashboard, alongside the parsed question.
    structured_llm = llm.with_structured_output(GeneratedQuestion, include_raw=True)
    chain = prompt | structured_llm

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
    # Enough targets for every attempt across both the main pass and the retry pass,
    # since attempts (not just accepted questions) consume a slot.
    max_attempts = count + 10
    while len(target_difficulties) < max_attempts:
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
        if any(re.search(rf"\b{re.escape(word)}\b", lower_text) for word in PREAMBLE_LEAK_WORDS):
            print(f"Validation failed: Question contains preamble or answer leak: {text}")
            return False

        text_lower = lower_text

        # Topic-level deduplication
        if topic:
            try:
                topic_emb = embeddings_model.embed_query(topic)
                for seen_topic, seen_emb in seen_topics_with_embs:
                    if cosine_similarity(topic_emb, seen_emb) > SEMANTIC_DUPLICATE_THRESHOLD:
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
                if cosine_similarity(new_emb, seen_emb) > SEMANTIC_DUPLICATE_THRESHOLD:
                    return False

            # Check against DB
            for i, db_emb in enumerate(existing_embeddings):
                if cosine_similarity(new_emb, db_emb) > SEMANTIC_DUPLICATE_THRESHOLD:
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

    def attempt_one(attempt_index: int) -> bool:
        """Generate and try to add a single question. Returns True if a question was accepted."""
        target_diff = target_difficulties[attempt_index]
        if target_diff == domain.DifficultyLevel.EASY:
            doc = pick_doc(easy_docs)
        elif target_diff == domain.DifficultyLevel.MEDIUM:
            doc = pick_doc(medium_docs)
        else:
            doc = pick_doc(hard_docs)

        target_style = question_styles[attempt_index % len(question_styles)]
        prev_q_str = "\n".join([f"- {q}" for q in previous_questions_list]) if previous_questions_list else "None"

        with track_llm_call(db, LLMCallSite.QUESTION_GEN, 'gemini-2.5-flash', session_id=session_id, module_id=module_id, user_id=triggered_by_user_id) as usage:
            raw_result = chain.invoke({
                "context": doc.page_content,
                "module_name": module_name,
                "previous_questions": prev_q_str,
                "target_difficulty": target_diff.value,
                "target_style": target_style
            })
            raw_message = raw_result.get("raw")
            if raw_message is not None and getattr(raw_message, "usage_metadata", None):
                usage["input_tokens"] = raw_message.usage_metadata.get("input_tokens")
                usage["output_tokens"] = raw_message.usage_metadata.get("output_tokens")
            response = raw_result.get("parsed")
            if response is None:
                raise ValueError(f"Structured output parsing failed: {raw_result.get('parsing_error')}")

        q_text = response.question.strip()
        q_topic = response.topic.strip()
        q_ideal_answer = response.ideal_answer.strip()

        return process_and_add_question(q_text, target_diff, q_topic, q_ideal_answer)

    attempt_index = 0
    for _ in range(count):
        try:
            attempt_one(attempt_index)
        except Exception as e:
            print("Failed to generate question from chunk:", e)
            db.rollback()
        attempt_index += 1

    # If we still need more questions (e.g. docs was smaller than count or duplicates skipped), retry
    retries = 0
    max_retries = 10
    while len(generated_questions) < count and docs and retries < max_retries and attempt_index < len(target_difficulties):
        try:
            added = attempt_one(attempt_index)
            if not added:
                retries += 1
        except Exception:
            db.rollback()
            retries += 1
        attempt_index += 1

    if len(generated_questions) < count:
        print(
            f"Partial generation for module {module_id}: requested {count}, "
            f"generated {len(generated_questions)} (docs_available={len(docs)}, retries_used={retries})"
        )

    return generated_questions
