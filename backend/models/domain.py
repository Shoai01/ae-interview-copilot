from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from core.database import Base

class UserRole(str, enum.Enum):
    TRAINEE = "TRAINEE"
    TRAINER = "TRAINER"
    ADMIN = "ADMIN"

class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class SessionStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    EXPIRED = "EXPIRED"

class FraudFlagType(str, enum.Enum):
    MULTIPLE_FACES = "MULTIPLE_FACES"
    NO_FACE = "NO_FACE"
    TAB_SWITCH = "TAB_SWITCH"
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT"

class AIRecommendationType(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    BORDERLINE = "BORDERLINE"

class TrainerDecisionType(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    HOLD = "HOLD"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    role = Column(SQLEnum(UserRole), nullable=False)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    employee_id = Column(String, nullable=True) # Relevant for trainers (AE Code)
    is_active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True) # Who provisioned this account
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", remote_side=[id], back_populates="created_users")
    created_users = relationship("User", back_populates="creator")
    sessions = relationship("VivaSession", back_populates="trainee", foreign_keys="VivaSession.trainee_id")
    reviewed_reports = relationship("VivaReport", back_populates="reviewer", foreign_keys="VivaReport.reviewed_by")


class TrainingModule(Base):
    __tablename__ = "training_modules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False) # Foundation | Intermediate | Developer
    description = Column(String, nullable=True)

    questions = relationship("QuestionBank", back_populates="module")
    sessions = relationship("VivaSession", back_populates="module")
    knowledge_docs = relationship("KnowledgeDocument", back_populates="module")

class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    filename = Column(String, nullable=False)
    extracted_text = Column(Text, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    module = relationship("TrainingModule", back_populates="knowledge_docs")

class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    text = Column(String, nullable=False)
    ideal_answer = Column(String, nullable=True)
    difficulty = Column(SQLEnum(DifficultyLevel), nullable=False)
    set_name = Column(String, nullable=True, default="Default Set")
    is_active = Column(Boolean, default=True)

    module = relationship("TrainingModule", back_populates="questions")
    viva_questions = relationship("VivaQuestion", back_populates="question_bank")

class VivaSession(Base):
    __tablename__ = "viva_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("users.id"), nullable=False) # Must be a user with role TRAINEE
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    duration_minutes = Column(Integer, default=15) # default session length
    question_count = Column(Integer, nullable=True) # Optional explicitly set question count
    set_name = Column(String, nullable=True) # Optional explicitly assigned set name
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(SQLEnum(SessionStatus), nullable=False, default=SessionStatus.IN_PROGRESS)

    trainee = relationship("User", back_populates="sessions", foreign_keys=[trainee_id])
    module = relationship("TrainingModule", back_populates="sessions")
    questions = relationship("VivaQuestion", back_populates="session")
    report = relationship("VivaReport", back_populates="session", uselist=False)

class VivaQuestion(Base):
    __tablename__ = "viva_questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("viva_sessions.id"), nullable=False)
    question_bank_id = Column(Integer, ForeignKey("question_bank.id"), nullable=False)
    question_order = Column(Integer, nullable=False) # sequence within the session
    transcript = Column(Text, nullable=True) # STT transcript
    audio_url = Column(String, nullable=True) # URL path to the uploaded audio file
    asked_at = Column(DateTime, default=datetime.utcnow)
    answered_at = Column(DateTime, nullable=True) # needed to compute response time

    session = relationship("VivaSession", back_populates="questions")
    question_bank = relationship("QuestionBank", back_populates="viva_questions")
    evaluation = relationship("Evaluation", back_populates="viva_question", uselist=False)
    fraud_flags = relationship("FraudFlag", back_populates="viva_question")

class Evaluation(Base):
    __tablename__ = "evaluations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    viva_question_id = Column(Integer, ForeignKey("viva_questions.id"), unique=True, nullable=False)
    score_communication = Column(Float, nullable=True)
    score_technical = Column(Float, nullable=True)
    score_confidence = Column(Float, nullable=True)
    ai_feedback = Column(Text, nullable=True)

    viva_question = relationship("VivaQuestion", back_populates="evaluation")

class FraudFlag(Base):
    __tablename__ = "fraud_flags"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    viva_question_id = Column(Integer, ForeignKey("viva_questions.id"), nullable=False)
    flag_type = Column(SQLEnum(FraudFlagType), nullable=False)
    count = Column(Integer, default=1, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow) # format as mm:ss only at display time

    viva_question = relationship("VivaQuestion", back_populates="fraud_flags")

class VivaReport(Base):
    __tablename__ = "viva_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("viva_sessions.id"), unique=True, nullable=False)
    aggregate_score = Column(Float, nullable=True)
    ai_recommendation = Column(SQLEnum(AIRecommendationType), nullable=True)
    strengths = Column(Text, nullable=True)
    areas_of_improvement = Column(Text, nullable=True)
    trainer_decision = Column(SQLEnum(TrainerDecisionType), nullable=True)
    trainer_notes = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True) # Trainer/Admin who made the call
    reviewed_at = Column(DateTime, nullable=True)

    session = relationship("VivaSession", back_populates="report")
    reviewer = relationship("User", back_populates="reviewed_reports", foreign_keys=[reviewed_by])

class AuditLogCategory(str, enum.Enum):
    USER_MANAGEMENT = "USER_MANAGEMENT"
    SESSION_TRAINING = "SESSION_TRAINING"
    QUESTION_BANK = "QUESTION_BANK"
    KNOWLEDGE_BASE = "KNOWLEDGE_BASE"

class AuditActionType(str, enum.Enum):
    USER_CREATED = "USER_CREATED"
    USER_UPDATED = "USER_UPDATED"
    USER_DELETED = "USER_DELETED"
    SESSION_ASSIGNED = "SESSION_ASSIGNED"
    BULK_SESSION_ASSIGNED = "BULK_SESSION_ASSIGNED"
    QUESTION_CREATED = "QUESTION_CREATED"
    BULK_QUESTION_UPLOAD = "BULK_QUESTION_UPLOAD"
    AI_QUESTION_GENERATED = "AI_QUESTION_GENERATED"
    QUESTION_UPDATED = "QUESTION_UPDATED"
    QUESTION_STATUS_TOGGLED = "QUESTION_STATUS_TOGGLED"
    TRAINER_DECISION_SUBMITTED = "TRAINER_DECISION_SUBMITTED"
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_DELETED = "DOCUMENT_DELETED"

from sqlalchemy import JSON, Index
from sqlalchemy.dialects.postgresql import JSONB

JSONType = JSON().with_variant(JSONB, 'postgresql')

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    actor_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    actor_name = Column(String, nullable=True) # Denormalized
    category = Column(SQLEnum(AuditLogCategory), nullable=False, index=True)
    action_type = Column(SQLEnum(AuditActionType), nullable=False)
    target = Column(String, nullable=True)
    details = Column(JSONType, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    actor = relationship("User")

    __table_args__ = (
        Index('ix_audit_logs_category', 'category'),
        Index('ix_audit_logs_actor_action', 'actor_id', 'action_type'),
    )

class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token = Column(String, unique=True, index=True, nullable=False)
    blacklisted_at = Column(DateTime, default=datetime.utcnow)
