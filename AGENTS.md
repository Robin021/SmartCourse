# Repository Guidelines

## Project Structure & Module Organization
- The repo currently hosts design and product documentation under `doc/`, including MinerU design specs and interaction flows.
- Keep new documents in `doc/` unless a new top-level area is clearly justified; prefer concise subfolders if you add assets (images/diagrams).
- Follow the existing filename pattern (`MinerU_<topic>__YYYYMMDDHHMMSS.md`) for major documents so versions are traceable.

## Build, Test, and Development Commands
- No build toolchain is checked in yet; edits are plain Markdown. Use your editor’s Markdown preview to validate layout before pushing.
- If you add linting, prefer portable CLI tools and commit their config (e.g., `markdownlint` via `markdownlint "**/*.md"`). Keep new tooling minimal and documented.
- For diagrams, store source files (e.g., `.drawio`) alongside exported images and note the generation step in the file header.

## Coding Style & Naming Conventions
- Write clear, scoped sections with `#`-based headings; keep paragraphs short and use bullet lists for procedures or requirements.
- Use US English for narration; include bilingual labels only when they clarify product terms already present in the existing docs.
- Keep tables and callouts lightweight; avoid embedding large binaries in Markdown. Link relative paths (e.g., `doc/...`) instead of absolute URLs.
- Favor snake_case with timestamps for major doc versions; for minor edits, update the existing file instead of creating a new timestamped copy.

## Testing Guidelines
- Before submitting, run a quick spell/grammar pass and ensure Markdown renders cleanly (headings nested correctly, lists aligned).
- Validate links to internal files and external references; broken links should be fixed or removed.
- If you introduce scripts or data samples, include minimal examples and confirm they do not reference real user data.

## Commit & Pull Request Guidelines
- Use concise, present-tense commit subjects; prefix with `docs:` or `chore:` when appropriate (e.g., `docs: update agent guide`).
- In pull requests, summarize the change scope, list key files touched (e.g., `AGENTS.md`, `doc/...`), and link to any tracking issue.
- Attach screenshots only when UI behavior is relevant; otherwise keep PRs text-focused to reduce noise.
- Note any follow-up tasks explicitly so reviewers know what remains out of scope.

## Security & Data Handling
- Do not store credentials, API keys, or proprietary datasets in the repo. Redact sample data and scrub document metadata before committing.
- Assume documents may be shared internally; avoid PII and customer-specific identifiers unless anonymized.
