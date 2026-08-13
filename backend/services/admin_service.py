from sqlalchemy.orm import Session
from models import domain
from schemas import admin as admin_schemas
from typing import List
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
