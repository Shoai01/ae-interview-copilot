from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from schemas import viva as viva_schemas
from services import viva_service
from core.deps import get_current_user, require_role
from models.domain import User, UserRole

router = APIRouter(
    prefix="/viva",
    tags=["viva"]
)

@router.post("/sessions/start", response_model=viva_schemas.SessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    return viva_service.resolve_or_create_session(db, current_user)

@router.post("/{session_id}/next-question", response_model=viva_schemas.NextQuestionResponse)
def get_next_question(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    question = viva_service.get_next_question(db, session_id)
    if not question:
        raise HTTPException(status_code=404, detail="No more questions available")
    return question

@router.post("/{session_id}/answer", status_code=status.HTTP_200_OK)
def submit_answer(session_id: int, answer_data: viva_schemas.AnswerSubmit, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    success = viva_service.submit_answer(db, session_id, answer_data)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found in session")
    return {"status": "success"}

@router.get("/{session_id}/summary", response_model=viva_schemas.SessionSummaryResponse)
def get_session_summary_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    summary = viva_service.get_session_summary(db, session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary

@router.get("", response_model=List[viva_schemas.SessionListItem])
def list_sessions(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return viva_service.get_all_sessions(db)

@router.post("/{session_id}/fraud-flag", status_code=status.HTTP_201_CREATED)
def report_fraud_flag(session_id: int, flag_data: viva_schemas.FraudFlagCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    result = viva_service.create_fraud_flag(db, session_id, flag_data)
    if not result:
        raise HTTPException(status_code=404, detail="Session or question not found")
    return {"status": "flagged"}

@router.post("/{session_id}/evaluate", status_code=status.HTTP_200_OK)
def evaluate_session_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = viva_service.evaluate_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "Evaluation completed"}

@router.get("/{session_id}/report", response_model=viva_schemas.SessionFullReportResponse)
def get_session_report_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = viva_service.get_session_report(db, session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return report

@router.get("/trainee/{user_id}", response_model=viva_schemas.TraineeResponse)
def get_trainee(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return viva_schemas.TraineeResponse(id=user.id, name=user.full_name or user.username)
