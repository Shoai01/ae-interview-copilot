# Manual Test Cases — Requires Browser, Hardware & Human Interaction

> **These test cases CANNOT be automated — you must test them manually.**
> **Requirements**: Real browser (Chrome recommended), microphone, camera, multiple accounts, DevTools access
> **Total**: 163 test cases

---

## How to Use This File

1. Open the app in Chrome
2. Log in with the relevant role (TRAINEE / TRAINER / ADMIN)
3. Follow the steps for each test case
4. Mark ✅ PASS or ❌ FAIL in the Result column
5. Add notes for any failures

---

## 1. Authentication & Browser Flow (10 tests)

### TC-AUTH-005: Refresh token flow (interceptor)
- **Steps**: Login → use app for 30+ min → make a request → verify 401 triggers auto-refresh → request replays
- **Expected**: Seamless continuation, no login redirect
- **Result**: ___

### TC-AUTH-006: Refresh with expired refresh token
- **Steps**: Login → wait 7+ days (or delete refresh cookie via DevTools) → trigger any request
- **Expected**: Redirected to login page
- **Result**: ___

### TC-AUTH-007: Refresh after logout
- **Steps**: Login → Logout → try to call `/auth/refresh` via DevTools/Postman
- **Expected**: 401, cookie cleared
- **Result**: ___

### TC-AUTH-014: Force password change flow
- **Steps**: Login with `must_change_password: true` → try navigating anywhere
- **Expected**: Forced to `/change-password` → after change, redirected to welcome check
- **Result**: ___

### TC-AUTH-018: Double login
- **Steps**: Login → go to login page → login again with same credentials
- **Expected**: Redirected to dashboard, new tokens issued
- **Result**: ___

### EC-AUTH-E1: Logout doesn't invalidate access token (security issue)
- **Steps**: Login → copy access token from DevTools → Logout → use copied token in curl/Postman
- **Expected**: Token still works for up to 30 min (this is a known vulnerability)
- **Result**: ___

### EC-AUTH-E2: Refresh endpoint has no rate limiting
- **Steps**: Login → send 50 rapid `/auth/refresh` requests via curl loop
- **Expected**: All succeed (no 429) — this is a vulnerability
- **Result**: ___

### EC-AUTH-E4: Concurrent refresh race condition
- **Steps**: Open 2 browser tabs → both trigger 401 at same time → both call refresh
- **Expected**: Only one refresh should win; verify no token conflict
- **Result**: ___

### EC-AUTH-E5: Cookie not set on HTTP (non-HTTPS)
- **Steps**: Access app via `http://` (not https) → login → check cookies in DevTools
- **Expected**: Refresh cookie may be silently rejected by modern Chrome
- **Result**: ___

### EC-AUTH-E6: Token stored only in memory (XSS check)
- **Steps**: Login → check `localStorage`, `sessionStorage`, cookies in DevTools
- **Expected**: Access token NOT in localStorage/sessionStorage (only in JS memory)
- **Result**: ___

---

## 2. User Management — Browser UI (2 tests)

### TC-USER-007: Admin updates user details
- **Steps**: Login as ADMIN → Users → edit a user → change name → save
- **Expected**: Updated successfully, changes visible in list
- **Result**: ___

### TC-USER-008: Delete user with active session
- **Steps**: Login as ADMIN → delete a trainee who has an IN_PROGRESS session
- **Expected**: Verify what happens to the session (orphaned? deleted? error?)
- **Result**: ___

---

## 3. Knowledge Base — Full Browser Flow (8 tests)

### TC-KB-002: Upload multiple PDFs
- **Steps**: Login as TRAINER → Knowledge Base → upload 3 PDFs to same module
- **Expected**: All 3 appear in document list, chunks generated
- **Result**: ___

### TC-KB-006: Upload very large PDF (50MB)
- **Steps**: Upload a 200-page, 50MB PDF
- **Expected**: Processes within reasonable time, no browser crash
- **Result**: ___

### TC-KB-007: Upload scanned image PDF
- **Steps**: Upload a PDF made of scanned images (no text layer)
- **Expected**: Warning about no extractable text, or empty chunk count
- **Result**: ___

