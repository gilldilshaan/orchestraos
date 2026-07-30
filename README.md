# OrchestraOS

**Organizational Intelligence Platform** — transforms natural-language business objectives into executable strategies through a multi-agent AI system. Describe a business goal, and the platform compiles it, plans it, builds an organization, assesses risks, generates strategic recommendations, provides an executive dashboard, and surfaces 12 competitive-differentiation features plus 8 execution intelligence capabilities — all with human oversight.

## Architecture

```
┌──────────────────────────────────────────────────┐
│              Decision Surface                     │
│           (Next.js 15 Frontend)                   │
├──────────────────────────────────────────────────┤
│                 API Gateway                       │
│           (FastAPI + Python 3.12)                 │
├──────────────────────────────────────────────────┤
│              Agent Orchestrator                   │
│  PipelineSteps · Dependency DAG · Event Bus       │
├──────────────────────────────────────────────────┤
│                AI Kernel                          │
│  PromptManager · ModelRouter · OutputValidator    │
│  RetryEngine · CacheManager · Observability       │
│  TokenTracker · CostTracker · WorkflowStateMachine│
├──────────────────────────────────────────────────┤
│   Agent Layer (5 agents + Devil's Advocate)       │
│   Planner · Risk · Organization · Decision · DA   │
├──────────────────────────────────────────────────┤
│   12 Competitive Features (Readiness, Bottleneck, │
│   Dependency Engine, Scenario Simulator, etc.)    │
├──────────────────────────────────────────────────┤
│    LLM Providers (OpenAI, Anthropic, Gemini)      │
│    Dev fallback mode — no API keys required       │
└──────────────────────────────────────────────────┘
```

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Frontend     | Next.js 15, React 19, TypeScript    |
| Styling      | Tailwind CSS, shadcn/ui             |
| Backend      | Python 3.12+, FastAPI, Pydantic v2  |
| Database     | PostgreSQL 16, pgvector, SQLAlchemy |
| Cache        | Redis 7                             |
| LLM          | LiteLLM, OpenAI, Anthropic, Google  |
| Infra        | Docker, Docker Compose              |
| Real-time    | WebSockets                          |

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Python 3.12+ (for local development)
- Node.js 20+ (for local development)
- OpenAI / Anthropic API keys (optional — fallback mode works without them)

### Docker (Recommended)

