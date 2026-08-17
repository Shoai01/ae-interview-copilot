from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from models.domain import DifficultyLevel

class ModuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class QuestionCreate(BaseModel):
    module_id: int
    text: str
    difficulty: DifficultyLevel

class QuestionResponse(BaseModel):
    id: int
    module_id: int
    text: str
    difficulty: DifficultyLevel
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
