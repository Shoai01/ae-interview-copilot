# Architecture Overview

The **Viva Copilot** project follows a modular layered architecture ensuring a clean separation of concerns:

## 1. Frontend Layer
- **Tech Stack:** React, Material UI (MUI), Vite.
- **Role:** Handles user interactions, dashboard displays, and form submissions.
- **Structure:** Divided into components, pages, services (API calls), and state management (context).

## 2. API / Router Layer (`backend/routers`)
- **Tech Stack:** FastAPI.
- **Role:** Exposes RESTful endpoints. It delegates business logic to the services layer.
- **Modules:** `admin.py`, `viva.py`, `auth.py`.

## 3. Service Layer (`backend/services`)
- **Role:** Contains core business logic.
- **Modules:** 
  - `user_service.py`: User creation and management.
  - `viva_service.py`: Exam session assignment and lifecycle management.
  - `email_service.py`: **[NEW]** Handles sending SMTP notifications to users (Mocked if SMTP not configured).
  - `knowledge_service.py`: Manages knowledge base document ingestion.

## 4. AI & Processing Layer (`backend/ai`)
- **Role:** Responsible for AI-driven question generation and session evaluation.
- **Tools:** Uses Google Vertex AI / GenAI for LLM interactions.

## 5. Data Access / DB Layer (`backend/models`, `backend/repositories`)
- **Tech Stack:** SQLAlchemy ORM.
- **Role:** Manages database schemas, relationships, and queries.

## Design Principles Followed
- **Separation of Concerns:** APIs, business logic, auth, and AI services are fully separated.
- **Reusability:** Functions in `user_service` and `email_service` are reused across different routers.
- **Scalability:** Stateless API design with a robust DB schema.