### TC-KB-008: Delete document triggers FAISS rebuild
- **Steps**: Upload 2 docs → delete one → generate questions
- **Expected**: Questions only from remaining document
- **Result**: ___

### EC-KB-E1: Upload to non-existent module
- **Steps**: Try uploading to module ID 99999 (via URL manipulation)
- **Expected**: Error message, no crash
- **Result**: ___

### EC-KB-E4: Upload sparse content PDF
- **Steps**: Upload PDF with only "Page 1" text on each page
- **Expected**: Warning or no questions generated
- **Result**: ___

### EC-KB-E5: Upload non-Latin PDF
- **Steps**: Upload a Japanese or Arabic PDF
- **Expected**: Either processes correctly or shows unsupported language warning
- **Result**: ___

### EC-KB-E6: Upload same document twice
- **Steps**: Upload the exact same PDF file twice
- **Expected**: Should warn about duplicate or deduplicate automatically
- **Result**: ___

---

## 4. Question Bank — Browser UI (6 tests)

### TC-QB-003: Difficulty distribution (visual check)
- **Steps**: Generate 15 questions → inspect list
- **Expected**: Mix of EASY/MEDIUM/HARD visible in the table
- **Result**: ___

### TC-QB-012: Rename question set
- **Steps**: Click on a set name → rename → save
- **Expected**: New name reflected in the list
- **Result**: ___

### EC-QB-E4: All questions toggled off
- **Steps**: Go to a set → toggle ALL questions to inactive
- **Expected**: Warning about empty set, or set cannot be assigned
- **Result**: ___

### EC-QB-E5: Long question text display
- **Steps**: Create a question with 24-word text
- **Expected**: Full text visible or truncated with expand option, no layout break
- **Result**: ___

### EC-QB-E2: Semantic dedup false positive
- **Steps**: Generate set A → manually create a similar-but-different question → generate set B
- **Expected**: Check if similar question was incorrectly deduplicated
- **Result**: ___

### EC-QB-E3: Server restart during question generation
- **Steps**: Start generating a large set → kill the backend server mid-generation → restart
- **Expected**: Partial set or clean failure, no corrupt state
- **Result**: ___

---

## 5. Full Exam Flow (End-to-End) (17 tests)

### TC-EXAM-001: Start exam — happy path
- **Steps**: Login as TRAINEE → pass welcome check → click "Start" → fullscreen → first question appears
- **Expected**: Session status changes to IN_PROGRESS, question displayed with TTS
- **Result**: ___

### TC-EXAM-002: Resume session after refresh
- **Steps**: Start exam → answer 2 questions → refresh browser → return
- **Expected**: Resumes from question 3, previous answers preserved
- **Result**: ___

### TC-EXAM-003: Resume — triple fallback recovery
- **Steps**: Start exam → close browser → reopen → navigate to exam URL
- **Expected**: Session recovered via `location.state` → `sessionStorage` → `GET /sessions/current`
- **Result**: ___

### TC-EXAM-005: Upload audio for answer (full flow)
- **Steps**: Record answer → click "Next" → verify audio file created in `uploads/audio/`
- **Expected**: WebM file saved, playable from trainer review
- **Result**: ___

### TC-EXAM-008: Auto-submit on countdown expiry
- **Steps**: Start exam → wait for timer to reach 0:00
- **Expected**: Auto-submits, evaluation runs, redirected to completion page
- **Result**: ___

### TC-EXAM-010: Navigate to next question
- **Steps**: Answer question → click "Next"
- **Expected**: Next question loads, TTS reads it aloud
- **Result**: ___

### TC-EXAM-011: All questions answered
- **Steps**: Answer every question → click "Next" on last one
- **Expected**: Evaluation triggered, redirected to `VivaComplete`
- **Result**: ___

### TC-EXAM-012: TTS reads question aloud
- **Steps**: New question loads → listen
- **Expected**: Browser voice reads the question text
- **Result**: ___

### TC-EXAM-013: TTS unavailable
- **Steps**: Disable speechSynthesis in DevTools or use old browser
- **Expected**: Question text shown, no crash, no TTS error
- **Result**: ___

