from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

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
def get_dashboard_metrics(module_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.get_dashboard_metrics(db, module_id=module_id)

@router.post("/users", response_model=user_schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: user_schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    # Only Admin can create Trainers. Trainer can create Trainees.
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create ADMIN accounts via API.")
    if current_user.role == UserRole.TRAINER and user.role != UserRole.TRAINEE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainers can only create Trainee accounts.")
        
    existing_user = user_service.get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
        
    created_user = user_service.create_user(db, user=user, created_by_id=current_user.id)
    
    # Send welcome email in the background (non-blocking)
    from services.email_service import send_welcome_email
    background_tasks.add_task(
        send_welcome_email,
        to_email=created_user.username,
        username=created_user.username,
        password=user.password,
        full_name=created_user.full_name
    )
    
    return created_user

@router.get("/users", response_model=List[user_schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return user_service.get_all_users(db, current_user.role)

@router.put("/users/{user_id}", response_model=user_schemas.UserResponse)
def update_user(user_id: int, user_update: user_schemas.UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    # Only Admin can update to TRAINER, Trainers can only update TRAINEE
    existing_user = user_service.get_user_by_id(db, user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_user.role == UserRole.TRAINER:
        if existing_user.role != UserRole.TRAINEE:
            raise HTTPException(status_code=403, detail="Trainers can only edit Trainee accounts.")
        if user_update.role and user_update.role != UserRole.TRAINEE:
            raise HTTPException(status_code=403, detail="Trainers cannot change role to Admin or Trainer.")
            
    updated_user = user_service.update_user(db, user_id, user_update, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    existing_user = user_service.get_user_by_id(db, user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_user.role == UserRole.TRAINER and existing_user.role != UserRole.TRAINEE:
        raise HTTPException(status_code=403, detail="Trainers can only delete Trainee accounts.")
        
    user_service.delete_user(db, user_id, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    return None

@router.get("/modules", response_model=List[admin_schemas.ModuleResponse])
def get_all_modules(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER, UserRole.TRAINEE]))):
    return admin_service.get_modules_with_counts(db)

@router.get("/questions", response_model=List[admin_schemas.QuestionResponse])
def get_questions(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.get_questions_by_module(db, module_id=module_id)

@router.post("/generate-set", response_model=List[admin_schemas.QuestionResponse])
def generate_ai_set(module_id: int, set_name: str, count: int = 15, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    from ai.question_gen import generate_dynamic_questions_for_session
    questions = generate_dynamic_questions_for_session(db, module_id, count=count, set_name=set_name)
    if not questions:
        raise HTTPException(status_code=400, detail="Could not generate questions. Make sure you have uploaded PDFs for this module.")
    return questions

@router.post("/questions/bulk", response_model=admin_schemas.BulkQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_questions_bulk(bulk_data: admin_schemas.BulkQuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.create_questions_bulk(db, bulk_data=bulk_data, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)

@router.post("/questions", response_model=admin_schemas.QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(question_data: admin_schemas.QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.create_question(db, question=question_data, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)

@router.put("/questions/{question_id}/toggle", response_model=admin_schemas.QuestionResponse)
def toggle_question_status(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    updated_question = admin_service.toggle_question_active_status(db, question_id=question_id, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated_question

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    try:
        success = admin_service.delete_question(db, question_id=question_id, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
        if not success:
            raise HTTPException(status_code=404, detail="Question not found")
        return None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/questions/{question_id}", response_model=admin_schemas.QuestionResponse)
def update_question(question_id: int, update_data: admin_schemas.QuestionUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    updated = admin_service.update_question(db, question_id, update_data, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated

@router.put("/modules/{module_id}/sets/{set_name}", status_code=status.HTTP_204_NO_CONTENT)
def rename_set(module_id: int, set_name: str, rename_data: admin_schemas.SetRename, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    admin_service.rename_set(db, module_id, set_name, rename_data.new_set_name, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    return None
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

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
def get_dashboard_metrics(module_id: Optional[int] = None, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.get_dashboard_metrics(db, module_id=module_id)

@router.post("/users", response_model=user_schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(user: user_schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    # Only Admin can create Trainers. Trainer can create Trainees.
    if user.role == UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create ADMIN accounts via API.")
    if current_user.role == UserRole.TRAINER and user.role != UserRole.TRAINEE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Trainers can only create Trainee accounts.")
        
    existing_user = user_service.get_user_by_username(db, user.username)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
        
    created_user = user_service.create_user(db, user=user, created_by_id=current_user.id)
    
    # Send welcome email in the background (non-blocking)
    from services.email_service import send_welcome_email
    background_tasks.add_task(
        send_welcome_email,
        to_email=created_user.username,
        username=created_user.username,
        password=user.password,
        full_name=created_user.full_name
    )
    
    return created_user

@router.get("/users", response_model=List[user_schemas.UserResponse])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return user_service.get_all_users(db, current_user.role)

@router.put("/users/{user_id}", response_model=user_schemas.UserResponse)
def update_user(user_id: int, user_update: user_schemas.UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    # Only Admin can update to TRAINER, Trainers can only update TRAINEE
    existing_user = user_service.get_user_by_id(db, user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_user.role == UserRole.TRAINER:
        if existing_user.role != UserRole.TRAINEE:
            raise HTTPException(status_code=403, detail="Trainers can only edit Trainee accounts.")
        if user_update.role and user_update.role != UserRole.TRAINEE:
            raise HTTPException(status_code=403, detail="Trainers cannot change role to Admin or Trainer.")
            
    updated_user = user_service.update_user(db, user_id, user_update, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    return updated_user

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    existing_user = user_service.get_user_by_id(db, user_id)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if current_user.role == UserRole.TRAINER and existing_user.role != UserRole.TRAINEE:
        raise HTTPException(status_code=403, detail="Trainers can only delete Trainee accounts.")
        
    user_service.delete_user(db, user_id, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    return None

@router.get("/modules", response_model=List[admin_schemas.ModuleResponse])
def get_all_modules(db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER, UserRole.TRAINEE]))):
    return admin_service.get_modules_with_counts(db)

@router.get("/modules/{module_id}/sets", response_model=List[admin_schemas.ModuleSetResponse])
def get_module_sets(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    from repositories.admin_repository import get_active_sets_with_counts_by_module
    return get_active_sets_with_counts_by_module(db, module_id)

@router.get("/questions", response_model=List[admin_schemas.QuestionResponse])
def get_questions(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.get_questions_by_module(db, module_id=module_id)

@router.post("/generate-set", response_model=List[admin_schemas.QuestionResponse])
def generate_ai_set(module_id: int, set_name: str, count: int = 15, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    from ai.question_gen import generate_dynamic_questions_for_session
    from services.audit_service import log_action
    from models.domain import AuditActionType
    
    with log_action(db, AuditActionType.AI_QUESTION_GENERATED, current_user.id, current_user.full_name or current_user.username) as log:
        questions = generate_dynamic_questions_for_session(db, module_id, count=count, set_name=set_name)
        if not questions:
            raise HTTPException(status_code=400, detail="Could not generate questions. Make sure you have uploaded PDFs for this module.")
        
        log['target'] = f"Set: {set_name} ({len(questions)} Qs)"
        log['details'] = {"module_id": module_id, "count": len(questions), "set_name": set_name}
        
    return questions

@router.post("/questions/bulk", response_model=admin_schemas.BulkQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_questions_bulk(bulk_data: admin_schemas.BulkQuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.create_questions_bulk(db, bulk_data=bulk_data, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)

@router.post("/questions", response_model=admin_schemas.QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(question_data: admin_schemas.QuestionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    return admin_service.create_question(db, question=question_data, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)

@router.put("/questions/{question_id}/toggle", response_model=admin_schemas.QuestionResponse)
def toggle_question_status(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    updated_question = admin_service.toggle_question_active_status(db, question_id=question_id, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated_question

@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(question_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    try:
        success = admin_service.delete_question(db, question_id=question_id, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
        if not success:
            raise HTTPException(status_code=404, detail="Question not found")
        return None
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/questions/{question_id}", response_model=admin_schemas.QuestionResponse)
def update_question(question_id: int, update_data: admin_schemas.QuestionUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    updated = admin_service.update_question(db, question_id, update_data, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    return updated

@router.put("/modules/{module_id}/sets/{set_name}", status_code=status.HTTP_204_NO_CONTENT)
def rename_set(module_id: int, set_name: str, rename_data: admin_schemas.SetRename, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    admin_service.rename_set(db, module_id, set_name, rename_data.new_set_name, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    return None

@router.delete("/modules/{module_id}/sets/{set_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(module_id: int, set_name: str, db: Session = Depends(get_db), current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))):
    admin_service.delete_set(db, module_id, set_name, actor_id=current_user.id, actor_name=current_user.full_name or current_user.username)
    return None

@router.post("/modules/{module_id}/upload-docs", response_model=admin_schemas.UploadDocsResponse)
async def upload_knowledge_document(
    module_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.TRAINER]))
):
    from services.audit_service import log_action
    from models.domain import AuditActionType
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    file_content = await file.read()
    
    try:
        with log_action(db, AuditActionType.DOCUMENT_UPLOADED, current_user.id, current_user.full_name or current_user.username) as log:
            chunks_created = knowledge_service.process_and_store_pdf(
                db=db, 
                module_id=module_id, 
                file_content=file_content, 
                source_filename=file.filename
            )
            log['target'] = f"Document: {file.filename}"
            log['details'] = {"module_id": module_id, "chunks": chunks_created}
            
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
    from services.audit_service import log_action
    from models.domain import AuditActionType
    
    doc = knowledge_service.get_knowledge_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    with log_action(db, AuditActionType.DOCUMENT_DELETED, current_user.id, current_user.full_name or current_user.username) as log:
        log['target'] = f"Document: {doc.filename}"
        log['details'] = {"module_id": doc.module_id}
        knowledge_service.delete_knowledge_document(db, doc)
    
    # Rebuild the FAISS index to reflect the deletion
    try:
        knowledge_service.rebuild_faiss_index(db)
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Even if rebuild fails, the doc is deleted from db. We log the error.
        
    return None

@router.get("/audit-logs", response_model=admin_schemas.AuditLogCursorPage)
def get_audit_logs(
    actor_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    action_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    cursor: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    from services.audit_service import get_audit_logs
    return get_audit_logs(
        db, actor_id=actor_id, category=category, action_type=action_type, 
        date_from=date_from, date_to=date_to, 
        cursor=cursor, limit=limit
    )
