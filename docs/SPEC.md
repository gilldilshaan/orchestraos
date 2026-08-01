# OrchestraOS — Product Specification

**Version**: 1.0.0
**Status**: Active Development
**Last Updated**: 2026-07-30

---

## 1. Executive Summary

### 1.1 Project Name

OrchestraOS

### 1.2 One-Line Description

An AI-powered Organizational Intelligence Platform that transforms natural language business objectives into executable business strategies using multiple specialized AI agents.

### 1.3 Problem Statement

Existing AI tools (ChatGPT, Claude) can generate ideas but cannot convert business goals into structured, executable execution plans. Traditional project management tools (Jira, Asana, Monday.com, ClickUp) require extensive manual planning and provide little to no strategic intelligence.

Founders, product managers, and business leaders waste significant time — often weeks — moving between planning documents, spreadsheets, communication tools, and project trackers. The disconnect between strategy formulation and execution tracking leads to missed deadlines, budget overruns, and unmanaged risks.

OrchestraOS solves this by becoming an **AI Operating System for Business Execution** — a single platform that takes a business objective in plain English and autonomously produces a complete execution strategy with plans, organization structures, risk assessments, and an executive dashboard.

### 1.4 Target Users

| Persona | Primary Need |
|---------|-------------|
| **Startup Founders** | Quickly validate and plan execution without hiring PMs |
| **SME Owners** | Turn strategic goals into actionable plans for small teams |
| **Project Managers** | Reduce manual planning overhead, get AI-generated risk insights |
| **Business Consultants** | Produce structured deliverables from client briefs faster |
| **Product Managers** | Align team structure, roadmap, and risks around product objectives |

---

## 2. User Journey

### 2.1 Core Flow

