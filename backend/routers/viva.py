from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from schemas import viva as viva_schemas
from services import viva_service

router = APIRouter(
    prefix="/viva",
    tags=["viva"]
)

@router.post("/sessions", response_model=viva_schemas.SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(session_data: viva_schemas.SessionCreate, db: Session = Depends(get_db)):
    return viva_service.create_session(db, session_data)

@router.post("/{session_id}/next-question", response_model=viva_schemas.NextQuestionResponse)
def get_next_question(session_id: int, db: Session = Depends(get_db)):
    question = viva_service.get_next_question(db, session_id)
    if not question:
        raise HTTPException(status_code=404, detail="No more questions available")
    return question

@router.get("/trainees/{trainee_id}", response_model=viva_schemas.TraineeResponse)
def get_trainee_info(trainee_id: int, db: Session = Depends(get_db)):
    trainee = viva_service.get_trainee(db, trainee_id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return trainee

@router.post("/{session_id}/answer", status_code=status.HTTP_200_OK)
def submit_answer(session_id: int, answer_data: viva_schemas.AnswerSubmit, db: Session = Depends(get_db)):
    success = viva_service.submit_answer(db, session_id, answer_data)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found in session")
    return {"status": "success"}


@router.get("/{session_id}/summary", response_model=viva_schemas.SessionSummaryResponse)
def get_session_summary_route(session_id: int, db: Session = Depends(get_db)):
    summary = viva_service.get_session_summary(db, session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary

from typing import List

@router.get("", response_model=List[viva_schemas.SessionListItem])
def list_sessions(db: Session = Depends(get_db)):
    return viva_service.get_all_sessions(db)

@router.post("/{session_id}/evaluate", status_code=status.HTTP_200_OK)
def evaluate_session_route(session_id: int, db: Session = Depends(get_db)):
    success = viva_service.evaluate_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"status": "Evaluation completed"}

@router.get("/{session_id}/report", response_model=viva_schemas.SessionFullReportResponse)
def get_session_report_route(session_id: int, db: Session = Depends(get_db)):
    report = viva_service.get_session_report(db, session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return report
