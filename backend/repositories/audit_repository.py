from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
import base64
from typing import List, Tuple, Optional
from datetime import datetime
from models.domain import AuditLog, AuditActionType, AuditLogCategory

def create_log(db: Session, actor_id: Optional[int], actor_name: Optional[str], category: AuditLogCategory, action_type: AuditActionType, target: Optional[str] = None, details: Optional[dict] = None) -> AuditLog:
    log_entry = AuditLog(actor_id=actor_id, actor_name=actor_name, category=category, action_type=action_type, target=target, details=details)
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

def encode_cursor(created_at: datetime, log_id: int) -> str:
    cursor_str = f"{created_at.isoformat()}|{log_id}"
    return base64.b64encode(cursor_str.encode()).decode()

def decode_cursor(cursor: str) -> Tuple[datetime, int]:
    try:
        cursor_str = base64.b64decode(cursor).decode()
        created_at_str, log_id_str = cursor_str.split('|')
        return datetime.fromisoformat(created_at_str), int(log_id_str)
    except Exception:
        return None, None

def get_logs(db: Session, actor_id: Optional[int] = None, category: Optional[str] = None, action_type: Optional[str] = None, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None, cursor: Optional[str] = None, limit: int = 50) -> Tuple[List[AuditLog], Optional[str]]:
    query = db.query(AuditLog)
    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if category:
        query = query.filter(AuditLog.category == category)
    if action_type:
        query = query.filter(AuditLog.action_type == action_type)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from)
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to)
    if cursor:
        created_at, log_id = decode_cursor(cursor)
        if created_at and log_id:
            query = query.filter((AuditLog.created_at < created_at) | ((AuditLog.created_at == created_at) & (AuditLog.id < log_id)))
    query = query.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    items = query.limit(limit + 1).all()
    next_cursor = None
    if len(items) > limit:
        next_item = items[limit - 1]
        next_cursor = encode_cursor(next_item.created_at, next_item.id)
        items = items[:limit]
    elif len(items) > 0 and len(items) == limit:
        next_item = items[-1]
        next_cursor = encode_cursor(next_item.created_at, next_item.id)
    return items, next_cursor