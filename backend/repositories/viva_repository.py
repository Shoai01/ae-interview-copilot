from sqlalchemy.orm import Session
from models import domain
import os
import datetime
from typing import List, Optional

def create_session(db: Session, trainee_id: int, module_id: int) -> domain.VivaSession:
    db_session = domain.VivaSession(
        trainee_id=trainee_id,
        module_id=module_id,
        status=domain.SessionStatus.IN_PROGRESS
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_session_by_id(db: Session, session_id: int) -> domain.VivaSession:
    return db.query(domain.VivaSession).filter(domain.VivaSession.id == session_id).first()

def get_all_sessions(db: Session) -> List[domain.VivaSession]:
    return db.query(domain.VivaSession).order_by(domain.VivaSession.start_time.desc()).all()

def get_pending_sessions(db: Session) -> List[domain.VivaSession]:
    return db.query(domain.VivaSession).filter(
        domain.VivaSession.status == domain.SessionStatus.PENDING
    ).all()

def get_active_session_by_trainee_id(db: Session, trainee_id: int) -> domain.VivaSession:
    return db.query(domain.VivaSession).filter(
        domain.VivaSession.trainee_id == trainee_id,
        domain.VivaSession.status.in_([domain.SessionStatus.IN_PROGRESS, domain.SessionStatus.PENDING])
    ).first()

def get_in_progress_session_by_trainee_id(db: Session, trainee_id: int) -> domain.VivaSession:
    return db.query(domain.VivaSession).filter(
        domain.VivaSession.trainee_id == trainee_id,
        domain.VivaSession.status == domain.SessionStatus.IN_PROGRESS
    ).first()

def get_pending_session_by_trainee_id(db: Session, trainee_id: int) -> domain.VivaSession:
    return db.query(domain.VivaSession).filter(
        domain.VivaSession.trainee_id == trainee_id,
        domain.VivaSession.status == domain.SessionStatus.PENDING
    ).order_by(domain.VivaSession.start_time.desc()).first()

def create_pending_session(db: Session, trainee_id: int, module_id: int, duration_minutes: int, question_count: int, set_name: str = None) -> domain.VivaSession:
    db_session = domain.VivaSession(
        trainee_id=trainee_id,
        module_id=module_id,
        duration_minutes=duration_minutes,
        question_count=question_count,
        set_name=set_name,
        status=domain.SessionStatus.PENDING,
        start_time=datetime.datetime.utcnow()
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def save_session(db: Session, session: domain.VivaSession) -> domain.VivaSession:
    db.commit()
    db.refresh(session)
    return session

def count_active_questions(db: Session, module_id: int) -> int:
    return db.query(domain.QuestionBank).filter(
        domain.QuestionBank.module_id == module_id,
        domain.QuestionBank.is_active == True
    ).count()

def get_next_active_question(db: Session, module_id: int, asked_question_ids: List[int]) -> domain.QuestionBank:
    return db.query(domain.QuestionBank).filter(
        domain.QuestionBank.module_id == module_id,
        domain.QuestionBank.is_active == True,
        ~domain.QuestionBank.id.in_(asked_question_ids) if asked_question_ids else True
    ).order_by(domain.QuestionBank.id).first()

def create_viva_question(db: Session, session_id: int, question_bank_id: int, question_order: int) -> domain.VivaQuestion:
    viva_question = domain.VivaQuestion(
        session_id=session_id,
        question_bank_id=question_bank_id,
        question_order=question_order
    )
    db.add(viva_question)
    db.commit()
    db.refresh(viva_question)
    return viva_question

def get_viva_question(db: Session, viva_question_id: int, session_id: int) -> domain.VivaQuestion:
    return db.query(domain.VivaQuestion).filter(
        domain.VivaQuestion.id == viva_question_id,
        domain.VivaQuestion.session_id == session_id
    ).first()

def update_viva_question_answer(db: Session, viva_question: domain.VivaQuestion, transcript: str) -> None:
    viva_question.answered_at = datetime.datetime.utcnow()
    viva_question.transcript = transcript
    db.commit()

MAX_ENHANCE_ATTEMPTS = 2

def increment_enhance_attempts(db: Session, viva_question: domain.VivaQuestion) -> bool:
    """Returns False (and does not increment) if the cap is already reached."""
    if viva_question.transcript_enhance_attempts >= MAX_ENHANCE_ATTEMPTS:
        return False
    viva_question.transcript_enhance_attempts += 1
    db.commit()
    return True

def set_enhanced_transcript(db: Session, viva_question: domain.VivaQuestion, transcript: str) -> None:
    """Overwrite transcript with a manually-enhanced (batch STT) result and flag it —
    deliberately does NOT touch answered_at, since Enhance runs pre-submit."""
    viva_question.transcript = transcript
    viva_question.transcript_manually_enhanced = True
    db.commit()

def end_session(db: Session, session: domain.VivaSession, end_time: datetime.datetime) -> None:
    session.end_time = end_time
    session.status = domain.SessionStatus.COMPLETED
    db.commit()

def save_evaluation(db: Session, db_eval: domain.Evaluation) -> domain.Evaluation:
    db.add(db_eval)
    # The caller will commit
    return db_eval

def save_report(db: Session, db_report: domain.VivaReport) -> domain.VivaReport:
    db.add(db_report)
    db.commit()
    return db_report

# Upper bound on stored episodes per (question, flag type) row so a client that
# keeps tripping a detector can't grow the JSON column without limit. `count`
# keeps counting past it.
MAX_FLAG_EVENTS = 50
FLAG_UPLOAD_ROOT = os.path.join("uploads", "flags")

def _save_flag_snapshot(session_id: int, flag_id: int, event_idx: int, image_base64: str) -> str | None:
    """Decode and save a base64-encoded frame as JPEG proof for a fraud flag."""
    try:
        import base64
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        raw_bytes = base64.b64decode(image_base64)
        if len(raw_bytes) == 0 or len(raw_bytes) > 5 * 1024 * 1024:
            return None
        upload_dir = os.path.join(FLAG_UPLOAD_ROOT, str(session_id))
        os.makedirs(upload_dir, exist_ok=True)
        path = os.path.join(upload_dir, f"flag_{flag_id}_{event_idx}.jpg")
        with open(path, "wb") as f:
            f.write(raw_bytes)
        return path
    except Exception as e:
        print(f"[FraudFlag] Failed to save snapshot: {e}")
        return None

def record_fraud_event(db: Session, viva_question_id: int, flag_type, phase: str, at, image_base64: str | None = None) -> domain.FraudFlag | None:
    """
    Record one edge of a fraud-flag episode.

    START: opens a new episode and bumps `count`. Saves proof snapshot if image_base64 provided.
    EVENT: like START but instantaneous — stored already closed (end == start).
    END:   closes the most recent still-open episode; a no-op (returns None)
           if there is none, e.g. the START was dropped or already closed.
    """
    from models.domain import FraudFlagType
    flag_type = FraudFlagType(flag_type)
    # Normalise to naive UTC, then to a millisecond ISO string with a "Z"
    # suffix (what the frontend's Date parser expects; also sorts chronologically).
    if at.tzinfo:
        at = at.astimezone(datetime.timezone.utc).replace(tzinfo=None)
    at_iso = at.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    flag = db.query(domain.FraudFlag).filter(
        domain.FraudFlag.viva_question_id == viva_question_id,
        domain.FraudFlag.flag_type == flag_type
    ).first()

    if phase == "END":
        if not flag:
            return None
        # Reassign a fresh list — in-place mutation isn't tracked by SQLAlchemy's JSON type.
        events = [dict(e) for e in (flag.events or [])]
        for event in reversed(events):
            if event.get("end") is None:
                event["end"] = max(at_iso, event["start"])  # ISO-UTC strings sort chronologically
                flag.events = events
                db.commit()
                db.refresh(flag)
                return flag
        return None

    if not flag:
        flag = domain.FraudFlag(
            viva_question_id=viva_question_id,
            flag_type=flag_type,
            count=0,
            events=[],
        )
        db.add(flag)
    flag.count = (flag.count or 0) + 1
    flag.detected_at = at
    events = [dict(e) for e in (flag.events or [])]
    event_entry = {"start": at_iso, "end": at_iso if phase == "EVENT" else None}
    if len(events) < MAX_FLAG_EVENTS:
        if image_base64:
            q = db.query(domain.VivaQuestion).filter(domain.VivaQuestion.id == viva_question_id).first()
            if q and q.session_id:
                db.flush()  # ensure flag.id is available
                img_path = _save_flag_snapshot(q.session_id, flag.id, len(events), image_base64)
                if img_path:
                    event_entry["has_image"] = True
                    event_entry["image_path"] = img_path
        events.append(event_entry)
    flag.events = events
    db.commit()
    db.refresh(flag)
    return flag