```
┌─────────────────────────────────────────────────────────┐
│  User enters a business objective in plain English       │
│  "I want to launch a SaaS analytics tool for SMBs in     │
│   the healthcare space with a $500k budget"              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  1. Objective Compiler                                   │
│     → Extracts mission, vision, KPIs, budget, timeline  │
│     → Identifies stakeholders and constraints            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  2. Business Readiness Assessment                        │
│     → Scores Market, Technical, Budget, Team, Timeline   │
│     → Generates strengths, weaknesses, recommendations   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  3. Missing Information Detector                         │
│     → Identifies gaps (budget, timeline, audience...)    │
│     → Asks clarification questions if critical info      │
│       is missing                                          │
│     → Iterative refinement until complete                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  4. Planner Agent                                        │
│     → Creates phased roadmap with milestones             │
│     → Estimates costs and timeline                       │
│     → Generates confidence score                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  5. Organization Generator                               │
│     → Creates departments needed for execution           │
│     → Defines roles, responsibilities, skills needed     │
│     → Suggests hiring order and headcount                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  6. Risk Agent                                           │
│     → Identifies strategic, operational, market risks    │
│     → Calculates probability × impact scores             │
│     → Suggests mitigation and contingency plans          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  7. Decision Engine                                      │
│     → Evaluates strategic options                        │
│     → Ranks alternatives with pros/cons/risks/cost       │
│     → Produces recommendation with reasoning             │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  8. Devil's Advocate Critique                            │
│     → Challenges assumptions and strategy                │
│     → Identifies overlooked risks                        │
│     → Suggests better alternatives                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  9. Human Approval                                       │
│     → User reviews plan, org, risks, decisions           │
│     → Can approve, reject, or request changes            │
│     → Decision recorded to memory                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  10. Executive Dashboard                                 │
│      → Shows all KPIs, milestones, risks, bottlenecks    │
│      → Real-time execution health score                  │
│      → Decision timeline                                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  11. Adaptive Replanning (on change)                     │
│      → User changes budget, timeline, or goals           │
│      → System recalculates strategy automatically        │
│      → Version history preserved                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Feature Specification

### 3.1 Must-Have Features

#### F-01: Natural Language Objective Compiler

| Attribute | Detail |
|-----------|--------|
| **Priority** | P0 — Must |
| **Input** | Free-form text describing a business objective |
| **Output** | Structured compilation: mission, vision, business type, industry, stakeholders, KPIs, timeline, budget, dependencies, assumptions, risks, success metrics |
| **AI Method** | LLM structured extraction via `generate_structured()` |
| **Fallback** | Rule-based extraction with mock data (dev mode) |
| **Storage** | `objective_compilations` table (1:1 with objectives) |

#### F-02: Multi-Agent AI System

Five specialized AI agents, each extending `BaseAgent`:

**Planner Agent** — Creates phased execution plans with milestones, roadmap, cost estimates, and confidence scoring. Generates `Plan` + `Milestone` records.

**Organization Agent** — Designs organizational structure: departments, roles, responsibilities, required skills, hiring priority. Generates `Department` + `Role` records.

**Risk Agent** — Identifies and analyzes risks across categories (strategic, operational, market, financial). Computes probability × impact scores, suggests mitigation. Generates `Risk` records.

**Decision Agent** — Evaluates strategic options with pros/cons/risks/cost analysis. Produces ranked alternatives with a recommendation. Generates `Decision` + `DecisionOption` records.

**Devil's Advocate Agent** — Challenges the proposed strategy. Identifies unrealistic assumptions, overlooked risks, and better alternatives. Assigns a critique score.

| Attribute | Detail |
|-----------|--------|
| **Priority** | P0 — Must |
| **Architecture** | Each agent is a standalone class in `app/agents/` |
| **LLM Call** | Each agent calls `llm_client.generate_structured()` |
| **Explanation** | Each agent calls `self._save_explanation()` for audit trail |
| **Orchestration** | `ObjectiveCompilerService.run_full_pipeline()` sequences agents |

#### F-03: Human-in-the-Loop Approval Workflow

| Attribute | Detail |
|-----------|--------|
| **Priority** | P0 — Must |
| **Flow** | AI generates → Human reviews → Approve / Reject / Request changes |
| **Endpoints** | `POST /decisions/{id}/approve`, `POST /decisions/{id}/reject`, `POST /plans/{id}/approve` |
| **Tracking** | Reviewer ID, timestamp, notes recorded for audit |

#### F-04: Executive Dashboard

| Attribute | Detail |
|-----------|--------|
| **Priority** | P0 — Must |
| **Data** | Objective summary, plans, milestones, risks (by level), decisions (by status), departments, job status, system health |
| **Aggregation** | `DashboardAggregator` service combines all data sources |
| **Endpoints** | `GET /dashboard/{objective_id}`, `GET /dashboard/` |

### 3.2 Should-Have Features

#### F-05: Business Readiness Assessment

| Attribute | Detail |
|-----------|--------|
| **Priority** | P1 — Should |
| **Input** | Compiled objective data |
| **Output** | Overall score (0–100) + category scores (Market, Technical, Budget, Team, Timeline) + strengths, weaknesses, recommendations |
| **Endpoint** | `POST /features/{id}/readiness/assess`, `GET /features/{id}/readiness` |
| **Storage** | `business_readiness` table |

#### F-06: Missing Information Detector

| Attribute | Detail |
|-----------|--------|
| **Priority** | P1 — Should |
| **Trigger** | Automatic check before full pipeline execution |
| **Detection** | Budget, timeline, target audience, team size, business model, revenue model, market, constraints, success metrics |
| **Output** | List of missing fields, critical gaps, clarification questions |
| **Iteration** | Supports refinement rounds with user answers |
| **Endpoint** | `POST /features/{id}/missing-info/check`, `POST /features/{id}/missing-info/refine` |

#### F-07: Explainable AI

| Attribute | Detail |
|-----------|--------|
| **Priority** | P1 — Should |
| **Requirement** | Every AI recommendation includes: recommendation, reasoning, evidence, assumptions, confidence, trade-offs, risks, dependencies, affected modules |
| **Implementation** | `ExplainableAIService.enrich_prompt()` + `wrap_result()` |
| **Storage** | `explanations` table with entity references |
| **Retrieval** | `GET /features/explanations/{entity_type}/{entity_id}` |

#### F-08: Resource Gap Analysis

| Attribute | Detail |
|-----------|--------|
| **Priority** | P1 — Should |
| **Input** | Current org structure + plan requirements |
| **Output** | Missing roles, missing skills, hiring needs, estimated cost, timeline, priority |
| **Endpoint** | `POST /features/{id}/resource-gaps/analyze`, `GET /features/{id}/resource-gaps` |
| **Storage** | `resource_gaps` table |

#### F-09: Dependency Intelligence

| Attribute | Detail |
|-----------|--------|
| **Priority** | P1 — Should |
| **Output** | Dependency graph (nodes + edges), critical path, circular dependencies, blocked tasks, cascade effects |
| **Endpoint** | `POST /features/{id}/dependencies/build`, `GET /features/{id}/dependencies` |
| **Storage** | `dependency_graphs` table |

#### F-10: Bottleneck Detection

| Attribute | Detail |
|-----------|--------|
| **Priority** | P1 — Should |
| **Types** | Waiting approvals, resource bottlenecks, department delays, blocked milestones, critical tasks |
| **Output** | Severity, root cause, recommended resolution |
| **Endpoints** | `POST /features/{id}/bottlenecks/scan`, `GET /features/{id}/bottlenecks`, `POST /bottlenecks/{id}/resolve` |
| **Storage** | `bottlenecks` table |

### 3.3 Could-Have Features

#### F-11: Scenario Simulation

| Attribute | Detail |
|-----------|--------|
| **Priority** | P2 — Could |
| **Use Cases** | "What if budget decreases by 20%?", "What if deadline moves earlier?", "What if we hire 3 more engineers?" |
| **Output** | Updated timeline, costs, risks, success probability, comparison |
| **Endpoints** | `POST /features/simulate`, `GET /features/{id}/scenarios` |
| **Storage** | `scenarios` table |

#### F-12: Adaptive Replanning

| Attribute | Detail |
|-----------|--------|
| **Priority** | P2 — Could |
| **Trigger** | User changes budget, timeline, goal, resources, or constraints |
| **Action** | Recalculates strategy, updates plan/milestones, creates version snapshot |
| **Versioning** | `plan_versions` table preserves full history with diffs |
| **Endpoints** | `POST /plans/{id}/replan`, `GET /plans/{id}/versions` |

#### F-13: Knowledge Graph

| Attribute | Detail |
|-----------|--------|
| **Priority** | P2 — Could |
| **Edges** | Links objectives, plans, milestones, departments, risks, decisions |
| **Relationship Types** | `HAS_PLAN`, `HAS_DEPARTMENT`, `HAS_RISK`, `HAS_DECISION`, `DEPENDS_ON` |
| **Auto-linking** | `auto_link_objective()` creates edges for all related entities |
| **Storage** | `knowledge_graph_edges` table |

#### F-14: Decision Memory

| Attribute | Detail |
|-----------|--------|
| **Priority** | P2 — Could |
| **Records** | Every decision (AI or human) with reason, evidence, alternatives, approver, date, impact |
| **Timeline** | Chronological view of all decisions made |
| **Endpoints** | `POST /features/decision-memory`, `GET /features/decision-memory` |
| **Storage** | `decision_memory` table |

---

## 4. Technical Stack

### 4.1 Frontend

| Technology | Purpose |
|-----------|---------|
| Next.js 15 | React framework with App Router |
| TypeScript | Type safety (strict mode) |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Accessible component primitives |
| React Query (TanStack) | Server state management |
| Zustand | Client state management |

### 4.2 Backend

| Technology | Purpose |
|-----------|---------|
| Python 3.12+ | Runtime |
| FastAPI | REST API framework |
| SQLAlchemy 2.0 | Async ORM with `MappedAsDataclass` |
| Pydantic v2 | Request/response validation |
| Alembic | Schema migrations |
| PostgreSQL 16 + pgvector | Primary database |
| Redis 7 | Caching and job queuing |
| asyncpg | High-performance async DB driver |

### 4.3 AI / LLM

| Technology | Purpose |
|-----------|---------|
| LiteLLM | Multi-provider LLM abstraction |
| OpenAI (gpt-4o) | Primary LLM provider |
| Anthropic (Claude) | Secondary LLM provider |
| Google Gemini | Tertiary LLM provider |
| LLMClient | Custom wrapper with auto-detection + fallback |

### 4.4 Infrastructure

| Technology | Purpose |
|-----------|---------|
| Docker Compose | Local development environment |
| Docker | Containerization |
| GitHub Actions | CI/CD pipeline |

### 4.5 Code Quality

| Tool | Purpose |
|------|---------|
| ruff | Linting + formatting (line-length 100, double quotes) |
| mypy | Static type checking (strict mode) |
| pytest | Testing framework (asyncio_mode = auto) |
| pytest-cov | Coverage reporting |
| pytest-asyncio | Async test support |

---

## 5. Functional Requirements

### 5.1 API Endpoints

#### Objectives (`/api/v1/objectives`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a new objective from raw text |
| GET | `/` | List objectives (with pagination, status filter) |
| GET | `/{id}` | Get objective with compilation data |
| PATCH | `/{id}` | Update objective status or text |
| POST | `/{id}/compile` | Compile objective via LLM |
| POST | `/{id}/generate` | Run full pipeline (compile → plan → org → risks → decisions) |

#### Plans (`/api/v1/plans`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/{id}` | Get plan with milestones and versions |
| POST | `/{id}/approve` | Approve plan (set status to active) |
| POST | `/{id}/replan` | Adaptive replanning with version snapshot |
| GET | `/{id}/versions` | List plan version history |

