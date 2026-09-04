from sqlalchemy.orm import Session
from sqlalchemy import func, case
import base64
from typing import List, Tuple, Optional
from datetime import datetime
from models.domain import LLMUsageLog, LLMCallSite, LLMCallStatus, User

def create_log(
    db: Session,
    call_site: LLMCallSite,
    model_name: str,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    latency_ms: Optional[int] = None,
    status: LLMCallStatus = LLMCallStatus.SUCCESS,
    error_message: Optional[str] = None,
    session_id: Optional[int] = None,
    module_id: Optional[int] = None,
    user_id: Optional[int] = None,
) -> LLMUsageLog:
    log_entry = LLMUsageLog(
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
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def encode_cursor(created_at: datetime, log_id: int) -> str:
    cursor_str = f"{created_at.isoformat()}|{log_id}"
    return base64.b64encode(cursor_str.encode()).decode()

def decode_cursor(cursor: str) -> Tuple[Optional[datetime], Optional[int]]:
    try:
        cursor_str = base64.b64decode(cursor).decode()
        created_at_str, log_id_str = cursor_str.split('|')
        return datetime.fromisoformat(created_at_str), int(log_id_str)
    except Exception:
        return None, None

def _apply_filters(query, call_site=None, status=None, model_name=None, session_id=None, user_id=None, date_from=None, date_to=None):
    if call_site:
        query = query.filter(LLMUsageLog.call_site == call_site)
    if status:
        query = query.filter(LLMUsageLog.status == status)
    if model_name:
        query = query.filter(LLMUsageLog.model_name == model_name)
    if session_id:
        query = query.filter(LLMUsageLog.session_id == session_id)
    if user_id:
        query = query.filter(LLMUsageLog.user_id == user_id)
    if date_from:
        query = query.filter(LLMUsageLog.created_at >= date_from)
    if date_to:
        query = query.filter(LLMUsageLog.created_at <= date_to)
    return query

def get_logs(
    db: Session,
    call_site: Optional[str] = None,
    status: Optional[str] = None,
    model_name: Optional[str] = None,
    session_id: Optional[int] = None,
    user_id: Optional[int] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    cursor: Optional[str] = None,
    limit: int = 50,
) -> Tuple[List[LLMUsageLog], Optional[str]]:
    query = db.query(LLMUsageLog)
    query = _apply_filters(query, call_site, status, model_name, session_id, user_id, date_from, date_to)

    if cursor:
        created_at, log_id = decode_cursor(cursor)
        if created_at and log_id:
            query = query.filter((LLMUsageLog.created_at < created_at) | ((LLMUsageLog.created_at == created_at) & (LLMUsageLog.id < log_id)))

    query = query.order_by(LLMUsageLog.created_at.desc(), LLMUsageLog.id.desc())
    items = query.limit(limit + 1).all()
    next_cursor = None
    if len(items) > limit:
        items = items[:limit]
        next_item = items[-1]
        next_cursor = encode_cursor(next_item.created_at, next_item.id)
    return items, next_cursor

def get_summary(
    db: Session,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> dict:
    """Aggregate totals, per-call-site breakdown, per-model breakdown, and a
    daily time series over the given window (all filtered rows, no pagination)."""
    base_query = db.query(LLMUsageLog)
    base_query = _apply_filters(base_query, date_from=date_from, date_to=date_to)

    totals_row = base_query.with_entities(
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.input_tokens), 0),
        func.coalesce(func.sum(LLMUsageLog.output_tokens), 0),
        func.coalesce(func.sum(LLMUsageLog.total_tokens), 0),
        func.coalesce(func.avg(LLMUsageLog.latency_ms), 0),
        func.sum(case((LLMUsageLog.status == LLMCallStatus.ERROR, 1), else_=0)),
    ).first()

    total_calls, total_input, total_output, total_tokens, avg_latency, error_count = totals_row
    error_count = error_count or 0

    by_call_site = base_query.with_entities(
        LLMUsageLog.call_site,
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.input_tokens), 0),
        func.coalesce(func.sum(LLMUsageLog.output_tokens), 0),
    ).group_by(LLMUsageLog.call_site).all()

    by_model = base_query.with_entities(
        LLMUsageLog.model_name,
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.input_tokens), 0),
        func.coalesce(func.sum(LLMUsageLog.output_tokens), 0),
    ).group_by(LLMUsageLog.model_name).all()

    day_expr = func.date(LLMUsageLog.created_at)
    daily = base_query.with_entities(
        day_expr,
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.input_tokens), 0),
        func.coalesce(func.sum(LLMUsageLog.output_tokens), 0),
    ).group_by(day_expr).order_by(day_expr).all()

    # Outer join since user_id is nullable — those rows collapse into one
    # "System" group instead of being dropped.
    by_user_query = base_query.outerjoin(User, LLMUsageLog.user_id == User.id)
    total_tokens_expr = func.coalesce(func.sum(LLMUsageLog.total_tokens), 0)
    by_user = by_user_query.with_entities(
        User.id,
        User.username,
        User.full_name,
        User.role,
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.input_tokens), 0),
        func.coalesce(func.sum(LLMUsageLog.output_tokens), 0),
        total_tokens_expr,
    ).group_by(User.id, User.username, User.full_name, User.role).order_by(total_tokens_expr.desc()).limit(50).all()

    by_user_total_users = by_user_query.with_entities(
        func.count(func.distinct(LLMUsageLog.user_id))
    ).scalar() or 0

    return {
        "total_calls": total_calls or 0,
        "total_input_tokens": int(total_input or 0),
        "total_output_tokens": int(total_output or 0),
        "total_tokens": int(total_tokens or 0),
        "avg_latency_ms": round(float(avg_latency or 0), 1),
        "error_count": int(error_count),
        "by_call_site": [
            {"call_site": cs.value if hasattr(cs, 'value') else cs, "calls": c, "input_tokens": int(i), "output_tokens": int(o)}
            for cs, c, i, o in by_call_site
        ],
        "by_model": [
            {"model_name": m, "calls": c, "input_tokens": int(i), "output_tokens": int(o)}
            for m, c, i, o in by_model
        ],
        "daily": [
            {"date": str(d), "calls": c, "input_tokens": int(i), "output_tokens": int(o)}
            for d, c, i, o in daily
        ],
        "by_user": [
            {
                "user_id": uid,
                "username": username,
                "full_name": full_name,
                "role": role.value if hasattr(role, 'value') else role,
                "calls": c,
                "input_tokens": int(i),
                "output_tokens": int(o),
                "total_tokens": int(t),
            }
            for uid, username, full_name, role, c, i, o, t in by_user
        ],
        "by_user_total_users": int(by_user_total_users),
    }
