from sqlalchemy.orm import Session
from models import domain
from schemas import admin as admin_schemas
from typing import List

def get_modules(db: Session) -> List[domain.TrainingModule]:
    return db.query(domain.TrainingModule).all()

def get_questions_by_module(db: Session, module_id: int) -> List[domain.QuestionBank]:
    return db.query(domain.QuestionBank).filter(domain.QuestionBank.module_id == module_id).order_by(domain.QuestionBank.id.desc()).all()

def create_question(db: Session, question: admin_schemas.QuestionCreate) -> domain.QuestionBank:
    db_question = domain.QuestionBank(
        module_id=question.module_id,
        text=question.text,
        ideal_answer=question.ideal_answer,
        difficulty=question.difficulty,
        set_name=question.set_name,
        is_active=True
    )
    db.add(db_question)
    db.commit()
    db.refresh(db_question)
    return db_question

def get_question_by_id(db: Session, question_id: int) -> domain.QuestionBank:
    return db.query(domain.QuestionBank).filter(domain.QuestionBank.id == question_id).first()

def save_question(db: Session, question: domain.QuestionBank) -> domain.QuestionBank:
    db.commit()
    db.refresh(question)
    return question

from sqlalchemy.exc import IntegrityError

def delete_question(db: Session, question: domain.QuestionBank) -> None:
    try:
        db.delete(question)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise ValueError("Cannot delete this question because it is referenced in past interview sessions. Please deactivate it instead.")

def update_question(db: Session, question: domain.QuestionBank, update_data: dict) -> domain.QuestionBank:
    for key, value in update_data.items():
        if value is not None:
            setattr(question, key, value)
    db.commit()
    db.refresh(question)
    return question

def rename_set_questions(db: Session, module_id: int, old_set_name: str, new_set_name: str) -> None:
    # If old_set_name is "Default Set", we actually look for None or "Default Set" based on how it's stored.
    # We will assume it's stored exactly as passed, or None.
    query = db.query(domain.QuestionBank).filter(
        domain.QuestionBank.module_id == module_id
    )
    if old_set_name == "Default Set":
        query = query.filter((domain.QuestionBank.set_name == None) | (domain.QuestionBank.set_name == "Default Set"))
    else:
        query = query.filter(domain.QuestionBank.set_name == old_set_name)
    
    query.update({domain.QuestionBank.set_name: new_set_name}, synchronize_session=False)
    db.commit()

def delete_set_questions(db: Session, module_id: int, set_name: str) -> None:
    query = db.query(domain.QuestionBank).filter(
        domain.QuestionBank.module_id == module_id
    )
    if set_name == "Default Set":
        query = query.filter((domain.QuestionBank.set_name == None) | (domain.QuestionBank.set_name == "Default Set"))
    else:
        query = query.filter(domain.QuestionBank.set_name == set_name)
    
    questions = query.all()
    if not questions:
        return
        
    try:
        for q in questions:
            db.delete(q)
        db.commit()
    except IntegrityError:
        db.rollback()
        # Fallback to soft delete
        for q in questions:
            q.is_active = False
        db.commit()

from sqlalchemy import func, desc

