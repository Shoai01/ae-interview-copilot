from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from models.domain import QuestionType, DifficultyLevel

class ModuleResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class QuestionCreate(BaseModel):
    module_id: int
    text: str
    question_type: QuestionType
    difficulty: DifficultyLevel

class QuestionResponse(BaseModel):
    id: int
    module_id: int
    text: str
    question_type: QuestionType
    difficulty: DifficultyLevel
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)
