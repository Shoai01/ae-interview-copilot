from sqlalchemy.orm import Session
from models import domain
from schemas import viva as viva_schemas
from repositories import viva_repository
import datetime

def assign_session(db: Session, session_data: viva_schemas.SessionCreate, current_user_id: int = 1, skip_audit: bool = False) -> viva_schemas.SessionResponse:
    """
    Assign a new viva session to a trainee. If the trainee does not exist by identifier,
    auto-create their account.
    
    Args:
        db (Session): Database session.
        session_data (SessionCreate): Details of the session to create.
        current_user_id (int): ID of the user assigning the session.
        
    Returns:
        SessionResponse: The created session details including any auto-generated password.
    """
    from services.user_service import get_user_by_id, get_user_by_username
    from repositories.user_repository import create_trainee
    from repositories.admin_repository import get_module_by_id
    from models.domain import UserRole
    import random
    import string
    
    trainee = None
    new_user_password = None
    
    if session_data.trainee_id:
        trainee = get_user_by_id(db, session_data.trainee_id)
        if not trainee or trainee.role != UserRole.TRAINEE:
            raise ValueError("Invalid trainee ID.")
    elif session_data.trainee_identifier:
        # Search only by username
        identifier = session_data.trainee_identifier.strip()
        trainee = get_user_by_username(db, identifier)
        if trainee and trainee.role != UserRole.TRAINEE:
             raise ValueError("User exists but is not a trainee.")
        
        if not trainee:
            # Auto-create the trainee
            new_user_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
            from core.security import get_password_hash
            trainee = create_trainee(
                db, 
                username=identifier, 
                full_name=session_data.trainee_full_name, 
                password_hash=get_password_hash(new_user_password), 
                created_by_id=current_user_id
            )
    else:
        raise ValueError("Must provide trainee_id or trainee_identifier.")
        
    existing_session = viva_repository.get_active_session_by_trainee_id(db, trainee.id)
    
    if existing_session:
        if existing_session.status == domain.SessionStatus.PENDING and existing_session.start_time:
            now = datetime.datetime.utcnow()
            if (now - existing_session.start_time).total_seconds() > 86400: # 24 hours
                existing_session.status = domain.SessionStatus.EXPIRED
                viva_repository.save_session(db, existing_session)
                existing_session = None # It's expired, so they CAN have a new one

    if existing_session:
        raise ValueError("Trainee already has an active or pending session.")

    db_session = viva_repository.create_pending_session(
        db,
        trainee_id=trainee.id,
        module_id=session_data.module_id,
        duration_minutes=session_data.duration_minutes,
        question_count=session_data.question_count,
        set_name=session_data.set_name
    )
    
    module = get_module_by_id(db, session_data.module_id)

    if not skip_audit:
        from services.audit_service import log_action
        from models.domain import AuditActionType
        creator = db.query(domain.User).filter(domain.User.id == current_user_id).first()
        actor_name = creator.full_name or creator.username if creator else "System"
        
        with log_action(db, AuditActionType.SESSION_ASSIGNED, current_user_id, actor_name) as log:
            log['target'] = trainee.full_name or trainee.username
            log['details'] = {"module_id": session_data.module_id, "session_id": db_session.id}

    return viva_schemas.SessionResponse(
        id=db_session.id,
        trainee_id=db_session.trainee_id,
        module_id=db_session.module_id,
        status=db_session.status.value,
        module_name=module.name if module else "Unknown",
        trainee_name=trainee.full_name or trainee.username,
        duration_minutes=db_session.duration_minutes,
        total_questions=0,
        start_time=db_session.start_time,
        new_user_password=new_user_password
    )

