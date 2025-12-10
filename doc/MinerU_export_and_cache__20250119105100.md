# Export and Cache Update

## Scope
- Added multi-format export (text, docx, pdf, pptx) with API + UI entry on project detail.
- Implemented stage data endpoints (load/save/complete) and wired stage pages to persist inputs.
- Introduced generation result caching (2 min TTL) with a regression test to avoid repeated LLM calls.

## How to Use
- UI: open `project/[id]` and use the “导出” panel to pick format and stages, then download the bundle.
- API:
  - `POST /api/project/:id/export` with `{ format: "text"|"docx"|"pdf"|"pptx", stages?: ["Q2","Q3"] }`.
  - `GET /api/project/:id/export?format=pdf&stages=Q2,Q3` for quick links.
- Stage persistence:
  - `GET /api/project/:id/stage/:stageId` to preload a stage.
  - `POST /api/project/:id/stage/:stageId/input` to save form data.
  - `POST /api/project/:id/stage/:stageId/complete` to mark done (progress recalculated).

## Verification
- Run `npm test` (covers export completeness, caching, stage services, validation, and SWOT).
- Manual sanity: generate a stage output, save input, mark complete, and export as docx/pdf/pptx to confirm downloads.

## Follow-ups
- Add end-to-end flows (Playwright) for navigation/export.
- Consider persisting cache to Redis if generation load grows; current cache is in-memory only.
