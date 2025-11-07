# Presentation Points (Firebase Learnings)

## Authentication
- Purpose: Gate user data per account; drive owner-only actions.
- Implemented: Email/password auth; route guards via `onAuthStateChanged`; Navbar avatar and sign-out.
- Where: `react/src/components/ProtectecRoutes.jsx`, `react/src/components/Navbar.jsx`, Login/Register pages.
- Learnings/Challenges: Centralize guards; avoid UI flash on auth change; auth state drives `users/{uid}/…` paths.

## Cloud Firestore (Database)
- Purpose: Source of truth for projects, logs, and public feed.
- Data model: `users/{uid}/projects/{projectId}` with `logs/`; `publicPosts/{projectId}` for Explore.
- Implemented: `onSnapshot` realtime updates; `serverTimestamp`; batch delete logs on project delete.
- Learnings/Challenges: Owner vs viewer access; resolve public owner via `publicPosts` (`uid` + `projectId`).

## Firestore Security Rules
- Purpose: Enforce per-user ownership; allow public read for shared posts.
- Implemented: Owner-only writes under `users/{uid}`; authenticated reads; global read on `publicPosts` with owner-only writes.
- Where: `firestore.rules`.
- Learnings/Challenges: Nesting (`projects`, `logs`) with the same owner rule; validate write identity on public docs.

## Cloud Storage for Firebase
- Purpose: Store project cover and log images.
- Implemented: Upload helpers set contentType; save `imageURL` + `imagePath` for cleanup.
- Delete flow: Removes all log images and project image when deleting a project.
- Learnings/Challenges: CORS confusion early; always persist exact storage paths; size limits in rules (10MB).

## Cloud Functions for Firebase
- Purpose: Serverless logic for plan generation and reminders (blueprint).
- Implemented: Callable `generatePlan` returns deterministic 5-step plans; client calls via `httpsCallable`.
- Where: `functions/src/index.ts`, client util `react/src/lib/ai.ts`.
- Learnings/Challenges: Prefer callable to avoid CORS; keep demo logic deterministic; ensure APIs enabled during deploy.

## Firebase Hosting
- Purpose: Deploy the SPA reliably.
- Implemented: Vite build served from `react/dist`; SPA rewrites to `/index.html`; predeploy builds the app.
- Where: `firebase.json` ("public": `react/dist`, predeploy), `react/package.json` scripts.
- Learnings/Challenges: Initially served `/public` placeholder; point Hosting to build output and keep rewrites minimal.

## Offline & Performance (Firestore)
- Purpose: Resilient UX with intermittent connectivity and dev network quirks.
- Implemented: `enableIndexedDbPersistence(db)`; `initializeFirestore` with `experimentalAutoDetectLongPolling`.
- Where: `react/src/firebase.js`.
- Learnings/Challenges: Persistence + long‑polling improves reliability for local/dev and flaky networks.

## Explore / Public Feed
- Purpose: Share selected projects publicly, keep private data under user paths.
- Implemented: `publicPosts/{projectId}` stores `{ uid, projectId, title, hobby, imageURL, createdAt }`; Explore lists these.
- Detail view: Resolves owner via `publicPosts` and loads `users/{ownerUid}/projects/{projectId}`; read‑only for viewers.
- Learnings/Challenges: Ensure `projectId` is saved in `publicPosts` for robust deep-links; legacy posts may need re-share.

## Plan & Progress (AI milestones)
- Purpose: Convert projects into 5 actionable milestones with progress tracking.
- Implemented: Normalize any AI output to exactly 5 steps; persist on “Suggest Plan”; interactive progress bar; viewer read‑only.
- Where: `react/src/lib/ai.ts`, `react/src/components/PlanProgress.jsx`, `react/src/pages/ProjectDetail.jsx`.
- Learnings/Challenges: Normalize at edges; avoid placeholder-only plans; keep one source of truth in Firestore.

## Capstone: Purpose & Outcomes
- Purpose: Learn Firebase by building an end‑to‑end app combining Auth, Firestore, Storage, Functions, Hosting.
- What worked: Realtime snapshots; clean per-user data model; owner-only controls; persisted progress.
- Challenges: Hosting output path; callable vs HTTP (CORS); public→private owner resolution; robust media cleanup.
- Takeaways: Model data around ownership; persist file paths; use callable functions; enable offline persistence; build then host.
