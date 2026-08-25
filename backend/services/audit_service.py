from sqlalchemy.orm import Session
from contextlib import contextmanager
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
from repositories import audit_repository
from models.domain import AuditActionType, AuditLogCategory
from schemas import admin as admin_schemas

CATEGORY_MAPPING = {
    AuditActionType.USER_CREATED: AuditLogCategory.USER_MANAGEMENT,
    AuditActionType.USER_UPDATED: AuditLogCategory.USER_MANAGEMENT,
    AuditActionType.USER_DELETED: AuditLogCategory.USER_MANAGEMENT,
    AuditActionType.SESSION_ASSIGNED: AuditLogCategory.SESSION_TRAINING,
    AuditActionType.BULK_SESSION_ASSIGNED: AuditLogCategory.SESSION_TRAINING,
    AuditActionType.TRAINER_DECISION_SUBMITTED: AuditLogCategory.SESSION_TRAINING,
    AuditActionType.QUESTION_CREATED: AuditLogCategory.QUESTION_BANK,
    AuditActionType.BULK_QUESTION_UPLOAD: AuditLogCategory.QUESTION_BANK,
    AuditActionType.AI_QUESTION_GENERATED: AuditLogCategory.QUESTION_BANK,
    AuditActionType.QUESTION_UPDATED: AuditLogCategory.QUESTION_BANK,
    AuditActionType.QUESTION_STATUS_TOGGLED: AuditLogCategory.QUESTION_BANK,
    AuditActionType.DOCUMENT_UPLOADED: AuditLogCategory.KNOWLEDGE_BASE,
    AuditActionType.DOCUMENT_DELETED: AuditLogCategory.KNOWLEDGE_BASE,
}

@contextmanager
def log_action(db: Session, action_type: AuditActionType, actor_id: Optional[int] = None, actor_name: Optional[str] = None):
    log_data = {'target': None, 'details': None}
    try:
        yield log_data
    finally:
        try:
            category = CATEGORY_MAPPING.get(action_type, AuditLogCategory.USER_MANAGEMENT)
            audit_repository.create_log(
                db, 
                actor_id=actor_id,
                actor_name=actor_name,
                category=category,
                action_type=action_type,
                target=log_data['target'],
                details=log_data['details']
            )
        except Exception as e:
            print(f'Audit log error: {e}')

def get_audit_logs(db: Session, actor_id: Optional[int] = None, category: Optional[str] = None, action_type: Optional[str] = None, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None, cursor: Optional[str] = None, limit: int = 50) -> admin_schemas.AuditLogCursorPage:
    items, next_cursor = audit_repository.get_logs(db, actor_id, category, action_type, date_from, date_to, cursor, limit)
    
    response_items = []
    for item in items:
        response_items.append(admin_schemas.AuditLogResponse(
            id=item.id,
            actor_id=item.actor_id,
            actor_name=item.actor_name,
            category=item.category.value if hasattr(item.category, 'value') else item.category,
            action_type=item.action_type.value if hasattr(item.action_type, 'value') else item.action_type,
            target=item.target,
            details=item.details,
            created_at=item.created_at
        ))
    return admin_schemas.AuditLogCursorPage(items=response_items, next_cursor=next_cursor)