### TC-EXAM-014: Session state across tabs
- **Steps**: Open exam in Tab A → open same URL in Tab B
- **Expected**: Tab B shows existing session or warning, not a duplicate
- **Result**: ___

### EC-EXAM-E1: beforeunload guard
- **Steps**: Start exam → try closing the browser tab
- **Expected**: "Leave site?" prompt appears
- **Result**: ___

### EC-EXAM-E5: Computer sleep/resume
- **Steps**: Start exam → close laptop lid → wait 2 hours → reopen
- **Expected**: Timer expired, session auto-submitted or shows expired state
- **Result**: ___

### EC-EXAM-E6: Network drops mid-answer
- **Steps**: Start recording → disconnect WiFi → click "Next"
- **Expected**: Error message shown, retry option, local draft preserved
- **Result**: ___

### EC-EXAM-E7: Browser back button
- **Steps**: Answer question → click "Next" → press browser Back
- **Expected**: Cannot go to previous question (or shows same current question)
- **Result**: ___

### EC-EXAM-E8: Double-click "Next" button
- **Steps**: Rapid double-click on "Next" button
- **Expected**: Only one submission, no duplicate answers
- **Result**: ___

### EC-SES-E1: Bulk assignment drops set_name
- **Steps**: Bulk assign sessions → verify if set_name is applied to each
- **Expected**: Check if all sessions got the correct set, or all got random sets
- **Result**: ___

### EC-SES-E3: Plaintext password in email
- **Steps**: Assign session to new trainee → check the welcome email in inbox
- **Expected**: Password visible in email (security concern)
- **Result**: ___

---

## 6. Voice Recording & Speech-to-Text (All browser + mic) (17 tests)

### TC-VOICE-001: Start recording — Deepgram connects
- **Steps**: Click mic button → check DevTools Network tab for WebSocket to Deepgram
- **Expected**: WSS connection established to `api.deepgram.com`
- **Result**: ___

### TC-VOICE-002: Interim results displayed live
- **Steps**: Start recording → speak → watch transcript field
- **Expected**: Partial words appear in real-time as you speak
- **Result**: ___

### TC-VOICE-003: Final transcript on stop
- **Steps**: Speak a sentence → click "Stop"
- **Expected**: Complete, accurate transcript in the text field
- **Result**: ___

### TC-VOICE-004: MediaRecorder captures independently
- **Steps**: Start recording → check DevTools for WebM chunks being created
- **Expected**: Audio chunks captured every 250ms, separate from Deepgram
- **Result**: ___

### TC-VOICE-005: Audio blob assembled
- **Steps**: Record for 30 seconds → check uploaded audio file
- **Expected**: Complete, playable WebM file in `uploads/audio/`
- **Result**: ___

### TC-VOICE-006: Pause/resume mid-answer
- **Steps**: Start recording → stop → start again (same question) → stop
- **Expected**: Both recordings merged or both uploaded, transcript combines both
- **Result**: ___

### TC-VOICE-007: Deepgram API key in WebSocket handshake
- **Steps**: Start recording → inspect WebSocket frames in DevTools
- **Expected**: API key sent as subprotocol in handshake
- **Result**: ___

### TC-VOICE-008: Deepgram connection failure
- **Steps**: Block `api.deepgram.com` in DevTools Network → start recording
- **Expected**: Fallback message "[Speech recognition unavailable]", exam continues
- **Result**: ___

### TC-VOICE-009: Microphone permission denied
- **Steps**: Click "Block" on mic permission prompt → try to start exam
- **Expected**: Welcome check fails with clear error message
- **Result**: ___

### TC-VOICE-010: No microphone hardware
- **Steps**: Test on a machine with no mic (or disable mic in OS settings)
- **Expected**: `getUserMedia` fails → caught by welcome check
- **Result**: ___

### TC-VOICE-011: Microphone disconnected mid-recording
- **Steps**: Start recording → unplug USB mic
- **Expected**: Recording stops gracefully, partial audio saved
- **Result**: ___

