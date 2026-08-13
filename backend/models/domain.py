from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import relationship
import enum
from datetime import datetime

from core.database import Base

class QuestionType(str, enum.Enum):
    VOICE = "VOICE"
    TEXT = "TEXT"

class DifficultyLevel(str, enum.Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"

class SessionStatus(str, enum.Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

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

class Trainee(Base):
    __tablename__ = "trainees"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    employee_id = Column(String, nullable=True) # nullable for now — stand-in field
    name = Column(String, nullable=True) # nullable for now

    sessions = relationship("VivaSession", back_populates="trainee")

class TrainingModule(Base):
    __tablename__ = "training_modules"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False) # Foundation | Intermediate | Developer
    description = Column(String, nullable=True)

    questions = relationship("QuestionBank", back_populates="module")
    sessions = relationship("VivaSession", back_populates="module")

class QuestionBank(Base):
    __tablename__ = "question_bank"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    text = Column(String, nullable=False)
    question_type = Column(SQLEnum(QuestionType), nullable=False)
    difficulty = Column(SQLEnum(DifficultyLevel), nullable=False)
    is_active = Column(Boolean, default=True)

    module = relationship("TrainingModule", back_populates="questions")
    viva_questions = relationship("VivaQuestion", back_populates="question_bank")

class VivaSession(Base):
    __tablename__ = "viva_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    trainee_id = Column(Integer, ForeignKey("trainees.id"), nullable=False)
    module_id = Column(Integer, ForeignKey("training_modules.id"), nullable=False)
    duration_minutes = Column(Integer, default=15) # default session length
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    status = Column(SQLEnum(SessionStatus), nullable=False, default=SessionStatus.IN_PROGRESS)

    trainee = relationship("Trainee", back_populates="sessions")
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
    audio_path = Column(String, nullable=True) # path to saved answer audio blob
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
    trainer_decision = Column(SQLEnum(TrainerDecisionType), nullable=True) # stays null until trainer review built

    session = relationship("VivaSession", back_populates="report")
