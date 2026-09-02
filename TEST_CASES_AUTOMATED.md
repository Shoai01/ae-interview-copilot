# Automated Test Cases — Backend pytest + Mocked Dependencies

> **These test cases will be implemented as automated pytest tests.**
> **Stack**: FastAPI TestClient + in-memory SQLite + mocked Gemini/Deepgram/SMTP
> **Total**: 85 test cases

---

## Setup Requirements

- Add `pytest`, `pytest-asyncio`, `httpx` to `requirements-dev.txt`
- `conftest.py` must set `SECRET_KEY` and `DATABASE_URL` before imports
- Mock Gemini via `backend/ai/base.py` (`get_chat_model`, `get_embeddings_model`)
- Mock SMTP by leaving `SMTP_HOST` unset (already self-mocking)
- Override FastAPI deps: `get_db`, `get_current_user`, `require_role`
- Disable rate limiter in test fixture

---

## 1. Authentication & Authorization (14 tests)

### TC-AUTH-001: Successful login with valid credentials
- **Endpoint**: `POST /auth/login`
- **Input**: `{"username": "admin", "password": "admin123"}`
- **Expected**: 200, response contains `access_token`, `role`, `must_change_password`; refresh cookie set

### TC-AUTH-002: Failed login with invalid password
- **Endpoint**: `POST /auth/login`
- **Input**: `{"username": "admin", "password": "wrong"}`
- **Expected**: 401 `{"detail": "Invalid credentials"}`

### TC-AUTH-003: Failed login with non-existent username
- **Endpoint**: `POST /auth/login`
- **Input**: `{"username": "nonexistent", "password": "pass"}`
- **Expected**: 401 `{"detail": "Invalid credentials"}`

### TC-AUTH-004: Rate limiting on login — 5 attempts per minute
- **Endpoint**: `POST /auth/login` × 6
- **Input**: 6 rapid requests with wrong password
- **Expected**: First 5 return 401, 6th returns 429

### TC-AUTH-008: Access token in Authorization header
- **Endpoint**: Any protected endpoint
- **Input**: `Authorization: Bearer <valid_token>`
- **Expected**: 200, request authenticated

### TC-AUTH-009: Missing Authorization header
- **Endpoint**: Any protected endpoint
- **Input**: No `Authorization` header
- **Expected**: 401

### TC-AUTH-010: Malformed / tampered JWT token
- **Endpoint**: Any protected endpoint
- **Input**: `Authorization: Bearer ey...tampered`
- **Expected**: 401

### TC-AUTH-011: Expired access token
- **Endpoint**: Any protected endpoint
- **Input**: Token with `exp` in the past
- **Expected**: 401

### TC-AUTH-012: Trainee cannot access admin endpoints
- **Endpoint**: `GET /admin/users`
- **Input**: Token with `role: "TRAINEE"`
- **Expected**: 403

### TC-AUTH-013: Trainer cannot create admin users
- **Endpoint**: `POST /admin/users` with `role: "ADMIN"`
- **Input**: Token with `role: "TRAINER"`
- **Expected**: 403

### TC-AUTH-015: Change password with mismatched new passwords
- **Endpoint**: `POST /auth/change-password`
- **Input**: `new_password: "abc"`, `confirm_password: "xyz"`
- **Expected**: 400 validation error

### TC-AUTH-016: Change password with wrong current password
- **Endpoint**: `POST /auth/change-password`
- **Input**: Wrong `current_password`
- **Expected**: 400 "Current password is incorrect"

### TC-AUTH-017: Logout clears refresh cookie
- **Endpoint**: `POST /auth/logout`
- **Input**: Valid session
- **Expected**: 200, refresh cookie cleared (max-age=0 or empty)

### EC-AUTH-E3: Default secret key raises on startup
- **Input**: `SECRET_KEY` unset or set to default sentinel
- **Expected**: `RuntimeError` raised at import time

---

## 2. User Management (8 tests)

### TC-USER-001: Admin creates a new trainee
- **Endpoint**: `POST /admin/users`
- **Input**: `{"username": "trainee1", "email": "t@test.com", "name": "Test", "role": "TRAINEE"}`
- **Expected**: 201, user in DB with `must_change_password: True`

### TC-USER-002: Admin creates a new trainer
- **Endpoint**: `POST /admin/users`
- **Input**: `{"username": "trainer1", "email": "tr@test.com", "name": "Trainer", "role": "TRAINER"}`
- **Expected**: 201

### TC-USER-003: Duplicate username rejection
- **Endpoint**: `POST /admin/users` × 2
- **Input**: Same `username` twice
- **Expected**: Second request returns 409 or 400

### TC-USER-004: Duplicate email rejection
- **Endpoint**: `POST /admin/users` × 2
- **Input**: Same `email` twice
- **Expected**: Second request returns 409 or 400

