from sqlalchemy.orm import Session
from models import domain
from schemas import admin as admin_schemas
from typing import List

def get_modules(db: Session) -> List[domain.TrainingModule]:
    return db.query(domain.TrainingModule).all()

def get_questions_by_module(db: Session, module_id: int) -> List[domain.QuestionBank]:
    return db.query(domain.QuestionBank).filter(domain.QuestionBank.module_id == module_id).order_by(domain.QuestionBank.id.desc()).all()

def create_question(db: Session, question: admin_schemas.QuestionCreate) -> domain.QuestionBank:
    db_question = domain.QuestionBank(
        module_id=question.module_id,
        text=question.text,
        question_type=question.question_type,
        difficulty=question.difficulty,
        is_active=True
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def toggle_question_active_status(db: Session, question_id: int) -> domain.QuestionBank:
    question = db.query(domain.QuestionBank).filter(domain.QuestionBank.id == question_id).first()
    if question:
        question.is_active = not question.is_active
        db.commit()
        db.refresh(question)
    return question

def delete_question(db: Session, question_id: int) -> bool:
    question = db.query(domain.QuestionBank).filter(domain.QuestionBank.id == question_id).first()
    if question:
        db.delete(question)
        db.commit()
        return True
    return False
