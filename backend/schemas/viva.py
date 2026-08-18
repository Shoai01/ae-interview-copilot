from pydantic import BaseModel, ConfigDict
from typing import Optional

class SessionCreate(BaseModel):
    trainee_id: int
    module_id: int
    duration_minutes: int = 15

class SessionResponse(BaseModel):
    id: int
    trainee_id: int
    module_id: int
    status: str
    module_name: str
    trainee_name: str
    duration_minutes: int
    total_questions: int
    
    model_config = ConfigDict(from_attributes=True)

class NextQuestionResponse(BaseModel):
    viva_question_id: int
    text: str
    question_type: str
    is_last_question: bool
    current_question_index: int
    total_questions: int
    
    model_config = ConfigDict(from_attributes=True)

class TraineeResponse(BaseModel):
    id: int
    name: str

class StatusResponse(BaseModel):
    status: str
    
    model_config = ConfigDict(from_attributes=True)

class AnswerSubmit(BaseModel):
    viva_question_id: int
    transcript: str

class FraudFlagCreate(BaseModel):
    viva_question_id: int
    flag_type: str
    detected_at: str

class SessionSummaryResponse(BaseModel):
    session_id: int
    duration_seconds: int
    questions_answered: int
    total_questions: int
    
    model_config = ConfigDict(from_attributes=True)

class EvaluationResponse(BaseModel):
    viva_question_id: int
    score_communication: Optional[float]
    score_technical: Optional[float]
    score_confidence: Optional[float]
    ai_feedback: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)

class VivaReportResponse(BaseModel):
    aggregate_score: Optional[float]
    ai_recommendation: Optional[str]
    strengths: Optional[str]
    areas_of_improvement: Optional[str]
    trainer_decision: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)

class SessionFullReportResponse(BaseModel):
    session: SessionResponse
    trainee: TraineeResponse
    summary: SessionSummaryResponse
    report: Optional[VivaReportResponse]
    questions: list[dict] # Will contain question text, transcript, and evaluation
    
    model_config = ConfigDict(from_attributes=True)

class SessionListItem(BaseModel):
    id: int
    trainee_name: Optional[str] = None
    employee_id: Optional[str] = None
    module_name: str
    ai_recommendation: Optional[str] = None
    status: str
    date: str
    
    model_config = ConfigDict(from_attributes=True)