#### Organizations (`/api/v1/organizations`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/objective/{id}` | Get departments + roles for objective |
| POST | `/objective/{id}/generate` | Generate org structure via OrganizationAgent |

#### Decisions (`/api/v1/decisions`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List decisions (filterable by status, objective) |
| GET | `/pending` | List pending decisions |
| GET | `/{id}` | Get decision with options |
| POST | `/{id}/approve` | Approve decision |
| POST | `/{id}/reject` | Reject decision |
| POST | `/{id}/review` | Set decision to UNDER_REVIEW |

#### Dashboard (`/api/v1/dashboard`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/{objective_id}` | Aggregated dashboard for one objective |
| GET | `/` | Dashboards for all objectives |

#### Jobs (`/api/v1/jobs`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/{id}` | Poll job status and result |

#### Features (`/api/v1/features`)

| Method | Path | Feature |
|--------|------|---------|
| POST | `/{id}/readiness/assess` | Business Readiness Assessment |
| GET | `/{id}/readiness` | Get readiness assessment |
| POST | `/{id}/missing-info/check` | Missing Information Detector |
| POST | `/{id}/missing-info/refine` | Refine with user answers |
| GET | `/{id}/missing-info` | Get missing info check |
| POST | `/{id}/devils-advocate` | Run Devil's Advocate critique |
| GET | `/{id}/devils-advocate/latest` | Get latest critique |
| POST | `/{id}/success-probability` | Calculate success probability |
| GET | `/{id}/success-probability` | Get success probability |
| POST | `/{id}/resource-gaps/analyze` | Analyze resource gaps |
| GET | `/{id}/resource-gaps` | Get resource gaps |
| POST | `/{id}/dependencies/build` | Build dependency graph |
| GET | `/{id}/dependencies` | Get dependency graph |
| POST | `/{id}/bottlenecks/scan` | Scan for bottlenecks |
| GET | `/{id}/bottlenecks` | List bottlenecks |
| POST | `/bottlenecks/{id}/resolve` | Resolve a bottleneck |
| GET | `/{id}/executive-dashboard` | Executive Intelligence Dashboard |
| POST | `/decision-memory` | Record a decision |
| GET | `/decision-memory` | List decision memory |
| GET | `/decision-memory/{id}` | Get decision memory entry |
| POST | `/{id}/replan` | Adaptive replan with decision memory |
| POST | `/simulate` | Run scenario simulation |
| GET | `/{id}/scenarios` | List scenarios |
| GET | `/scenarios/{id}` | Get scenario details |
| GET | `/explanations/{type}/{id}` | Get explainable AI metadata |

