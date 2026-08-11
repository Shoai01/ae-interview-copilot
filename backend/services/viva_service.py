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
