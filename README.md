# CausalFunnel — User Analytics

A session tracking pipeline: a dependency-free browser tracker, a Node/Mongo event API, a React dashboard, and a demo storefront that generates real traffic.

Live flow: visit `/demo/` → clicks and page views land in Mongo → dashboard shows sessions and click heatmaps within seconds.

## Tech stack

- Tracker: vanilla JS, zero dependencies (`tracker/causalfunnel.js`)
- API: Node 20, Express 4, Mongoose 8, Zod 3, Helmet, express-rate-limit, Morgan
- Store: MongoDB 7
- Dashboard: React 18, Vite 5
- Demo: three static shop pages (`demo/`)
- Run: docker-compose (mongo + api + dashboard)

## Run it

Prerequisites: Docker + Docker Compose, or Node 20 + a local MongoDB.

One command (recommended):

```bash
docker compose up --build
```

Then open:

- Dashboard → http://localhost:5173
- Demo store → http://localhost:4000/demo/
- API health → http://localhost:4000/health
- Tracker → http://localhost:4000/tracker.js

Generate your first session: open the demo store, click through Home → Product → Checkout, then refresh the dashboard. Sessions auto-refresh every 10 seconds.

Optional seed data (so the dashboard isn't empty on first open):

```bash
docker compose exec api npm run seed
```

Manual run without Docker:

```bash
# terminal 1 — api (needs Mongo on localhost:27017)
cd server && cp .env.example .env && npm install && npm run seed && npm run dev

# terminal 2 — dashboard (Vite bakes VITE_API_URL in at build time, so set it before `npm run build`)
cd dashboard && npm install && npm run dev
```

## Deploy

Three free tiers, no card required: **MongoDB Atlas M0** for the database, **Render** for the API, **Vercel** for the dashboard.

### 1. Database — MongoDB Atlas (free M0)

Sign up at cloud.mongodb.com, create a free cluster, then **Database Access → Add New Database User** and
**Network Access → Allow access from anywhere** (`0.0.0.0/0`) so the hosted API can reach it.
Copy the connection string and swap the password placeholder:

```
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/causalfunnel?retryWrites=true&w=majority
```

### 2. API + demo store + tracker — Render (free)

`render.yaml` is a ready blueprint. Either connect the repo at
[dashboard.render.com/blueprint](https://dashboard.render.com/blueprint) or run:

```bash
render login
render blueprint launch
```

Set `MONGODB_URI` to the Atlas string when prompted. When it finishes you get an origin like
`https://causalfunnel-api.onrender.com` which serves the API, the demo store at `/demo/`, and the
tracker at `/tracker.js`.

Free-tier services idle out after 15 minutes and take roughly a minute to wake. The dashboard already
shows an "api unreachable" state while it does, and recovers on its own.

### 3. Dashboard — Vercel (free)

```bash
npm i -g vercel
vercel login
cd dashboard
vercel --prod --build-env VITE_API_URL=https://causalfunnel-api.onrender.com
```

Vercel detects the Vite preset. `VITE_API_URL` is baked in at build time — omitting it on a hosted
build shows a red configuration banner instead of silently calling `localhost`.

### Seed the hosted database

```bash
cd server
MONGODB_URI="mongodb+srv://..." npm run seed
```

### Hosting notes

- `trust proxy` is enabled, so per-IP rate limiting sees the real client rather than the platform proxy.
- `bufferCommands` is off, so a database outage returns an error instead of hanging a request.
- Set `CORS_ORIGIN` to the deployed dashboard origin to lock cross-origin reads to your own front end.
- On a serverless host set `DB_CONNECT_ATTEMPTS=1` so cold starts fail fast rather than retrying past
  the function timeout.

| Service  | Local URL               |
|----------|-------------------------|
| Dashboard| http://localhost:5173   |
| API      | http://localhost:4000   |
| Demo     | http://localhost:4000/demo/ |

## Tracker snippet

Drop this on any page. With no `data-api`, events post to the page's own origin — correct whenever the API serves the page, with no configuration.

```html
<script src="http://localhost:4000/tracker.js" data-api="http://localhost:4000" defer></script>
```

Set `data-api` only when the tracker is loaded cross-origin from a separate API host. For SPAs, call `window.causalfunnel.page()` after each route change. Session id is exposed via `window.causalfunnel.session()` and persisted in `localStorage` (`cf_session_id`) with a cookie fallback.

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/events` | Ingest one event (`sessionId`, `type`, `pageUrl`, `timestamp?`, `x?`, `y?`, `xNorm?`, `yNorm?`, `viewportW/H?`, `targetLabel?`) |
| GET | `/api/events/recent?limit=` | Newest events across sessions for the live wire (cap 100) |
| GET | `/api/sessions?page=&limit=` | Sessions with `totalEvents`, `pageViews`, `clicks`, `firstSeen`, `lastSeen` |
| GET | `/api/sessions/:sessionId` | Ordered events for one session (cap 500) |
| GET | `/api/pages` | Distinct page URLs with totals (heatmap selector) |
| GET | `/api/heatmaps?url=` | Click points for one page (cap 2000, newest first) |
| GET | `/api/stats` | Totals for the dashboard header |
| GET | `/api/stats/timeline?hours=` | Per-hour view/click buckets for the activity chart (1–168h) |
| GET | `/health` | Liveness |

Validation is Zod at the route boundary; failures return 400 with field details. Ingestion is rate-limited to 600 req/min per IP.

## Assumptions and trade-offs

- No auth on ingestion by design (assignment scope). Mitigation is validation + rate limiting + a 64kb body cap. A production version would add per-site API keys and origin allowlists.
- `sessionId` is client-generated and therefore spoofable. Accepted because sessions are analytics, not access control.
- Heatmap positions are plotted from normalized 0–1000 coords (`xNorm`/`yNorm`) so mixed viewports align; raw pixels are kept for audit. A production heatmap would render over a real page screenshot instead of a schematic frame.
- Session listing is an aggregation over the events collection — correct at this scale, and indexed (`sessionId+timestamp`, `pageUrl+type`). Past ~10M events it should move to a precomputed sessions collection.
- Tracker sends each event with `sendBeacon` (fetch keepalive fallback) and never throws into the host page. Batching is a 300ms debounce, not a persistent queue — pagehide flushes, offline events are dropped rather than stored unbounded.
