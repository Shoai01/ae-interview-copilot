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