### TC-USER-005: Trainer can only view trainees
- **Endpoint**: `GET /admin/users`
- **Input**: Token with `role: "TRAINER"`
- **Expected**: Only TRAINEE users returned

### TC-USER-006: Trainer cannot delete another trainer
- **Endpoint**: `DELETE /admin/users/{trainer_id}`
- **Input**: Token with `role: "TRAINER"`, target is TRAINER
- **Expected**: 403

### TC-USER-009: List users with pagination
- **Endpoint**: `GET /admin/users?page=1&limit=10`
- **Input**: 25 users in DB
- **Expected**: 10 users returned, pagination metadata correct

### TC-USER-010: List users with search/filter
- **Endpoint**: `GET /admin/users?search=john`
- **Input**: Users with names "john", "jane", "johnny"
- **Expected**: Only "john" and "johnny" returned

---

## 3. Knowledge Base & Document Ingestion (7 tests)

### TC-KB-001: Upload a valid PDF
- **Endpoint**: `POST /admin/modules/{id}/upload-docs`
- **Input**: Valid 5-page PDF file
- **Expected**: 200, `KnowledgeDocument` row created, FAISS index updated

### TC-KB-003: Upload non-PDF file
- **Endpoint**: `POST /admin/modules/{id}/upload-docs`
- **Input**: `.txt` or `.docx` file
- **Expected**: 400 "Only PDF files are allowed"

### TC-KB-004: Upload empty PDF
- **Endpoint**: `POST /admin/modules/{id}/upload-docs`
- **Input**: Blank 0-page PDF
- **Expected**: 400 or graceful handling

### TC-KB-005: Upload corrupted PDF
- **Endpoint**: `POST /admin/modules/{id}/upload-docs`
- **Input**: Truncated/malformed PDF bytes
- **Expected**: 400 with error message, no crash

### TC-KB-009: List documents for a module
- **Endpoint**: `GET /admin/modules/{id}/documents`
- **Input**: Module with 3 uploaded docs
- **Expected**: 200, list of 3 documents with metadata

### TC-KB-010: Get document details
- **Endpoint**: `GET /admin/modules/{id}/documents/{doc_id}`
- **Input**: Valid doc ID
- **Expected**: 200, document metadata returned

### TC-KB-011: Delete document that doesn't exist
- **Endpoint**: `DELETE /admin/modules/{id}/documents/{nonexistent_id}`
- **Input**: Non-existent UUID
- **Expected**: 404

---

## 4. Question Bank & AI Generation (11 tests)

### TC-QB-001: Generate questions from knowledge base
- **Endpoint**: `POST /admin/generate-set`
- **Input**: `{"module_id": 1, "question_count": 10, "set_name": "Midterm"}`
- **Expected**: 200, 10 `QuestionBank` rows created with mixed difficulties

### TC-QB-002: Generated question validation
- **Logic**: Inspect generated questions
- **Expected**: Each ends with `?`, ≤25 words, no answer leakage in question text

### TC-QB-004: Generate with insufficient knowledge base
- **Endpoint**: `POST /admin/generate-set`
- **Input**: Module with 1 short document, request 20 questions
- **Expected**: Returns available questions with warning, or fewer than 20

### TC-QB-005: Generate with empty knowledge base
- **Endpoint**: `POST /admin/generate-set`
- **Input**: Module with 0 documents
- **Expected**: 400 error or predefined fallback questions

### TC-QB-006: Manual question creation
- **Endpoint**: `POST /admin/modules/{id}/questions`
- **Input**: `{"question_text": "What is X?", "difficulty": "EASY", "ideal_answer": "..."}`
- **Expected**: 201, question in bank

### TC-QB-007: Bulk question creation
- **Endpoint**: `POST /admin/modules/{id}/questions/bulk`
- **Input**: Array of 10 questions
- **Expected**: All 10 created; per-item errors for invalid entries

### TC-QB-008: Update a question
- **Endpoint**: `PUT /admin/modules/{id}/questions/{qid}`
- **Input**: Updated question text
- **Expected**: 200, question updated in DB

### TC-QB-009: Delete a question
- **Endpoint**: `DELETE /admin/modules/{id}/questions/{qid}`
- **Input**: Valid question ID
- **Expected**: 200, question removed

### TC-QB-010: Delete question referenced by past sessions
- **Endpoint**: `DELETE /admin/modules/{id}/questions/{qid}`
- **Input**: Question with existing `VivaQuestion` FK references
- **Expected**: 400 or soft-delete

### TC-QB-011: Toggle question active/inactive
- **Endpoint**: `PATCH /admin/modules/{id}/questions/{qid}/toggle`
- **Input**: Active question
- **Expected**: 200, `is_active` flipped

### TC-QB-013: Delete question set
- **Endpoint**: `DELETE /admin/modules/{id}/sets/{set_name}`
- **Input**: Valid set name
- **Expected**: 200, set and questions removed

