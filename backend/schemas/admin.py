from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from models.domain import DifficultyLevel

class ModuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    max_questions_per_set: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class QuestionBankBase(BaseModel):
    module_id: int
    text: str
    ideal_answer: Optional[str] = None
    difficulty: DifficultyLevel
    set_name: Optional[str] = "Default Set"
    is_active: Optional[bool] = True

class QuestionCreate(BaseModel):
    module_id: int
    text: str
    ideal_answer: Optional[str] = None
    difficulty: DifficultyLevel
    set_name: Optional[str] = "Default Set"

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    ideal_answer: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    set_name: Optional[str] = None
    is_active: Optional[bool] = None

class SetRename(BaseModel):
    new_set_name: str

class QuestionResponse(BaseModel):
    id: int
    module_id: int
    text: str
    ideal_answer: Optional[str] = None
    difficulty: DifficultyLevel
    set_name: Optional[str] = None
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

from datetime import datetime

class KnowledgeDocumentResponse(BaseModel):
    id: int
    module_id: int
    filename: str
    uploaded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class KnowledgeDocumentDetailResponse(KnowledgeDocumentResponse):
    extracted_text: str

class UploadDocsResponse(BaseModel):
    message: str
    chunks_created: int

class TrendData(BaseModel):
    label: str
    average_score: float
    count: int

class CompetencyData(BaseModel):
    module_name: str
    average_score: float

class RecentActivity(BaseModel):
    session_id: int
    trainee_name: str
    trainee_initials: str
    module_name: str
    date: str
    score: Optional[float]
    status: str

class DashboardResponse(BaseModel):
    total_interviews: int
    avg_performance_score: float
    active_sessions: int
    completion_rate: float
    trends: list[TrendData]
    top_competencies: list[CompetencyData]
    recent_activity: list[RecentActivity]
