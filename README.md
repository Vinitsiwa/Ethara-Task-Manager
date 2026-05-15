# Vinit Task Hub

Full-stack workspace and work-item manager with **role-based access** (Admin / Member).  
**FastAPI** + **SQLAlchemy** + **JWT** backend, **React** + **TypeScript** + **Vite** frontend.

## Features

- **Authentication** — register, login, JWT sessions, protected routes
- **Workspaces** — admins create/update/delete; collaborators via membership table
- **Work items** — statuses **Pending**, **Active**, **Done**; priorities **Low**, **Medium**, **High**; deadlines; assignment
- **Overview** — totals by status, overdue count, high-priority count (scoped by role)
- **UI** — teal/zinc theme, DM Sans, mobile nav drawer, React Query, toast feedback

## Structure

```text
backend/
  main.py
  config.py
  routers/     auth, workspaces, work_items, overview, users
  models/      User, Workspace, WorkspaceMember, WorkItem
  schemas/     Pydantic validation
  database/    SQLAlchemy engine & sessions
  utils/       JWT, bcrypt, dependencies

frontend/src/
  pages/       login, register, overview, workspaces, workspace detail, work items
  components/  layout, navbar, nav panel, UI primitives
  services/    API client, auth context, query keys
```

## Environment

Copy `.env.example` to `.env`.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Default: `sqlite:///./vinit_taskhub.db`. On Railway use PostgreSQL (`postgresql+psycopg://...`). |
| `SECRET_KEY` | JWT secret. In production: ≥ 32 chars, not a placeholder. |
| `ENVIRONMENT` | `development` or `production` |
| `CORS_ORIGINS` | Comma-separated origins. Empty in production when UI and API share one host. |
| `PORT` | HTTP port (Railway sets this) |
| `VITE_API_URL` | Optional API base URL for separate frontend hosting |

## Local setup

**Prerequisites:** Python 3.12+, Node 20+

### Backend

```powershell
cd c:\path\to\VinitTaskManager
python -m venv .venv
.\.venv\Scripts\activate
pip install -r backend\requirements.txt
$env:PYTHONPATH = (Get-Location).Path
python -m uvicorn backend.main:app --reload --port 8000
```

- API: http://127.0.0.1:8000  
- Docs: http://127.0.0.1:8000/docs  

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

- UI: http://127.0.0.1:5173 (proxies `/api`, `/health`, `/ready` to port 8000)

## API summary

| Area | Base | Notes |
|------|------|-------|
| Auth | `/api/auth` | `POST /register`, `POST /login`, `GET /profile` |
| Workspaces | `/api/workspaces` | CRUD + `/collaborators` |
| Work items | `/api/work-items` | CRUD; members update **status** only |
| Overview | `/api/overview` | Aggregated stats |
| Users | `/api/users` | Admin directory for invites |
| Health | `/health`, `/ready` | Liveness & DB readiness |

## Railway deployment

1. Add **PostgreSQL** and copy `DATABASE_URL`.
2. Deploy from this repo using the root **Dockerfile** (`railway.json`).
3. Set `DATABASE_URL`, `SECRET_KEY` (≥ 32 chars), `ENVIRONMENT=production`.
4. Health check: `GET /health` (optionally `GET /ready` for DB).
5. The container serves the built React app from `/app/static`.

## Demo flow

1. **Register** as Admin at `/register`, then **sign in**.
2. Create a **workspace** (you are auto-added as collaborator).
3. Register a **Member** in another browser; note their user ID from the toast.
4. As Admin, open the workspace → **Collaborators** → invite the member from the directory.
5. Create a **work item** with assignee and priority.
6. As Member, update **status** on assigned items; compare **Overview** stats between roles.

## Submission checklist

- [ ] Live Railway URL
- [ ] GitHub repository link
- [ ] This README with your deployed URL filled in

---

Built by Vinit — task management with workspaces, collaborators, and role-based delivery tracking.