```bash
cp .env.example .env
# Edit .env with your API keys (optional for dev)
docker compose up

# Backend:  http://localhost:8000
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Local Development

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\Activate.ps1 on Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

## Project Structure

```
orchestraos/
├── backend/
│   ├── app/
│   │   ├── agents/           # 5 AI agents + Devil's Advocate
│   │   ├── api/v1/           # Route handlers (55+ endpoints)
│   │   ├── database/         # SQLAlchemy, Alembic, UUIDv7
│   │   ├── kernel/           # AI Kernel (8 subsystems)
│   │   ├── llm/              # LLM abstraction (provider auto-detect)
│   │   ├── models/           # SQLAlchemy models (31+ tables)
│   │   ├── repositories/     # Data access layer (27 repos)
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── services/         # Business logic (18+ services)
│   │   ├── main.py           # App entrypoint
│   │   ├── config.py         # Pydantic Settings
│   │   ├── dependencies.py   # FastAPI Depends()
│   │   ├── exceptions.py     # OrchestraOSError hierarchy
│   │   ├── logging_.py       # structlog config
│   │   └── middleware.py     # CORS, security, request ID
│   ├── migrations/           # Alembic migrations
│   ├── prompts/              # 14 versioned prompt templates
│   ├── tests/                # 16+ unit + integration tests
│   └── Dockerfile
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utility functions
│   ├── providers/            # React context providers
│   ├── services/             # API client layer
│   ├── store/                # Zustand stores
│   ├── types/                # TypeScript types
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                 # AI development guide
└── README.md
```

## API Endpoints

### System
| Method | Endpoint                 | Description              |
| ------ | ------------------------ | ------------------------ |
| GET    | `/`                      | Root status              |
| GET    | `/health/system`         | System health            |
| GET    | `/health/ai`             | AI + Kernel stats        |
| GET    | `/health/organization`   | Organization health      |

### Objectives
| Method | Endpoint                         | Description                    |
| ------ | -------------------------------- | ------------------------------ |
| POST   | `/objectives`                    | Create objective               |
| GET    | `/objectives/{id}`               | Get objective                  |
| PATCH  | `/objectives/{id}`               | Update objective               |
| DELETE | `/objectives/{id}`               | Delete objective               |
| POST   | `/objectives/{id}/compile`       | Compile (AI)                   |
| POST   | `/objectives/{id}/full-pipeline` | Run full pipeline (async)      |
| GET    | `/objectives`                    | List objectives (paginated)    |

### Plans
| Method | Endpoint                       | Description              |
| ------ | ------------------------------ | ------------------------ |
| GET    | `/plans/{id}`                  | Get plan                 |
| POST   | `/plans/{id}/approve`          | Approve plan             |
| POST   | `/plans/{id}/replan`           | Adaptive replan          |
| GET    | `/plans/{id}/versions`         | List plan versions       |

### Organizations
| Method | Endpoint                                   | Description                  |
| ------ | ------------------------------------------ | ---------------------------- |
| POST   | `/organizations/generate`                  | Generate org structure (AI)  |
| GET    | `/organizations/{objective_id}`            | Get organization             |

### Risks
| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| POST   | `/risks`                    | Create risk              |
| GET    | `/risks/{id}`               | Get risk                 |
| GET    | `/risks/objective/{obj_id}` | List risks by objective  |

### Decisions
| Method | Endpoint                       | Description              |
| ------ | ------------------------------ | ------------------------ |
| POST   | `/objectives/{id}/decision`    | Create decision          |
| GET    | `/decisions`                   | List decisions           |
| GET    | `/decisions/{id}`              | Get decision             |
| POST   | `/decisions/{id}/approve`      | Approve decision         |
| POST   | `/decisions/{id}/reject`       | Reject decision          |
| POST   | `/decisions/{id}/review`       | Request review           |

### Dashboard
| Method | Endpoint                                          | Description                    |
| ------ | ------------------------------------------------- | ------------------------------ |
| GET    | `/dashboard/{objective_id}`                       | Aggregated dashboard           |
| GET    | `/features/{objective_id}/executive-dashboard`    | Executive dashboard (Features) |

### Feature Endpoints
| Method | Endpoint                                                | Description                  |
| ------ | ------------------------------------------------------- | ---------------------------- |
| POST   | `/features/{id}/readiness`                              | Business Readiness (AI)      |
| GET    | `/features/{id}/readiness`                              | Get readiness assessment     |
| POST   | `/features/{id}/missing-info`                           | Missing Info Check (AI)      |
| POST   | `/features/{id}/missing-info/refine`                    | Refine missing info          |
| GET    | `/features/{id}/missing-info`                           | Get missing info check       |
| POST   | `/features/{id}/devils-advocate`                        | Run Devil's Advocate (AI)    |
| GET    | `/features/{id}/devils-advocate/latest`                 | Get latest critique          |
| POST   | `/features/{id}/success-probability`                    | Calculate probability (AI)   |
| GET    | `/features/{id}/success-probability`                    | Get probability              |
| POST   | `/features/{id}/resource-gaps`                          | Analyze resource gaps (AI)   |
| GET    | `/features/{id}/resource-gaps`                          | Get gap analysis             |
| POST   | `/features/{id}/dependency-graph`                       | Build dependency graph (AI)  |
| GET    | `/features/{id}/dependency-graph`                       | Get dependency graph         |
| POST   | `/features/{id}/bottlenecks/scan`                       | Scan bottlenecks (AI)        |
| GET    | `/features/{id}/bottlenecks`                            | List bottlenecks             |
| POST   | `/features/{id}/bottlenecks/{bn_id}/resolve`            | Resolve bottleneck           |
| POST   | `/features/{id}/decision-memory`                        | Record decision memory       |
| GET    | `/features/{id}/decision-memory`                        | List decision memory         |
| GET    | `/features/{id}/decision-memory/{mem_id}`               | Get memory entry             |
| POST   | `/features/{id}/scenarios/simulate`                     | Scenario simulator (AI)      |
| GET    | `/features/{id}/scenarios`                              | List scenarios               |
| GET    | `/features/{id}/scenarios/{scenario_id}`                | Get scenario                 |
| POST   | `/features/{id}/explainable-ai`                         | Generate explanation (AI)    |
| GET    | `/features/{id}/explainable-ai/{entity_type}/{entity}`  | Get explanations             |
| GET    | `/features/kernel/stats`                                | AI Kernel statistics         |
| POST   | `/features/kernel/reset`                                | Reset kernel metrics         |
| POST   | `/features/{id}/replan`                                 | Adaptive replan (AI)         |
| GET    | `/features/{id}/replan`                                 | Get replan history           |

### Real-time
| Type     | Endpoint               | Description                   |
| -------- | ---------------------- | ----------------------------- |
| WebSocket| `ws://host/ws/{obj}`   | Live dashboard updates        |