def get_dashboard_metrics(db: Session, module_id: int = None) -> dict:
    session_query = db.query(domain.VivaSession)
    report_query = db.query(domain.VivaReport).join(domain.VivaSession, domain.VivaSession.id == domain.VivaReport.session_id)
    
    if module_id is not None:
        session_query = session_query.filter(domain.VivaSession.module_id == module_id)
        report_query = report_query.filter(domain.VivaSession.module_id == module_id)
        
    total_interviews = session_query.count()
    
    avg_score = report_query.with_entities(func.avg(domain.VivaReport.aggregate_score)).scalar()
    avg_performance_score = round(avg_score, 1) if avg_score else 0.0
    
    active_sessions = session_query.filter(domain.VivaSession.status == domain.SessionStatus.IN_PROGRESS).count()
    completed_sessions = session_query.filter(domain.VivaSession.status == domain.SessionStatus.COMPLETED).count()
    
    completion_rate = (completed_sessions / total_interviews * 100) if total_interviews > 0 else 0.0
    completion_rate = round(completion_rate, 1)
    
    from sqlalchemy import or_, and_
    total_passed = report_query.filter(
        or_(
            domain.VivaReport.trainer_decision == domain.TrainerDecisionType.PASS,
            and_(
                domain.VivaReport.trainer_decision == None,
                domain.VivaReport.ai_recommendation == domain.AIRecommendationType.PASS
            )
        )
    ).count()
    
    total_failed = report_query.filter(
        or_(
            domain.VivaReport.trainer_decision == domain.TrainerDecisionType.FAIL,
            and_(
                domain.VivaReport.trainer_decision == None,
                domain.VivaReport.ai_recommendation == domain.AIRecommendationType.FAIL
            )
        )
    ).count()
    
    completed_reports_query = db.query(domain.VivaSession.start_time, domain.VivaReport.aggregate_score)\
        .join(domain.VivaReport, domain.VivaSession.id == domain.VivaReport.session_id)\
        .filter(domain.VivaSession.status == domain.SessionStatus.COMPLETED)
        
    if module_id is not None:
        completed_reports_query = completed_reports_query.filter(domain.VivaSession.module_id == module_id)
        
    completed_reports = completed_reports_query.all()
        
    from collections import defaultdict
    trend_dict = defaultdict(list)
    for start_time, score in completed_reports:
        if start_time and score is not None:
            day_str = start_time.strftime("%b %d")
            trend_dict[day_str].append(score)
            
    trends = []
    for day_str, scores in list(trend_dict.items())[-7:]:
        trends.append({
            "label": day_str,
            "average_score": round(sum(scores) / len(scores), 1),
            "count": len(scores)
        })
        
    module_scores_query = db.query(
        domain.TrainingModule.name,
        func.avg(domain.VivaReport.aggregate_score).label("avg_score")
    )\
    .select_from(domain.VivaSession)\
    .join(domain.TrainingModule, domain.VivaSession.module_id == domain.TrainingModule.id)\
    .join(domain.VivaReport, domain.VivaSession.id == domain.VivaReport.session_id)
    
    if module_id is not None:
        module_scores_query = module_scores_query.filter(domain.VivaSession.module_id == module_id)
        
    module_scores = module_scores_query\
    .group_by(domain.TrainingModule.name)\
    .order_by(desc("avg_score"))\
    .limit(4).all()
    
    top_competencies = [
        {"module_name": m_name, "average_score": round(m_score, 1)}
        for m_name, m_score in module_scores if m_score is not None
    ]
    
    recent_sessions_query = db.query(
        domain.VivaSession,
        domain.User.full_name,
        domain.User.username,
        domain.TrainingModule.name.label("module_name"),
        domain.VivaReport.aggregate_score
    )\
    .join(domain.User, domain.VivaSession.trainee_id == domain.User.id)\
    .join(domain.TrainingModule, domain.VivaSession.module_id == domain.TrainingModule.id)\
    .outerjoin(domain.VivaReport, domain.VivaSession.id == domain.VivaReport.session_id)
    
    if module_id is not None:
        recent_sessions_query = recent_sessions_query.filter(domain.VivaSession.module_id == module_id)
        
    recent_sessions = recent_sessions_query\
    .order_by(domain.VivaSession.start_time.desc())\
    .limit(5).all()
    
    recent_activity = []
    for sess, f_name, u_name, m_name, score in recent_sessions:
        name = f_name or u_name
        initials = "".join([part[0] for part in name.split()[:2]]).upper() if name else "??"
        recent_activity.append({
            "session_id": sess.id,
            "trainee_name": name,
            "trainee_initials": initials,
            "module_name": m_name,
            "date": sess.start_time.strftime("%d %b, %Y") if sess.start_time else "N/A",
            "score": round(score, 1) if score is not None else None,
            "status": sess.status.value
        })
        
    return {
        "total_interviews": total_interviews,
        "total_passed": total_passed,
        "total_failed": total_failed,
        "avg_performance_score": avg_performance_score,
        "active_sessions": active_sessions,
        "completion_rate": completion_rate,
        "trends": trends,
        "top_competencies": top_competencies,
        "recent_activity": recent_activity
    }
