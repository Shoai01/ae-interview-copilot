from sqlalchemy.orm import Session
from models import domain
import datetime
from typing import List

def get_trainee_by_id(db: Session, trainee_id: int) -> domain.Trainee:
    return db.query(domain.Trainee).filter(domain.Trainee.id == trainee_id).first()

def create_trainee(db: Session, trainee_id: int, name: str) -> domain.Trainee:
    trainee = domain.Trainee(id=trainee_id, name=name)
    db.add(trainee)
    db.commit()
    db.refresh(trainee)
    return trainee

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

def create_fraud_flag(db: Session, viva_question_id: int, flag_type: str, detected_at) -> domain.FraudFlag:
    from models.domain import FraudFlagType
    
    # Check if a flag of this type already exists for this question
    existing_flag = db.query(domain.FraudFlag).filter(
        domain.FraudFlag.viva_question_id == viva_question_id,
        domain.FraudFlag.flag_type == FraudFlagType(flag_type)
    ).first()
    
    if existing_flag:
        existing_flag.count += 1
        existing_flag.detected_at = detected_at # Update to latest detection time
        db.commit()
        db.refresh(existing_flag)
        return existing_flag
        
    flag = domain.FraudFlag(
        viva_question_id=viva_question_id,
        flag_type=FraudFlagType(flag_type),
        count=1,
        detected_at=detected_at
    )
    db.add(flag)
    db.commit()
    db.refresh(flag)
    return flag