### Jobs (Async)
| Method | Endpoint        | Description       |
| ------ | --------------- | ----------------- |
| GET    | `/jobs/{id}`    | Poll job status   |

### Execution Intelligence (Sprint 8)

#### Agent Communication
| Method | Endpoint                                              | Description                            |
| ------ | ----------------------------------------------------- | -------------------------------------- |
| POST   | `/intelligence/messages`                              | Send agent-to-agent message            |
| GET    | `/intelligence/messages/{objective_id}`               | List messages for objective            |
| GET    | `/intelligence/messages/{objective_id}/conversation`  | Get conversation between two agents    |
| POST   | `/intelligence/messages/{message_id}/read`            | Mark message as read                   |
| GET    | `/intelligence/messages/{objective_id}/unread/{agent}`| Count unread messages for agent        |
| POST   | `/intelligence/conflicts`                             | Report agent conflict                  |
| GET    | `/intelligence/conflicts/{objective_id}`              | List conflicts                         |
| POST   | `/intelligence/conflicts/{conflict_id}/resolve`       | Resolve conflict                       |

#### Approval Gates
| Method | Endpoint                                   | Description                    |
| ------ | ------------------------------------------ | ------------------------------ |
| POST   | `/intelligence/gates`                      | Create approval gate           |
| GET    | `/intelligence/gates/{objective_id}`       | List gates                     |
| GET    | `/intelligence/gates/{objective_id}/pending`| List pending gates             |
| POST   | `/intelligence/gates/{gate_id}/review`     | Approve/reject/request-changes |

#### Checkpoints & Resilience
| Method | Endpoint                                             | Description                       |
| ------ | ---------------------------------------------------- | --------------------------------- |
| POST   | `/intelligence/checkpoints`                          | Save execution checkpoint         |
| GET    | `/intelligence/checkpoints/{objective_id}`           | Get checkpoint                    |
| POST   | `/intelligence/checkpoints/{objective_id}/resume`    | Resume from checkpoint            |
| POST   | `/intelligence/alerts`                               | Create watchdog alert             |
| GET    | `/intelligence/alerts/{objective_id}`                | List alerts                       |
| GET    | `/intelligence/alerts/{objective_id}/unresolved`     | List unresolved alerts            |
| POST   | `/intelligence/alerts/{alert_id}/acknowledge`        | Acknowledge alert                 |
| POST   | `/intelligence/alerts/{alert_id}/resolve`            | Resolve alert                     |
| GET    | `/intelligence/alerts/counts`                        | Global alert counts               |

#### Self-Healing
| Method | Endpoint                                        | Description                     |
| ------ | ----------------------------------------------- | ------------------------------- |
| POST   | `/intelligence/healing/actions`                 | Record healing action           |
| GET    | `/intelligence/healing/actions/{objective_id}`  | List healing actions            |
| GET    | `/intelligence/healing/stats/{objective_id}`    | Healing success stats           |
| POST   | `/intelligence/healing/auto`                    | Auto-heal from error            |

#### Operations Center
| Method | Endpoint                              | Description               |
| ------ | ------------------------------------- | ------------------------- |
| GET    | `/intelligence/operations/summary`    | Global operations summary |