def resolve_or_create_session(db: Session, trainee: domain.User) -> viva_schemas.SessionResponse:
    """
    Check if a trainee has an IN_PROGRESS session and resume it.
    If not, look for a PENDING session and start it by assigning questions.
    
    Args:
        db (Session): Database session.
        trainee (domain.User): The trainee user object.
        
    Returns:
        SessionResponse: The started or resumed session details.
    """
    from repositories.admin_repository import get_distinct_active_sets_by_module, get_active_questions_by_set, get_fallback_questions
    
    # Check for existing in-progress session
    existing_session = viva_repository.get_in_progress_session_by_trainee_id(db, trainee.id)

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
                from ai.question_gen import generate_dynamic_questions_for_session
                dynamic_questions = generate_dynamic_questions_for_session(db, db_session.module_id, count=5)
                
                if len(dynamic_questions) < 5:
                    print(f"Partial generation: Requested 5, generated {len(dynamic_questions)}. Falling back to predefined to fill gap.")
                    needed = 5 - len(dynamic_questions)
                    exclude_ids = [q.id for q in dynamic_questions]
                    fallback_questions = get_fallback_questions(db, db_session.module_id, exclude_ids, limit=needed)
                    dynamic_questions.extend(fallback_questions)
                    
                for i, qb_item in enumerate(dynamic_questions):
                    viva_repository.create_viva_question(
                        db=db, session_id=db_session.id, question_bank_id=qb_item.id, question_order=i+1
                    )
                total_questions = len(dynamic_questions) if dynamic_questions else 0

    if not existing_session:
        # If no in_progress session, look for a PENDING one
        pending_session = viva_repository.get_pending_session_by_trainee_id(db, trainee.id)
        
        if not pending_session:
            raise ValueError("No session has been assigned to you by an admin or trainer.")
            
        # Check for 24-hour expiration
        if pending_session.start_time:
            now = datetime.datetime.utcnow()
            if (now - pending_session.start_time).total_seconds() > 86400: # 24 hours
                pending_session.status = domain.SessionStatus.EXPIRED
                viva_repository.save_session(db, pending_session)
                raise ValueError("This session assignment has expired. Please contact your trainer.")
                
        db_session = pending_session
        db_session.status = domain.SessionStatus.IN_PROGRESS
        db_session.start_time = datetime.datetime.utcnow()
        viva_repository.save_session(db, db_session)
        
        # Phase 2: Pull questions from a pre-defined Set (Deterministic Pooling)
        distinct_sets = get_distinct_active_sets_by_module(db, db_session.module_id)
        
        if not distinct_sets:
            # Revert session state if no questions available
            db_session.status = domain.SessionStatus.PENDING
            viva_repository.save_session(db, db_session)
            raise ValueError("Could not start session. No Question Sets are available for this module.")
            
        import random
        # Pick the requested set, or a random one if not specified or not found
        chosen_set = None
        if getattr(db_session, 'set_name', None) and db_session.set_name in distinct_sets:
            chosen_set = db_session.set_name
        else:
            chosen_set = random.choice(distinct_sets)
        
        # Get all questions from the chosen set
        available_questions = get_active_questions_by_set(db, db_session.module_id, chosen_set)
        
        if getattr(db_session, 'question_count', None) and db_session.question_count > 0:
            needed = db_session.question_count
        else:
            needed = db_session.duration_minutes // 3 # approx 3 mins per question
            if needed < 5: needed = 5
            
        if needed > len(available_questions):
            needed = len(available_questions)
            
        selected_questions = available_questions[:needed]

        # Link the selected questions to the session
        for i, qb_item in enumerate(selected_questions):
            viva_repository.create_viva_question(
                db=db,
                session_id=db_session.id,
                question_bank_id=qb_item.id,
                question_order=i+1
            )
            
        total_questions = len(selected_questions)

    if total_questions == 0:
        raise ValueError("Could not generate questions. AI generation failed, and there are no predefined questions available for this module.")

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
    """
    Get the currently active or pending session for a trainee.
    
    Args:
        db (Session): Database session.
        trainee_id (int): Trainee's ID.
        
    Returns:
        SessionResponse: Details of the session, or None if no session exists.
    """
    session = viva_repository.get_active_session_by_trainee_id(db, trainee_id)
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
        total_questions=len(session.questions),
        start_time=session.start_time
    )

