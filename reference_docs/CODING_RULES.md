# CODING_RULES.md
> AI must follow these rules on every file it touches or creates. If a rule conflicts with a specific request, flag the conflict instead of silently picking one.

---

## 1. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Python files/modules | snake_case | `interview_service.py` |
| Python classes | PascalCase | `InterviewService` |
| Python functions/vars | snake_case | `get_next_question()` |
| React components | PascalCase | `InterviewPage.jsx` |
| React hooks | camelCase, `use` prefix | `useInterviewSession()` |
| React vars/functions | camelCase | `handleSubmit` |
| DB tables | snake_case, plural | `interview_questions` |
| DB columns | snake_case | `created_at` |
| API routes | kebab-case, plural nouns | `/interview-questions` |
| Env vars | UPPER_SNAKE_CASE | `GEMINI_API_KEY` |

---

## 2. Folder Structure

**Backend (FastAPI)**
```
backend/
├── main.py
├── core/           (config.py, security.py, deps.py)
├── routers/
├── services/
├── repositories/
├── models/
├── schemas/
├── ai/
└── tests/
```

**Frontend (React)**
```
frontend/
├── src/
│   ├── pages/
│   ├── components/
│   ├── features/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   ├── utils/
│   └── types/
```

One component per file. One router per resource (`interviews.py`, `auth.py`, `admin.py`...).

---

## 3. Import Rules

- No relative imports crossing more than 2 levels up (`../../../x` is forbidden — restructure instead)
- Backend: absolute imports from `backend/` root (`from services.interview_service import ...`)
- Frontend: use path aliases (`@/components/...`) instead of long relative chains — configure in `vite.config.js`
- Never import a router inside a service or repository (one-way dependency: routers → services → repositories)
- Group imports: stdlib → third-party → local, each group separated by a blank line

---

## 4. API Response Format (standard envelope)

All backend responses follow this shape:

```json
{
  "success": true,
  "data": { },
  "error": null,
  "message": "optional human-readable message"
}
```

On failure:
```json
{
  "success": false,
  "data": null,
  "error": { "code": "OTP_EXPIRED", "detail": "OTP has expired, request a new one." },
  "message": null
}
```

- Use consistent HTTP status codes (400 validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 422 pydantic validation, 500 server)
- Every custom error has a stable `code` string — frontend matches on `code`, never on `message` text

---

## 5. Component Patterns (React)

- Functional components only, hooks-based
- Props destructured in function signature, not accessed via `props.x`
- No inline business logic in JSX — extract to a hook or helper
- Container/presentational split for anything with data fetching: `InterviewPageContainer` (logic) + `InterviewPageView` (UI) if a page grows complex; keep simple pages as one file
- Loading/error/empty states handled explicitly in every data-fetching component — no silent failures

---

## 6. TypeScript Rules
*(Adopt if/when the project moves to TS — currently JS per stack; keep this section ready)*

- `strict: true` in tsconfig once adopted
- No `any` — use `unknown` + narrowing, or proper interface
- Shared types live in `src/types/`, mirrored to backend Pydantic schemas conceptually (field names must match)

---

## 7. Styling System

- Utility-first CSS (Tailwind recommended) — confirm with Soheb before first component is built
- No inline `style={{}}` except for truly dynamic values (computed positions, progress bar widths)
- Shared design tokens (colors, spacing) centralized — no magic hex codes scattered in components
- Follow existing 4-phase color coding from the architecture diagram if useful for UI theming: Pre-Interview (blue), Prep (green), Execution (purple), Post-Interview (orange), Admin (teal)

---

## 8. Backend Coding Rules

- Every endpoint has a Pydantic request schema and response schema — no raw dicts
- All DB access via repository functions — services never write raw SQL/ORM queries inline
- All AI calls go through `ai/` abstraction layer (see ARCHITECTURE.md Section 6)
- Secrets/API keys only via environment variables, never hardcoded
- Every service function has a docstring stating purpose, inputs, outputs

---

## 9. Commit/Change Hygiene (for AI-assisted coding sessions)

- One feature/fix per change — don't bundle unrelated edits
- After any change, update `FEATURE_LOG.md`
- If a schema or route changes, update `PROJECT_CONTEXT.md` in the same session
- Never silently change an established pattern (naming, response format, folder structure) — flag it first
