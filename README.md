# OrchestraOS

**Organizational Intelligence Platform** — transforming business objectives into autonomous execution through AI orchestration.

## Architecture

```
┌─────────────────────────────────────────────┐
│              Decision Surface                │
│           (Next.js 15 Frontend)              │
├─────────────────────────────────────────────┤
│               API Gateway                    │
│           (FastAPI + Python 3.12)            │
├─────────────────────────────────────────────┤
│               AI Kernel                      │
│    Scheduler · Memory · Message Bus          │
├─────────────────────────────────────────────┤
│   Planner · Risk · Simulation · Evidence     │
├─────────────────────────────────────────────┤
│    Dynamic Agent Departments                 │
├─────────────────────────────────────────────┤
│    LLM Providers (OpenAI, Anthropic, Google) │
└─────────────────────────────────────────────┘
```

## Tech Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Frontend   | Next.js 15, React 19, TypeScript  |
| Styling    | Tailwind CSS, shadcn/ui           |
| Backend    | Python 3.12, FastAPI, Pydantic v2 |
| Database   | PostgreSQL (Supabase), pgvector   |
| Cache      | Redis                             |
| LLM        | LiteLLM, OpenAI, Anthropic, Google|
| Infra      | Docker, Docker Compose            |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.12+ (for local development)
- Node.js 20+ (for local development)
- Supabase account (free tier)
- OpenAI / Anthropic API keys

### Docker (Recommended)

```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your API keys

# Start all services
docker compose up

# Backend:  http://localhost:8000
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Local Development

#### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
orchestraos/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # Route handlers
│   │   ├── core/            # Business logic
│   │   ├── database/        # SQLAlchemy, Alembic
│   │   ├── kernel/          # AI Kernel (future)
│   │   ├── llm/             # LLM abstraction (future)
│   │   ├── memory/          # Memory management (future)
│   │   ├── middleware/      # Custom middleware
│   │   ├── models/          # SQLAlchemy models
│   │   ├── repositories/    # Data access layer
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business services
│   │   ├── workers/         # Background tasks
│   │   ├── main.py          # App entrypoint
│   │   ├── config.py        # Settings
│   │   ├── database.py      # DB session
│   │   ├── dependencies.py  # DI
│   │   ├── exceptions.py    # Error types
│   │   ├── logging_.py      # Structured logging
│   │   ├── middleware.py    # Middleware setup
│   │   └── redis_client.py  # Redis client
│   ├── migrations/          # Alembic migrations
│   ├── tests/
│   └── Dockerfile
├── frontend/
│   ├── app/                 # Next.js App Router
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   ├── providers/           # React providers
│   ├── services/            # API clients
│   ├── store/               # Zustand stores
│   ├── types/               # TypeScript types
│   └── Dockerfile
├── docs/                    # Architecture docs
├── scripts/                 # Dev scripts
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints

### Public API (`/api/v1`)

| Method | Endpoint                       | Description               |
| ------ | ------------------------------ | ------------------------- |
| GET    | `/health/system`               | System health             |
| GET    | `/health/ai`                   | AI module health          |
| GET    | `/health/organization`         | Organizational health     |
| POST   | `/objectives`                  | Create objective          |
| GET    | `/objectives/:id`              | Get objective             |
| POST   | `/objectives/:id/generate`     | Generate plan (async)     |
| GET    | `/plans/:id`                   | Get plan                  |
| POST   | `/plans/:id/approve`           | Approve plan              |
| GET    | `/dashboard/:objectiveId`      | Aggregated dashboard      |
| GET    | `/decisions`                   | List decisions            |
| GET    | `/decisions/:id`               | Get decision              |
| POST   | `/decisions/:id/approve`       | Approve decision          |
| POST   | `/decisions/:id/reject`        | Reject decision           |
| GET    | `/jobs/:id`                    | Poll job status           |

## Code Quality

- **Python**: ruff (lint), mypy (types), pytest (tests)
- **TypeScript**: ESLint, Prettier, strict TypeScript
- **Pre-commit**: Formatting and linting on every commit

## License

MIT
