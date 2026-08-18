from sqlalchemy.orm import Session
from models import domain
from schemas import viva as viva_schemas
from repositories import viva_repository
import datetime

def assign_session(db: Session, session_data: viva_schemas.SessionCreate, current_user_id: int = 1) -> viva_schemas.SessionResponse:
    from services.user_service import get_user_by_id
    from models.domain import User, UserRole
    import random
    import string
    
    trainee = None
    new_user_password = None
    
    if session_data.trainee_id:
        trainee = get_user_by_id(db, session_data.trainee_id)
        if not trainee or trainee.role != domain.UserRole.TRAINEE:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Invalid trainee ID.")
    elif session_data.trainee_identifier:
        # Search only by username
        identifier = session_data.trainee_identifier.strip()
        trainee = db.query(User).filter(
            User.username == identifier,
            User.role == UserRole.TRAINEE
        ).first()
        
        if not trainee:
            # Auto-create the trainee
            new_user_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            from core.security import get_password_hash
            trainee = User(
                username=identifier,
                full_name=session_data.trainee_full_name,
                password_hash=get_password_hash(new_user_password),
                role=UserRole.TRAINEE,
                created_by=current_user_id
            )
            db.add(trainee)
            db.commit()
            db.refresh(trainee)
    else:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Must provide trainee_id or trainee_identifier.")
        
    existing_session = db.query(domain.VivaSession).filter(
        domain.VivaSession.trainee_id == trainee.id,
        domain.VivaSession.status.in_([domain.SessionStatus.IN_PROGRESS, domain.SessionStatus.PENDING])
    ).first()
    
    if existing_session:
        if existing_session.status == domain.SessionStatus.PENDING and existing_session.start_time:
            now = datetime.datetime.utcnow()
            if (now - existing_session.start_time).total_seconds() > 86400: # 24 hours
                existing_session.status = domain.SessionStatus.EXPIRED
                db.commit()
                existing_session = None # It's expired, so they CAN have a new one

    if existing_session:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Trainee already has an active or pending session.")

    db_session = domain.VivaSession(
        trainee_id=trainee.id,
        module_id=session_data.module_id,
        duration_minutes=session_data.duration_minutes,
        status=domain.SessionStatus.PENDING,
        start_time=datetime.datetime.utcnow()
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    module = db.query(domain.TrainingModule).filter(domain.TrainingModule.id == session_data.module_id).first()

    return viva_schemas.SessionResponse(
        id=db_session.id,
        trainee_id=db_session.trainee_id,
        module_id=db_session.module_id,
        status=db_session.status.value,
        module_name=module.name if module else "Unknown",
        trainee_name=trainee.full_name or trainee.username,
        duration_minutes=db_session.duration_minutes,
        total_questions=0,
        new_user_password=new_user_password
    )
def resolve_or_create_session(db: Session, trainee: domain.User) -> viva_schemas.SessionResponse:
    # Check for existing in-progress session
    existing_session = db.query(domain.VivaSession).filter(
        domain.VivaSession.trainee_id == trainee.id,
        domain.VivaSession.status == domain.SessionStatus.IN_PROGRESS
    ).first()

    if existing_session:
        db_session = existing_session
        total_questions = len(db_session.questions)
        answered_count = sum(1 for q in db_session.questions if q.answered_at is not None)
        
        if total_questions > 0 and answered_count >= total_questions:
            # Session was completed but state wasn't updated properly, fix it and start new
            viva_repository.end_session(db, db_session, datetime.datetime.utcnow())
            existing_session = None # Fall through to create new session
        else:
            # If the session got stuck without questions, generate them now
            if total_questions == 0:
                from services.knowledge_service import generate_dynamic_questions_for_session
                dynamic_questions = generate_dynamic_questions_for_session(db, db_session.module_id, count=5)
                
                if len(dynamic_questions) < 5:
                    print(f"Partial generation: Requested 5, generated {len(dynamic_questions)}. Falling back to predefined to fill gap.")
                    from sqlalchemy.sql.expression import func
                    needed = 5 - len(dynamic_questions)
                    exclude_ids = [q.id for q in dynamic_questions]
                    fallback_questions = db.query(domain.QuestionBank).filter(
                        domain.QuestionBank.module_id == db_session.module_id,
                        domain.QuestionBank.is_active == True,
                        ~domain.QuestionBank.id.in_(exclude_ids) if exclude_ids else True
                    ).order_by(func.random()).limit(needed).all()
                    
                    dynamic_questions.extend(fallback_questions)
                    
                for i, qb_item in enumerate(dynamic_questions):
                    viva_repository.create_viva_question(
                        db=db, session_id=db_session.id, question_bank_id=qb_item.id, question_order=i+1
                    )
                total_questions = len(dynamic_questions) if dynamic_questions else 0

    if not existing_session:
        # If no in_progress session, look for a PENDING one
        pending_session = db.query(domain.VivaSession).filter(
            domain.VivaSession.trainee_id == trainee.id,
            domain.VivaSession.status == domain.SessionStatus.PENDING
        ).first()
        
        if not pending_session:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="No session has been assigned to you by an admin or trainer.")
            
        # Check for 24-hour expiration
        if pending_session.start_time:
            now = datetime.datetime.utcnow()
            if (now - pending_session.start_time).total_seconds() > 86400: # 24 hours
                pending_session.status = domain.SessionStatus.EXPIRED
                db.commit()
                from fastapi import HTTPException
                raise HTTPException(status_code=400, detail="This session assignment has expired. Please contact your trainer.")
                
        db_session = pending_session
        db_session.status = domain.SessionStatus.IN_PROGRESS
        db_session.start_time = datetime.datetime.utcnow()
        db.commit()
        
        # Phase 2: Dynamically generate 5 questions tailored to this session from FAISS
        from services.knowledge_service import generate_dynamic_questions_for_session
        dynamic_questions = generate_dynamic_questions_for_session(db, db_session.module_id, count=5)
        
        if len(dynamic_questions) < 5:
            # Surface partial generation explicitly
            print(f"Partial generation: Requested 5, generated {len(dynamic_questions)}. Falling back to predefined to fill gap.")
            from sqlalchemy.sql.expression import func
            needed = 5 - len(dynamic_questions)
            exclude_ids = [q.id for q in dynamic_questions]
            fallback_questions = db.query(domain.QuestionBank).filter(
                domain.QuestionBank.module_id == db_session.module_id,
                domain.QuestionBank.is_active == True,
                ~domain.QuestionBank.id.in_(exclude_ids) if exclude_ids else True
            ).order_by(func.random()).limit(needed).all()
            
            dynamic_questions.extend(fallback_questions)

        # Link exactly these 5 questions to the session
        for i, qb_item in enumerate(dynamic_questions):
            viva_repository.create_viva_question(
                db=db,
                session_id=db_session.id,
                question_bank_id=qb_item.id,
                question_order=i+1
            )
            
        total_questions = len(dynamic_questions) if dynamic_questions else 0

    if total_questions == 0:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Could not generate questions. AI generation failed, and there are no predefined questions available for this module.")


    return viva_schemas.SessionResponse(
        id=db_session.id,
        trainee_id=db_session.trainee_id,
        module_id=db_session.module_id,
        status=db_session.status.value,
        module_name=db_session.module.name if db_session.module else "Unknown",
        trainee_name=trainee.full_name or trainee.username,
        duration_minutes=db_session.duration_minutes,
        total_questions=total_questions
    )

