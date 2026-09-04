import os
from typing import Optional

from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

from ai.base import get_embeddings_model, get_chat_model
from models.domain import LLMCallSite
from services.knowledge_service import FAISS_INDEX_PATH
from services.llm_usage_service import track_llm_call


class IdealAnswerResult(BaseModel):
    grounded: bool = Field(description="True only if the reference extracts actually contain enough information to answer the question")
    ideal_answer: str = Field(description="Bullet points of what a good answer should include, based only on the reference extracts. Empty if not grounded.")


def generate_ideal_answer_from_kb(module_id: int, question_text: str, k: int = 3, db=None, triggered_by_user_id: Optional[int] = None) -> Optional[str]:
    """
    RAG lookup for a manually-authored question: retrieve the most relevant
    chunks for `question_text` from this module's knowledge base (real
    similarity search, not a random pick) and ask the LLM to draft an ideal
    answer grounded only in that material.

    Returns None — never raises — if there's no knowledge base, no relevant
    chunks for this module, or the LLM determines the material doesn't
    actually cover the question. Callers should treat None as "leave
    ideal_answer blank" rather than fail question creation.

    `db`/`triggered_by_user_id` are optional and, when provided, record
    per-call token usage to llm_usage_logs for the admin analytics dashboard.
    """
    if not question_text or not question_text.strip():
        return None
    if not os.path.exists(FAISS_INDEX_PATH):
        return None

    try:
        embeddings_model = get_embeddings_model(db=db, module_id=module_id, user_id=triggered_by_user_id)
        vector_store = FAISS.load_local(FAISS_INDEX_PATH, embeddings_model, allow_dangerous_deserialization=True)
        docs = vector_store.similarity_search(question_text, k=k, filter={"module_id": module_id})
    except Exception as e:
        print("Ideal-answer retrieval failed:", e)
        return None

    if not docs:
        return None

    context = "\n\n---\n\n".join(doc.page_content for doc in docs)

    prompt = PromptTemplate.from_template(
        "You are drafting a reference ('ideal') answer for a technical interview question, "
        "using ONLY the knowledge base extracts below. Do not use outside knowledge.\n\n"
        "Question: {question}\n\n"
        "Knowledge base extracts:\n{context}\n\n"
        "If the extracts do not contain enough information to answer this specific question, "
        "set grounded to false and leave ideal_answer empty. Otherwise set grounded to true and "
        "write a concise ideal answer as short bullet points."
    )

    try:
        llm = get_chat_model(temperature=0.3)
        # include_raw=True so token usage is available for the usage dashboard
        chain = prompt | llm.with_structured_output(IdealAnswerResult, include_raw=True)
        with track_llm_call(db, LLMCallSite.IDEAL_ANSWER, 'gemini-2.5-flash', module_id=module_id, user_id=triggered_by_user_id) as usage:
            raw_result = chain.invoke({"question": question_text, "context": context})
            raw_message = raw_result.get("raw")
            if raw_message is not None and getattr(raw_message, "usage_metadata", None):
                usage["input_tokens"] = raw_message.usage_metadata.get("input_tokens")
                usage["output_tokens"] = raw_message.usage_metadata.get("output_tokens")
            result = raw_result.get("parsed")
            if result is None:
                raise ValueError(f"Structured output parsing failed: {raw_result.get('parsing_error')}")
    except Exception as e:
        print("Ideal-answer generation failed:", e)
        return None

    if not result.grounded or not result.ideal_answer.strip():
        return None

    return result.ideal_answer.strip()
