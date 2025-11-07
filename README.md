# hobbyHoarder

HobbyHoarder is a Firebase‑powered React app for tracking hobby projects, logging progress (with photos), and sharing selected projects publicly. The goal of the project is to learn Firebase by using many of its products together in a realistic, end‑to‑end app.

**Tech Stack**
- React (Vite) + Tailwind v4 (utility classes only)
- Firebase Web SDK v12
- Firebase Hosting for static SPA deploy

**Key Features**
- Email/password auth with protected routes.
- Projects CRUD under each user, with optional cover image upload to Storage.
- Progress logs per project with optional photo uploads.
- AI “Plan & Progress” (5 milestones) per project, persisted and toggleable.
- Explore (public feed) that lists projects shared to `publicPosts`.
- Offline‑first Firestore and live UI via realtime snapshots.

**Data Model (Firestore)**
- `users/{uid}`
  - `projects/{projectId}`: { title, hobby, imageURL, imagePath, plan[], createdAt, updatedAt }
    - `logs/{logId}`: { text, imageURL?, imagePath?, createdAt }
- `publicPosts/{projectId}`: { uid, projectId, title, hobby, imageURL, createdAt, updatedAt }

**Storage Paths**
- `users/{uid}/projects/{filename}` — project cover images
- `users/{uid}/projects/{projectId}/logs/{filename}` — log images

## Firebase Features Used (what and how)

**Authentication**
- Email/password sign‑in and registration; session tracked via `onAuthStateChanged` for redirects and Navbar display.
- Sign out action in Navbar; owner context drives all reads/writes to `users/{uid}/…`.

**Cloud Firestore (database)**
- Per‑user projects with logs; public feed at top‑level `publicPosts` for discovery.
- Realtime UI with `onSnapshot` for projects/logs/public posts; queries ordered by `createdAt` and client search.
- Server timestamps (`serverTimestamp`) on create/update; batches used to delete many docs (e.g., logs) safely.
- Offline persistence enabled plus long‑polling to improve local reliability.

**Firestore Security Rules**
- `users/{uid}` subtree: reads allowed to signed‑in users; writes only when `request.auth.uid == uid`.
- Nested `projects` and `logs` inherit owner‑only write rules; reads allowed to authenticated users.
- `publicPosts` is globally readable; writes allowed only when the doc `uid` matches `request.auth.uid`.

**Cloud Storage for Firebase**
- Uploads project cover images and log images; saved `imagePath` is used to delete files later.
- Robust delete flow removes all log images and the project image on project delete.
- Storage rules restrict writes to the owner and limit file size (10 MB) for both project and log paths.

**Cloud Functions for Firebase**
- Callable function `generatePlan` returns deterministic 5‑step plans (no external API; demo‑safe).
- Scheduled reminder (blueprint) queries stale projects and would send FCM notifications to user tokens.

**Firebase Cloud Messaging (Web Push)**
- Service worker placeholder registered; request permission + register token saved to `users/{uid}/tokens/{token}`.
- Tokens are intended for the reminder Cloud Function to notify users.

**Firebase Hosting**
- SPA built with Vite; Hosting serves `react/dist` and rewrites all routes to `/index.html`.
- Predeploy step builds the React app before upload.

## Getting Started (Local)

Prerequisites
- Node.js 18+ and npm
- Firebase CLI: `npm i -g firebase-tools`
- A Firebase project with config in `react/.env` (VITE_ vars)

Install & Run
- Install web app deps: `npm --prefix react install`
- (Optional) install functions deps: `npm --prefix functions install`
- Start dev server: `npm --prefix react run dev`

## Environment

Set these in `react/.env` (already present in this repo):
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_APP_ID`, etc.

## Deploy

Hosting (SPA)
- `firebase deploy --only hosting`
- firebase.json predeploy builds the app and serves from `react/dist` with SPA rewrites.

Security Rules
- Firestore: `firebase deploy --only firestore`
- Storage: `firebase deploy --only storage`

Functions (optional)
- `npm --prefix functions install`
- `firebase deploy --only functions`
- Note: Scheduled functions and FCM typically require billing enabled.

## Project Structure (high‑level)
- `react/src/pages` — Dashboard, ProjectDetail, ProjectNew, etc.
- `react/src/components` — UI (Navbar, Sidebar, Layout, Button, PlanProgress, Toast)
- `react/src/lib` — helpers (ai, plan, storage, notify)
- `firestore.rules` / `storage.rules` — security rules
- `functions/` — Cloud Functions source
- `firebase.json` — Hosting, Functions, and rules config

## Notes & Tips
- Public project deep‑links resolve the owner via `publicPosts/{projectId}` (contains `uid` and `projectId`).
- Owner‑only actions are hidden for viewers (no plan toggles, no add/delete logs).
- If a legacy public post doesn’t open, toggle “Share publicly” off/on once to write `projectId` to `publicPosts`.

---

This README is presentation‑ready: it summarizes the Firebase features used, the data model, how to run locally, and how to deploy safely without breaking the current flows.
