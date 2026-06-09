# Image Task Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private web app that accepts up to ten numbered images, understands grouped Chinese editing instructions, confirms the per-image task list, and submits each image to an n1n-compatible image editing API.

**Architecture:** A React single-page workbench uploads images and sends the numbered instruction to a Fastify API. The server first resolves deterministic number/range expressions locally, can optionally use an LLM for ambiguous instructions, and then calls the relay image-edit endpoint once per selected image. Files stay in memory and are not persisted.

**Tech Stack:** React 19, TypeScript, Vite, Fastify, Zod, Vitest, Testing Library, native `fetch`/`FormData`, Docker.

---

## File Structure

- `src/shared/instructions.ts`: Parses numbered Chinese instructions into per-image tasks.
- `src/shared/types.ts`: Shared request, task, and result types.
- `src/server/app.ts`: Fastify routes and validation.
- `src/server/relay.ts`: n1n/OpenAI-compatible image-edit API adapter.
- `src/server/index.ts`: Local and container server entry point.
- `src/client/App.tsx`: Ten-image upload and task-confirmation workbench.
- `src/client/api.ts`: Browser API client.
- `src/client/styles.css`: Responsive editorial workbench styling.
- `tests/instructions.test.ts`: Range, list, all, exclusion, and validation tests.
- `tests/server.test.ts`: API validation and relay orchestration tests.
- `tests/App.test.tsx`: Upload limit, numbering, and confirmation UI tests.
- `Dockerfile`, `render.yaml`: Container and cloud deployment configuration.

### Task 1: Instruction Parser

**Files:**
- Create: `src/shared/instructions.ts`
- Create: `src/shared/types.ts`
- Test: `tests/instructions.test.ts`

- [ ] Write failing tests for single numbers, comma lists, ranges, all images, exclusions, and out-of-range references.
- [ ] Run `npm test -- tests/instructions.test.ts` and confirm failures are caused by the missing parser.
- [ ] Implement `parseInstruction(text, imageCount)` with one task per selected image.
- [ ] Run the focused test and confirm it passes.

### Task 2: Server API

**Files:**
- Create: `src/server/app.ts`
- Create: `src/server/relay.ts`
- Test: `tests/server.test.ts`

- [ ] Write failing tests for `POST /api/parse` and multipart `POST /api/process`.
- [ ] Verify requests with more than ten files or empty instructions are rejected.
- [ ] Implement route schemas and dependency-injected relay calls.
- [ ] Run server tests and confirm all pass.

### Task 3: React Workbench

**Files:**
- Create: `src/client/App.tsx`
- Create: `src/client/api.ts`
- Create: `src/client/styles.css`
- Test: `tests/App.test.tsx`

- [ ] Write failing tests for numbered previews, ten-image limit, instruction confirmation, and per-image statuses.
- [ ] Implement drag/drop and file-picker image intake with object URL cleanup.
- [ ] Implement instruction confirmation and process controls.
- [ ] Add per-image retry, download, and download-all controls.
- [ ] Run component tests and confirm all pass.

### Task 4: Runtime and Deployment

**Files:**
- Create: `src/server/index.ts`
- Create: `.env.example`
- Create: `Dockerfile`
- Create: `render.yaml`
- Create: `README.md`

- [ ] Serve the Vite production build from Fastify.
- [ ] Configure `N1N_API_KEY`, `N1N_BASE_URL`, `IMAGE_MODEL`, and optional `APP_PASSWORD`.
- [ ] Add health checking and in-memory upload limits.
- [ ] Document local development, API configuration, and Render deployment.

### Task 5: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start the app and inspect desktop and mobile layouts in a real browser.
- [ ] Verify no API key is present in browser assets or logs.
- [ ] Verify images are not written to disk.