#### Health (`/api/v1/health`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/system` | System health (DB + Redis) |
| GET | `/ai` | AI module health |
| GET | `/organization` | Organizational health metrics |

### 5.2 Database Schema

All tables inherit from `BaseEntity`:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUIDv7 (PK) | Auto-generated primary key |
| `created_at` | UTCDateTime | Auto-set on creation |
| `updated_at` | UTCDateTime | Auto-updated on modification |
| `deleted_at` | UTCDateTime | Soft delete marker (nullable) |
| `created_by` | UUID | User who created the record |
| `updated_by` | UUID | User who last updated |
| `version` | Integer | Optimistic locking (default 1) |
| `metadata_` | JSONB | Flexible metadata storage |

#### Core Tables

| Table | Purpose | Key FK |
|-------|---------|--------|
| `users` | User accounts | — |
| `objectives` | Business objectives | `users.id` |
| `jobs` | Async job tracking | `users.id`, `objectives.id` |
| `objective_compilations` | Structured extraction | `objectives.id` |
| `plans` | Execution plans | `objectives.id` |
| `plan_versions` | Plan version history | `plans.id` |
| `milestones` | Plan milestones | `plans.id` |
| `departments` | Organizational units | `objectives.id`, `plans.id` |
| `roles` | Department roles | `departments.id` |
| `risks` | Risk registry | `objectives.id`, `plans.id` |
| `decisions` | Strategic decisions | `objectives.id` |
| `decision_options` | Decision alternatives | `decisions.id` |
| `explanations` | AI explainability metadata | — |
| `scenarios` | What-if simulations | `objectives.id`, `plans.id` |
| `knowledge_graph_edges` | Entity relationship graph | — |
| `kpis` | Key performance indicators | — |
| `kpi_history` | KPI value snapshots | `kpis.id` |

