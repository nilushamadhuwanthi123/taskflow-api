![CI](https://github.com/nilushamadhuwanthi123/taskflow-api/actions/workflows/ci.yml/badge.svg)

# TaskFlow API

TaskFlow API is a JWT-authenticated task/todo management REST API built with Node.js, Express, and MongoDB. It exists primarily as a **DevOps / CI-CD showcase**: the goal isn't just a working backend, but a genuine containerized service with an automated test-and-build pipeline behind it. Every push and pull request to `main` runs lint, a real integration test suite, and a Docker build sanity check via GitHub Actions (CI); merges to `main` are then auto-deployed to [Render](https://render.com) directly from the same Dockerfile using Render's native Docker auto-deploy (CD) — no separate deploy scripts or manual steps involved.

## Features

- JWT-based authentication (register/login) with bcrypt password hashing
- Short-lived access tokens with a rotating refresh-token flow (`/api/auth/refresh`, `/api/auth/logout`) — refresh tokens are stored only as a SHA-256 hash and rotate on every use
- Full task CRUD scoped to the authenticated user (ownership enforced on every read/write)
- Filtering task lists by `status` and `priority`, with pagination (`page`, `limit`) and sorting (`sort`)
- Centralized error handling with a consistent JSON error shape
- Real request validation (`express-validator`) on every write endpoint
- Rate limiting on auth routes (`express-rate-limit`)
- Security headers via `helmet`, configurable CORS
- `/health` endpoint for container orchestration and uptime checks
- `/api/stats` endpoint exposing lightweight, in-memory request metrics (totals, per-method and per-status-class breakdowns, current auth rate-limit config) for basic operational visibility
- Integration test suite (Jest + Supertest) against a real in-memory MongoDB (`mongodb-memory-server`) — no external database required to run tests
- Multi-stage, non-root Dockerfile with a `HEALTHCHECK`
- `docker-compose.yml` for one-command local development (API + MongoDB)
- GitHub Actions CI: lint → test → docker build, on every push/PR to `main`

## API Endpoint Reference

| Method | Path                | Auth required | Body                                                              | Description                                  |
|--------|---------------------|:-------------:|--------------------------------------------------------------------|-----------------------------------------------|
| GET    | `/health`            | No            | —                                                                    | Health check (`{ status, uptime, timestamp }`) |
| GET    | `/api/stats`          | No            | —                                                                    | Request metrics: totals, per-method/status breakdown, auth rate limit |
| POST   | `/api/auth/register`| No            | `{ name, email, password }`                                        | Create a new user account, returns a JWT      |
| POST   | `/api/auth/login`    | No            | `{ email, password }`                                               | Authenticate, returns an access + refresh token |
| POST   | `/api/auth/refresh`  | No*           | `{ refreshToken }`                                                   | Exchange a valid refresh token for a new pair (rotates it) |
| POST   | `/api/auth/logout`   | Yes           | —                                                                    | Revoke the current user's refresh token       |
| POST   | `/api/tasks`         | Yes           | `{ title, description?, status?, priority?, dueDate? }`             | Create a task owned by the current user       |
| GET    | `/api/tasks`         | Yes           | — (`?status=`, `?priority=`, `?page=`, `?limit=`, `?sort=`)          | List the current user's tasks (paginated, sortable) |
| GET    | `/api/tasks/:id`     | Yes           | —                                                                    | Get a single task (must be owned by the user) |
| PUT    | `/api/tasks/:id`     | Yes           | Any of `{ title, description, status, priority, dueDate }`         | Update a task (must be owned by the user)     |
| DELETE | `/api/tasks/:id`     | Yes           | —                                                                    | Delete a task (must be owned by the user)     |

Authenticated requests send `Authorization: Bearer <token>`. `status` is one of `todo` \| `in-progress` \| `done`; `priority` is one of `low` \| `medium` \| `high`.

`register` and `login` return both a short-lived `token` (access token) and a longer-lived `refreshToken`. When the access token expires, `POST /api/auth/refresh` exchanges a valid refresh token for a brand-new pair — the refresh token used is immediately invalidated (rotation), so it can't be replayed. `POST /api/auth/logout` revokes the current refresh token outright.

## Architecture

```
src/
├── app.js              # Express app: middleware + routes (no listen() — importable by tests)
├── server.js            # Loads env, connects to MongoDB, starts app.js listening
├── config/
│   └── db.js             # Mongoose connection helper
├── models/
│   ├── User.js            # User schema, password hashing, comparePassword
│   └── Task.js             # Task schema
├── controllers/
│   ├── authController.js  # register / login handlers
│   ├── taskController.js  # task CRUD handlers, ownership checks
│   └── statsController.js # /api/stats handler
├── middleware/
│   ├── auth.js             # JWT verification -> req.user
│   ├── validate.js          # express-validator error formatter
│   ├── errorHandler.js       # centralized error -> JSON response
│   ├── trackMetrics.js        # records every request into utils/metrics
│   └── asyncHandler.js        # wraps async route handlers
├── utils/
│   ├── ApiError.js          # typed HTTP error
│   └── metrics.js            # in-memory request counters backing /api/stats
└── routes/
    ├── authRoutes.js         # /api/auth/* (+ rate limiting)
    ├── taskRoutes.js          # /api/tasks/* (+ validation, protected)
    ├── healthRoutes.js         # /health
    └── statsRoutes.js          # /api/stats
```

`app.js` and `server.js` are deliberately split: `app.js` exports the configured Express app without binding a port, so the test suite can `require('../src/app')` and drive it with Supertest directly, while `server.js` is the thin entrypoint that actually connects to MongoDB and listens.

**CI/CD flow:** GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main` — checkout → install → `eslint` → `jest` (against `mongodb-memory-server`, no external services needed) → `docker build` as a build-correctness gate. Nothing is pushed to a registry from CI. On a successful merge to `main`, Render pulls the repository and builds/deploys the same `Dockerfile` automatically (Render's native Docker auto-deploy) — the pipeline that gates code in CI is the same Dockerfile that ships to production.

## Run locally

### Option 1: Docker Compose (recommended)

```bash
cp .env.example .env   # optional locally, compose sets its own env vars for the containers
docker compose up --build
```

This starts the API on `http://localhost:5000` and a MongoDB instance, wired together by service name (`mongo`), with a named volume for MongoDB data and a healthcheck-gated `depends_on` so the API waits for MongoDB to be ready.

### Option 2: Node directly

```bash
cp .env.example .env   # then edit MONGO_URI to point at a running MongoDB instance
npm install
npm run dev
```

`npm run dev` uses `nodemon` for auto-restart on file changes. `npm start` runs the same entrypoint without nodemon.

## Run tests

```bash
npm install
npm test
```

Tests use `mongodb-memory-server` to spin up a real, ephemeral MongoDB instance in-process — no Docker, no external database, and no network-dependent test database is required. This is also exactly what runs in CI.

## Environment Variables

See [`.env.example`](./.env.example) for the full template. Never commit a real `.env` file.

| Variable          | Description                                             | Example                                      |
|-------------------|-----------------------------------------------------------|-----------------------------------------------|
| `PORT`            | Port the HTTP server listens on                            | `5000`                                        |
| `NODE_ENV`        | Runtime environment                                         | `development` \| `production` \| `test`      |
| `MONGO_URI`       | MongoDB connection string                                   | `mongodb://mongo:27017/taskflow`             |
| `JWT_SECRET`      | Secret used to sign/verify access-token JWTs                  | a long random string                          |
| `JWT_EXPIRES_IN`  | Access token expiry                                            | `7d`                                          |
| `JWT_REFRESH_SECRET` | Secret used to sign/verify refresh-token JWTs (must differ from `JWT_SECRET`) | a different long random string |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry                                     | `30d`                                         |
| `CORS_ORIGIN`     | Comma-separated allowed CORS origins, or `*` for any          | `https://myapp.com,https://admin.myapp.com`  |

## Live API

**Live API:** https://taskflow-api-zvwb.onrender.com — try `GET /health` for a quick liveness check. Deployed on Render's free tier via `render.yaml` (Docker auto-deploy from `main`); the instance spins down after inactivity, so the first request after idle time can take up to ~50 seconds.

## License

MIT
