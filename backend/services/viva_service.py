from sqlalchemy.orm import Session
from models import domain
from schemas import viva as viva_schemas
import datetime

def create_session(db: Session, session_data: viva_schemas.SessionCreate) -> domain.VivaSession:
    # In a real scenario with auth, trainee_id comes from token.
    # For now, ensure trainee exists or create a dummy one.
    trainee = db.query(domain.Trainee).filter(domain.Trainee.id == session_data.trainee_id).first()
    if not trainee:
        trainee = domain.Trainee(id=session_data.trainee_id, name="Test Candidate")
        db.add(trainee)
        db.commit()
        db.refresh(trainee)

    db_session = domain.VivaSession(
        trainee_id=trainee.id,
        module_id=session_data.module_id,
        status=domain.SessionStatus.IN_PROGRESS
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def get_next_question(db: Session, session_id: int) -> viva_schemas.NextQuestionResponse:
    session = db.query(domain.VivaSession).filter(domain.VivaSession.id == session_id).first()
    if not session:
        return None

    # Get IDs of questions already asked in this session
    asked_question_ids = [vq.question_bank_id for vq in session.questions]

    # Prevent React Strict Mode double-fetching from skipping questions:
    # If the last question hasn't been answered yet, just return it again.
    if session.questions:
        last_vq = max(session.questions, key=lambda x: x.question_order)
        if last_vq.answered_at is None:
            total_questions = db.query(domain.QuestionBank).filter(
                domain.QuestionBank.module_id == session.module_id,
                domain.QuestionBank.is_active == True
            ).count()
            return viva_schemas.NextQuestionResponse(
                viva_question_id=last_vq.id,
                text=last_vq.question_bank.text,
                question_type=last_vq.question_bank.question_type.value,
                is_last_question=(last_vq.question_order >= total_questions),
                current_question_index=last_vq.question_order,
                total_questions=total_questions
            )

    # Find next active question in the module that hasn't been asked
    next_qb_item = db.query(domain.QuestionBank).filter(
        domain.QuestionBank.module_id == session.module_id,
        domain.QuestionBank.is_active == True,
        ~domain.QuestionBank.id.in_(asked_question_ids) if asked_question_ids else True
    ).order_by(domain.QuestionBank.id).first()

    # Get total active questions for this module
    total_questions = db.query(domain.QuestionBank).filter(
        domain.QuestionBank.module_id == session.module_id,
        domain.QuestionBank.is_active == True
    ).count()

    if not next_qb_item:
        return None # No more questions available

    # Record that this question is being asked
    question_order = len(asked_question_ids) + 1
    viva_question = domain.VivaQuestion(
        session_id=session.id,
        question_bank_id=next_qb_item.id,
        question_order=question_order
    )
    db.add(viva_question)
    db.commit()
    db.refresh(viva_question)

    return viva_schemas.NextQuestionResponse(
        viva_question_id=viva_question.id,
        text=next_qb_item.text,
        question_type=next_qb_item.question_type.value,
        is_last_question=(question_order >= total_questions),
        current_question_index=question_order,
        total_questions=total_questions
    )

def get_trainee(db: Session, trainee_id: int) -> domain.Trainee:
    return db.query(domain.Trainee).filter(domain.Trainee.id == trainee_id).first()

def submit_answer(db: Session, session_id: int, answer_data: viva_schemas.AnswerSubmit) -> bool:
    viva_question = db.query(domain.VivaQuestion).filter(
        domain.VivaQuestion.id == answer_data.viva_question_id,
        domain.VivaQuestion.session_id == session_id
    ).first()
    
    if viva_question:
        viva_question.answered_at = datetime.datetime.utcnow()
        viva_question.transcript = answer_data.transcript
        db.commit()
        return True
    return False

def get_session_summary(db: Session, session_id: int) -> viva_schemas.SessionSummaryResponse:
    session = db.query(domain.VivaSession).filter(domain.VivaSession.id == session_id).first()
    if not session:
        return None
        
    total_questions = db.query(domain.QuestionBank).filter(
        domain.QuestionBank.module_id == session.module_id,
        domain.QuestionBank.is_active == True
    ).count()
    
    answered_questions = [q for q in session.questions if q.answered_at is not None]
    questions_answered = len(answered_questions)
    
    last_answer_time = max([q.answered_at for q in answered_questions], default=session.start_time) if answered_questions else session.start_time
    
    if session.end_time is None and questions_answered > 0 and questions_answered == total_questions:
        session.end_time = last_answer_time
        session.status = domain.SessionStatus.COMPLETED
        db.commit()
        
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
    session = db.query(domain.VivaSession).filter(domain.VivaSession.id == session_id).first()
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
        db.add(db_eval)
        
    # Save Report
    db_report = domain.VivaReport(
        session_id=session.id,
        aggregate_score=eval_result.aggregate_score,
        ai_recommendation=eval_result.ai_recommendation,
        strengths=eval_result.strengths,
        areas_of_improvement=eval_result.areas_of_improvement
    )
    db.add(db_report)
    db.commit()
    return True

def get_session_report(db: Session, session_id: int) -> viva_schemas.SessionFullReportResponse:
    session = db.query(domain.VivaSession).filter(domain.VivaSession.id == session_id).first()
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
    sessions = db.query(domain.VivaSession).order_by(domain.VivaSession.start_time.desc()).all()
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