#### Feature Tables

| Table | Purpose | Key FK |
|-------|---------|--------|
| `business_readiness` | Readiness assessments | `objectives.id` |
| `missing_info_checks` | Missing info detection | `objectives.id` |
| `devils_advocate_critiques` | AI critique results | `objectives.id`, `plans.id` |
| `success_probabilities` | Success probability estimates | `objectives.id`, `plans.id` |
| `resource_gaps` | Resource gap analysis | `objectives.id`, `plans.id` |
| `dependency_graphs` | Dependency graph snapshots | `objectives.id` |
| `bottlenecks` | Bottleneck records | `objectives.id` |
| `decision_memory` | Decision audit trail | `objectives.id`, `decisions.id` |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| API response time (non-LLM) | < 500ms (p95) |
| API response time (LLM call) | < 30s (p95) |
| Database query time | < 100ms (p95) |
| Dashboard load time | < 2s |
| Concurrent users | 100+ |
| Objective compilation | < 15s |
| Full pipeline execution | < 120s |

### 6.2 Scalability

- Horizontal scaling via stateless API layer
- Database connection pool: 20 min / 10 overflow
- Redis for cache and job queue
- Async everything (no blocking I/O)

### 6.3 Security

| Requirement | Implementation |
|-------------|---------------|
| Authentication | JWT via Supabase (future) |
| Internal API | `X-Internal-Key` header validation |
| Trace IDs | `X-Trace-Id` header propagation |
| CORS | Configurable origins |
| Secrets | Environment variables only, never in code |
| Data validation | Pydantic v2 strict validation |

### 6.4 Reliability

| Requirement | Implementation |
|-------------|---------------|
| Error handling | `OrchestraOSError` hierarchy with structured responses |
| Database | Connection pooling, retry logic, health checks |
| LLM failures | Fallback mode with structured mock responses |
| Job recovery | Job status tracking with error capture |
| Migrations | Alembic with up/down revision chain |

### 6.5 Maintainability

- Clean Architecture with strict layer separation
- Repository Pattern for all data access
- Dependency Injection via FastAPI `Depends()`
- 80%+ test coverage target
- `ruff` + `mypy` enforced in CI
- Comprehensive API documentation via OpenAPI

### 6.6 Compatibility

- RESTful API (not GraphQL)
- Versioned endpoints (`/api/v1/`)
- PostgreSQL 16 with pgvector
- Docker Compose for local development
- OpenAI / Anthropic / Google LLM providers

---

## 7. Architecture Summary

