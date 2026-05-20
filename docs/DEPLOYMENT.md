# NextUp Karaoke — Deployment Guide

## Overview

NextUp Karaoke deploys to Render using three services defined in `render.yaml`:

| Service | Type | Description |
|---|---|---|
| `nextup-backend` | Web Service (Python) | FastAPI backend + WebSocket server |
| `nextup-karaoke` | Static Site | React frontend |
| `nextup-redis` | Redis | Queue and session state persistence |

---

## First-Time Deploy to Render

### 1. Prerequisites
- A [Render](https://render.com) account (free tier works)
- This repository pushed to GitHub (or GitLab)

### 2. Connect and Deploy

1. In Render Dashboard, click **New → Blueprint**
2. Connect your GitHub repository
3. Render detects `render.yaml` and shows the three services to create
4. Click **Apply** — all three services are created and deployed automatically

### 3. Update Cross-Service URLs

After the first deploy, Render assigns actual URLs to your services. You need to update two environment variables:

**On `nextup-backend`:**
- `FRONTEND_URL` → set to the actual URL of your static site (e.g. `https://nextup-karaoke.onrender.com`)

**On `nextup-karaoke` (static site):**
- `VITE_API_URL` → set to the actual URL of your backend (e.g. `https://nextup-backend.onrender.com`)
- `VITE_APP_URL` → set to the actual URL of your static site (e.g. `https://nextup-karaoke.onrender.com`)

After updating the static site env vars, trigger a manual redeploy of the frontend (env vars are baked in at build time via Vite).

---

## Custom domain (e.g. nextupkaraoke.app)

When the frontend is served from your own domain but the API stays on `*.onrender.com`, the browser treats that as **cross-origin**. The backend must explicitly allow your frontend origin.

### Fix CORS errors

1. **Render → `nextup-backend` → Environment**
   - Set `FRONTEND_URL` to your public site origin **exactly** (no trailing slash):
     - `https://nextupkaraoke.app`
   - If guests can use both apex and `www`, use a comma-separated list:
     - `https://nextupkaraoke.app,https://www.nextupkaraoke.app`
   - Save changes — Render redeploys the backend automatically.

2. **Render → `nextup-karaoke` (static site) → Environment**
   - `VITE_API_URL` → `https://nextup-backend-cyct.onrender.com` (or `https://api.nextupkaraoke.app` if you add that custom domain on the backend)
   - `VITE_APP_URL` → `https://nextupkaraoke.app` (QR codes and share links)
   - **Manual Deploy** the static site after saving (Vite bakes env vars at build time).

3. **Redeploy the backend** after changing `FRONTEND_URL` (Render auto-redeploys on save; wait until status is **Live**).

4. **Verify CORS is actually active**

   ```bash
   # What origins did the running server load?
   curl -s https://nextup-backend-cyct.onrender.com/health

   # Must include access-control-allow-origin (not just allow-methods):
   curl -sD - -o /dev/null -H "Origin: https://nextupkaraoke.app" \
     https://nextup-backend-cyct.onrender.com/health | grep -i access-control
   ```

   You should see **both**:
   - `access-control-allow-origin: https://nextupkaraoke.app`
   - `access-control-allow-credentials: true`

   If you only see `allow-credentials` and `allow-methods` but **no** `allow-origin`, the live `FRONTEND_URL` still does not match your site (typo, trailing slash, old value, or deploy not finished).

5. **Verify in the browser**
   - Open [https://nextupkaraoke.app](https://nextupkaraoke.app), DevTools → Network.
   - Host a party or join; API calls should return `200`, not CORS errors.

### Why this happens

The app at `https://nextupkaraoke.app` calls `https://nextup-backend-cyct.onrender.com`. The browser sends `Origin: https://nextupkaraoke.app`. FastAPI’s CORS middleware only reflects origins listed in `FRONTEND_URL`. If that variable still says `https://nextup-karaoke.onrender.com`, the backend blocks the request.

---

## Local Development

### Backend

```bash
cd backend
uv sync
cp .env.example .env
# Edit .env if needed (REDIS_URL is optional — app runs without Redis)
uv run uvicorn main:app --reload
# Backend available at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Frontend available at http://localhost:5173
# Proxies /api and /ws to localhost:8000 automatically
```

### Redis (optional for local dev)

The app runs without Redis — queue state is held in memory. To test Redis persistence locally:

```bash
docker run -p 6379:6379 redis:alpine
# Then set REDIS_URL=redis://localhost:6379 in backend/.env
```

---

## How to Run a Party

1. **Host:** Open `https://nextup-karaoke.onrender.com/display` on the TV/projector
2. **Host:** Click **Start Party** (one-time click to enable browser autoplay)
3. **Guests:** Scan the QR code on the display, or navigate to `https://nextup-karaoke.onrender.com` on their phone
4. **Guests:** Enter their name and pick a display color, then tap **Join Party**
5. **Guests:** Search for songs and tap **Add** to queue them up
6. Songs play automatically; when one ends, the next starts

---

## Architecture Notes

### WebSocket
Render web services support WebSocket connections natively. No special proxy configuration is required. Active WebSocket connections are not subject to the 15-minute idle timeout — only connections with no traffic are dropped.

### Redis Persistence
The free Redis tier on Render has a 25 MB data limit and a 2-week data expiry. The queue for a single party is well within these limits. If Redis is unavailable at startup, the app starts with an empty queue (no crash).

### React Router on Static Sites
The `routes` rewrite rule in `render.yaml` rewrites all paths (`/*`) to `/index.html`. This is required for React Router to handle direct navigation to `/display`, `/search`, etc. Without it, those URLs would return 404.

### Autoplay Policy
Modern browsers block autoplay of videos with sound unless the page has received a user gesture. The **Start Party** button on the display screen is intentionally required — clicking it grants autoplay permission for the browser session. All subsequent songs (`loadVideoById`) play automatically without further interaction.

### YouTube Search
Song search uses `youtubesearchpython`, which scrapes YouTube's internal search API without requiring an API key. Results may occasionally differ from the official YouTube search. If search stops working, check for a newer version of the package.

---

## Environment Variables Reference

### Backend
| Variable | Required | Description |
|---|---|---|
| `REDIS_URL` | No | Redis connection string. Falls back to in-memory if not set. |
| `FRONTEND_URL` | Yes (prod) | Frontend origin(s) for CORS (e.g. `https://nextupkaraoke.app`). Comma-separated for multiple origins. |

### Frontend (build-time)
| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes (prod) | Backend base URL (e.g. `https://nextup-backend.onrender.com`) |
| `VITE_APP_URL` | No | Public URL of this app, used for the QR code on the display screen. Defaults to `window.location.origin`. |
