# Project Context: Viva Copilot

## Current Status
Viva Copilot is a production-grade application designed for conducting and evaluating trainee examinations using AI. 
The system allows trainers/admins to upload knowledge documents, generate question banks, assign exam sessions, and automatically evaluate candidates' verbal/written responses.

## Recent Changes
- **Audit Logs UI Enhancement**:
  - Upgraded the nested assigned trainees list for bulk actions (`BULK_SESSION_ASSIGNED`) in the Activity Logs tab.
  - Replaced the plain bulleted list with an enterprise-ready responsive multi-column grid (`repeat(auto-fill, minmax(220px, 1fr))`) containing colored avatar initials, numbered badges, and tooltips.
  - Added a bounded scroll container (`maxHeight: 280px`) with styled custom scrollbars to cleanly handle 15, 20, or 50+ trainees without ballooning page height.
  - Added live search/filter for fast lookups, a "Copy All" clipboard action with toast feedback, and an interactive trainee count chip in the Target column to toggle expansion.
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