def get_current_session(db: Session, trainee_id: int) -> viva_schemas.SessionResponse:
    # Look for IN_PROGRESS first
    session = db.query(domain.VivaSession).filter(
        domain.VivaSession.trainee_id == trainee_id,
        domain.VivaSession.status == domain.SessionStatus.IN_PROGRESS
    ).first()
    
    if not session:
        # Fallback to PENDING
        session = db.query(domain.VivaSession).filter(
            domain.VivaSession.trainee_id == trainee_id,
            domain.VivaSession.status == domain.SessionStatus.PENDING
        ).first()
        
    if not session:
        return None
        
    return viva_schemas.SessionResponse(
        id=session.id,
        trainee_id=session.trainee_id,
        module_id=session.module_id,
        status=session.status.value,
        module_name=session.module.name if session.module else "Unknown",
        trainee_name=session.trainee.full_name or session.trainee.username,
        duration_minutes=session.duration_minutes,
        total_questions=len(session.questions)
    )

def get_next_question(db: Session, session_id: int) -> viva_schemas.NextQuestionResponse:
    session = viva_repository.get_session_by_id(db, session_id)
    if not session:
        return None

    if not session.questions:
        return None

    # Find the first question (ordered by question_order) that hasn't been answered yet
    sorted_questions = sorted(session.questions, key=lambda x: x.question_order)
    
    current_vq = None
    for vq in sorted_questions:
        if vq.answered_at is None:
            current_vq = vq
            break
            
    if not current_vq:
        # All questions have been answered
        return None

    total_questions = len(sorted_questions)

    return viva_schemas.NextQuestionResponse(
        viva_question_id=current_vq.id,
        text=current_vq.question_bank.text,
        is_last_question=(current_vq.question_order >= total_questions),
        current_question_index=current_vq.question_order,
        total_questions=total_questions
    )

