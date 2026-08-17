from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from schemas import admin as admin_schemas
from schemas import user as user_schemas
from services import admin_service, user_service, knowledge_service
from core.deps import require_role
from models.domain import UserRole, User
from models import domain

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

@router.get("/dashboard", response_model=admin_schemas.DashboardResponse)
def get_dashboard_metrics(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.get_dashboard_metrics(db)

@router.post("/users", response_model=user_schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: user_schemas.UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    # Only Admin can create Trainers. Trainer can create Trainees.
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create ADMIN accounts via API.")
    if current_user.role == UserRole.TRAINER and user.role != UserRole.TRAINEE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainers can only create Trainee accounts.")
        
    existing_user = user_service.get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
        
    return user_service.create_user(db, user=user, created_by_id=current_user.id)

@router.get("/users", response_model=List[user_schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return user_service.get_all_users(db, current_user.role)

@router.get("/modules", response_model=List[admin_schemas.ModuleResponse])
def get_all_modules(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER, UserRole.TRAINEE]))):
    return admin_service.get_modules(db)

@router.get("/questions", response_model=List[admin_schemas.QuestionResponse])
def get_questions(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN]))):
    return admin_service.get_questions_by_module(db, module_id=module_id)

@router.post("/questions", response_model=admin_schemas.QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(question: admin_schemas.QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN]))):
    return admin_service.create_question(db, question=question)

@router.put("/questions/{question_id}/toggle", response_model=admin_schemas.QuestionResponse)
def toggle_question_status(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN]))):
    updated_question = admin_service.toggle_question_active_status(db, question_id=question_id)
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated_question

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN]))):
    try:
        success = admin_service.delete_question(db, question_id=question_id)
        if not success:
            raise HTTPException(status_code=404, detail="Question not found")
        return None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/modules/{module_id}/upload-docs", response_model=admin_schemas.UploadDocsResponse)
async def upload_knowledge_document(
    module_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    file_content = await file.read()
    
    try:
        chunks_created = knowledge_service.process_and_store_pdf(
            db=db, 
            module_id=module_id, 
            file_content=file_content, 
            source_filename=file.filename
        )
        return admin_schemas.UploadDocsResponse(message=f"Successfully processed {file.filename}", chunks_created=chunks_created)
    except Exception as e:
        import traceback
        with open("upload_error.log", "w") as f:
            traceback.print_exc(file=f)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing document: {str(e)}")

@router.get("/modules/{module_id}/docs", response_model=List[admin_schemas.KnowledgeDocumentResponse])
def get_knowledge_documents(
    module_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))
):
    docs = knowledge_service.get_knowledge_documents(db, module_id)
    return docs

@router.get("/docs/{doc_id}", response_model=admin_schemas.KnowledgeDocumentDetailResponse)
def get_knowledge_document(
    doc_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))
):
    doc = knowledge_service.get_knowledge_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/docs/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_knowledge_document(
    doc_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))
):
    doc = knowledge_service.get_knowledge_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    knowledge_service.delete_knowledge_document(db, doc)
    
    # Rebuild the FAISS index to reflect the deletion
    try:
        knowledge_service.rebuild_faiss_index(db)
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Even if rebuild fails, the doc is deleted from db. We log the error.
        
    return None
