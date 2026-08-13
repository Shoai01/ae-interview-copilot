from sqlalchemy.orm import Session
from models import domain
from schemas import viva as viva_schemas
from repositories import viva_repository
import datetime

def create_session(db: Session, session_data: viva_schemas.SessionCreate):
    # In a real scenario with auth, trainee_id comes from token.
    # For now, ensure trainee exists or create a dummy one.
    trainee = viva_repository.get_trainee_by_id(db, session_data.trainee_id)
    if not trainee:
        trainee = viva_repository.create_trainee(db, session_data.trainee_id, "Test Candidate")

    db_session = viva_repository.create_session(db, trainee.id, session_data.module_id)
    
    # Fetch extra data for the rich response
    total_questions = viva_repository.count_active_questions(db, session_data.module_id)
    
    return viva_schemas.SessionResponse(
        id=db_session.id,
        trainee_id=db_session.trainee_id,
        module_id=db_session.module_id,
        status=db_session.status.value,
        module_name=db_session.module.name,
        trainee_name=trainee.name or "Candidate",
        duration_minutes=db_session.duration_minutes,
        total_questions=total_questions
    )

def get_next_question(db: Session, session_id: int) -> viva_schemas.NextQuestionResponse:
    session = viva_repository.get_session_by_id(db, session_id)
    if not session:
        return None

    # Get IDs of questions already asked in this session
    asked_question_ids = [vq.question_bank_id for vq in session.questions]

    # Prevent React Strict Mode double-fetching from skipping questions:
    # If the last question hasn't been answered yet, just return it again.
    if session.questions:
        last_vq = max(session.questions, key=lambda x: x.question_order)
        if last_vq.answered_at is None:
            total_questions = viva_repository.count_active_questions(db, session.module_id)
            return viva_schemas.NextQuestionResponse(
                viva_question_id=last_vq.id,
                text=last_vq.question_bank.text,
                question_type=last_vq.question_bank.question_type.value,
                is_last_question=(last_vq.question_order >= total_questions),
                current_question_index=last_vq.question_order,
                total_questions=total_questions
            )

    # Find next active question in the module that hasn't been asked
    next_qb_item = viva_repository.get_next_active_question(db, session.module_id, asked_question_ids)

    # Get total active questions for this module
    total_questions = viva_repository.count_active_questions(db, session.module_id)

    if not next_qb_item:
        return None # No more questions available

    # Record that this question is being asked
    question_order = len(asked_question_ids) + 1
    viva_question = viva_repository.create_viva_question(db, session.id, next_qb_item.id, question_order)

    return viva_schemas.NextQuestionResponse(
        viva_question_id=viva_question.id,
        text=next_qb_item.text,
        question_type=next_qb_item.question_type.value,
        is_last_question=(question_order >= total_questions),
        current_question_index=question_order,
        total_questions=total_questions
    )

def get_trainee(db: Session, trainee_id: int) -> domain.Trainee:
    return viva_repository.get_trainee_by_id(db, trainee_id)

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
        
    total_questions = viva_repository.count_active_questions(db, session.module_id)
    
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
        
    # Prepare data for AI
    questions_data = []
    for q in session.questions:
        if q.answered_at and q.transcript:
            questions_data.append({
                'viva_question_id': q.id,
                'question_text': q.question_bank.text,
                'transcript': q.transcript
            })
            
    # Call AI Service
    eval_result = ai_service.evaluate_interview_session(questions_data)
    
    # Save Question Evaluations
    for q_eval in eval_result.question_evaluations:
        db_eval = domain.Evaluation(
            viva_question_id=q_eval.viva_question_id,
            score_communication=q_eval.score_communication,
            score_technical=q_eval.score_technical,
            score_confidence=q_eval.score_confidence,
            ai_feedback=q_eval.ai_feedback
        )
        viva_repository.save_evaluation(db, db_eval)
        
    # Save Report
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
        
    return viva_schemas.SessionFullReportResponse(
        session=session,
        trainee=session.trainee,
        summary=summary,
        report=report_data,
        questions=questions
    )

def get_all_sessions(db: Session):
    sessions = viva_repository.get_all_sessions(db)
    result = []
    for s in sessions:
        ai_rec = s.report.ai_recommendation.value if s.report and s.report.ai_recommendation else None
        status = "Pending Review"
        if s.status == domain.SessionStatus.IN_PROGRESS:
            status = "In Progress"
        elif s.report and s.report.trainer_decision:
            status = "Reviewed"
            
        result.append(viva_schemas.SessionListItem(
            id=s.id,
            trainee_name=s.trainee.name or "Unknown",
            employee_id=s.trainee.employee_id or f"EMP-{s.trainee.id:04d}",
            module_name=s.module.name,
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
    # Verify the question belongs to this session
    viva_question = viva_repository.get_viva_question(db, flag_data.viva_question_id, session_id)
    if not viva_question:
        return None
    try:
        detected_at = dt.fromisoformat(flag_data.detected_at.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        detected_at = dt.utcnow()
    return viva_repository.create_fraud_flag(db, flag_data.viva_question_id, flag_data.flag_type, detected_at)