### TC-VOICE-012: Edit transcript after recording
- **Steps**: Record answer → manually edit the transcript text → submit
- **Expected**: Edited version is submitted (field is editable by design)
- **Result**: ___

### TC-VOICE-013: Block paste/copy/cut/drop
- **Steps**: Try to paste external text into transcript field (Ctrl+V)
- **Expected**: Paste is blocked, only voice input allowed
- **Result**: ___

### TC-VOICE-014: Very long recording (10+ min)
- **Steps**: Record continuously for 10 minutes → stop
- **Expected**: Transcript complete, audio blob uploaded, no memory error
- **Result**: ___

### TC-VOICE-015: Silence — no speech
- **Steps**: Start recording → remain silent for 30 seconds → stop
- **Expected**: Empty transcript, no error, can proceed to next question
- **Result**: ___

### EC-VOICE-E1: Deepgram endpointing splits sentence
- **Steps**: Speak with a 500ms pause in the middle of a sentence
- **Expected**: Check if transcript splits into two separate segments
- **Result**: ___

### EC-VOICE-E2: Multiple tabs with mic access
- **Steps**: Open exam in Tab A (recording) → open exam in Tab B → start recording
- **Expected**: Both tabs get mic access, or one fails gracefully
- **Result**: ___

---

## 7. Proctoring & Fraud Detection (All browser + camera) (16 tests)

### TC-FRAUD-001: Multiple faces detected
- **Steps**: Position 2 people in camera frame during exam
- **Expected**: `MULTIPLE_FACES` fraud flag logged in session
- **Result**: ___

### TC-FRAUD-002: No face detected
- **Steps**: Cover camera or turn away for extended period
- **Expected**: `NO_FACE` fraud flag logged
- **Result**: ___

### TC-FRAUD-003: Tab switch detected
- **Steps**: During exam, press Alt+Tab to another application
- **Expected**: `TAB_SWITCH` fraud flag logged
- **Result**: ___

### TC-FRAUD-004: Fullscreen exit detected
- **Steps**: During exam, press Escape to exit fullscreen
- **Expected**: `FULLSCREEN_EXIT` fraud flag logged
- **Result**: ___

### TC-FRAUD-005: Background noise detected
- **Steps**: Play loud music near the microphone during exam
- **Expected**: `BACKGROUND_NOISE` fraud flag logged (after 2.5s sustained + 30s cooldown)
- **Result**: ___

### TC-FRAUD-006: Multiple simultaneous fraud types
- **Steps**: Alt+Tab AND cover camera at the same time
- **Expected**: Both `TAB_SWITCH` and `NO_FACE` flags logged independently
- **Result**: ___

### TC-FRAUD-007: Same fraud type deduplication
- **Steps**: Tab switch 5 times in 10 seconds
- **Expected**: Single `TAB_SWITCH` row with `count: 5` (not 5 separate rows)
- **Result**: ___

### TC-FRAUD-008: Fraud flags don't affect AI score
- **Steps**: Complete exam with 10+ fraud flags → review evaluation scores
- **Expected**: Scores reflect answer quality only, not fraud count
- **Result**: ___

### TC-FRAUD-009: Fraud flags visible to trainer
- **Steps**: Login as TRAINER → open review detail for flagged session
- **Expected**: All fraud flags displayed with type, count, and timestamps
- **Result**: ___

### TC-FRAUD-010: Face detection model load failure
- **Steps**: Rename/delete `public/models/` directory → restart app → start exam
- **Expected**: Face detection disabled, exam continues without proctoring
- **Result**: ___

### TC-FRAUD-011: Noise detection cooldown
- **Steps**: Play noise → stop → play again within 30 seconds
- **Expected**: Only one `BACKGROUND_NOISE` flag per 30-second window
- **Result**: ___

### EC-FRAUD-E1: Silent failure on fraud report
- **Steps**: Block API calls in DevTools → tab switch
- **Expected**: No error shown to user (silent fail is by design)
- **Result**: ___

### EC-FRAUD-E2: face-api.js load on slow network
- **Steps**: Throttle network to Slow 3G → open exam page
- **Expected**: Face detection loads slowly but exam can start
- **Result**: ___

