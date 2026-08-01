# OrchestraOS — AI Development Guide

## Project Overview

OrchestraOS is an AI-powered Organizational Intelligence Platform. It transforms natural-language business objectives into executable strategies through a multi-agent AI system. Users describe a business goal, and the platform compiles it, plans it, builds an organization, assesses risks, generates strategic recommendations, and provides an executive dashboard — all with human oversight.

## Technology Stack

### Frontend
- **Next.js 15** with App Router
- **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **shadcn/ui** for component primitives
- **React Query** (TanStack Query) for server state
- **Zustand** for client state

### Backend
- **Python 3.12+** with async throughout
- **FastAPI** for REST API (OpenAPI docs at `/docs`)
- **SQLAlchemy 2.0** (async) with `MappedAsDataclass` style
- **Pydantic v2** for request/response schemas
- **PostgreSQL 16** with pgvector extension
- **Alembic** for schema migrations
- **Redis 7** for caching and job queuing
- **asyncpg** for database driver

### AI
- **LiteLLM** for multi-provider LLM access
- **OpenAI** (gpt-4o), **Anthropic**, **Google Gemini** support
- **Dev fallback mode**: rule-based mock responses when no API keys set
- Multi-agent architecture (Planner, Risk, Organization, Decision, Devil's Advocate)

### Infrastructure
- **Docker Compose** (PostgreSQL, Redis, backend, frontend)
- **GitHub Actions** for CI/CD

### Code Quality
| Tool | Purpose |
|------|---------|
| `ruff` | Linting and formatting (line-length 100, double quotes) |
| `mypy` | Static type checking (strict mode) |
| `pytest` | Testing (async mode auto, testpaths: `tests/`) |
| `pytest-cov` | Coverage reporting |
| `pytest-asyncio` | Async test support |

## Coding Conventions

### Python

- **Target**: Python 3.12+
- **Formatting**: `ruff` with line-length 100, double quotes
- **Imports**: standard library → third-party → local (alphabetical within groups)
- **Types**: always annotated. Use `| None` syntax, not `Optional[]`
- **Async**: all database operations are async. Use `async def` everywhere
- **Naming**:
  - Classes: `PascalCase` (models, repositories, services, schemas)
  - Functions/methods: `snake_case`
  - Private methods: `_leading_underscore`
  - Constants: `UPPER_SNAKE_CASE`
- **Error handling**: custom `OrchestraOSError` hierarchy in `app/exceptions.py`
- **Logging**: structlog with JSON format, request-id injection via middleware
- **Strings**: f-strings preferred; `.format()` only for complex templates
- **File header**: `from __future__ import annotations` at the top of every file

### TypeScript

- **Strict mode**: `strict: true` in tsconfig
- **Naming**: `camelCase` for variables/functions, `PascalCase` for components/types
- **Components**: functional components with hooks, no class components
- **State**: Zustand for global, React Query for server, local state for ephemeral
- **API calls**: service layer abstracts fetch, not inlined in components

## Folder Structure

```
orchestraos/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI app factory, lifespan, middleware
│   │   ├── config.py                # Pydantic Settings (singleton)
│   │   ├── dependencies.py          # FastAPI Depends() — trace_id, auth, redis health
│   │   ├── exceptions.py            # OrchestraOSError base + 12 subclasses
│   │   ├── logging_.py              # structlog configuration
│   │   ├── middleware.py            # CORS, SecurityHeaders, RequestID, error handlers
│   │   ├── redis_client.py          # Async Redis singleton wrapper
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py        # Aggregates all v1 routers
│   │   │       ├── health.py        # GET /health/system, /ai, /organization
│   │   │       ├── objectives.py    # CRUD + compile + full pipeline
│   │   │       ├── plans.py         # GET, approve, replan, versions
│   │   │       ├── organizations.py # GET, generate org structure
│   │   │       ├── decisions.py     # CRUD, approve, reject, review
│   │   │       ├── dashboard.py     # Aggregated dashboard per objective
│   │   │       ├── jobs.py          # Poll job status
│   │   │       └── features.py      # All 12 feature endpoints
│   │   ├── agents/
│   │   │   ├── __init__.py          # BaseAgent abstract class + _save_explanation
│   │   │   ├── tasks.py             # PlannerAgent, RiskAgent, OrganizationAgent, DecisionAgent, DashboardAgent
│   │   │   └── devils_advocate_agent.py  # Devil's Advocate critique agent
│   │   ├── database/
│   │   │   ├── base.py              # DeclarativeBase
│   │   │   ├── session.py           # async engine, session factory, get_session
│   │   │   └── uuid7.py             # UUIDv7 generator
│   │   ├── llm/
│   │   │   ├── __init__.py
│   │   │   └── client.py            # LLMClient — provider detection, fallback, generate, generate_structured
│   │   ├── models/
│   │   │   ├── base.py              # BaseEntity mixin (id, created_at, updated_at, deleted_at, version, metadata, ...)
│   │   │   ├── user.py              # User model
│   │   │   ├── objective.py         # Objective model
│   │   │   ├── job.py               # Job model
│   │   │   ├── extensions.py        # 17 extended models (Plan, Milestone, Department, Role, Risk, Decision, ...)
│   │   │   └── features.py          # 8 feature models (BusinessReadiness, MissingInfoCheck, ...)
│   │   ├── repositories/
│   │   │   ├── base.py              # BaseRepository[T] — 8 generic CRUD methods
│   │   │   ├── user_repository.py
│   │   │   ├── objective_repository.py
│   │   │   ├── job_repository.py
│   │   │   ├── extensions_repository.py   # 13 repos for extended models
│   │   │   └── features_repository.py     # 8 repos for feature models
│   │   ├── schemas/
│   │   │   ├── __init__.py          # All core schemas + enums
│   │   │   └── features.py          # All feature schemas
│   │   ├── services/
│   │   │   ├── objective_compiler.py      # ObjectiveCompilerService, run_full_pipeline
│   │   │   ├── engine.py                  # SimulationEngine, AdaptiveReplanningService, KnowledgeGraphService, DashboardAggregator, ExplanationService
│   │   │   ├── business_readiness.py      # Feature 1
│   │   │   ├── missing_info_detector.py   # Feature 2
│   │   │   ├── success_probability.py     # Feature 4
│   │   │   ├── resource_gap.py            # Feature 5
│   │   │   ├── dependency_engine.py       # Feature 6
│   │   │   ├── bottleneck_detection.py    # Feature 7
│   │   │   ├── decision_memory.py         # Feature 9
│   │   │   ├── scenario_simulator.py      # Feature 11
│   │   │   └── explainable_ai.py          # Feature 12
│   │   ├── core/                    # Future AI Kernel
│   │   ├── kernel/                  # Future kernel modules
│   │   ├── memory/                  # Future memory management
│   │   ├── workers/                 # Future background workers
│   │   └── utils/                   # Utility modules
│   ├── migrations/
│   │   ├── versions/                # Timestamped migration files
│   │   ├── env.py                   # Async Alembic environment
│   │   ├── alembic.ini
│   │   └── script.py.mako
│   ├── tests/
│   │   ├── conftest.py              # Fixtures (session, integration marker)
│   │   ├── test_models.py           # 39 unit tests
│   │   ├── test_repositories.py      # Integration tests (marked @integration)
│   │   ├── test_migrations.py       # Schema migration tests
│   │   └── test_features.py         # Feature schema unit tests
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── app/                         # Next.js App Router pages
│   ├── components/                  # React components
│   ├── hooks/                       # Custom React hooks
│   ├── lib/                         # Utility functions
│   ├── providers/                   # React context providers
│   ├── services/                    # API client layer
│   ├── store/                       # Zustand stores
│   ├── types/                       # TypeScript types
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                        # This file
└── SPEC.md                          # Product specification
```

## Testing Rules

### Requirements

- Every new feature requires unit tests + integration tests
- Tests must run without external dependencies when possible
- Use `pytest` with `asyncio_mode = auto`
- Tests live in `backend/tests/`

### Patterns

- **Unit tests**: test schemas, models, and business logic in isolation. No database needed.
- **Integration tests**: marked `@pytest.mark.integration`. Use `conftest.py` fixtures.
- **API tests**: use `TestClient` from FastAPI or `httpx.AsyncClient`.
- **Mocks**: mock `llm_client` for AI-dependent tests to avoid API calls.
- **Coverage**: aim for 80%+ coverage on new code.

### Running Tests

```bash
cd backend
pytest                                          # all tests
pytest tests/test_features.py -v                # feature tests
pytest -m integration                           # integration tests only
pytest --cov=app --cov-report=term-missing      # coverage
```

## Git Workflow

### Branching

```
main              # production-ready, protected
  └── feature/*   # new features (e.g. feature/objective-compiler)
  └── fix/*       # bug fixes
  └── refactor/*  # refactoring
  └── docs/*      # documentation
```

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add objective compiler service
fix: handle null timeline in planner agent
docs: add API spec for decision endpoints
refactor: extract base repository class
test: add integration tests for risk repository
chore: update ruff config
```

### Rules

- Never commit directly to `main`
- Always create a pull request for non-trivial changes
- Squash-merge feature branches
- Keep commits atomic (one logical change per commit)
- Write descriptive commit messages

## Architecture Principles

### Clean Architecture Layers

```
API Gateway (routers)
    ↓
Services (business logic)
    ↓
Repositories (data access)
    ↓
Models (SQLAlchemy ORM)
```

### Key Rules

1. **Controllers are thin** — routers only parse requests, delegate to services, return responses
2. **Services contain business logic** — never in routers or repositories
3. **Repositories only access data** — no business logic, no AI calls
4. **Agents orchestrate AI workflows** — agents call LLM, create domain entities, save explanations
5. **No circular imports** — services import repositories, not vice versa
6. **Repository Pattern** — all database access through repositories, never raw sessions
7. **Dependency Injection** — session is injected per-request via FastAPI `Depends(get_session)`
8. **Singletons** — `llm_client`, `redis_client`, `settings` are module-level singletons

### Agent Architecture

```
BaseAgent
├── PlannerAgent        — creates Plan + Milestones
├── RiskAgent           — identifies Risk records
├── OrganizationAgent   — creates Department + Role records
├── DecisionAgent       — creates Decision + DecisionOption records
├── DashboardAgent      — aggregates and summarizes execution state
└── DevilsAdvocateAgent — challenges strategy with critique
```

Each agent:
- Receives an `AsyncSession` on construction
- Implements `async def run(objective_id) -> dict`
- Calls `llm_client.generate_structured()` for AI reasoning
- Creates domain entities via repositories
- Saves explanations via `_save_explanation()`

### LLM Abstraction

The `LLMClient` singleton:
- Auto-detects provider: `openai` > `anthropic` > `google` > `litellm` > `fallback`
- `generate()` returns raw string
- `generate_structured()` returns parsed dict (wraps generate + json.loads)
- Fallback mode returns hardcoded structured responses for every feature
- No API keys needed for development

## AI Development Guidelines

### Creating a New Agent

1. Create the agent class in `app/agents/`, extending `BaseAgent`
2. Implement `async def run(self, objective_id: str) -> dict[str, Any]`
3. Build a context dict with relevant existing data
4. Call `llm_client.generate_structured(prompt)` with a clear prompt requesting JSON output
5. Create domain entities using repositories
6. Call `self._save_explanation()` to persist explainability metadata
7. Return a dict with IDs and summary

### Creating a New Service

1. Create the service class in `app/services/`
2. Accept `AsyncSession` in the constructor
3. Instantiate repositories in the constructor
4. Use repository methods for data access
5. Call `llm_client` via the singleton for AI operations
6. Return dicts (not ORM objects) — serialized for API consumption

### Adding a Database Table

1. Define model in `app/models/extensions.py` or `app/models/features.py`
2. Create repository in `app/repositories/` extending `BaseRepository[T]`
3. Export from `app/models/__init__.py` and `app/repositories/__init__.py`
4. Generate Alembic migration: `cd backend && alembic revision --autogenerate -m "description"`
5. Or write a manual migration in `migrations/versions/`

### Adding an API Endpoint

1. Define schema(s) in `app/schemas/`
2. Add route function in the appropriate `app/api/v1/` router
3. Use `Depends(get_session)` for database access
4. Delegate to a service class
5. Return `ApiResponse(data=...)`
6. Register router in `app/api/v1/router.py` if new file

### Explainable AI

Every AI recommendation must include explanation metadata:
- `recommendation` — the actual recommendation text
- `reasoning` — detailed reasoning behind it
- `evidence` — list of evidence points
- `assumptions` — list of assumptions made
- `confidence` — score 0.0–1.0
- `risk_level` — low/medium/high/critical
- `affected_departments` — list of impacted departments
- `dependencies` — list of dependencies
- `model_used` — which LLM provider was used

Use `BaseAgent._save_explanation()` in agents, or `ExplainableAIService.enrich_prompt()` / `wrap_result()` in services.

## Boundaries

### Do NOT
- Rewrite existing architecture or modules
- Remove or rename existing API endpoints
- Install unnecessary packages
- Break backward compatibility
- Bypass the repository pattern
- Use synchronous database operations
- Hardcode API keys or secrets
- Commit generated migration files without review

### Do
- Extend existing patterns for new features
- Use dependency injection for all services
- Keep modules loosely coupled
- Write tests alongside features
- Update architecture docs and API specs
- Follow the established error handling patterns
- Use UUIDv7 for all primary keys
- Use soft deletes (`deleted_at` column)

## Best Practices

### Database
- All tables inherit from `BaseEntity` (id, created_at, updated_at, deleted_at, created_by, updated_by, version, metadata)
- Use `UUID(as_uuid=False)` for all FK columns (stored as strings)
- Use `UTCDateTime` for datetime columns
- Index foreign keys and frequently queried columns
- Use JSONB for flexible/structured data
- Use server defaults for non-nullable columns

### Services
- One service class per domain concern
- Constructor receives `session: AsyncSession` only
- Instantiate repositories in `__init__`
- Return serializable dicts, not ORM instances
- Handle "not found" with `{"error": "message"}` dicts

### Error Handling
- Use `OrchestraOSError` subclasses for application errors
- FastAPI exception handlers catch and format all errors
- Never expose stack traces in production
- Use structlog for structured error logging

### API Design
- All responses wrapped in `ApiResponse(data=..., meta=MetaData(...))`
- Paginated endpoints use `PaginatedResponse`
- Trace IDs propagated via `X-Trace-Id` header
- Internal endpoints require `X-Internal-Key` header

## Definition of Done

A feature is complete when all of the following are true:

- [ ] Schema(s) defined and validated
- [ ] Model(s) created and migrated
- [ ] Repository(ies) implemented
- [ ] Service logic implemented
- [ ] Agent created (if AI-driven)
- [ ] API endpoint(s) registered and documented
- [ ] LLM fallback response added (if AI-driven)
- [ ] Unit tests passingI reviewed both documents.

* The **SPEC.md** is comprehensive and well-structured. It covers the product vision, user journey, features, architecture, APIs, database schema, non-functional requirements, success criteria, and roadmap. 
* The **CLAUDE.md** clearly documents the project structure, coding conventions, testing rules, architecture principles, AI guidelines, and development workflow. 

## Overall Rating

| Area                 | Rating     |
| -------------------- | ---------- |
| Architecture         | **10/10**  |
| Documentation        | **9.8/10** |
| Backend Design       | **9.7/10** |
| Extensibility        | **10/10**  |
| Enterprise Readiness | **9.5/10** |

This is already well above the level of a typical university project.

---

# Things I'd still improve

## 1. AI Kernel (Highest Priority)

Your architecture diagram includes an **AI Kernel**, but the implementation appears to rely on `LLMClient` plus individual services.

I would actually implement:

```text
AIKernel
 ├── PromptManager
 ├── ModelRouter
 ├── ContextManager
 ├── OutputValidator
 ├── RetryEngine
 ├── CacheManager
 ├── TokenTracker
 └── CostTracker
```

Then every agent uses

```python
await ai_kernel.run(...)
```

instead of directly calling

```python
llm_client.generate_structured(...)
```

This becomes one of the strongest architectural selling points.

---

# 2. Agent Orchestrator

Right now your pipeline seems sequential.

Instead implement

```text
AgentOrchestrator

↓

ObjectiveCompiler

↓

Planner

↓

Organization

↓

Risk

↓

Decision

↓

Devil's Advocate

↓

Dashboard
```

The orchestrator should manage

* retries
* context
* dependencies
* ordering
* partial failures

---

# 3. Shared Context

Every agent currently rebuilds context.

Instead create

```python
ExecutionContext
```

containing

* objective
* readiness
* plan
* risks
* departments
* decisions

All agents consume the same context object.

---

# 4. Prompt Versioning

Instead of prompts in Python:

```
planner_v1.md

planner_v2.md

risk_v1.md

decision_v1.md
```

Makes prompt engineering much easier.

---

# 5. AI Output Validation

Before saving AI output:

```
LLM

↓

JSON Repair

↓

Pydantic

↓

Business Rules

↓

Repository
```

Never trust raw LLM responses.

---

# 6. Event Bus

Instead of

```
Planner

↓

Risk

↓

Decision
```

publish events

```
PlanCreated

↓

RiskAgent

↓

DecisionAgent

↓

Dashboard
```

Much cleaner architecture.

---

# 7. AI Observability

Track

* model used
* latency
* prompt version
* tokens
* estimated cost
* retry count
* failure reason

Great for debugging and presentations.

---

# 8. Workflow State Machine

Currently you describe the pipeline.

I'd explicitly model states:

```
Draft

↓

Compiled

↓

Planning

↓

Organization

↓

RiskAnalysis

↓

DecisionPending

↓

Approved

↓

Executing

↓

Monitoring

↓

Completed
```

This makes workflow management far cleaner.

---

# 9. RBAC

Even if not implemented, document:

* Founder
* Admin
* Manager
* Reviewer
* Viewer

Shows enterprise thinking.

---

# 10. WebSockets

Dashboard

Instead of polling

```
GET /dashboard
```

Future:

```
WebSocket

↓

Live Updates
```

---

# Biggest inconsistency I found

One thing stands out in your SPEC.

Early on you define:

> **Planner Agent**
> **Organization Agent**
> **Risk Agent**
> **Decision Agent**

Later in the architecture diagram you show

```
AI Kernel

↓

Core Modules

↓

Agent Layer
```

That implies the kernel exists.

From everything you've shown over the last few days, **the AI Kernel is still conceptual rather than implemented**.

I would either:

* **implement it**, or
* **mark it as "Future Architecture"**

so the documentation matches reality.

---

## Final assessment

If the implementation matches the documentation, OrchestraOS is already at the level of a strong capstone project. The biggest opportunity now is not adding more user-facing features—it is **strengthening the AI infrastructure** (kernel, orchestration, validation, and observability) so the implementation fully matches the architecture you've documented.

- [ ] Integration tests passing
- [ ] Dashboard integration (if applicable)
- [ ] Decision memory integration (if applicable)
- [ ] Explanation/Explainable AI metadata saved
- [ ] Code passes `ruff check` and `mypy`
- [ ] Docker build succeeds
- [ ] API documented in `03_API_SPECIFICATION.md`
- [ ] No existing functionality broken
