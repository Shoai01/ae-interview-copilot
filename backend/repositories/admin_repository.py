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

def get_dashboard_metrics(db: Session) -> dict:
    total_interviews = db.query(domain.VivaSession).count()
    
    avg_score = db.query(func.avg(domain.VivaReport.aggregate_score)).scalar()
    avg_performance_score = round(avg_score, 1) if avg_score else 0.0
    
    active_sessions = db.query(domain.VivaSession).filter(domain.VivaSession.status == domain.SessionStatus.IN_PROGRESS).count()
    
    completed_sessions = db.query(domain.VivaSession).filter(domain.VivaSession.status == domain.SessionStatus.COMPLETED).count()
    completion_rate = (completed_sessions / total_interviews * 100) if total_interviews > 0 else 0.0
    completion_rate = round(completion_rate, 1)
    
    # Trends (mocking logic by grouping by day - SQLite compatible)
    # Actually, a simple grouping might be complex cross-DB. Let's return 7 days of dummy data for trends 
    # OR we can just query all completed sessions and group them manually in python
    completed_reports = db.query(domain.VivaSession.start_time, domain.VivaReport.aggregate_score)\
        .join(domain.VivaReport, domain.VivaSession.id == domain.VivaReport.session_id)\
        .filter(domain.VivaSession.status == domain.SessionStatus.COMPLETED).all()
        
    # Python-side aggregation for trends (safe for all DB dialects for small datasets)
    from collections import defaultdict
    trend_dict = defaultdict(list)
    for start_time, score in completed_reports:
        if start_time and score is not None:
            day_str = start_time.strftime("%b %d")
            trend_dict[day_str].append(score)
            
    trends = []
    # If no data, provide empty
    for day_str, scores in list(trend_dict.items())[-7:]: # last 7 entries
        trends.append({
            "label": day_str,
            "average_score": round(sum(scores) / len(scores), 1),
            "count": len(scores)
        })
        
    # Top Competencies
    module_scores = db.query(
        domain.TrainingModule.name,
        func.avg(domain.VivaReport.aggregate_score).label("avg_score")
    )\
    .select_from(domain.VivaSession)\
    .join(domain.TrainingModule, domain.VivaSession.module_id == domain.TrainingModule.id)\
    .join(domain.VivaReport, domain.VivaSession.id == domain.VivaReport.session_id)\
    .group_by(domain.TrainingModule.name)\
    .order_by(desc("avg_score"))\
    .limit(4).all()
    
    top_competencies = [
        {"module_name": m_name, "average_score": round(m_score, 1)}
        for m_name, m_score in module_scores if m_score is not None
    ]
    
    # Recent Activity
    recent_sessions = db.query(
        domain.VivaSession,
        domain.User.full_name,
        domain.User.username,
        domain.TrainingModule.name.label("module_name"),
        domain.VivaReport.aggregate_score
    )\
    .join(domain.User, domain.VivaSession.trainee_id == domain.User.id)\
    .join(domain.TrainingModule, domain.VivaSession.module_id == domain.TrainingModule.id)\
    .outerjoin(domain.VivaReport, domain.VivaSession.id == domain.VivaReport.session_id)\
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
            "date": sess.start_time.strftime("%b %d, %Y") if sess.start_time else "Unknown",
            "score": round(score, 1) if score is not None else None,
            "status": sess.status.value
        })
        
    return {
        "total_interviews": total_interviews,
        "avg_performance_score": avg_performance_score,
        "active_sessions": active_sessions,
        "completion_rate": completion_rate,
        "trends": trends,
        "top_competencies": top_competencies,
        "recent_activity": recent_activity
    }
