from pydantic import BaseModel, ConfigDict
from typing import Optional

class SessionCreate(BaseModel):
    trainee_id: int
    module_id: int

class SessionResponse(BaseModel):
    id: int
    trainee_id: int
    module_id: int
    status: str
    
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
    
    model_config = ConfigDict(from_attributes=True)

class AnswerSubmit(BaseModel):
    viva_question_id: int
    transcript: str

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
    trainee_name: str
    employee_id: str
    module_name: str
    ai_recommendation: Optional[str]
    status: str
    date: str
    
    model_config = ConfigDict(from_attributes=True)