### EC-FRAUD-E3: Camera permission revoked mid-exam
- **Steps**: Start exam → go to browser settings → disable camera → return
- **Expected**: Face detection stops, `NO_FACE` flags accumulate, or graceful handling
- **Result**: ___

### EC-FRAUD-E4: Noise threshold false positives
- **Steps**: In a quiet office with AC humming → start exam
- **Expected**: No false `BACKGROUND_NOISE` flags from normal ambient noise
- **Result**: ___

### EC-FRAUD-E5: False face detection on shadows
- **Steps**: Move in/out of shadow during exam → check fraud flags
- **Expected**: No false `MULTIPLE_FACES` from lighting changes
- **Result**: ___

---

## 8. Trainer Review — Full Browser UI (10 tests)

### TC-REV-001: View session review page
- **Steps**: Login as TRAINER → Sessions → open a completed session
- **Expected**: Transcripts, scores, feedback, fraud flags all displayed correctly
- **Result**: ___

### TC-REV-002: Audio playback in review
- **Steps**: Click play on audio player for a question
- **Expected**: Audio plays from `uploads/audio/` correctly
- **Result**: ___

### TC-REV-009: Trainer decision — HOLD
- **Steps**: Submit decision with `HOLD`
- **Expected**: Session status updated, appears in HOLD filter
- **Result**: ___

### TC-REV-010: Review draft persistence
- **Steps**: Start reviewing → type notes → navigate away → return
- **Expected**: Draft notes still present (from sessionStorage)
- **Result**: ___

### TC-REV-011: Multiple trainers reviewing same session
- **Steps**: Login as Trainer A in Chrome → open session review → Login as Trainer B in Firefox → open same session → both submit different decisions
- **Expected**: Last write wins; both can view the same session
- **Result**: ___

### EC-REV-E1: Audio file missing from disk
- **Steps**: Delete an audio file from `uploads/audio/` → refresh review page
- **Expected**: "Audio unavailable" placeholder, rest of review works
- **Result**: ___

### EC-REV-E2: Review with dummy/fallback scores
- **Steps**: Find a session that was evaluated with fallback scores (Gemini failure)
- **Expected**: Check if there's any indication scores are fallbacks
- **Result**: ___

### EC-REV-E3: Very long transcript display
- **Steps**: Manually set a transcript to 5000+ words → open review
- **Expected**: Page renders without layout break, scrollable
- **Result**: ___

### TC-FRAUD-008: Verify fraud flags in review (browser)
- **Steps**: Open review for a session with fraud flags
- **Expected**: Flags visible with correct counts and types
- **Result**: ___

### TC-EVAL-008: Lazy evaluation trigger
- **Steps**: Find a COMPLETED session with no report → open review page
- **Expected**: Report auto-generated on load, scores displayed
- **Result**: ___

---

## 9. Security — Manual Penetration (10 tests)

### TC-SEC-001: IDOR on session results
- **Steps**: Login as Trainee A → note a session ID from Trainee B → call `GET /viva/{B_session_id}/summary`
- **Expected**: Should be 403 → **Currently returns 200** (vulnerability)
- **Result**: ___

### TC-SEC-002: IDOR on evaluation trigger
- **Steps**: Login as Trainee A → call `POST /viva/{B_session_id}/evaluate`
- **Expected**: Should be 403 → **Currently triggers billable Gemini call**
- **Result**: ___

### TC-SEC-003: IDOR on trainee info
- **Steps**: Login as Trainee A → call `GET /viva/trainee/{B_user_id}`
- **Expected**: Should be restricted → **Currently returns any user's info**
- **Result**: ___

### TC-SEC-004: Unauthenticated audio file access
- **Steps**: Copy an audio URL from DevTools → open in incognito (no login)
- **Expected**: File is accessible without authentication (vulnerability)
- **Result**: ___

### TC-SEC-005: Deepgram API key in frontend bundle
- **Steps**: Login → DevTools → Sources → search for Deepgram key in JS bundles
- **Expected**: Key found in `dist/assets/*.js` (vulnerability)
- **Result**: ___

