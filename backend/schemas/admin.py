from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from models.domain import DifficultyLevel

class ModuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    max_questions_per_set: Optional[int] = None
    
    model_config = ConfigDict(from_attributes=True)

class ModuleSetResponse(BaseModel):
    name: str
    count: int

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

class BulkQuestionItem(BaseModel):
    text: str
    ideal_answer: Optional[str] = None
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    set_name: Optional[str] = "Default Set"

class BulkQuestionCreate(BaseModel):
    module_id: int
    questions: List[BulkQuestionItem]
    
class BulkQuestionResponse(BaseModel):
    message: str
    count: int

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
    ai_score: Optional[float] = None
    trainer_score: Optional[float] = None
    max_marks: Optional[int] = None
    status: str

class DashboardResponse(BaseModel):
    total_interviews: int
    total_passed: int
    total_failed: int
    avg_performance_score: float
    active_sessions: int
    completion_rate: float
    trends: list[TrendData]
    top_competencies: list[CompetencyData]
    recent_activity: list[RecentActivity]

from datetime import datetime
from typing import Any, Dict

class AuditLogResponse(BaseModel):
    id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    category: Optional[str] = None
    action_type: str
    target: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class AuditLogCursorPage(BaseModel):
    items: List[AuditLogResponse]
    next_cursor: Optional[str] = None

class LLMUsageLogResponse(BaseModel):
    id: int
    call_site: str
    model_name: str
    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    latency_ms: Optional[int] = None
    status: str
    error_message: Optional[str] = None
    session_id: Optional[int] = None
    module_id: Optional[int] = None
    user_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class LLMUsageLogCursorPage(BaseModel):
    items: List[LLMUsageLogResponse]
    next_cursor: Optional[str] = None

class LLMUsageCallSiteBreakdown(BaseModel):
    call_site: str
    calls: int
    input_tokens: int
    output_tokens: int

class LLMUsageModelBreakdown(BaseModel):
    model_name: str
    calls: int
    input_tokens: int
    output_tokens: int

class LLMUsageDailyPoint(BaseModel):
    date: str
    calls: int
    input_tokens: int
    output_tokens: int

class UserSiteBreakdown(BaseModel):
    call_site: str
    total_tokens: int

class LLMUsageUserBreakdown(BaseModel):
    user_id: Optional[int] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    calls: int
    input_tokens: int
    output_tokens: int
    total_tokens: int
    sites: List[UserSiteBreakdown] = []

class LLMUsageSummaryResponse(BaseModel):
    total_calls: int
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    avg_latency_ms: float
    error_count: int
    by_call_site: List[LLMUsageCallSiteBreakdown]
    by_model: List[LLMUsageModelBreakdown]
    daily: List[LLMUsageDailyPoint]
    by_user: List[LLMUsageUserBreakdown] = []
    by_user_total_users: int = 0
    total_system_users: int = 0
