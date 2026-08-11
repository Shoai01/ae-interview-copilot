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