### 7.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      DECISION SURFACE                                │
│          Next.js 15 · React · Tailwind · shadcn/ui                   │
│          User interaction, visualization, human approval              │
├─────────────────────────────────────────────────────────────────────┤
│                       API GATEWAY                                     │
│          FastAPI · Pydantic v2 · OpenAPI · Async                      │
│          Request validation, routing, response formatting             │
├─────────────────────────────────────────────────────────────────────┤
│                       AI KERNEL                                       │
│          Scheduler · Memory Manager · Message Bus                     │
│          Module Registry · State Manager · Resource Allocator         │
├─────────────────────────────────────────────────────────────────────┤
│                     CORE MODULES                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Objective │ │ Planner  │ │   Org    │ │   Risk   │ │  Simul.  │  │
│  │ Compiler │ │          │ │ Generator│ │  Engine  │ │  Engine  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Decision │ │  Memory  │ │ Evidence │ │  Health  │ │Bottleneck│  │
│  │  Engine  │ │ Manager  │ │  Engine  │ │  Engine  │ │  Engine  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     AGENT LAYER                                      │
│  PlannerAgent · RiskAgent · OrganizationAgent · DecisionAgent        │
│  DashboardAgent · DevilsAdvocateAgent                                │
│  (Each agent: session → LLM → domain entities → explanations)       │
├─────────────────────────────────────────────────────────────────────┤
│                      LLM PROVIDER                                    │
│  LLMClient (singleton) — auto-detect: OpenAI > Anthropic > Google   │
│  > LiteLLM > Fallback (dev mode with mock responses)                 │
├─────────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                      │
│  PostgreSQL 16 + pgvector · Redis 7 · asyncpg · SQLAlchemy 2.0      │
│  Alembic migrations · Repository pattern · Soft deletes              │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| FastAPI over Django REST | Async native, Pydantic integration, OpenAPI auto-docs |
| SQLAlchemy over raw SQL | ORM with async, migration support, type safety |
| Repository Pattern | Consistent data access, testable, swappable |
| LLMClient singleton | Single config point, provider auto-detection |
| Dev fallback mode | No API keys needed for local development |
| UUIDv7 | Time-ordered UUIDs, cluster-friendly, index-efficient |
| Soft deletes | Audit trail, data recovery, referential integrity |
| JSONB for flexible data | Schema-less storage for AI-generated structures |
| `_save_explanation()` | Mandatory explainability for all AI operations |

### 7.3 Request Lifecycle

```
Client Request
  │
  ▼
FastAPI Router (thin: parse + delegate)
  │
  ▼
Service (business logic)
  │
  ├── Repository (data access)
  │   └── SQLAlchemy Model (ORM)
  │
  └── Agent (AI workflow, optional)
      ├── LLMClient.generate_structured()
      ├── Repository.create(entity)
      └── _save_explanation()
  │
  ▼
ApiResponse (serialized dict)
```

---

## 8. Success Criteria

### 8.1 Functional Acceptance Criteria

- [ ] User can create an objective via natural language input
- [ ] AI extracts structured business information (mission, vision, KPIs, budget, timeline)
- [ ] Missing information is detected and clarification is requested
- [ ] Business readiness score is calculated with category breakdowns
- [ ] Planner generates a phased roadmap with milestones
- [ ] Organization Generator creates departments and roles
- [ ] Risk Agent identifies and scores risks with mitigation
- [ ] Decision Engine generates recommendations with alternatives
- [ ] Devil's Advocate critiques the strategy

### 8.2 Workflow Acceptance Criteria

- [ ] Full pipeline: compile → plan → org → risks → decisions
- [ ] Human-in-the-loop approval for plans and decisions
- [ ] Dashboard visualizes all execution data
- [ ] Adaptive replanning updates plans after parameter changes
- [ ] Scenario simulations allow what-if analysis
- [ ] Decision memory provides audit trail

### 8.3 Technical Acceptance Criteria

- [ ] All API endpoints respond correctly
- [ ] Database migrations apply cleanly (up and down)
- [ ] Unit tests pass (schemas, models)
- [ ] Integration tests pass (repositories)
- [ ] LLM fallback mode works without API keys
- [ ] Docker Compose builds and starts all services
- [ ] APIs documented in OpenAPI spec
- [ ] Code passes `ruff check` and `mypy --strict`

### 8.4 Quality Gates

