import logging
from typing import Optional

from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel, Field

from ai.base import get_chat_model
from models.domain import LLMCallSite
from services.llm_usage_service import track_llm_call

logger = logging.getLogger(__name__)

MODEL_NAME = 'gemini-2.5-flash'
MAX_FIELD_CHARS = 1500  # per question text / ideal answer, keeps the prompt bounded


class QuestionTerms(BaseModel):
    index: int = Field(description="The index of the question these terms belong to, exactly as given")
    terms: list[str] = Field(description="Terms a speaker would say aloud that speech recognition could mishear. Empty if none.")


class KeytermExtraction(BaseModel):
    questions: list[QuestionTerms]


_PROMPT = PromptTemplate.from_template(
    "You are building a speech-recognition vocabulary for spoken answers to technical interview "
    "questions about a software automation platform.\n\n"
    "For each question below (with its reference answer), list the terms a candidate would say "
    "aloud that a general-purpose speech recognizer is likely to get wrong: product names, "
    "feature / step / screen names (e.g. 'Filter Rows'), UI labels, tool names, acronyms and "
    "technical jargon.\n\n"
    "Rules:\n"
    "- Each term is 1 to 4 words and must appear in the question or reference answer.\n"
    "- Keep the capitalization used in the source text.\n"
    "- Do NOT include ordinary English words or generic concepts (process, workflow, server, "
    "data, project, run, ...), sentences, or numbers.\n"
    "- Return an entry for every question index, with an empty list when nothing qualifies.\n\n"
    "{questions}"
)


def _format_questions(items: list[tuple[str, Optional[str]]]) -> str:
    blocks = []
    for index, (text, ideal_answer) in enumerate(items):
        block = f"[{index}] Question: {(text or '')[:MAX_FIELD_CHARS]}"
        if ideal_answer:
            block += f"\nReference answer: {ideal_answer[:MAX_FIELD_CHARS]}"
        blocks.append(block)
    return "\n\n".join(blocks)


def extract_keyterms(items: list[tuple[str, Optional[str]]], module_id: Optional[int] = None, db=None) -> dict[int, list[str]]:
    """
    Ask the LLM which spoken terms in each (question text, ideal answer) pair
    need to be boosted in speech recognition. Returns {position in `items` ->
    raw terms}; positions the model skipped are simply absent so callers can
    leave those questions pending. Raises on LLM/parsing failure — the caller
    decides what a failure means. Output is unfiltered; services.keyterm_service
    cleans it.
    """
    if not items:
        return {}

    llm = get_chat_model(temperature=0)
    # include_raw=True so token usage is available for the usage dashboard
    chain = _PROMPT | llm.with_structured_output(KeytermExtraction, include_raw=True)
    with track_llm_call(db, LLMCallSite.KEYTERM_EXTRACTION, MODEL_NAME, module_id=module_id) as usage:
        raw_result = chain.invoke({"questions": _format_questions(items)})
        raw_message = raw_result.get("raw")
        if raw_message is not None and getattr(raw_message, "usage_metadata", None):
            usage["input_tokens"] = raw_message.usage_metadata.get("input_tokens")
            usage["output_tokens"] = raw_message.usage_metadata.get("output_tokens")
        result = raw_result.get("parsed")
        if result is None:
            raise ValueError(f"Structured output parsing failed: {raw_result.get('parsing_error')}")

    extracted: dict[int, list[str]] = {}
    for entry in result.questions:
        if 0 <= entry.index < len(items):
            extracted.setdefault(entry.index, []).extend(entry.terms)
    return extracted