def get_next_question(db: Session, session_id: int) -> viva_schemas.NextQuestionResponse:
    """
    Get the next unanswered question for a session.
    
    Args:
        db (Session): Database session.
        session_id (int): Session ID.
        
    Returns:
        NextQuestionResponse: The question details, or None if all are answered.
    """
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
    """
    Submit a transcript answer for a question in a session.
    
    Args:
        db (Session): Database session.
        session_id (int): Session ID.
        answer_data (AnswerSubmit): Submission data with transcript.
        
    Returns:
        bool: True if saved successfully, False if question not found.
    """
    viva_question = viva_repository.get_viva_question(db, answer_data.viva_question_id, session_id)
    if viva_question:
        viva_repository.update_viva_question_answer(db, viva_question, answer_data.transcript)
        return True
    return False

def upload_answer_audio(db: Session, session_id: int, viva_question_id: int, audio_url: str) -> bool:
    """
    Save the uploaded audio URL for a question in a session.
    
    Args:
        db (Session): Database session.
        session_id (int): Session ID.
        viva_question_id (int): The VivaQuestion ID.
        audio_url (str): The relative URL to the audio file.
        
    Returns:
        bool: True if saved successfully, False if question not found.
    """
    viva_question = viva_repository.get_viva_question(db, viva_question_id, session_id)
    if viva_question:
        viva_question.audio_url = audio_url
        db.commit()
        return True
    return False

def get_session_summary(db: Session, session_id: int) -> viva_schemas.SessionSummaryResponse:
    """
    Calculate and retrieve summary metrics for a session.
    
    Args:
        db (Session): Database session.
        session_id (int): Session ID.
        
    Returns:
        SessionSummaryResponse: Summary data including duration and answered count.
    """
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
    """
    Evaluate a completed session using the AI service.
    
    Args:
        db (Session): Database session.
        session_id (int): Session ID to evaluate.
        
    Returns:
        bool: True if evaluation completed, False if session not found.
    """
    session = viva_repository.get_session_by_id(db, session_id)
    if not session:
        return False
        
    questions_data = []
    for q in session.questions:
        if q.answered_at and q.transcript:
            flags = [f"{f.flag_type.value} (Count: {f.count})" for f in q.fraud_flags] if q.fraud_flags else []
            questions_data.append({
                'viva_question_id': q.id,
                'question_text': q.question_bank.text,
                'ideal_answer': q.question_bank.ideal_answer,
                'transcript': q.transcript,
                'fraud_flags': flags
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
    sorted_questions = sorted(session.questions, key=lambda x: x.question_order)
    for q in sorted_questions:
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
            "audio_url": q.audio_url,
            "duration": int((q.answered_at - q.asked_at).total_seconds()) if q.answered_at and q.asked_at else 0,
            "evaluation": eval_data,
            "fraud_flags": [{"type": f.flag_type.value, "count": f.count} for f in q.fraud_flags] if q.fraud_flags else []
        })
        
    report_data = None
    if session.report:
        report_data = {
            "aggregate_score": session.report.aggregate_score,
            "ai_recommendation": session.report.ai_recommendation.value if session.report.ai_recommendation else None,
            "strengths": session.report.strengths,
            "areas_of_improvement": session.report.areas_of_improvement,
            "trainer_decision": session.report.trainer_decision.value if session.report.trainer_decision else None,
            "trainer_notes": session.report.trainer_notes
        }
        
    session_response = viva_schemas.SessionResponse(
        id=session.id,
        trainee_id=session.trainee_id,
        module_id=session.module_id,
        status=session.status.value,
        module_name=session.module.name if session.module else "Unknown",
        trainee_name=session.trainee.full_name or session.trainee.username if session.trainee else "Candidate",
        duration_minutes=session.duration_minutes,
        total_questions=summary.total_questions,
        start_time=session.start_time
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
    """
    Fetch all sessions. Auto-expire PENDING sessions older than 24h.
    
    Args:
        db (Session): Database session.
        
    Returns:
        List[SessionListItem]: A list of session summaries for the dashboard.
    """
    now = datetime.datetime.utcnow()
    pending_sessions = viva_repository.get_pending_sessions(db)
    
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
            username=s.trainee.username if s.trainee else "Unknown",
            module_name=s.module.name if s.module else "Unknown",
            ai_recommendation=ai_rec,
            trainer_decision=s.report.trainer_decision.value if s.report and s.report.trainer_decision else None,
            status=status,
            date=s.start_time.strftime("%b %d, %Y")
        ))
    return result

