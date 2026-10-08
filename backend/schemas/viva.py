from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime
from models.domain import FraudFlagType

class SessionCreate(BaseModel):
    trainee_id: Optional[int] = None
    trainee_identifier: Optional[str] = None
    trainee_full_name: Optional[str] = None
    module_id: int
    duration_minutes: int = 15
    question_count: Optional[int] = None
    set_name: Optional[str] = None

class SessionResponse(BaseModel):
    id: int
    trainee_id: int
    module_id: int
    status: str
    module_name: str
    trainee_name: str
    duration_minutes: int
    total_questions: int
    max_marks: int = 20
    start_time: Optional[datetime] = None
    new_user_password: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class NextQuestionResponse(BaseModel):
    viva_question_id: int
    text: str
    is_last_question: bool
    current_question_index: int
    total_questions: int
    
    model_config = ConfigDict(from_attributes=True)

class TraineeResponse(BaseModel):
    id: int
    name: str

class DeepgramTokenResponse(BaseModel):
    access_token: str
    expires_in: int
    # Domain terms to boost in live captions (curated base + terms extracted
    # from the module's question bank), already trimmed to Deepgram's limits.
    keyterms: List[str] = []

class TTSRequest(BaseModel):
    text: str

class StatusResponse(BaseModel):
    status: str
    
    model_config = ConfigDict(from_attributes=True)

class AnswerSubmit(BaseModel):
    viva_question_id: int
    transcript: str

class EnhanceTranscriptResponse(BaseModel):
    transcript: str

    model_config = ConfigDict(from_attributes=True)

class FraudFlagCreate(BaseModel):
    viva_question_id: int
    # Enum-typed so an unknown flag type is rejected with a 422 at the API
    # boundary instead of raising ValueError (500) in the repository.
    flag_type: FraudFlagType
    # START opens a new episode of this flag type; END closes the most recent
    # open one. detected_at is the time of that start/end event.
    # EVENT records a single instant (no duration), e.g. background noise bursts.
    phase: Literal["START", "END", "EVENT"] = "START"
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
    final_score: Optional[float] = None
    ai_recommendation: Optional[str]
    strengths: Optional[str]
    areas_of_improvement: Optional[str]
    trainer_decision: Optional[str]
    trainer_notes: Optional[str] = None
    needs_review: bool = False
    reviewed_by_id: Optional[int] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SessionFullReportResponse(BaseModel):
    session: SessionResponse
    trainee: TraineeResponse
    summary: SessionSummaryResponse
    report: Optional[VivaReportResponse]
    questions: list[dict] # Will contain question text, transcript, audio_url, and evaluation
    
    model_config = ConfigDict(from_attributes=True)

class SessionListItem(BaseModel):
    id: int
    trainee_name: Optional[str] = None
    username: Optional[str] = None
    module_name: str
    ai_recommendation: Optional[str] = None
    trainer_decision: Optional[str] = None
    status: str
    date: str
    
    model_config = ConfigDict(from_attributes=True)

class TrainerDecisionRequest(BaseModel):
    decision: str  # PASS, FAIL, HOLD
    notes: Optional[str] = None
    final_score: Optional[float] = None

class BulkSessionTrainee(BaseModel):
    trainee_identifier: str
    trainee_full_name: str

class BulkSessionCreate(BaseModel):
    module_id: int
    duration_minutes: int = 15
    question_count: Optional[int] = None
    trainees: list[BulkSessionTrainee]

class BulkSessionResultItem(BaseModel):
    identifier: str
    full_name: str
    session_id: Optional[int] = None
    new_user_password: Optional[str] = None
    error: Optional[str] = None

class BulkSessionResponse(BaseModel):
    success_count: int
    failed_count: int
    results: list[BulkSessionResultItem]