def submit_answer(db: Session, session_id: int, answer_data: viva_schemas.AnswerSubmit) -> bool:
    viva_question = viva_repository.get_viva_question(db, answer_data.viva_question_id, session_id)
    if viva_question:
        viva_repository.update_viva_question_answer(db, viva_question, answer_data.transcript)
        return True
    return False

def get_session_summary(db: Session, session_id: int) -> viva_schemas.SessionSummaryResponse:
    session = viva_repository.get_session_by_id(db, session_id)
    if not session:
        return None
        
    total_questions = len(session.questions)
    
    answered_questions = [q for q in session.questions if q.answered_at is not None]
    questions_answered = len(answered_questions)
    
    last_answer_time = max([q.answered_at for q in answered_questions], default=session.start_time) if answered_questions else session.start_time
    
    if session.end_time is None and questions_answered > 0 and questions_answered == total_questions:
        viva_repository.end_session(db, session, last_answer_time)
        
    end_time_to_use = session.end_time if session.end_time else last_answer_time
    duration_seconds = int((end_time_to_use - session.start_time).total_seconds())

    return viva_schemas.SessionSummaryResponse(
        session_id=session.id,
        duration_seconds=duration_seconds,
        questions_answered=questions_answered,
        total_questions=total_questions
    )

from ai import evaluator as ai_service

def evaluate_session(db: Session, session_id: int):
    session = viva_repository.get_session_by_id(db, session_id)
    if not session:
        return False
        
    questions_data = []
    for q in session.questions:
        if q.answered_at and q.transcript:
            questions_data.append({
                'viva_question_id': q.id,
                'question_text': q.question_bank.text,
                'transcript': q.transcript
            })
            
    eval_result = ai_service.evaluate_interview_session(questions_data)
    
    for q_eval in eval_result.question_evaluations:
        db_eval = domain.Evaluation(
            viva_question_id=q_eval.viva_question_id,
            score_communication=q_eval.score_communication,
            score_technical=q_eval.score_technical,
            score_confidence=q_eval.score_confidence,
            ai_feedback=q_eval.ai_feedback
        )
        viva_repository.save_evaluation(db, db_eval)
        
    db_report = domain.VivaReport(
        session_id=session.id,
        aggregate_score=eval_result.aggregate_score,
        ai_recommendation=eval_result.ai_recommendation,
        strengths=eval_result.strengths,
        areas_of_improvement=eval_result.areas_of_improvement
    )
    viva_repository.save_report(db, db_report)
    return True

