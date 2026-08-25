from sqlalchemy.orm import Session
from models import domain
from schemas import admin as admin_schemas
from typing import List, Optional
from repositories import admin_repository

def get_module_by_id(db: Session, module_id: int) -> domain.TrainingModule:
    """
    Fetch a single training module by its ID.
    
    Args:
        db (Session): Database session.
        module_id (int): ID of the module to fetch.
        
    Returns:
        TrainingModule: The module object if found.
    """
    return admin_repository.get_module_by_id(db, module_id)

def get_modules_with_counts(db: Session) -> List[dict]:
    """
    Fetch all training modules and include the maximum number of active questions 
    available in any single set for each module.
    
    Args:
        db (Session): Database session.
        
    Returns:
        List[dict]: List of modules with 'max_questions_per_set'.
    """
    return admin_repository.get_modules_with_max_questions(db)

def get_questions_by_module(db: Session, module_id: int) -> List[domain.QuestionBank]:
    return admin_repository.get_questions_by_module(db, module_id)

from services.audit_service import log_action
from models.domain import AuditActionType

def create_question(db: Session, question: admin_schemas.QuestionCreate, actor_id: int = None, actor_name: str = None) -> domain.QuestionBank:
    with log_action(db, AuditActionType.QUESTION_CREATED, actor_id, actor_name) as log:
        new_q = admin_repository.create_question(db, question)
        log['target'] = f"Question: {new_q.id} (Set: {new_q.set_name})"
        log['details'] = {"module_id": new_q.module_id, "difficulty": new_q.difficulty.value}
        return new_q

def create_questions_bulk(db: Session, bulk_data: admin_schemas.BulkQuestionCreate, actor_id: int = None, actor_name: str = None) -> admin_schemas.BulkQuestionResponse:
    with log_action(db, AuditActionType.BULK_QUESTION_UPLOAD, actor_id, actor_name) as log:
        count = 0
        for q in bulk_data.questions:
            q_create = admin_schemas.QuestionCreate(
                module_id=bulk_data.module_id,
                text=q.text,
                ideal_answer=q.ideal_answer,
                difficulty=q.difficulty,
                set_name=q.set_name
            )
            admin_repository.create_question(db, q_create)
            count += 1
        
        log['target'] = f"Module: {bulk_data.module_id}"
        log['details'] = {"count": count}
        return admin_schemas.BulkQuestionResponse(message="Successfully created questions in bulk", count=count)

def toggle_question_active_status(db: Session, question_id: int, actor_id: int = None, actor_name: str = None) -> domain.QuestionBank:
    with log_action(db, AuditActionType.QUESTION_STATUS_TOGGLED, actor_id, actor_name) as log:
        question = admin_repository.get_question_by_id(db, question_id)
        if question:
            question.is_active = not question.is_active
            result = admin_repository.save_question(db, question)
            log['target'] = f"Question: {question.id}"
            log['details'] = {"new_status": question.is_active}
            return result
        return None

def delete_question(db: Session, question_id: int, actor_id: int = None, actor_name: str = None) -> bool:
    with log_action(db, AuditActionType.QUESTION_UPDATED, actor_id, actor_name) as log:
        question = admin_repository.get_question_by_id(db, question_id)
        if question:
            log['target'] = f"Question: {question.id}"
            log['details'] = {"action": "deleted", "text_preview": question.text[:50] if question.text else ""}
            admin_repository.delete_question(db, question)
            return True
        return False

def get_dashboard_metrics(db: Session, module_id: Optional[int] = None) -> dict:
    return admin_repository.get_dashboard_metrics(db, module_id)

def update_question(db: Session, question_id: int, update_data: admin_schemas.QuestionUpdate, actor_id: int = None, actor_name: str = None) -> domain.QuestionBank:
    with log_action(db, AuditActionType.QUESTION_UPDATED, actor_id, actor_name) as log:
        question = admin_repository.get_question_by_id(db, question_id)
        if question:
            result = admin_repository.update_question(db, question, update_data.model_dump(exclude_unset=True))
            log['target'] = f"Question: {question.id}"
            log['details'] = {"updated_fields": list(update_data.model_dump(exclude_unset=True).keys())}
            return result
        return None

def rename_set(db: Session, module_id: int, old_set_name: str, new_set_name: str, actor_id: int = None, actor_name: str = None) -> None:
    with log_action(db, AuditActionType.QUESTION_UPDATED, actor_id, actor_name) as log:
        admin_repository.rename_set_questions(db, module_id, old_set_name, new_set_name)
        log['target'] = f"Set: {old_set_name} -> {new_set_name}"
        log['details'] = {"module_id": module_id}

def delete_set(db: Session, module_id: int, set_name: str, actor_id: int = None, actor_name: str = None) -> None:
    with log_action(db, AuditActionType.QUESTION_UPDATED, actor_id, actor_name) as log:
        admin_repository.delete_set_questions(db, module_id, set_name)
        log['target'] = f"Set: {set_name}"
        log['details'] = {"module_id": module_id, "action": "deleted"}