---

## 5. Session Assignment (9 tests)

### TC-SES-001: Assign session to existing trainee
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: `{"trainee_email": "t@test.com", "module_id": 1, "set_name": "Midterm", "question_count": 10, "duration_minutes": 30}`
- **Expected**: 201, `VivaSession` row with status `PENDING`

### TC-SES-002: Assign session auto-creates trainee
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: `{"trainee_email": "new@test.com", "module_id": 1, ...}`
- **Expected**: 201, new `User` row created with `must_change_password: True`

### TC-SES-003: Duplicate active session rejection
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: Trainee with existing PENDING session
- **Expected**: 400 "Trainee already has an active session"

### TC-SES-004: Stale session auto-expiry (>24h)
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: Trainee with PENDING session created 25 hours ago
- **Expected**: Old session status → `EXPIRED`, new session created

### TC-SES-005: Bulk assignment via CSV
- **Endpoint**: `POST /viva/sessions/assign/bulk`
- **Input**: Array of 20 trainee entries
- **Expected**: 201, 20 sessions created

### TC-SES-006: Bulk assignment with mixed valid/invalid
- **Endpoint**: `POST /viva/sessions/assign/bulk`
- **Input**: 10 entries — 2 invalid emails, 1 duplicate, 7 valid
- **Expected**: 7 created, 3 per-item errors in response

### TC-SES-008: Assignment with nonexistent module
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: `module_id: 99999`
- **Expected**: 400 "Module not found" (or session with `module_name: "Unknown"`)

### TC-SES-011: Session with duration only
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: `duration_minutes: 15`, no `question_count`
- **Expected**: `question_count` computed as `15 // 3 = 5`

### TC-SES-012: Session with very short duration
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: `duration_minutes: 1`
- **Expected**: Minimum 5 questions enforced

---

## 6. Trainee Exam Flow — Backend Logic (5 tests)

### TC-EXAM-004: Answer a question with transcript
- **Endpoint**: `POST /viva/{session_id}/answer`
- **Input**: `{"transcript": "My answer is..."}`
- **Expected**: 200, `VivaQuestion.transcript` updated in DB

### TC-EXAM-006: Audio upload size limit (50MB)
- **Endpoint**: `POST /viva/{session_id}/answer/{qid}/audio`
- **Input**: File > 50MB
- **Expected**: 413 or 400

### TC-EXAM-007: Audio ownership verification
- **Endpoint**: `POST /viva/{session_id}/answer/{qid}/audio`
- **Input**: Trainee A uploading to Trainee B's session
- **Expected**: 403 Forbidden

### TC-EXAM-009: Submit empty answer
- **Endpoint**: `POST /viva/{session_id}/answer`
- **Input**: `{"transcript": ""}`
- **Expected**: 200, empty string saved (valid)

### EC-EXAM-E2: Self-heal generates questions for 0-question session
- **Endpoint**: `POST /viva/sessions/start`
- **Input**: Session with 0 materialized questions
- **Expected**: Questions generated on the fly, session transitions to IN_PROGRESS

---

## 7. AI Evaluation & Grading (9 tests)

### TC-EVAL-001: Evaluate completed session
- **Endpoint**: `POST /viva/{session_id}/evaluate`
- **Input**: COMPLETED session with all answers
- **Expected**: `Evaluation` rows + `VivaReport` created

### TC-EVAL-002: 3-axis scoring structure
- **Logic**: Inspect `Evaluation` rows after evaluation
- **Expected**: Each has `score` (0-10), `evaluation_criteria` dict, `feedback` text

### TC-EVAL-003: Aggregate score calculation
- **Logic**: Compute expected aggregate from per-question scores
- **Expected**: `aggregate_score` = mean of per-question averages, scaled to `max_marks`

### TC-EVAL-004: PASS/FAIL/BORDERLINE recommendation
- **Logic**: Inspect `VivaReport.ai_recommendation`
- **Expected**: One of PASS, FAIL, or BORDERLINE

### TC-EVAL-005: Evaluate with some unanswered questions
- **Input**: 10-question session, 7 answered, 3 empty transcripts
- **Expected**: Unanswered scored 0, evaluation proceeds, no crash

### TC-EVAL-006: Evaluate with ALL unanswered questions
- **Input**: 10-question session, 0 answers
- **Expected**: All scores 0, FAIL recommendation

### TC-EVAL-007: Re-evaluation is idempotent
- **Input**: Session that already has a `VivaReport`
- **Expected**: Returns existing report or overwrites (not duplicate)

### TC-EVAL-009: Gemini failure returns dummy fallback
- **Mock**: Gemini raises on all retries
- **Expected**: Dummy 5.0 score / BORDERLINE returned, no crash