def create_fraud_flag(db: Session, session_id: int, flag_data: viva_schemas.FraudFlagCreate):
    """
    Record a fraud flag detected by the frontend (e.g. TAB_SWITCH, NO_FACE) for a question.
    
    Args:
        db (Session): Database session.
        session_id (int): ID of the session.
        flag_data (FraudFlagCreate): Data about the fraud flag.
        
    Returns:
        FraudFlag: The newly created or updated fraud flag, or None if invalid.
    """
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

from services.audit_service import log_action
from models.domain import AuditActionType

def submit_trainer_decision(db: Session, session_id: int, decision_data, reviewer_id: int):
    """
    Save a trainer's manual review decision for a completed session.
    """
    session = viva_repository.get_session_by_id(db, session_id)
    if not session or not session.report:
        return None
        
    reviewer = db.query(domain.User).filter(domain.User.id == reviewer_id).first()
    reviewer_name = reviewer.full_name or reviewer.username if reviewer else None

    from services.audit_service import log_action
    from models.domain import AuditActionType

    with log_action(db, AuditActionType.TRAINER_DECISION_SUBMITTED, reviewer_id, reviewer_name) as log:
        report = session.report
        report.trainer_decision = domain.TrainerDecisionType(decision_data.decision)
        report.reviewed_by = reviewer_id
        report.reviewed_at = datetime.datetime.utcnow()
        
        # Store notes in dedicated field
        if decision_data.notes:
            report.trainer_notes = decision_data.notes
        
        db.commit()
        db.refresh(report)
        
        log['target'] = f"Session: {session.id}"
        log['details'] = {
            "decision": decision_data.decision,
            "trainee_id": session.trainee_id
        }
        
    return report

def assign_session_bulk(db: Session, bulk_data: viva_schemas.BulkSessionCreate, current_user_id: int) -> viva_schemas.BulkSessionResponse:
    creator = db.query(domain.User).filter(domain.User.id == current_user_id).first()
    actor_name = creator.full_name or creator.username if creator else None

    with log_action(db, AuditActionType.BULK_SESSION_ASSIGNED, current_user_id, actor_name) as log:
        success_count = 0
        failed_count = 0
        results = []
        assigned_trainees = []
        
        for trainee in bulk_data.trainees:
            result_item = viva_schemas.BulkSessionResultItem(
                identifier=trainee.trainee_identifier,
                full_name=trainee.trainee_full_name
            )
            
            try:
                # Create standard SessionCreate payload
                single_session_data = viva_schemas.SessionCreate(
                    trainee_identifier=trainee.trainee_identifier,
                    trainee_full_name=trainee.trainee_full_name,
                    module_id=bulk_data.module_id,
                    duration_minutes=bulk_data.duration_minutes,
                    question_count=bulk_data.question_count
                )
                
                # Delegate to existing logic
                assigned = assign_session(db, single_session_data, current_user_id, skip_audit=True)
                
                result_item.session_id = assigned.id
                result_item.new_user_password = assigned.new_user_password
                success_count += 1
                assigned_trainees.append(trainee.trainee_full_name or trainee.trainee_identifier)
                
            except ValueError as e:
                result_item.error = str(e)
                failed_count += 1
            except Exception as e:
                result_item.error = str(e)
                failed_count += 1
                
            results.append(result_item)
            
        bulk_result = viva_schemas.BulkSessionResponse(
            success_count=success_count,
            failed_count=failed_count,
            results=results
        )
        
        log['target'] = f"Module: {bulk_data.module_id}"
        log['details'] = {
            "module_id": bulk_data.module_id,
            "success_count": success_count,
            "failed_count": failed_count,
            "assigned_trainees": assigned_trainees,
            "total_trainees": len(bulk_data.trainees)
        }

    return bulk_result
