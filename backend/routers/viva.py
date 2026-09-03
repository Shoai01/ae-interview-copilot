import logging
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from schemas import viva as viva_schemas
from services import viva_service, user_service
from repositories import viva_repository
from core.deps import get_current_user, require_role
from models.domain import User, UserRole
from models import domain

router = APIRouter(
    prefix="/viva",
    tags=["viva"]
)

def _verify_session_ownership(db: Session, session_id: int, current_user: User) -> None:
    """Ensure the calling trainee owns this session before touching its data."""
    session = db.query(domain.VivaSession).filter(
        domain.VivaSession.id == session_id,
        domain.VivaSession.trainee_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=403, detail="You are not authorized to access this session")

def _verify_session_access(db: Session, session_id: int, current_user: User) -> None:
    """Trainees may only access their own session; trainers/admins may review any session."""
    if current_user.role == UserRole.TRAINEE:
        _verify_session_ownership(db, session_id, current_user)
        return
    session = db.query(domain.VivaSession).filter(domain.VivaSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

@router.post("/sessions/assign", response_model=viva_schemas.SessionResponse, status_code=status.HTTP_201_CREATED)
def assign_session(session_data: viva_schemas.SessionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    try:
        session_result = viva_service.assign_session(db, session_data, current_user_id=current_user.id)
        
        # Dispatch emails in background (non-blocking)
        from services.email_service import send_welcome_email, send_session_assignment_email
        if session_result.new_user_password:
            # Trainee was auto-created during assignment
            username = session_data.trainee_identifier
            background_tasks.add_task(
                send_welcome_email,
                to_email=username,
                username=username,
                password=session_result.new_user_password,
                full_name=session_result.trainee_name
            )
            to_email = username
        else:
            # Look up trainee's username (email)
            trainee = user_service.get_user_by_id(db, session_result.trainee_id)
            to_email = trainee.username if trainee else None
            
        if to_email:
            background_tasks.add_task(
                send_session_assignment_email,
                to_email=to_email,
                module_name=session_result.module_name,
                duration_minutes=session_result.duration_minutes,
                full_name=session_result.trainee_name,
                question_count=session_data.question_count
            )
            
        return session_result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sessions/assign/bulk", response_model=viva_schemas.BulkSessionResponse, status_code=status.HTTP_201_CREATED)
def assign_session_bulk(bulk_data: viva_schemas.BulkSessionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    # Bulk handler catches ValueError internally and returns it in the response payload
    bulk_result = viva_service.assign_session_bulk(db, bulk_data, current_user_id=current_user.id)
    
    # Dispatch emails for successful assignments in background (non-blocking)
    from services.email_service import send_welcome_email, send_session_assignment_email
    from services.admin_service import get_module_by_id
    
    module = get_module_by_id(db, bulk_data.module_id)
    module_name = module.name if module else "Unknown"
    
    for item in bulk_result.results:
        if not item.error and item.session_id:
            to_email = item.identifier
            if item.new_user_password:
                background_tasks.add_task(
                    send_welcome_email,
                    to_email=to_email,
                    username=to_email,
                    password=item.new_user_password,
                    full_name=item.full_name
                )
            background_tasks.add_task(
                send_session_assignment_email,
                to_email=to_email,
                module_name=module_name,
                duration_minutes=bulk_data.duration_minutes,
                full_name=item.full_name,
                question_count=bulk_data.question_count
            )
            
    return bulk_result

@router.post("/sessions/start", response_model=viva_schemas.SessionResponse, status_code=status.HTTP_201_CREATED)
def start_session(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    try:
        return viva_service.resolve_or_create_session(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/sessions/current", response_model=viva_schemas.SessionResponse)
def get_current_session(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    session = viva_service.get_current_session(db, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="No active or pending session found")
    return session

@router.post("/{session_id}/next-question", response_model=viva_schemas.NextQuestionResponse)
def get_next_question(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    _verify_session_ownership(db, session_id, current_user)
    question = viva_service.get_next_question(db, session_id)
    if not question:
        raise HTTPException(status_code=404, detail="No more questions available")
    return question

@router.post("/{session_id}/answer", response_model=viva_schemas.StatusResponse, status_code=status.HTTP_200_OK)
def submit_answer(session_id: int, answer_data: viva_schemas.AnswerSubmit, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    _verify_session_ownership(db, session_id, current_user)
    success = viva_service.submit_answer(db, session_id, answer_data)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found in session")
    return viva_schemas.StatusResponse(status="success")

from fastapi import UploadFile, File
import os
import uuid

logger = logging.getLogger(__name__)

MAX_AUDIO_SIZE = 50 * 1024 * 1024  # 50MB

@router.post("/{session_id}/answer/{viva_question_id}/audio", response_model=viva_schemas.StatusResponse, status_code=status.HTTP_201_CREATED)
async def upload_audio(
    session_id: int, 
    viva_question_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([UserRole.TRAINEE]))
):
    _verify_session_ownership(db, session_id, current_user)

    # Fix 3: Validate content type with null safety
    content_type = file.content_type or ""
    allowed_types = ["audio/", "video/webm", "application/octet-stream"]
    if not any(content_type.startswith(t) if t.endswith("/") else content_type == t for t in allowed_types):
        raise HTTPException(status_code=400, detail=f"Invalid audio file type: {content_type}")
        
    ext = file.filename.split('.')[-1] if file.filename and '.' in file.filename else 'webm'
    filename = f"{uuid.uuid4()}.{ext}"
    os.makedirs(os.path.join("uploads", "audio"), exist_ok=True)
    file_path = os.path.join("uploads", "audio", filename)
    
    # Fix 6: Read with size limit to prevent memory exhaustion
    content = await file.read(MAX_AUDIO_SIZE + 1)
    if len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Audio file too large (max 50MB)")

    logger.info(f"Received audio file for session {session_id}, question {viva_question_id}, size: {len(content)} bytes")
    with open(file_path, "wb") as f:
        f.write(content)
        
    audio_url = f"/uploads/audio/{filename}"
    
    success = viva_service.upload_answer_audio(db, session_id, viva_question_id, audio_url)
    logger.info(f"DB update success: {success} for audio_url: {audio_url}")
    if not success:
        logger.warning(f"Deleting {file_path} because DB update failed (question not found in session)")
        # cleanup if failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=404, detail="Question not found in session")
        
    return viva_schemas.StatusResponse(status="uploaded")

@router.get("/{session_id}/answer/{viva_question_id}/audio")
def stream_answer_audio(
    session_id: int,
    viva_question_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Stream candidate audio recording with byte-range and CORS headers.
    Requires the calling trainee to own the session, or a trainer/admin reviewing it.
    """
    _verify_session_access(db, session_id, current_user)

    vq = viva_repository.get_viva_question(db, viva_question_id, session_id)
    if not vq or not vq.audio_url:
        raise HTTPException(status_code=404, detail="Audio recording not found")

    rel_path = vq.audio_url.lstrip('/')
    if not os.path.exists(rel_path):
        raise HTTPException(status_code=404, detail="Audio file missing on server disk")

    return FileResponse(
        rel_path,
        media_type="audio/webm",
        headers={
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, max-age=86400",
        }
    )

@router.get("/{session_id}/summary", response_model=viva_schemas.SessionSummaryResponse)
def get_session_summary_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _verify_session_access(db, session_id, current_user)
    summary = viva_service.get_session_summary(db, session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")
    return summary

@router.get("", response_model=List[viva_schemas.SessionListItem])
def list_sessions(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return viva_service.get_all_sessions(db)

@router.post("/{session_id}/fraud-flag", response_model=viva_schemas.StatusResponse, status_code=status.HTTP_201_CREATED)
def report_fraud_flag(session_id: int, flag_data: viva_schemas.FraudFlagCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.TRAINEE]))):
    _verify_session_ownership(db, session_id, current_user)
    result = viva_service.create_fraud_flag(db, session_id, flag_data)
    if not result:
        raise HTTPException(status_code=404, detail="Session or question not found")
    return viva_schemas.StatusResponse(status="flagged")

@router.post("/{session_id}/evaluate", response_model=viva_schemas.StatusResponse, status_code=status.HTTP_200_OK)
def evaluate_session_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    success = viva_service.evaluate_session(db, session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return viva_schemas.StatusResponse(status="Evaluation completed")

@router.get("/{session_id}/report", response_model=viva_schemas.SessionFullReportResponse)
def get_session_report_route(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _verify_session_access(db, session_id, current_user)
    report = viva_service.get_session_report(db, session_id)
    if not report:
        raise HTTPException(status_code=404, detail="Session not found")
    return report

@router.put("/{session_id}/decision")
def submit_decision(session_id: int, decision_data: viva_schemas.TrainerDecisionRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    result = viva_service.submit_trainer_decision(db, session_id, decision_data, current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Session or report not found")
    return {"status": "ok", "decision": result.trainer_decision.value if result.trainer_decision else None}

@router.get("/trainee/{user_id}", response_model=viva_schemas.TraineeResponse)
def get_trainee(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return viva_schemas.TraineeResponse(id=user.id, name=user.full_name or user.username)
