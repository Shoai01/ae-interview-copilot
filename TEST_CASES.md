# Viva Copilot — AI Voice Assessment System: Test Cases & Edge Cases

> **Generated**: 2026-09-02
> **System**: Viva Copilot — AutomationEdge internal platform for AI-graded oral exams
> **Stack**: React 19 / FastAPI / PostgreSQL / Gemini 2.5 Flash / Deepgram nova-2 / FAISS

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Management](#2-user-management)
3. [Knowledge Base & Document Ingestion](#3-knowledge-base--document-ingestion)
4. [Question Bank & AI Generation](#4-question-bank--ai-generation)
5. [Session Assignment](#5-session-assignment)
6. [Trainee Exam Flow](#6-trainee-exam-flow)
7. [Voice Recording & Speech-to-Text](#7-voice-recording--speech-to-text)
8. [Proctoring & Fraud Detection](#8-proctoring--fraud-detection)
9. [AI Evaluation & Grading](#9-ai-evaluation--grading)
10. [Trainer Review & Decision](#10-trainer-review--decision)
11. [Audit Logging](#11-audit-logging)
12. [Email Notifications](#12-email-notifications)
13. [Health & Infrastructure](#13-health--infrastructure)
14. [Frontend / UI Edge Cases](#14-frontend--ui-edge-cases)
15. [Security Edge Cases](#15-security-edge-cases)
16. [Performance & Scalability](#16-performance--scalability)

---

## 1. Authentication & Authorization

### TC-AUTH-001: Successful login with valid credentials
- **Steps**: POST `/auth/login` with correct `username` + `password`
- **Expected**: 200, access token in JSON body, refresh token set as `httponly` cookie, response includes `role` and `must_change_password`

### TC-AUTH-002: Failed login with invalid password
- **Steps**: POST `/auth/login` with valid username, wrong password
- **Expected**: 401 `{"detail": "Invalid credentials"}`

### TC-AUTH-003: Failed login with non-existent username
- **Steps**: POST `/auth/login` with unknown username
- **Expected**: 401 `{"detail": "Invalid credentials"}` (must not reveal which field was wrong)

### TC-AUTH-004: Rate limiting on login — 5 attempts per minute
- **Steps**: POST `/auth/login` 6 times in rapid succession with wrong password
- **Expected**: First 5 return 401, 6th returns 429 Too Many Requests

### TC-AUTH-005: Refresh token flow
- **Steps**: Login → wait for access token to age → call any authenticated endpoint → 401 → interceptor calls `POST /auth/refresh` → original request replays
- **Expected**: Seamless token refresh, user sees no interruption

### TC-AUTH-006: Refresh with expired refresh token
- **Steps**: Login → wait 7+ days (or manually expire cookie) → call authenticated endpoint
- **Expected**: 401 on refresh → user redirected to login

### TC-AUTH-007: Refresh with blacklisted / revoked refresh token
- **Steps**: Logout → attempt `POST /auth/refresh` with old cookie
- **Expected**: 401 (Note: current implementation does NOT blacklist — see edge case EC-AUTH-E1)

### TC-AUTH-008: Access token sent in Authorization header
- **Steps**: Include `Authorization: Bearer <token>` on request
- **Expected**: Request authenticated successfully

### TC-AUTH-009: Missing Authorization header
- **Steps**: Call any protected endpoint without `Authorization` header or cookie
- **Expected**: 401

### TC-AUTH-010: Malformed / tampered JWT token
- **Steps**: Modify one character in the JWT payload, send as Bearer token
- **Expected**: 401 Invalid token

### TC-AUTH-011: Expired access token
- **Steps**: Use an access token older than 30 minutes
- **Expected**: 401 → refresh interceptor fires → if refresh valid, replays; otherwise redirects to login

### TC-AUTH-012: Role-based access — trainee cannot access admin endpoints
- **Steps**: Login as TRAINEE → call `GET /admin/users` or `POST /admin/generate-set`
- **Expected**: 403 Forbidden

### TC-AUTH-013: Role-based access — trainer cannot create admin users
- **Steps**: Login as TRAINER → `POST /admin/users` with `role: "ADMIN"`
- **Expected**: 403 or validation error

### TC-AUTH-014: Force password change flow
- **Steps**: Login with `must_change_password: true` → attempt to navigate to any page
- **Expected**: `ProtectedRoute` redirects to `/change-password` → after changing, redirected to welcome check

### TC-AUTH-015: Change password with mismatched new passwords
- **Steps**: POST `/auth/change-password` with `new_password != confirm_password`
- **Expected**: 400 validation error

### TC-AUTH-016: Change password with current password wrong
- **Steps**: POST `/auth/change-password` with incorrect `current_password`
- **Expected**: 400 "Current password is incorrect"

### TC-AUTH-017: Logout clears refresh cookie
- **Steps**: Login → `POST /auth/logout` → attempt `POST /auth/refresh`
- **Expected**: 401 (cookie cleared)
- **Edge**: Access token remains valid until expiry (current limitation)

### TC-AUTH-018: Double login (already authenticated)
- **Steps**: Login → navigate to login page → login again
- **Expected**: Redirected to dashboard, new tokens issued, old session effectively replaced

---

### Edge Cases — Authentication

#### EC-AUTH-E1: Logout does not invalidate access token
- **Scenario**: User logs out, but still holds the access token in memory
- **Risk**: Token valid for up to 30 minutes post-logout
- **Current behavior**: `TokenBlacklist` model exists but is never referenced in logout logic
- **Mitigation needed**: Blacklist the JTI on logout, check blacklist in token verification

#### EC-AUTH-E2: Refresh endpoint has no rate limiting
- **Scenario**: Attacker calls `/auth/refresh` in a loop with a valid cookie
- **Risk**: Token refresh abuse, potential brute-force on token rotation
- **Mitigation needed**: Apply `slowapi` limit (e.g., 10/min) to `/auth/refresh`

#### EC-AUTH-E3: Default secret key in production
- **Scenario**: `SECRET_KEY` env var is unset
- **Risk**: Falls back to `"dev-secret-key-do-not-use-in-production"` — JWTs are forgeable
- **Mitigation needed**: Fail-fast on startup if `SECRET_KEY` is default/missing in non-dev

#### EC-AUTH-E4: Concurrent refresh token requests (race condition)
- **Scenario**: Multiple tabs or rapid 401s trigger parallel refresh calls
- **Risk**: Multiple new refresh tokens issued; only one `_retry` guard in interceptor
- **Mitigation needed**: Mutex or request deduplication for refresh calls

#### EC-AUTH-E5: Cookie not set when SameSite=None without Secure
- **Scenario**: HTTP (non-HTTPS) environment
- **Risk**: Refresh cookie silently rejected by browser in modern Chrome
- **Mitigation needed**: Document that `secure=True` requires HTTPS; add dev exception

---

## 2. User Management

### TC-USER-001: Admin creates a new trainee
- **Steps**: `POST /admin/users` with `role: "TRAINEE"`, valid email, name
- **Expected**: 201, user created with `must_change_password: true`, random password emailed

### TC-USER-002: Admin creates a new trainer
- **Steps**: `POST /admin/users` with `role: "TRAINER"`
- **Expected**: 201, trainer account created

### TC-USER-003: Duplicate username rejection
- **Steps**: Create user "john" → create another user "john"
- **Expected**: 409 or 400 conflict error

### TC-USER-004: Duplicate email rejection
- **Steps**: Create user with email "a@test.com" → create another with same email
- **Expected**: 409 or 400 conflict error

### TC-USER-005: Trainer can only view/manage trainees
- **Steps**: Login as TRAINER → list users → attempt to create trainer or admin
- **Expected**: Listed users filtered to TRAINEE only; creation of non-trainee returns 403

### TC-USER-006: Trainer cannot delete another trainer
- **Steps**: Login as TRAINER → `DELETE /admin/users/{trainer_id}`
- **Expected**: 403

### TC-USER-007: Admin updates user details
- **Steps**: `PUT /admin/users/{id}` with new name/email
- **Expected**: 200, user updated

### TC-USER-008: Delete user with active session
- **Steps**: Delete a trainee who has an IN_PROGRESS viva session
- **Expected**: Cascading behavior verified — session either deleted or orphaned (expected behavior documented)

### TC-USER-009: List users with pagination
- **Steps**: `GET /admin/users?page=1&limit=10` with 25 users
- **Expected**: Returns 10 users, pagination metadata correct

### TC-USER-010: List users with search/filter
- **Steps**: `GET /admin/users?search=john`
- **Expected**: Only matching users returned

---

### Edge Cases — User Management

#### EC-USER-E1: Self-deletion
- **Scenario**: Admin deletes their own account
- **Risk**: Locks out the only admin
- **Mitigation needed**: Prevent self-deletion or require another admin

#### EC-USER-E2: User with underscores, unicode, or very long names
- **Scenario**: Name field contains emoji, 200+ chars, SQL injection attempts
- **Risk**: Rendering issues, potential injection if not parameterized
- **Mitigation needed**: Pydantic validation on all name fields (max length, allowed chars)

#### EC-USER-E3: Provisioned user email is invalid
- **Scenario**: Bulk assignment with malformed email
- **Risk**: Welcome email bounces silently, user can't receive credentials
- **Mitigation needed**: Email format validation before user creation

---

## 3. Knowledge Base & Document Ingestion

### TC-KB-001: Upload a valid PDF
- **Steps**: `POST /admin/modules/{id}/upload-docs` with a 5-page PDF
- **Expected**: 200, document chunked, embedded into FAISS index, `KnowledgeDocument` row created

### TC-KB-002: Upload multiple PDFs
- **Steps**: Upload 3 PDFs to the same module
- **Expected**: All 3 processed, FAISS index rebuilt with all chunks

### TC-KB-003: Upload non-PDF file
- **Steps**: Upload a `.docx`, `.txt`, or `.png` file
- **Expected**: 400 "Only PDF files are allowed"

### TC-KB-004: Upload empty PDF (0 pages)
- **Steps**: Upload a blank PDF
- **Expected**: 400 "No text content found" or graceful handling

### TC-KB-005: Upload corrupted PDF
- **Steps**: Upload a truncated or malformed PDF file
- **Expected**: 400 with meaningful error, no crash

### TC-KB-006: Upload very large PDF (100+ pages)
- **Steps**: Upload a 200-page, 50MB PDF
- **Expected**: Processed within reasonable time, all chunks embedded, no OOM

### TC-KB-007: Upload PDF with no extractable text (scanned images)
- **Steps**: Upload a scanned-image-only PDF
- **Expected**: 400 or warning that no text was extracted

### TC-KB-008: Delete a document triggers FAISS rebuild
- **Steps**: Upload 2 docs → delete one → generate questions
- **Expected**: Only chunks from remaining doc are in the index

### TC-KB-009: List documents for a module
- **Steps**: `GET /admin/modules/{id}/documents`
- **Expected**: Returns all uploaded documents with metadata (filename, chunk count, upload date)

### TC-KB-010: Get document details
- **Steps**: `GET /admin/modules/{id}/documents/{doc_id}`
- **Expected**: Returns document metadata and chunk preview

### TC-KB-011: Delete document that doesn't exist
- **Steps**: `DELETE /admin/modules/{id}/documents/{nonexistent_id}`
- **Expected**: 404

---

### Edge Cases — Knowledge Base

#### EC-KB-E1: Module ID does not exist
- **Scenario**: Upload doc to `module_id = 99999`
- **Risk**: Session created pointing to non-existent module, `module_name: "Unknown"`
- **Mitigation needed**: Validate module exists before upload; 404 if not

#### EC-KB-E2: FAISS index corruption
- **Scenario**: Server crashes mid-index rebuild
- **Risk**: Partial/corrupt FAISS index on disk, all future queries fail
- **Mitigation needed**: Atomic index writes (write to temp, rename), index validation on load

#### EC-KB-E3: Concurrent document deletions
- **Scenario**: Two admins delete documents from the same module simultaneously
- **Risk**: Race condition on FAISS rebuild — index may reference deleted chunks
- **Mitigation needed**: Lock or serialise index rebuilds per module

#### EC-KB-E4: Very short / meaningless PDF content
- **Scenario**: PDF contains only "Page 1", "Page 2" (no substantive content)
- **Risk**: All chunks filtered out by `question_gen.py` quality heuristic (alphanumeric ratio, length)
- **Mitigation needed**: Warn user that document content is too sparse for question generation

#### EC-KB-E5: PDF with special encoding / non-Latin characters
- **Scenario**: PDF in Japanese, Arabic, or mixed encodings
- **Risk**: PyMuPDF extracts garbled text, embeddings are meaningless
- **Mitigation needed**: Detect language, warn if unsupported, or support multi-language

#### EC-KB-E6: Uploading the same document twice
- **Scenario**: Duplicate upload of identical PDF
- **Risk**: Duplicate chunks in FAISS index, duplicate questions generated
- **Mitigation needed**: Deduplicate by file hash or name+module combination

---

## 4. Question Bank & AI Generation

### TC-QB-001: Generate questions from knowledge base
- **Steps**: `POST /admin/generate-set` with `module_id`, `question_count: 10`, `set_name: "Midterm"`
- **Expected**: 10 questions generated with mixed difficulties (EASY/MEDIUM/HARD), saved to `QuestionBank`

### TC-QB-002: Generated question validation
- **Steps**: Generate 20 questions, inspect each
- **Expected**: Each ends with `?`, ≤25 words, no answer leakage, deduplicated (cosine similarity < 0.85)

### TC-QB-003: Difficulty distribution
- **Steps**: Generate 15 questions
- **Expected**: Roughly 5 EASY, 5 MEDIUM, 5 HARD (follows ladder pattern)

### TC-QB-004: Generate with insufficient knowledge base
- **Steps**: Module has only 1 short document → request 20 questions
- **Expected**: Fallback to available chunks + predefined questions, or graceful warning

### TC-QB-005: Generate with empty knowledge base
- **Steps**: Module has 0 documents → request questions
- **Expected**: 400 "No knowledge base content available" or predefined fallback

### TC-QB-006: Manual question creation
- **Steps**: `POST /admin/modules/{id}/questions` with question text, difficulty, ideal_answer
- **Expected**: 201, question added to bank

### TC-QB-007: Bulk question creation
- **Steps**: `POST /admin/modules/{id}/questions/bulk` with array of 10 questions
- **Expected**: All 10 created, per-item errors returned for any invalid entries

### TC-QB-008: Update a question
- **Steps**: `PUT /admin/modules/{id}/questions/{qid}` with new text
- **Expected**: 200, question updated

### TC-QB-009: Delete a question
- **Steps**: `DELETE /admin/modules/{id}/questions/{qid}`
- **Expected**: 200, question removed from bank

### TC-QB-010: Delete question referenced by past sessions
- **Steps**: Delete a question that has `VivaQuestion` rows pointing to it
- **Expected**: 400 "Cannot delete question referenced by existing sessions" or soft-delete

### TC-QB-011: Toggle question active/inactive
- **Steps**: `PATCH /admin/modules/{id}/questions/{qid}/toggle`
- **Expected**: Active status toggled; inactive questions excluded from session creation

### TC-QB-012: Rename question set
- **Steps**: `PUT /admin/modules/{id}/sets/{set_id}/rename` with new name
- **Expected**: 200, set renamed

### TC-QB-013: Delete question set
- **Steps**: `DELETE /admin/modules/{id}/sets/{set_id}`
- **Expected**: Set and its questions deleted (or soft-deleted if FK constraints prevent hard delete)

### TC-QB-014: Deduplication across generations
- **Steps**: Generate set A → generate set B from same module
- **Expected**: If cosine similarity > 0.85 on topic AND question embedding, existing `QuestionBank` row is reused

### TC-QB-015: Question generation retry resilience
- **Steps**: Mock Gemini to fail on 2 out of 3 attempts
- **Expected**: Tenacity retries, final result succeeds (or returns dummy BORDERLINE if all retries fail)

---

### Edge Cases — Question Bank

#### EC-QB-E1: Gemini returns questions failing validation
- **Scenario**: Model returns a statement (no `?`), or >25 words, or contains the ideal answer
- **Current behavior**: Filtered out, retry loop continues up to 10 times
- **Edge**: If all 10 retries produce invalid questions → fewer questions than requested
- **Mitigation**: Return whatever valid questions were generated with a warning

#### EC-QB-E2: Semantic dedup false positive
- **Scenario**: Two legitimately different questions about related topics have cosine similarity > 0.85
- **Risk**: Valid question silently dropped as duplicate
- **Mitigation**: Make threshold configurable, log dedup decisions

#### EC-QB-E3: AI generation mid-service-restart
- **Scenario**: Server restarts during a long question generation batch
- **Risk**: Partial set committed, FAISS index state inconsistent
- **Mitigation**: Transactional batch with rollback on failure

#### EC-QB-E4: Question set with zero active questions
- **Scenario**: All questions in a set are toggled off
- **Risk**: Session assigned with this set gets 0 questions → self-heal AI generates hardcoded count=5
- **Mitigation**: Warn trainer when deactivating last question in a set

#### EC-QB-E5: Extremely long question text
- **Scenario**: AI generates a 24-word question that barely passes validation
- **Risk**: Fits in DB but may be truncated in UI or cause layout issues
- **Mitigation**: UI should handle long questions gracefully (ellipsis, expandable)

---

## 5. Session Assignment

### TC-SES-001: Assign session to existing trainee
- **Steps**: `POST /viva/sessions/assign` with existing `trainee_email`, `module_id`, `set_name`, `question_count: 10`, `duration_minutes: 30`
- **Expected**: 201, `PENDING` session created, welcome + assignment emails queued

### TC-SES-002: Assign session auto-creates trainee
- **Steps**: Assign to email "new.user@test.com" (no existing account)
- **Expected**: Trainee account created with random 8-char password, `must_change_password: true`, credentials emailed

### TC-SES-003: Duplicate active session rejection
- **Steps**: Assign session to trainee with existing PENDING/IN_PROGRESS session
- **Expected**: 400 "Trainee already has an active session"

### TC-SES-004: Stale session auto-expiry
- **Steps**: Trainee has a PENDING session created >24 hours ago → assign new session
- **Expected**: Old session auto-expired, new session created successfully

### TC-SES-005: Bulk assignment via CSV
- **Steps**: `POST /viva/sessions/assign/bulk` with CSV paste of 20 trainees
- **Expected**: 20 sessions created (or per-item errors for duplicates/invalid entries)

### TC-SES-006: Bulk assignment with mixed valid/invalid entries
- **Steps**: Bulk assign 10 trainees, 2 with invalid emails, 1 duplicate
- **Expected**: 7 successful, 3 per-item error messages returned

### TC-SES-007: Bulk assignment — all failures
- **Steps**: All entries in bulk are invalid
- **Expected**: 400 with all error details, no sessions created

### TC-SES-008: Assignment with nonexistent module
- **Steps**: Assign session with `module_id: 99999`
- **Expected**: 400 "Module not found" (current: creates session with `module_name: "Unknown"`)

### TC-SES-009: Assignment with nonexistent question set
- **Steps**: Assign session with `set_name: "Nonexistent"`
- **Expected**: Fallback to random set selection, or explicit error

### TC-SES-010: Email delivery failure
- **Steps**: SMTP server unreachable during assignment
- **Expected**: Session still created, email failure logged but doesn't block the response

### TC-SES-011: Session with duration only (no question_count)
- **Steps**: Assign with `duration_minutes: 15`, no `question_count`
- **Expected**: `question_count = 15 // 3 = 5`

### TC-SES-012: Session with very short duration
- **Steps**: Assign with `duration_minutes: 1`
- **Expected**: Minimum 5 questions enforced (`max(question_count, duration // 3, 5)`)

### TC-SES-013: Session with very long duration
- **Steps**: Assign with `duration_minutes: 120`
- **Expected**: `question_count = 40`, all questions materialized

---

### Edge Cases — Session Assignment

#### EC-SES-E1: Bulk assignment drops `set_name`
- **Scenario**: Frontend sends `set_name` in bulk payload
- **Current behavior**: `BulkSessionCreate` schema has no `set_name` field → silently dropped
- **Mitigation**: Add `set_name` to `BulkSessionCreate` schema and forward to `assign_session`

#### EC-SES-E2: Timezone-naive vs timezone-aware timestamp mismatch
- **Scenario**: Client sends ISO timestamp with `+00:00` → parsed to timezone-aware datetime
- **Risk**: `TypeError` on Postgres `TIMESTAMP WITHOUT ZONE` column when comparing with `datetime.utcnow()` (naive)
- **Mitigation**: Standardize all timestamps to UTC-naive, or migrate to timezone-aware everywhere

#### EC-SES-E3: Email sent with plaintext password
- **Scenario**: Welcome email contains random 8-char password in HTML
- **Risk**: Password transit via email is inherently insecure
- **Mitigation**: Consider magic-link or one-time-password flow instead

---

## 6. Trainee Exam Flow

### TC-EXAM-001: Start exam — happy path
- **Steps**: Trainee logs in → passes welcome check → clicks "Start" → fullscreen → `POST /viva/sessions/start`
- **Expected**: Session transitions PENDING → IN_PROGRESS, questions materialized, first question returned

### TC-EXAM-002: Resume IN_PROGRESS session after page refresh
- **Steps**: Start exam → refresh browser → return to page
- **Expected**: `GET /viva/sessions/current` returns active session, resumes from last answered question

### TC-EXAM-003: Resume session — triple fallback
- **Steps**: Refresh page
- **Expected**: Recovery path: `location.state` → `sessionStorage` → `GET /viva/sessions/current` → `getUserMedia` re-acquisition

### TC-EXAM-004: Answer a question with transcript
- **Steps**: Complete voice recording → click "Next" → `POST /viva/{id}/answer` with transcript text
- **Expected**: 200, `VivaQuestion` record updated with transcript

### TC-EXAM-005: Upload audio for an answer
- **Steps**: After answer submission → `POST /viva/{id}/answer/{qid}/audio` with WebM blob
- **Expected**: 200, audio saved to `uploads/audio/{uuid}.webm`

### TC-EXAM-006: Audio upload size limit (50MB)
- **Steps**: Upload audio file >50MB
- **Expected**: 413 Payload Too Large

### TC-EXAM-007: Audio ownership verification
- **Steps**: Trainee A tries to upload audio for Trainee B's session
- **Expected**: 403 Forbidden (verified by `trainee_id == current_user.id` check)

### TC-EXAM-008: Auto-submit on countdown expiry
- **Steps**: Timer reaches 0:00
- **Expected**: `handleAutoSubmit` fires → all answered questions saved → evaluation triggered → redirected to completion page

### TC-EXAM-009: Submit empty answer (no transcript)
- **Steps**: Skip recording → click "Next" with no transcript
- **Expected**: Empty string saved (valid — trainee may choose not to answer)

### TC-EXAM-010: Navigate to next question
- **Steps**: Click "Next" after answering
- **Expected**: `POST /viva/{id}/next-question` → next unanswered question returned with TTS

### TC-EXAM-011: All questions answered
- **Steps**: Answer the last question → click "Next"
- **Expected**: No more questions → evaluation triggered → redirect to `VivaComplete`

### TC-EXAM-012: TTS reads question aloud
- **Steps**: New question loads
- **Expected**: Browser `speechSynthesis` speaks the question text

### TC-EXAM-013: TTS disabled or unavailable
- **Steps**: `window.speechSynthesis` is undefined (old browser) or voices not loaded
- **Expected**: Question text displayed normally, no crash, skip TTS silently

### TC-EXAM-014: Session state preservation across tabs
- **Steps**: Open session in Tab A → open same URL in Tab B
- **Expected**: Only one active exam; second tab shows existing session or warning

---

### Edge Cases — Exam Flow

#### EC-EXAM-E1: `beforeunload` guard behavior
- **Scenario**: Trainee accidentally closes tab mid-exam
- **Expected**: Browser shows "Leave site?" prompt; draft saved to `sessionStorage`

#### EC-EXAM-E2: Session stuck with 0 questions (self-heal)
- **Scenario**: `resolve_or_create_session` is called on a session where materialization failed
- **Current behavior**: AI-generates 5 questions on the spot (hardcoded `count=5`, ignores `question_count`)
- **Mitigation**: Use session's actual `question_count` instead of hardcoded 5

#### EC-EXAM-E3: Exam started but no questions in assigned set
- **Scenario**: All questions in assigned set are inactive
- **Risk**: Falls back to random set selection; if ALL sets have 0 active questions, self-heal generates 5 hardcoded
- **Mitigation**: Validate at assignment time that the set has enough active questions

#### EC-EXAM-E4: Session materialization races with question generation
- **Scenario**: Two concurrent calls to `resolve_or_create_session` for the same session
- **Risk**: Duplicate question rows created
- **Mitigation**: Database-level unique constraint or application lock

#### EC-EXAM-E5: Computer sleep/resume during exam
- **Scenario**: Laptop lid closed → reopened 2 hours later
- **Risk**: Countdown expired silently, audio/WebSocket connections dead, but UI may still show questions
- **Mitigation**: Check server-side session status on wake; auto-submit if expired

#### EC-EXAM-E6: Network drops mid-answer
- **Steps**: Start recording → disconnect WiFi → click "Next"
- **Expected**: Answer submission fails → retry with exponential backoff → local draft preserved in sessionStorage

#### EC-EXAM-E7: Trainee tries to go back to previous question
- **Steps**: After clicking "Next", attempt browser back button
- **Expected**: Not supported — question order is sequential, no backward navigation

#### EC-EXAM-E8: Double-submit "Next" button
- **Steps**: Rapid double-click on "Next"
- **Risk**: Answer submitted twice, or race condition on question transition
- **Mitigation**: Disable button after first click, debounce submission

---

## 7. Voice Recording & Speech-to-Text

### TC-VOICE-001: Start recording — Deepgram WebSocket connects
- **Steps**: Click mic button to start recording
- **Expected**: WebSocket to `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&interim_results=true&endpointing=300` opens, MediaRecorder starts

### TC-VOICE-002: Interim results displayed live
- **Steps**: Speak during recording
- **Expected**: Partial transcripts appear in real-time in the editable text field

### TC-VOICE-003: Final transcript on stop
- **Steps**: Click "Stop" or "Next"
- **Expected**: Final Deepgram transcript received, committed to answer field

### TC-VOICE-004: MediaRecorder captures audio independently
- **Steps**: Start recording
- **Expected**: MediaRecorder captures WebM chunks at 250ms intervals, independent of Deepgram stream

### TC-VOICE-005: Audio blob assembled on stop
- **Steps**: Stop recording after 30 seconds
- **Expected**: Complete WebM blob assembled from cached chunks + header replay

### TC-VOICE-006: Pause/resume mid-answer
- **Steps**: Start recording → stop → start again (same question)
- **Expected**: Deepgram reconnects, MediaRecorder caches first chunk as header and replays it for continuity

### TC-VOICE-007: Deepgram API key authentication
- **Steps**: Check WebSocket connection handshake
- **Expected**: API key passed as `Authorization: Token <key>` via WS subprotocol

### TC-VOICE-008: Deepgram connection failure
- **Steps**: Invalid API key or Deepgram service down
- **Expected**: WebSocket error → fallback to local-only recording → transcript shows "[Speech recognition unavailable]"

### TC-VOICE-009: Microphone permission denied
- **Steps**: Browser denies `getUserMedia` for microphone
- **Expected**: Welcome check fails → clear error message "Microphone access required" → cannot start exam

### TC-VOICE-010: No microphone hardware
- **Steps**: Machine with no audio input device
- **Expected**: `getUserMedia` fails → welcome check catches this before exam start

### TC-VOICE-011: Microphone disconnected mid-recording
- **Steps**: Unplug USB mic while recording
- **Expected**: MediaRecorder `onerror` or `onstop` fires → partial audio saved → graceful degradation

### TC-VOICE-012: Transcript editing by trainee
- **Steps**: After recording, edit the transcript text
- **Expected**: Edited version submitted (transcript field is editable by design)

### TC-VOICE-013: Transcript paste/copy/cut/drop blocked
- **Steps**: Attempt to paste external text into transcript field
- **Expected**: Blocked by event handlers (anti-cheating measure)

### TC-VOICE-014: Very long recording (10+ minutes of continuous speech)
- **Steps**: Record continuously for 10 minutes
- **Expected**: Deepgram streams without timeout, MediaRecorder chunks don't accumulate unbounded memory, blob assembled correctly

### TC-VOICE-015: Silence — no speech detected
- **Steps**: Start recording, remain silent for 30 seconds
- **Expected**: Deepgram returns no speech, empty transcript, no error

---

### Edge Cases — Voice Recording

#### EC-VOICE-E1: Deepgram `endpointing` latency
- **Scenario**: Trainee pauses mid-sentence for >300ms
- **Risk**: Deepgram prematurely finalizes transcript, splits one sentence into two segments
- **Mitigation**: Tune `endpointing` parameter, client-side stitching of rapid successive finals

#### EC-VOICE-E2: Multiple browser tabs with mic access
- **Scenario**: Trainee opens exam in two tabs, both request `getUserMedia`
- **Risk**: Second tab gets mic stream but first tab's stream may be throttled or shared
- **Mitigation**: Detect existing stream in `store.js`, reuse instead of re-requesting

#### EC-VOICE-E3: Stale MediaRecorder guard fires incorrectly
- **Scenario**: Rapid start/stop/start creates multiple MediaRecorder instances
- **Current behavior**: Stale-recorder guard (`if (mediaRecorderRef.current !== mediaRecorder) return`) prevents cross-contamination
- **Edge**: If guard fires, audio chunks are silently dropped — no error surfaced to user

#### EC-VOICE-E4: WebM container without proper headers
- **Scenario**: First chunk is corrupted or missing
- **Risk**: Assembled blob is unplayable, audio upload succeeds but playback fails in trainer review
- **Mitigation**: Validate blob integrity before upload, add error feedback

#### EC-VOICE-E5: Deepgram returns empty/whitespace-only transcript
- **Scenario**: Background noise without speech
- **Risk**: Answer saved as whitespace string, treated as "answered" (not skipped)
- **Mitigation**: Trim whitespace; if empty after trim, treat as unanswered

---

## 8. Proctoring & Fraud Detection

### TC-FRAUD-001: Multiple faces detected
- **Steps**: Position 2 people in camera frame during exam
- **Expected**: `MULTIPLE_FACES` flag posted → server deduplicates, increments `count`

### TC-FRAUD-002: No face detected
- **Steps**: Cover camera or look away for extended period
- **Expected**: `NO_FACE` flag posted

### TC-FRAUD-003: Tab switch detected
- **Steps**: Alt+Tab to another application
- **Expected**: `TAB_SWITCH` flag posted

### TC-FRAUD-004: Fullscreen exit detected
- **Steps**: Press Escape to exit fullscreen
- **Expected**: `FULLSCREEN_EXIT` flag posted

### TC-FRAUD-005: Background noise detected
- **Steps**: Play loud music near microphone
- **Expected**: Web Audio API RMS > 0.03 for 2.5s → `BACKGROUND_NOISE` flag posted (after 30s cooldown)

### TC-FRAUD-006: Multiple simultaneous fraud types
- **Steps**: Tab switch + cover camera at same time
- **Expected**: Both flags posted independently, each with `count: 1`

### TC-FRAUD-007: Same fraud type repeated — deduplication
- **Steps**: Tab switch 5 times in 10 seconds
- **Expected**: Single `TAB_SWITCH` row with `count: 5` (not 5 separate rows)

### TC-FRAUD-008: Fraud flag does NOT affect AI score
- **Steps**: Exam with 10 fraud flags → evaluate
- **Expected**: AI evaluation explicitly told to not penalize for fraud; score reflects only answer quality

### TC-FRAUD-009: Fraud flags visible to trainer
- **Steps**: Open trainer review page for session with flags
- **Expected**: All fraud flags displayed with type, count, and timestamps

### TC-FRAUD-010: Face detection model load failure
- **Steps**: `public/models/` directory missing or corrupted
- **Expected**: `import()` of face-api.js fails gracefully → proctoring disabled → exam continues without face checks

### TC-FRAUD-011: Noise detection cooldown
- **Steps**: Background noise detected → noise stops → noise starts again within 30s
- **Expected**: Only one `BACKGROUND_NOISE` flag per 30-second window

---

### Edge Cases — Proctoring

#### EC-FRAUD-E1: Silent failure on fraud report (by design)
- **Scenario**: `POST /viva/{id}/fraud-flag` fails (network error, server error)
- **Current behavior**: Intentionally silent — `api.js:227` catches and ignores errors
- **Risk**: Fraud events are lost without any trace
- **Mitigation**: Buffer failed fraud reports client-side, retry with backoff

#### EC-FRAUD-E2: face-api.js is 40+ MB of WASM
- **Scenario**: Slow network or mobile device
- **Risk**: Lazy `import()` delays exam start, or OOM on low-memory devices
- **Mitigation**: Set time limit for model load, allow exam to start without face detection

#### EC-FRAUD-E3: Camera permission revoked mid-exam
- **Scenario**: User revokes camera permission in browser settings during exam
- **Risk**: Face detection stops silently, `NO_FACE` flags accumulate
- **Mitigation**: Detect stream track `ended` event, notify user, pause proctoring gracefully

#### EC-FRAUD-E4: Noise detection RMS threshold tuning
- **Scenario**: Quiet office AC hum triggers false positives
- **Risk**: Legitimate `BACKGROUND_NOISE` flags when environment is slightly noisy
- **Mitigation**: Make threshold configurable per session or per environment

#### EC-FRAUD-E5: face-api.js false positive on shadows/artifacts
- **Scenario**: Changing lighting conditions cause false `MULTIPLE_FACES` detections
- **Risk**: Unfair fraud flagging
- **Mitigation**: Require sustained detection (e.g., 3+ consecutive checks) before flagging

---

## 9. AI Evaluation & Grading

### TC-EVAL-001: Evaluate completed session
- **Steps**: `POST /viva/{id}/evaluate` on COMPLETED session with all answers
- **Expected**: Per-question `Evaluation` rows created (3-axis scores + feedback), `VivaReport` generated

### TC-EVAL-002: 3-axis scoring
- **Steps**: Evaluate session → inspect individual evaluations
- **Expected**: Each evaluation has `score` (0-10), `evaluation_criteria` breakdown, `feedback`

### TC-EVAL-003: Aggregate score calculation
- **Steps**: Session with 5 questions, each scored differently
- **Expected**: `aggregate_score` = mean of per-question average scores, scaled to `session.max_marks`

### TC-EVAL-004: PASS/FAIL/BORDERLINE recommendation
- **Steps**: Evaluate session
- **Expected**: `VivaReport` includes `ai_recommendation` (PASS, FAIL, or BORDERLINE)

### TC-EVAL-005: Evaluate session with some unanswered questions
- **Steps**: 10-question session, only 7 answered
- **Expected**: Unanswered questions scored 0, overall evaluation proceeds

### TC-EVAL-006: Evaluate session with ALL unanswered questions
- **Steps**: 10-question session, 0 answers
- **Expected**: All scores 0, FAIL recommendation, no crash

### TC-EVAL-007: Re-evaluation of already-evaluated session
- **Steps**: Evaluate a session that already has a `VivaReport`
- **Expected**: Idempotent — returns existing report, or re-generates and overwrites

### TC-EVAL-008: Evaluate session from get_session_report (lazy evaluation)
- **Steps**: Call `GET /viva/{id}/report` on COMPLETED session without a report
- **Expected**: Report is lazily auto-generated before being returned

### TC-EVAL-009: Gemini service failure — fallback evaluation
- **Steps**: Mock Gemini to return errors on all 3 tenacity retries
- **Expected**: Dummy 5.0 score / BORDERLINE result returned instead of crashing

### TC-EVAL-010: Evaluation includes fraud flag context
- **Steps**: Evaluate session with fraud flags → inspect the Gemini prompt
- **Expected**: Fraud flags passed to model but model instructed to NOT penalize score for them

### TC-EVAL-011: Get session summary
- **Steps**: `GET /viva/{id}/summary`
- **Expected**: Returns session-level summary with aggregate scores, recommendation, question count

### TC-EVAL-012: Get session report
- **Steps**: `GET /viva/{id}/report`
- **Expected**: Full report with per-question evaluations, scores, feedback, fraud summary

---

### Edge Cases — AI Evaluation

#### EC-EVAL-E1: Gemini structured output schema mismatch
- **Scenario**: Gemini returns JSON that doesn't match `response_schema`
- **Risk**: Pydantic validation fails, evaluation crashes
- **Mitigation**: Validate Gemini output schema, retry on parse failure

#### EC-EVAL-E2: Evaluation on very long transcripts
- **Scenario**: Trainee wrote 2000+ words per answer across 20 questions
- **Risk**: Exceeds Gemini context window or token limits
- **Mitigation**: Truncate or summarize long inputs before sending to model

#### EC-EVAL-E3: Evaluation cost accumulation
- **Scenario**: 100 trainees × 20 questions each = 2000 Gemini calls
- **Risk**: Significant API cost, potential quota exhaustion
- **Mitigation**: Track token usage, implement quotas or batching

#### EC-EVAL-E4: Race condition — evaluate called twice simultaneously
- **Scenario**: Frontend fire-and-forget triggers, user clicks "evaluate" twice
- **Risk**: Two concurrent Gemini calls, duplicate `Evaluation` rows
- **Mitigation**: Lock session during evaluation, idempotent upsert

#### EC-EVAL-E5: `final_score` exceeds `max_marks`
- **Scenario**: `aggregate_score` calculation produces a value > `max_marks`
- **Current behavior**: Should be clamped, but verify
- **Mitigation**: Server-side clamp: `min(final_score, max_marks)`

#### EC-EVAL-E6: Evaluation with non-English transcripts
- **Scenario**: Trainee answered in Hindi/Chinese mixed with English
- **Risk**: Gemini may score inconsistently across languages
- **Mitigation**: Document supported languages, potentially add language detection

---

## 10. Trainer Review & Decision

### TC-REV-001: View session review page
- **Steps**: Trainer navigates to `TrainerReviewDetail` for a completed session
- **Expected**: Transcripts, audio playback, per-question scores/feedback, fraud flags displayed

### TC-REV-002: Audio playback in review
- **Steps**: Click play on audio player for a question
- **Expected**: Custom audio player plays the WebM file from `uploads/audio/`

### TC-REV-003: Override AI score
- **Steps**: Change score in override field → submit
- **Expected**: `PUT /viva/{id}/decision` → score clamped to 0..max_marks, old/new values audit-logged

### TC-REV-004: Score override clamp — below zero
- **Steps**: Enter score of -5
- **Expected**: Clamped to 0

### TC-REV-005: Score override clamp — above max_marks
- **Steps**: Enter score exceeding `session.max_marks`
- **Expected**: Clamped to `max_marks`

### TC-REV-006: Trainer adds review notes
- **Steps**: Enter notes in text field → submit decision
- **Expected**: Notes saved with the decision

### TC-REV-007: Trainer decision — PASS
- **Steps**: Submit with `decision: "PASS"`
- **Expected**: Session status updated, audit logged

### TC-REV-008: Trainer decision — FAIL
- **Steps**: Submit with `decision: "FAIL"`
- **Expected**: Session status updated, audit logged

### TC-REV-009: Trainer decision — HOLD
- **Steps**: Submit with `decision: "HOLD"`
- **Expected**: Session status updated, audit logged

### TC-REV-010: Review draft persistence
- **Steps**: Start reviewing → navigate away → return
- **Expected**: Draft review notes/scores preserved in `sessionStorage`

### TC-REV-011: Multiple trainers reviewing same session
- **Steps**: Trainer A opens review → Trainer B opens same session
- **Expected**: Both can review; last write wins on decision submission

---

### Edge Cases — Trainer Review

#### EC-REV-E1: Audio file missing from disk
- **Scenario**: Audio file was deleted, server restarted, or disk was wiped
- **Risk**: Audio player shows error, rest of review still works
- **Mitigation**: Graceful error on audio load, show "Audio unavailable" placeholder

#### EC-REV-E2: Review of session evaluated with dummy scores
- **Scenario**: Gemini failed all retries → session has dummy 5.0/BORDERLINE scores
- **Risk**: Trainer sees suspiciously uniform scores without knowing they're fallbacks
- **Mitigation**: Display indicator when scores are AI-fallback, not genuine evaluation

#### EC-REV-E3: Very long transcript display
- **Scenario**: Trainee pasted (somehow) a 5000-word transcript
- **Risk**: Page renders slowly, layout breaks
- **Mitigation**: Virtualized scrolling or collapsed view for long transcripts

---

## 11. Audit Logging

### TC-AUDIT-001: Login attempt logged
- **Steps**: Successful and failed login
- **Expected**: Audit entry with action `USER_LOGIN` or `USER_LOGIN_FAILED`, category `AUTH`

### TC-AUDIT-002: User creation logged
- **Steps**: Admin creates user
- **Expected**: Audit entry with action `USER_CREATED`, category `USER_MANAGEMENT`, `details` JSON with user info

### TC-AUDIT-003: Question generation logged
- **Steps**: Generate question set
- **Expected**: Audit entry with action `QUESTION_SET_GENERATED`, category `QUESTION_BANK`

### TC-AUDIT-004: Session assignment logged
- **Steps**: Assign viva session
- **Expected**: Audit entry with action `SESSION_ASSIGNED`, category `SESSION`, includes trainee and module info

### TC-AUDIT-005: Evaluation completed logged
- **Steps**: Run AI evaluation
- **Expected**: Audit entry with action `SESSION_EVALUATED`, category `SESSION`

### TC-AUDIT-006: Trainer decision logged with old/new score
- **Steps**: Override score from 7.0 to 8.5 and set decision to PASS
- **Expected**: Audit entry includes `old_score`, `new_score`, `decision` in details

### TC-AUDIT-007: Audit log survives wrapped action failure
- **Steps**: Action that throws an error is wrapped in audit context manager
- **Expected**: Audit log is still written (write happens in `finally` block)

### TC-AUDIT-008: Audit failure doesn't break the request
- **Steps**: Mock audit log write to fail
- **Expected**: Original action still completes, audit failure logged but not propagated

### TC-AUDIT-009: Cursor pagination
- **Steps**: `GET /admin/audit-logs?page_size=10` → get next page with cursor
- **Expected**: Correct cursor-based pagination, no duplicate or skipped entries

### TC-AUDIT-010: Filter audit logs by category
- **Steps**: `GET /admin/audit-logs?category=AUTH`
- **Expected**: Only AUTH category logs returned

### TC-AUDIT-011: Filter audit logs by user
- **Steps**: `GET /admin/audit-logs?user_id=5`
- **Expected**: Only logs from user 5 returned

---

### Edge Cases — Audit Logging

#### EC-AUDIT-E1: Cursor pagination off-by-one
- **Current behavior**: `get_logs` computes next cursor from `items[limit - 1]` when `len(items) > limit`
- **Risk**: Row at index `limit-1` is both returned to client AND used as exclusive cursor → skipped on next page
- **Mitigation**: Use `items[limit]` as cursor boundary, or use `items[-1].id` without returning the extra row

#### EC-AUDIT-E2: Wrong action type for question/set deletion
- **Current behavior**: `delete_question` logs `QUESTION_UPDATED` instead of a delete action
- **Risk**: Audit trail shows updates instead of deletes
- **Mitigation**: Add `QUESTION_DELETED` and `SET_DELETED` enum members, log correct action

#### EC-AUDIT-E3: Audit `details` JSON field — Postgres JSONB vs SQLite JSON
- **Scenario**: SQLite uses `JSON` type, Postgres uses `JSONB`
- **Risk**: Query patterns may differ, indexing unavailable on SQLite
- **Mitigation**: Database-agnostic query patterns, document Postgres recommendation for production

---

## 12. Email Notifications

### TC-EMAIL-001: Welcome email sent on user creation
- **Steps**: Assign session to new trainee → check email
- **Expected**: HTML email with username, temporary password, login link

### TC-EMAIL-002: Assignment email sent
- **Steps**: Assign session → check trainee's email
- **Expected**: Email with exam details (module, date, duration, instructions)

### TC-EMAIL-003: SMTP mock mode (no SMTP configured)
- **Steps**: Run without `SMTP_HOST` env var
- **Expected**: Emails logged to console, no crash

### TC-EMAIL-004: SMTP connection failure
- **Steps**: Set invalid SMTP host
- **Expected**: Email send fails → error logged → session/user creation not blocked

### TC-EMAIL-005: SMTP with SSL (port 465)
- **Steps**: Configure SMTP on port 465
- **Expected**: SSL connection used (not STARTTLS)

### TC-EMAIL-006: SMTP with STARTTLS (port 587)
- **Steps**: Configure SMTP on port 587
- **Expected**: STARTTLS upgrade used

---

### Edge Cases — Email

#### EC-EMAIL-E1: Email queue blocks response
- **Scenario**: BackgroundTasks email is slow (SMTP timeout)
- **Risk**: User waits 30+ seconds for assignment response
- **Mitigation**: Verify emails are truly async (FastAPI `BackgroundTasks` runs after response)

#### EC-EMAIL-E2: HTML injection in email templates
- **Scenario**: Trainee name contains `<script>` tags
- **Risk**: XSS in email client (unlikely but possible)
- **Mitigation**: HTML-escape all dynamic values in email templates

---

## 13. Health & Infrastructure

### TC-HEALTH-001: Health endpoint returns OK
- **Steps**: `GET /health`
- **Expected**: 200 with DB connectivity confirmed

### TC-HEALTH-002: Health endpoint when DB is down
- **Steps**: Stop PostgreSQL → `GET /health`
- **Expected**: 503 or error response

### TC-HEALTH-003: Frontend polls health every 30s
- **Steps**: Monitor network tab during active session
- **Expected**: Health check requests every 30 seconds → drives "Engine Active" indicator in Layout

### TC-HEALTH-004: SQLite fallback works
- **Steps**: Start without `DB_*` env vars
- **Expected**: Falls back to `viva_copilot.db`, app starts successfully

### TC-HEALTH-005: Static file serving for uploads
- **Steps**: `GET /uploads/audio/{uuid}.webm`
- **Expected**: Audio file served (unauthenticated — current design)

---

### Edge Cases — Health & Infrastructure

#### EC-INFRA-E1: DB connection at import time
- **Current behavior**: `main.py` opens a DB connection at import time for seeding
- **Risk**: Transient DB hiccup at import crashes the entire app
- **Mitigation**: Move seeding into lifespan startup event with retry

#### EC-INFRA-E2: SQLite in production
- **Scenario**: Deployed without PostgreSQL configured
- **Risk**: SQLite doesn't support concurrent writes, no JSONB, no proper locking
- **Mitigation**: Validate DB backend in startup, warn if SQLite detected in non-dev

#### EC-INFRA-E3: `dist/` committed to git alongside source
- **Scenario**: Developer makes frontend changes, forgets to rebuild
- **Risk**: Deployed bundle is stale, doesn't match source
- **Mitigation**: Remove `dist/` from git, add to `.gitignore`, deploy via CI build

---

## 14. Frontend / UI Edge Cases

### TC-FE-001: Responsive layout on mobile
- **Steps**: Access admin dashboard on 375px width
- **Expected**: Sidebar collapses, content readable, no horizontal scroll

### TC-FE-002: Dark mode / light mode
- **Steps**: Toggle theme
- **Expected**: All pages render correctly in both themes

### TC-FE-003: Breadcrumb navigation
- **Steps**: Navigate deep into review detail
- **Expected**: Breadcrumbs in Layout reflect current path, clickable

### TC-FE-004: Toast notifications
- **Steps**: Perform success action and error action
- **Expected**: Green success toast, red error toast, auto-dismiss

### TC-FE-005: Session expiry during active use
- **Steps**: Use app for 30+ minutes without page refresh
- **Expected**: First request after expiry triggers 401 → interceptor refreshes → seamless continuation

### TC-FE-006: Network offline indicator
- **Steps**: Disconnect network → attempt action
- **Expected**: Axios error → toast shows network error message

### TC-FE-007: Loading states
- **Steps**: Navigate to pages with slow API calls
- **Expected**: Loading spinners/skeletons shown during data fetch

### TC-FE-008: Empty states
- **Steps**: Navigate to question bank with no questions
- **Expected**: "No questions yet" message with call-to-action

### TC-FE-009: Large dataset rendering
- **Steps**: Question bank with 500+ questions
- **Expected**: Table paginated, no UI freeze

### TC-FE-010: React Router navigation guards
- **Steps**: Attempt to access `/admin/users` as a trainee
- **Expected**: `ProtectedRoute` redirects to appropriate page

---

### Edge Cases — Frontend

#### EC-FE-E1: XSS via transcript display
- **Scenario**: Trainee submits transcript containing `<script>alert(1)</script>`
- **Risk**: If rendered with `dangerouslySetInnerHTML` or unescaped
- **Mitigation**: React escapes by default — verify no `dangerouslySetInnerHTML` on transcripts

#### EC-FE-E2: sessionStorage draft corruption
- **Scenario**: Manual `sessionStorage` tampering via DevTools
- **Risk**: Malformed JSON causes parse error on resume
- **Mitigation**: Wrap `JSON.parse` in try/catch, fall back to server fetch

#### EC-FE-E3: Zustand store (`store.js`) is module-level mutable
- **Scenario**: Multiple React strict mode renders in dev
- **Risk**: Stream reference may be duplicated or lost
- **Mitigation**: Acceptable for dev-only issue, but document behavior

---

## 15. Security Edge Cases

### TC-SEC-001: IDOR on session results
- **Scenario**: Trainee A calls `GET /viva/{trainee_b_session_id}/summary`
- **Expected**: Should be 403 → **Currently returns 200** (vulnerability)
- **Mitigation**: Add ownership check: `session.trainee_id == current_user.id` or require ADMIN/TRAINER role

### TC-SEC-002: IDOR on evaluation trigger
- **Scenario**: Trainee A calls `POST /viva/{trainee_b_session_id}/evaluate`
- **Expected**: Should be 403 → **Currently triggers billable Gemini call** (vulnerability + cost abuse)
- **Mitigation**: Restrict to ADMIN/TRAINER roles only

### TC-SEC-003: IDOR on trainee info endpoint
- **Scenario**: Trainee A calls `GET /viva/trainee/{trainee_b_user_id}`
- **Expected**: Should be restricted → **Currently returns any user's info**
- **Mitigation**: Restrict to ADMIN/TRAINER or self-only

### TC-SEC-004: Unauthenticated audio file access
- **Scenario**: Guess or enumerate `GET /uploads/audio/{uuid}.webm`
- **Expected**: Any audio file is publicly accessible without authentication
- **Mitigation**: Serve audio through authenticated proxy endpoint, or use signed URLs

### TC-SEC-005: Deepgram API key exposed in frontend bundle
- **Scenario**: `VITE_DEEPGRAM_API_KEY` is compiled into public JS bundle
- **Expected**: Any user can extract the API key from browser DevTools
- **Mitigation**: Proxy Deepgram connection through backend, or use time-limited tokens

### TC-SEC-006: Default admin credentials
- **Scenario**: Fresh deploy, no env vars set
- **Expected**: `admin`/`admin123` seeded automatically → **Security risk if not changed**
- **Mitigation**: Force password change on first login, or require explicit credential setup

### TC-SEC-007: JWT with default secret key
- **Scenario**: `SECRET_KEY` not set in environment
- **Expected**: Falls back to `"dev-secret-key-do-not-use-in-production"` → tokens forgeable
- **Mitigation**: Fail startup if `SECRET_KEY` is default/missing in production

### TC-SEC-008: SQL injection via search parameters
- **Steps**: Enter `' OR 1=1 --` in search fields
- **Expected**: SQLAlchemy parameterized queries prevent injection → no data leak

### TC-SEC-009: CSRF on state-changing endpoints
- **Steps**: Craft cross-origin form POST to `/viva/{id}/answer`
- **Expected**: CORS blocks; SameSite cookie on refresh token limits scope

### TC-SEC-010: Transcript anti-paste bypass
- **Steps**: Use DevTools to remove `onpaste`/`oncopy` handlers, then paste external text
- **Expected**: Paste succeeds client-side, but server receives and stores whatever was pasted
- **Limitation**: Client-side paste blocking is a weak anti-cheat measure

---

## 16. Performance & Scalability

### TC-PERF-001: Concurrent exam sessions
- **Steps**: 50 trainees start exams simultaneously
- **Expected**: All sessions materialize questions, WebSocket connections established, no OOM

### TC-PERF-002: FAISS index query performance
- **Steps**: Query FAISS with 100K+ vectors
- **Expected**: Sub-second retrieval, embeddings served from memory

### TC-PERF-003: Large question bank pagination
- **Steps**: Module with 1000 questions, paginated list
- **Expected**: Fast page loads, cursor pagination efficient

### TC-PERF-004: Audio upload under slow network
- **Steps**: Upload 20MB audio on 1 Mbps connection
- **Expected**: Upload completes within timeout, progress indication

### TC-PERF-005: Concurrent AI evaluations
- **Steps**: 10 sessions evaluated simultaneously
- **Expected**: Gemini API handles parallel requests, no rate limit errors

### TC-PERF-006: Database connection pooling
- **Steps**: 50 concurrent requests to different endpoints
- **Expected**: SQLAlchemy connection pool handles load, no connection exhaustion

### TC-PERF-007: Email sending doesn't block event loop
- **Steps**: Assign 10 sessions in rapid succession
- **Expected**: All 10 responses returned quickly, emails sent in background

---

### Edge Cases — Performance

#### EC-PERF-E1: Gemini rate limiting
- **Scenario**: High-volume evaluation requests
- **Risk**: Vertex AI quota exhaustion → all evaluations fail → dummy scores everywhere
- **Mitigation**: Queue evaluations, implement backoff, monitor quota usage

#### EC-PERF-E2: Deepgram concurrent connection limit
- **Scenario**: 100+ simultaneous WebSocket connections to Deepgram
- **Risk**: Account-level connection limit hit → new exam sessions can't stream speech recognition
- **Mitigation**: Monitor connection count, implement connection pooling or queuing

#### EC-PERF-E3: FAISS index rebuild during active queries
- **Scenario**: Document deletion triggers rebuild while questions are being generated
- **Risk**: Corrupted or partial index served
- **Mitigation**: Read-write lock on FAISS index, or atomic swap of index files

#### EC-PERF-E4: Memory leak from uncleaned MediaRecorder streams
- **Scenario**: Trainee starts/stops recording 50 times in one exam
- **Risk**: Accumulated `MediaStream` references not garbage collected
- **Mitigation**: Verify `store.js` stream reference is properly nulled on exam completion

---

## Summary Statistics

| Category | Test Cases | Edge Cases |
|---|---|---|
| Authentication & Authorization | 18 | 5 |
| User Management | 10 | 3 |
| Knowledge Base & Document Ingestion | 11 | 6 |
| Question Bank & AI Generation | 15 | 5 |
| Session Assignment | 13 | 3 |
| Trainee Exam Flow | 14 | 8 |
| Voice Recording & Speech-to-Text | 15 | 5 |
| Proctoring & Fraud Detection | 11 | 5 |
| AI Evaluation & Grading | 12 | 6 |
| Trainer Review & Decision | 11 | 3 |
| Audit Logging | 11 | 3 |
| Email Notifications | 6 | 2 |
| Health & Infrastructure | 5 | 3 |
| Frontend / UI | 10 | 3 |
| Security | 10 | 0 (included inline) |
| Performance & Scalability | 7 | 4 |
| **Total** | **179** | **69** |

**Grand Total: 248 test scenarios**

---

## Prioritized Critical Issues Found During Test Case Generation

| Priority | Issue | Location |
|---|---|---|
| 🔴 P0 | IDOR: any trainee can read other trainees' transcripts/scores | `viva.py:175,193` |
| 🔴 P0 | IDOR: any trainee can trigger Gemini evaluation on others' sessions (cost abuse) | `viva.py:200` |
| 🔴 P0 | Deepgram API key exposed in frontend bundle | `frontend/.env` → `VITE_DEEPGRAM_API_KEY` |
| 🔴 P0 | Unauthenticated audio file access | `main.py` StaticFiles mount |
| 🟠 P1 | Logout doesn't invalidate access tokens | `auth.py` — `TokenBlacklist` unused |
| 🟠 P1 | Default JWT secret key fallback in production | `security.py:7` |
| 🟠 P1 | Default admin credentials seeded on every boot | `admin_seed_service.py` |
| 🟠 P1 | `/auth/refresh` has no rate limiting | `auth.py` |
| 🟡 P2 | Audit cursor pagination off-by-one | `audit_repository.py:47` |
| 🟡 P2 | Bulk assignment drops `set_name` silently | `schemas/viva.py:114` |
| 🟡 P2 | Admin router file duplicated (dead code lines 1-132) | `admin.py` |
| 🟡 P2 | Wrong audit action type for deletions | `admin_service.py:76` |
| 🟡 P2 | Timezone-naive/aware timestamp mixing | `viva_service.py` |
| 🟡 P2 | Self-heal hardcodes count=5 ignoring session `question_count` | `viva_service.py:132` |
| 🟢 P3 | Undeclared Python dependencies (`tenacity`, `numpy`, `bcrypt`) | `requirements.txt` |
| 🟢 P3 | `dist/` committed to git alongside source | `.gitignore` gap |
| 🟢 P3 | No `TrainingModule` creation endpoint | `admin.py` |