### TC-SEC-006: Default admin credentials
- **Steps**: Fresh deploy → login with `admin` / `admin123`
- **Expected**: Login succeeds (security risk if not changed)
- **Result**: ___

### TC-SEC-007: JWT with default secret key
- **Steps**: Start app without `SECRET_KEY` env var → verify it starts
- **Expected**: App fails to start (or uses default key — vulnerability)
- **Result**: ___

### TC-SEC-010: Anti-paste bypass
- **Steps**: Open DevTools → remove `onpaste` handler → paste external text into transcript
- **Expected**: Paste succeeds (client-side blocking is weak)
- **Result**: ___

### TC-FRAUD-010: Face detection model missing
- **Steps**: Delete `public/models/` directory → open exam
- **Expected**: Exam starts without face detection (graceful degradation)
- **Result**: ___

### TC-EXAM-014: Multi-tab exam state
- **Steps**: Open exam URL in 3 tabs simultaneously
- **Expected**: Only one active exam session; others show warning or existing session
- **Result**: ___

---

## 10. Frontend / UI (All visual checks) (13 tests)

### TC-FE-001: Responsive layout on mobile
- **Steps**: Open admin dashboard on 375px width (Chrome DevTools mobile mode)
- **Expected**: Sidebar collapses, content readable, no horizontal scroll
- **Result**: ___

### TC-FE-002: Dark mode / light mode
- **Steps**: Toggle theme in the app
- **Expected**: All pages render correctly, no invisible text or broken layouts
- **Result**: ___

### TC-FE-003: Breadcrumb navigation
- **Steps**: Navigate to Trainer Review Detail → check breadcrumbs at top
- **Expected**: Breadcrumbs show correct path, each segment is clickable
- **Result**: ___

### TC-FE-004: Toast notifications
- **Steps**: Perform a success action → perform an error action
- **Expected**: Green success toast appears and auto-dismisses; red error toast appears
- **Result**: ___

### TC-FE-005: Session expiry during active use
- **Steps**: Login → use app for 30+ min without refreshing → perform an action
- **Expected**: 401 triggers silent refresh → action succeeds, no login redirect
- **Result**: ___

### TC-FE-006: Network offline indicator
- **Steps**: Disconnect network (DevTools → Network → Offline) → try to save
- **Expected**: Toast or message shows network error
- **Result**: ___

### TC-FE-007: Loading states
- **Steps**: Navigate to dashboard (slow endpoint) → observe UI
- **Expected**: Loading spinner or skeleton shown while data loads
- **Result**: ___

### TC-FE-008: Empty states
- **Steps**: Navigate to question bank with no questions
- **Expected**: "No questions yet" message with button to create
- **Result**: ___

### TC-FE-009: Large dataset rendering
- **Steps**: Navigate to question bank with 500+ questions
- **Expected**: Table paginated, scrolling smooth, no UI freeze
- **Result**: ___

### TC-FE-010: Navigation guards (ProtectedRoute)
- **Steps**: Login as TRAINEE → manually type `/admin/users` in URL bar
- **Expected**: Redirected away from admin page
- **Result**: ___

### EC-FE-E1: XSS via transcript display
- **Steps**: Submit transcript `<script>alert('XSS')</script>` → view in trainer review
- **Expected**: Script tag displayed as text, not executed (React escapes by default)
- **Result**: ___

### EC-FE-E2: sessionStorage tampering
- **Steps**: Open DevTools → modify sessionStorage exam data to invalid JSON
- **Expected**: App handles gracefully, falls back to server fetch
- **Result**: ___

### EC-FE-E3: Zustand store in React strict mode
- **Steps**: Run in dev mode → start/stop recording rapidly
- **Expected**: Stream reference maintained correctly (dev-only issue)
- **Result**: ___

---

## 11. Performance & Scalability (7 tests)

### TC-PERF-001: 50 concurrent exam sessions
- **Steps**: Use k6 or artillery to simulate 50 concurrent `POST /viva/sessions/start`
- **Expected**: All sessions materialize, no OOM, response times < 5s
- **Result**: ___

### TC-PERF-002: FAISS index query speed
- **Steps**: Seed 100K+ vectors → time question generation
- **Expected**: Sub-second vector retrieval
- **Result**: ___

