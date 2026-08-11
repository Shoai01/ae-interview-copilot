from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from schemas import admin as admin_schemas
from services import admin_service

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

@router.get("/modules", response_model=List[admin_schemas.ModuleResponse])
def get_all_modules(db: Session = Depends(get_db)):
    return admin_service.get_modules(db)

@router.get("/questions", response_model=List[admin_schemas.QuestionResponse])
def get_questions(module_id: int, db: Session = Depends(get_db)):
    return admin_service.get_questions_by_module(db, module_id=module_id)

@router.post("/questions", response_model=admin_schemas.QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(question: admin_schemas.QuestionCreate, db: Session = Depends(get_db)):
    return admin_service.create_question(db, question=question)

@router.put("/questions/{question_id}/toggle", response_model=admin_schemas.QuestionResponse)
def toggle_question_status(question_id: int, db: Session = Depends(get_db)):
    updated_question = admin_service.toggle_question_active_status(db, question_id=question_id)
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated_question

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db)):
    success = admin_service.delete_question(db, question_id=question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return None