### EC-EVAL-E5: final_score clamped to max_marks
- **Input**: Evaluation where aggregate > max_marks
- **Expected**: `final_score == max_marks` (clamped)

---

## 8. Trainer Review & Decision — Backend (6 tests)

### TC-REV-003: Override AI score
- **Endpoint**: `PUT /viva/{session_id}/decision`
- **Input**: `{"score_override": 8.5, "decision": "PASS"}`
- **Expected**: 200, `final_score` updated, audit log with old/new values

### TC-REV-004: Score override clamp — below zero
- **Endpoint**: `PUT /viva/{session_id}/decision`
- **Input**: `{"score_override": -5}`
- **Expected**: Clamped to 0

### TC-REV-005: Score override clamp — above max_marks
- **Endpoint**: `PUT /viva/{session_id}/decision`
- **Input**: `{"score_override": 999}`
- **Expected**: Clamped to `max_marks`

### TC-REV-006: Trainer adds review notes
- **Endpoint**: `PUT /viva/{session_id}/decision`
- **Input**: `{"trainer_notes": "Good performance", "decision": "PASS"}`
- **Expected**: 200, notes saved

### TC-REV-007: Trainer decision — PASS
- **Endpoint**: `PUT /viva/{session_id}/decision`
- **Input**: `{"decision": "PASS"}`
- **Expected**: 200, audit logged

### TC-REV-008: Trainer decision — FAIL
- **Endpoint**: `PUT /viva/{session_id}/decision`
- **Input**: `{"decision": "FAIL"}`
- **Expected**: 200, audit logged

---

## 9. Audit Logging (8 tests)

### TC-AUDIT-001: Login attempt logged
- **Endpoint**: `POST /auth/login`
- **Input**: Successful + failed login
- **Expected**: `AuditLog` rows with action `USER_LOGIN` / `USER_LOGIN_FAILED`

### TC-AUDIT-002: User creation logged
- **Endpoint**: `POST /admin/users`
- **Input**: Admin creates user
- **Expected**: `AuditLog` with action `USER_CREATED`, category `USER_MANAGEMENT`

### TC-AUDIT-004: Session assignment logged
- **Endpoint**: `POST /viva/sessions/assign`
- **Input**: Assign session
- **Expected**: `AuditLog` with action `SESSION_ASSIGNED`

### TC-AUDIT-007: Audit survives wrapped action failure
- **Logic**: Wrap failing action in audit context manager
- **Expected**: Audit row written even though action raised

### TC-AUDIT-008: Audit failure doesn't break request
- **Mock**: Audit write raises exception
- **Expected**: Original action completes, exception not propagated

### TC-AUDIT-009: Cursor pagination
- **Endpoint**: `GET /admin/audit-logs?page_size=10`
- **Input**: 25 audit logs in DB
- **Expected**: Page 1 returns 10, cursor valid, page 2 returns next 10

### TC-AUDIT-010: Filter by category
- **Endpoint**: `GET /admin/audit-logs?category=AUTH`
- **Input**: Mix of AUTH and SESSION logs
- **Expected**: Only AUTH logs returned

### TC-AUDIT-011: Filter by user
- **Endpoint**: `GET /admin/audit-logs?user_id=5`
- **Input**: Logs from multiple users
- **Expected**: Only user 5's logs returned

---

## 10. Email Notifications — Backend Logic (3 tests)

### TC-EMAIL-003: SMTP mock mode
- **Input**: `SMTP_HOST` unset
- **Expected**: Email functions return `True`, print to console, no crash

### TC-EMAIL-004: SMTP connection failure
- **Mock**: SMTP host unreachable
- **Expected**: Email send fails, error logged, session/user creation NOT blocked

### EC-EMAIL-E2: HTML injection in email templates
- **Input**: User name `<script>alert(1)</script>`
- **Expected**: HTML-escaped in email body, no XSS

---

## 11. Security — Backend Verifiable (3 tests)

### TC-SEC-008: SQL injection via search
- **Endpoint**: `GET /admin/users?search=' OR 1=1 --`
- **Input**: SQL injection payload
- **Expected**: No data leak, SQLAlchemy parameterized query handles it safely

### TC-SEC-009: CORS blocks cross-origin POST
- **Input**: `Origin: https://evil.com` on `POST /viva/{id}/answer`
- **Expected**: CORS preflight rejected

### EC-SES-E2: Timezone-aware timestamp doesn't crash
- **Input**: ISO timestamp with `+00:00`
- **Expected**: No `TypeError` on Postgres/SQLite column comparison

---

## 12. Health (2 tests)

### TC-HEALTH-001: Health endpoint returns OK
- **Endpoint**: `GET /health`
- **Expected**: 200 with DB connectivity confirmed

### TC-HEALTH-004: SQLite fallback works
- **Input**: No `DB_*` env vars set
- **Expected**: App starts, falls back to `viva_copilot.db`