### TC-PERF-003: Large question bank pagination
- **Steps**: Create 1000 questions → paginate through them
- **Expected**: Each page loads in < 500ms
- **Result**: ___

### TC-PERF-004: Audio upload on slow network
- **Steps**: Throttle to 1 Mbps → upload 20MB audio
- **Expected**: Upload completes, progress indicator shown
- **Result**: ___

### TC-PERF-005: 10 concurrent AI evaluations
- **Steps**: Trigger 10 evaluations simultaneously
- **Expected**: All complete without rate limit errors from Gemini
- **Result**: ___

### TC-PERF-006: DB connection pool under load
- **Steps**: 50 concurrent requests to various endpoints
- **Expected**: No connection exhaustion errors
- **Result**: ___

### TC-PERF-007: Email doesn't block event loop
- **Steps**: Assign 10 sessions rapidly → measure response times
- **Expected**: All responses < 2s, emails sent in background
- **Result**: ___

---

## 12. Remaining Edge Cases (32 tests)

### EC-EXAM-E3: All questions in set are inactive
- **Steps**: Toggle all questions in a set to inactive → assign session with that set
- **Expected**: Fallback to random set or error at assignment time
- **Result**: ___

### EC-EXAM-E4: Concurrent session materialization
- **Steps**: Hit `POST /viva/sessions/start` from 2 browser tabs simultaneously
- **Expected**: No duplicate question rows
- **Result**: ___

### EC-KB-E2: FAISS index corruption
- **Steps**: Kill server mid-document-upload → restart → try to generate questions
- **Expected**: Either index recovery or clear error message
- **Result**: ___

### EC-KB-E3: Concurrent document deletions
- **Steps**: Open 2 tabs → delete different documents from same module simultaneously
- **Expected**: No crash, both deletions succeed, index rebuilt correctly
- **Result**: ___

### EC-QB-E1: Gemini returns invalid questions
- **Steps**: (Hard to force — observe behavior if it happens naturally)
- **Expected**: Invalid questions filtered, retry up to 10 times
- **Result**: ___

### TC-SES-007: Bulk assignment — all failures
- **Steps**: Bulk assign with all invalid entries
- **Expected**: 400 with all error details, no sessions created
- **Result**: ___

### TC-SES-009: Assignment with nonexistent question set
- **Steps**: Assign with `set_name: "Nonexistent123"`
- **Expected**: Error or fallback to random set
- **Result**: ___

### TC-SES-010: Email delivery failure (real SMTP)
- **Steps**: Configure invalid SMTP host → assign session
- **Expected**: Session created, email failure logged but not blocking
- **Result**: ___

### TC-SES-013: Very long duration session
- **Steps**: Assign session with `duration_minutes: 120`
- **Expected**: 40 questions materialized, exam runs correctly
- **Result**: ___

### TC-EVAL-010: Fraud flags in evaluation prompt
- **Steps**: Evaluate session with fraud flags → check if Gemini output is unaffected by fraud
- **Expected**: Scores based on answer quality only
- **Result**: ___

### TC-EVAL-011: Get session summary (browser)
- **Steps**: Open summary page for a completed session
- **Expected**: Aggregate scores, recommendation, question count displayed
- **Result**: ___

### TC-EVAL-012: Get session report (browser)
- **Steps**: Open report page for a completed session
- **Expected**: Full per-question evaluations, scores, feedback displayed
- **Result**: ___

### TC-HEALTH-002: Health endpoint when DB is down
- **Steps**: Stop PostgreSQL → call `GET /health`
- **Expected**: 503 or error response
- **Result**: ___

### TC-HEALTH-003: Frontend health polling
- **Steps**: Open app → DevTools Network → filter for `/health`
- **Expected**: Requests every 30 seconds, "Engine Active" indicator green
- **Result**: ___

### TC-HEALTH-005: Unauthenticated audio file access
- **Steps**: Get an audio URL → open in incognito without login
- **Expected**: File is publicly accessible (vulnerability confirmed)
- **Result**: ___

