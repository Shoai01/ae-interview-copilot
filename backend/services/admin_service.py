from sqlalchemy.orm import Session
from models import domain
from schemas import admin as admin_schemas
from typing import List, Optional
from repositories import admin_repository

def get_modules(db: Session) -> List[domain.TrainingModule]:
    return admin_repository.get_modules(db)

def get_questions_by_module(db: Session, module_id: int) -> List[domain.QuestionBank]:
    return admin_repository.get_questions_by_module(db, module_id)

def create_question(db: Session, question: admin_schemas.QuestionCreate) -> domain.QuestionBank:
    return admin_repository.create_question(db, question)

def toggle_question_active_status(db: Session, question_id: int) -> domain.QuestionBank:
    question = admin_repository.get_question_by_id(db, question_id)
    if question:
        question.is_active = not question.is_active
        return admin_repository.save_question(db, question)
    return None

def delete_question(db: Session, question_id: int) -> bool:
    question = admin_repository.get_question_by_id(db, question_id)
    if question:
        admin_repository.delete_question(db, question)
        return True
    return False

def get_dashboard_metrics(db: Session, module_id: Optional[int] = None) -> dict:
    return admin_repository.get_dashboard_metrics(db, module_id)

def update_question(db: Session, question_id: int, update_data: admin_schemas.QuestionUpdate) -> domain.QuestionBank:
    question = admin_repository.get_question_by_id(db, question_id)
    if question:
        return admin_repository.update_question(db, question, update_data.model_dump(exclude_unset=True))
    return None

def rename_set(db: Session, module_id: int, old_set_name: str, new_set_name: str) -> None:
    admin_repository.rename_set_questions(db, module_id, old_set_name, new_set_name)

def delete_set(db: Session, module_id: int, set_name: str) -> None:
    admin_repository.delete_set_questions(db, module_id, set_name)