## Features

### 12 Competitive-Differentiation Features

| #  | Feature                | Description                                      |
| -- | ---------------------- | ------------------------------------------------ |
| 1  | Business Readiness     | Assesses market, tech, budget, team, timeline    |
| 2  | Missing Info Detector  | Identifies gaps + generates clarification Qs     |
| 3  | Devil's Advocate       | Challenges strategy with adversarial critique    |
| 4  | Success Probability    | Scores success likelihood with factor breakdown  |
| 5  | Resource Gap Analysis  | Identifies resource deficits by category         |
| 6  | Dependency Engine      | Builds dependency graph + critical path          |
| 7  | Bottleneck Detection   | Scans + resolves bottlenecks by severity         |
| 8  | Executive Dashboard    | Unified view across all features                 |
| 9  | Decision Memory        | Records + recalls past decisions                 |
| 10 | Adaptive Replanning    | Auto-replans on change + records memory          |
| 11 | Scenario Simulator     | What-if simulations with trade-off analysis      |
| 12 | Explainable AI         | Structured reasoning + evidence for every AI op  |

### AI Infrastructure (10 Improvements)

| #  | Component             | Description                                      |
| -- | --------------------- | ------------------------------------------------ |
| 1  | AI Kernel             | 8 subsystems orchestrating all LLM calls         |
| 2  | Agent Orchestrator    | Pipeline DAG with retry + partial failure        |
| 3  | Shared Context        | ExecutionContext consumed by all agents          |
| 4  | Prompt Versioning     | 14 versioned `.md` templates in `backend/prompts/`|
| 5  | Output Validation     | JSON repair → Pydantic → Business Rules pipeline |
| 6  | Event Bus             | Pub/sub for inter-agent communication            |
| 7  | Observability         | Tracks latency, tokens, cost, retries per call   |
| 8  | State Machine         | 16 explicit workflow states with transitions     |
| 9  | RBAC                  | 5 roles (founder→viewer), 12 permissions         |
| 10 | WebSockets            | Real-time dashboard updates via EventBus         |

### Agents

- **PlannerAgent** — creates Plan + Milestones
- **RiskAgent** — identifies Risk records
- **OrganizationAgent** — creates Department + Role records
- **DecisionAgent** — creates Decision + DecisionOption records
- **DashboardAgent** — aggregates execution state
- **DevilsAdvocateAgent** — challenges strategy with critique

All agents use `AIKernel.run()` for consistency, observability, caching, and retry.

## Sprint 8 — Execution Intelligence System

### 8 Capabilities

| # | Capability                  | Description                                              |
| -- | --------------------------- | -------------------------------------------------------- |
| 1  | Agent Communication         | Structured agent-to-agent messaging with conversations   |
| 2  | Collaboration Timeline      | Chronological feed of inter-agent exchanges in Mission Control |
| 3  | Conflict Resolution         | Detect, highlight, and resolve agent disagreements inline |
| 4  | Human Approval Workflows    | Approval gates that pause execution until human reviews   |
| 5  | Long-Running Executions     | Checkpoint/resume — persist state mid-pipeline           |
| 6  | Execution Watchdog          | Stall/infinite-retry/dependency-failure detection         |
| 7  | Self-Healing Executions     | Auto-retry, fallback model, alternate agent, repair       |
| 8  | Executive Operations Center | Global dashboard — health score, agents, alerts, costs    |

### Frontend

- **Operations Center** (`/operations`) — live summary of all objectives, agents, health score, pending approvals, alerts, success rate
- **Mission Control** (`/execution`) — 4 integrated panels: CollaborationFeed, ConflictPanel, ApprovalPanel, WatchdogAlerts — all collapsible in the right inspector
- All panels poll in real-time with React Query refetch intervals

## Code Quality

```bash
cd backend
pytest                          # 16+ unit tests
pytest --cov=app --cov-report=term-missing  # coverage
ruff check .                    # linting
mypy app                        # type checking
```

## Git Workflow

- **Branch**: `ai-lead` (active development)
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.)
- **No direct commits to `main`** — feature branches only

## License

MIT
