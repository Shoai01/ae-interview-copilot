import time
from contextlib import contextmanager
from typing import Optional
from sqlalchemy.orm import Session

from repositories import llm_usage_repository
from models.domain import LLMCallSite, LLMCallStatus


@contextmanager
def track_llm_call(
    db: Optional[Session],
    call_site: LLMCallSite,
    model_name: str,
    session_id: Optional[int] = None,
    module_id: Optional[int] = None,
    user_id: Optional[int] = None,
):
    """
    Times a single LLM call and records it to llm_usage_logs, admin-only data
    for the usage analytics dashboard.

    Usage:
        with track_llm_call(db, LLMCallSite.EVALUATOR, "gemini-2.5-flash", session_id=sid) as usage:
            response = call_the_model(...)
            usage["input_tokens"], usage["output_tokens"] = extract_tokens(response)

    If the wrapped call raises, an ERROR row is recorded (tokens left as None)
    and the exception is re-raised unchanged. If `db` is None, or the log
    write itself fails, usage tracking is skipped silently rather than
    breaking the underlying LLM call.
    """
    usage = {"input_tokens": None, "output_tokens": None}
    start = time.monotonic()
    status = LLMCallStatus.SUCCESS
    error_message = None
    try:
        yield usage
    except Exception as e:
        status = LLMCallStatus.ERROR
        error_message = str(e)[:500]
        raise
    finally:
        latency_ms = int((time.monotonic() - start) * 1000)
        if db is not None:
            try:
                input_tokens = usage.get("input_tokens")
                output_tokens = usage.get("output_tokens")
                total_tokens = (input_tokens + output_tokens) if (input_tokens is not None and output_tokens is not None) else None
                llm_usage_repository.create_log(
                    db,
                    call_site=call_site,
                    model_name=model_name,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=total_tokens,
                    latency_ms=latency_ms,
                    status=status,
                    error_message=error_message,
                    session_id=session_id,
                    module_id=module_id,
                    user_id=user_id,
                )
            except Exception as log_err:
                print(f"LLM usage logging error: {log_err}")
