# Stage, Export, and Version API Reference (Draft)

> Base URL: relative to Next.js app (`/api/...`). Auth: cookie `token` required; admin routes need `role=SYSTEM_ADMIN`.

## Stage lifecycle
- `GET /api/project/:id/stage/:stageId`
  - Returns saved `input`, `output`, `status`, `diagnostic_score`.
  - Errors: 400 invalid stage, 404 project.
- `POST /api/project/:id/stage/:stageId/input`
  - Body: `{ "input": { ... } }`
  - Saves form input, sets status to `in_progress` if previously `not_started`.
- `POST /api/project/:id/stage/:stageId/generate`
  - Body: `{ "formData": { ... }, "conversationHistory"?: [...] }`
  - Runs stage generation (Q2–Q10), persists output, creates version, returns report/scores/keywords.
- `POST /api/project/:id/stage/:stageId/complete`
  - Marks stage completed, updates overall progress.

## Versioning
- `GET /api/project/:id/versions/:stage`
  - Returns version history list for a stage.
- `POST /api/project/:id/versions/:stage`
  - Body: `{ "action": "rollback", "version": <number> }`
  - Rolls back to target version, returns the restored version.

## Export
- `GET /api/project/:id/export?format=text|docx|pdf|pptx&stages=Q2,Q3`
  - Downloads bundle; defaults to `text` and all stages.
- `POST /api/project/:id/export`
  - Body: `{ "format": "docx", "stages": ["Q2","Q3"] }`
  - Downloads bundle in requested format.

## Progress & project
- `GET /api/project/:id/progress`
  - Returns overall progress and merged stage statuses.
- `GET /api/projects/:id`
  - Returns project detail with stage defs + status.

## Auth helpers
- `GET /api/auth/me`
  - Returns current user info based on cookie `token`.

## Notes
- Errors return `{ error: string }` with appropriate status codes.
- Export supports sanitized filenames; docx/pdf/pptx are pure JS (no binaries required).
- Generation throttled via in-memory queue; cache TTL 2 minutes to avoid repeated LLM calls.
