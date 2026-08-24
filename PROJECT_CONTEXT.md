# Project Context: Viva Copilot

## Current Status
Viva Copilot is a production-grade application designed for conducting and evaluating trainee examinations using AI. 
The system allows trainers/admins to upload knowledge documents, generate question banks, assign exam sessions, and automatically evaluate candidates' verbal/written responses.

## Recent Changes
- **Email Notifications**: 
  - Added an `email_service` in the backend.
  - The system now automatically sends a "Welcome" email containing the username and a temporary password when a Trainee is newly created via the admin dashboard or auto-created during session assignment.
  - The system sends a "New Exam Session Assigned" email containing the module name and duration when a session is assigned to a trainee (both single and bulk assignments).
  - Toast notifications in the frontend have been updated to reflect that emails are being dispatched.

## Development Guidelines
- Always maintain modular layered architecture.
- Keep frontend, backend, APIs, auth, database logic, and AI services cleanly separated.
- Reuse existing components/utilities; avoid duplicate logic.
- Follow existing naming conventions and coding patterns.
- Ensure all code is scalable, maintainable, and production-ready.