### TC-AUDIT-003: Question generation audit log
- **Steps**: Generate a question set → check audit logs
- **Expected**: Audit entry with action `QUESTION_SET_GENERATED`
- **Result**: ___

### TC-AUDIT-005: Evaluation audit log
- **Steps**: Evaluate a session → check audit logs
- **Expected**: Audit entry with action `SESSION_EVALUATED`
- **Result**: ___

### TC-AUDIT-006: Trainer decision audit with score change
- **Steps**: Override score and submit decision → check audit logs
- **Expected**: Audit entry includes `old_score`, `new_score`, `decision`
- **Result**: ___

### TC-EMAIL-001: Welcome email delivered
- **Steps**: Assign session to new trainee → check real inbox
- **Expected**: Email with username, password, login link received
- **Result**: ___

### TC-EMAIL-002: Assignment email delivered
- **Steps**: Assign session → check trainee's inbox
- **Expected**: Email with exam details received
- **Result**: ___

### TC-EMAIL-005: SMTP SSL (port 465)
- **Steps**: Configure SMTP on port 465 → assign session
- **Expected**: Email sent successfully via SSL
- **Result**: ___

### TC-EMAIL-006: SMTP STARTTLS (port 587)
- **Steps**: Configure SMTP on port 587 → assign session
- **Expected**: Email sent successfully via STARTTLS
- **Result**: ___

### EC-EMAIL-E1: Slow SMTP doesn't block response
- **Steps**: Configure SMTP with 10s timeout → assign session
- **Expected**: Response returns immediately, email sent in background
- **Result**: ___

### EC-INFRA-E1: DB connection at import time
- **Steps**: Stop DB → start the app
- **Expected**: App crashes on startup (current behavior) — needs fix
- **Result**: ___

### EC-INFRA-E2: SQLite in production
- **Steps**: Deploy without `DB_*` env vars → check app behavior
- **Expected**: App runs on SQLite (warns: not suitable for production)
- **Result**: ___

### EC-PERF-E1: Gemini rate limiting
- **Steps**: Send 50+ evaluation requests rapidly
- **Expected**: Some fail with rate limit, fallback scores used
- **Result**: ___

### EC-PERF-E2: Deepgram connection limit
- **Steps**: Open 100+ exam sessions simultaneously
- **Expected**: Some connections may fail — check fallback behavior
- **Result**: ___

### EC-PERF-E3: FAISS rebuild during queries
- **Steps**: Delete document (triggers rebuild) while another request generates questions
- **Expected**: No crash, index eventually consistent
- **Result**: ___

### EC-PERF-E4: Memory leak from MediaRecorder
- **Steps**: Start/stop recording 50 times → check browser memory in DevTools Performance tab
- **Expected**: No significant memory growth
- **Result**: ___

### EC-AUDIT-E1: Cursor pagination off-by-one
- **Steps**: Request 3 pages of 10 audit logs each → verify no duplicate or skipped entries
- **Expected**: All 30 entries returned exactly once
- **Result**: ___

### EC-AUDIT-E2: Wrong audit action for deletions
- **Steps**: Delete a question → check audit log action type
- **Expected**: Shows `QUESTION_UPDATED` instead of `QUESTION_DELETED` (bug)
- **Result**: ___

### EC-AUDIT-E3: JSONB vs JSON field behavior
- **Steps**: Query audit logs by `details` field on Postgres vs SQLite
- **Expected**: Both work, but Postgres has better performance
- **Result**: ___

---

## Summary

| Category | Count |
|---|---|
| Authentication & Browser Flow | 10 |
| User Management — Browser UI | 2 |
| Knowledge Base — Full Browser Flow | 8 |
| Question Bank — Browser UI | 6 |
| Full Exam Flow (End-to-End) | 17 |
| Voice Recording & Speech-to-Text | 17 |
| Proctoring & Fraud Detection | 16 |
| Trainer Review — Full Browser UI | 10 |
| Security — Manual Penetration | 10 |
| Frontend / UI | 13 |
| Performance & Scalability | 7 |
| Remaining Edge Cases | 32 |
| **Total** | **148** |

*(Note: some overlap with the original 163 count due to consolidation in the manual file)*