```
┌─────────────────────────────────────────────┐
│  Does feature have schemas?    │ Pass / Fail │
│  Does feature have models?     │ Pass / Fail │
│  Does feature have repos?      │ Pass / Fail │
│  Does feature have services?   │ Pass / Fail │
│  Does feature have endpoints?  │ Pass / Fail │
│  Does feature have fallback?   │ Pass / Fail │
│  Does feature have tests?      │ Pass / Fail │
│  Does feature have docs?       │ Pass / Fail │
│  Do all tests pass?            │ Pass / Fail │
│  Does ruff pass?               │ Pass / Fail │
│  Does mypy pass?               │ Pass / Fail │
│  Does Docker build?            │ Pass / Fail │
└─────────────────────────────────────────────┘
```

---

## 9. Demo Flow

### 9.1 Interactive Demo

```
Step 1:  POST /objectives
         Body: { "raw_input": "Launch a B2B SaaS analytics platform
                 for healthcare SMBs with a $500k seed budget" }

Step 2:  POST /objectives/{id}/missing-info/check
         → Detects missing: target_audience, team_size, timeline

Step 3:  POST /objectives/{id}/missing-info/refine
         Body: { "answers": { "timeline": "9 months",
                 "team_size": "5 people" } }

Step 4:  POST /objectives/{id}/readiness/assess
         → Returns scores: Market 78, Technical 65, Budget 60, ...

Step 5:  POST /objectives/{id}/compile
         → Extracts mission, vision, KPIs, budget, timeline, etc.

Step 6:  POST /objectives/{id}/generate
         → Runs full pipeline:
            Planner → Organization → Risk → Decision

Step 7:  POST /objectives/{id}/devils-advocate
         → Critique score: 65/100, 2 counter-arguments, 3 risks

Step 8:  POST /objectives/{id}/success-probability
         → Success probability: 0.72, Failure risk: 0.22

Step 9:  GET /dashboard/{id}
         → Full executive dashboard with all KPIs

Step 10: GET /dashboard/{id}/executive-dashboard
         → Executive summary with readiness, probability, bottlenecks
```

---

## 10. Future Scope

### 10.1 Short Term (0–3 months)

- Real-time WebSocket updates for dashboard
- Email/push notifications for pending approvals
- User authentication and team workspaces
- Export plans to PDF/CSV
- Plan comparison view
- Markdown-based plan documentation generation

### 10.2 Medium Term (3–6 months)

- AI Kernel: Scheduler, Memory Manager, Message Bus
- Background worker execution for long-running tasks
- Integration with Slack, Jira, Asana
- Custom agent creation via no-code interface
- Historical analytics and trend detection
- Multi-language support for objectives
- Template library for common business objectives

### 10.3 Long Term (6–12 months)

- Autonomous execution with agent-monitored workflows
- Integration with external APIs (Stripe, HubSpot, GitHub)
- Real-time collaboration with shared workspaces
- Mobile app for approvals and monitoring
- Custom LLM fine-tuning on organizational data
- Advanced analytics with ML-powered recommendations
- Enterprise SSO and RBAC
- API marketplace for third-party extensions

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| **Objective** | A natural-language business goal entered by the user |
| **Compilation** | Structured extraction of business information from raw objective text |
| **Agent** | Specialized AI module that performs a specific business function |
| **Plan** | A phased execution roadmap with milestones and cost estimates |
| **Organization** | The set of departments and roles needed to execute a plan |
| **Risk** | An identified uncertainty with probability, impact, and mitigation |
| **Decision** | A strategic recommendation with options, reasoning, and evidence |
| **Explanation** | Metadata that makes AI reasoning transparent and auditable |
| **Dashboard** | Aggregated view of all execution data for a given objective |
| **Scenario** | A what-if simulation with modified parameters |
| **Knowledge Graph** | Relationship graph connecting all entities (objectives, plans, etc.) |
| **Bottleneck** | An execution blocker with severity, root cause, and resolution |
| **Fallback Mode** | Development mode using rule-based mock responses instead of real LLM |
| **Devil's Advocate** | An AI agent that challenges and critiques proposed strategies |

---

## 12. References

- [architecture.md](./architecture.md) — Detailed architecture documentation
- [api.md](./api.md) — Full API specification
- [CLAUDE.md](./CLAUDE.md) — AI development guidelines
- `backend/app/` — Python backend source
- `frontend/` — TypeScript/Next.js frontend source
- `docker-compose.yml` — Development environment setup