def get_session_report(db: Session, session_id: int) -> viva_schemas.SessionFullReportResponse:
    session = viva_repository.get_session_by_id(db, session_id)
    if not session:
        return None
        
    summary = get_session_summary(db, session_id)
    
    questions = []
    for q in session.questions:
        eval_data = None
        if q.evaluation:
            eval_data = {
                "score_communication": q.evaluation.score_communication,
                "score_technical": q.evaluation.score_technical,
                "score_confidence": q.evaluation.score_confidence,
                "ai_feedback": q.evaluation.ai_feedback,
            }
        
        questions.append({
            "viva_question_id": q.id,
            "question_order": q.question_order,
            "text": q.question_bank.text,
            "transcript": q.transcript,
            "duration": int((q.answered_at - q.asked_at).total_seconds()) if q.answered_at and q.asked_at else 0,
            "evaluation": eval_data
        })
        
    report_data = None
    if session.report:
        report_data = {
            "aggregate_score": session.report.aggregate_score,
            "ai_recommendation": session.report.ai_recommendation.value if session.report.ai_recommendation else None,
            "strengths": session.report.strengths,
            "areas_of_improvement": session.report.areas_of_improvement,
            "trainer_decision": session.report.trainer_decision.value if session.report.trainer_decision else None
        }
        
    session_response = viva_schemas.SessionResponse(
        id=session.id,
        trainee_id=session.trainee_id,
        module_id=session.module_id,
        status=session.status.value,
        module_name=session.module.name if session.module else "Unknown",
        trainee_name=session.trainee.full_name or session.trainee.username if session.trainee else "Candidate",
        duration_minutes=session.duration_minutes,
        total_questions=summary.total_questions
    )

    trainee_response = viva_schemas.TraineeResponse(
        id=session.trainee.id if session.trainee else 0,
        name=session.trainee.full_name or session.trainee.username if session.trainee else "Unknown Candidate"
    )

    return viva_schemas.SessionFullReportResponse(
        session=session_response,
        trainee=trainee_response,
        summary=summary,
        report=report_data,
        questions=questions
    )

def get_all_sessions(db: Session):
    # Auto-expire PENDING sessions older than 24h
    now = datetime.datetime.utcnow()
    pending_sessions = db.query(domain.VivaSession).filter(
        domain.VivaSession.status == domain.SessionStatus.PENDING
    ).all()
    
    dirty = False
    for ps in pending_sessions:
        if ps.start_time and (now - ps.start_time).total_seconds() > 86400: # 24 hours
            ps.status = domain.SessionStatus.EXPIRED
            dirty = True
            
    if dirty:
        db.commit()

    sessions = viva_repository.get_all_sessions(db)
    result = []
    for s in sessions:
        ai_rec = s.report.ai_recommendation.value if s.report and s.report.ai_recommendation else None
        status = "Pending Review"
        if s.status == domain.SessionStatus.IN_PROGRESS:
            status = "In Progress"
        elif s.status == domain.SessionStatus.EXPIRED:
            status = "Expired"
        elif s.status == domain.SessionStatus.PENDING:
            status = "Assigned"
        elif s.report and s.report.trainer_decision:
            status = "Reviewed"
            
        result.append(viva_schemas.SessionListItem(
            id=s.id,
            trainee_name=s.trainee.full_name or s.trainee.username if s.trainee else "Unknown",
            employee_id=s.trainee.employee_id if s.trainee else f"EMP-{s.trainee.id:04d}",
            module_name=s.module.name if s.module else "Unknown",
            ai_recommendation=ai_rec,
            status=status,
            date=s.start_time.strftime("%b %d, %Y")
        ))
    return result

def create_fraud_flag(db: Session, session_id: int, flag_data: viva_schemas.FraudFlagCreate):
    from datetime import datetime as dt
    session = viva_repository.get_session_by_id(db, session_id)
    if not session:
        return None
    viva_question = viva_repository.get_viva_question(db, flag_data.viva_question_id, session_id)
    if not viva_question:
        return None
    try:
        detected_at = dt.fromisoformat(flag_data.detected_at.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        detected_at = dt.utcnow()
    return viva_repository.create_fraud_flag(db, flag_data.viva_question_id, flag_data.flag_type, detected_at)
