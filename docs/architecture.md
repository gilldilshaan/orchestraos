# OrchestraOS — Software Architecture Specification (SAS)

**Version:** 2.0
**Status:** Final for Engineering Review
**Owner:** OrchestraOS Core Team
**Based On:** TPRD v1.0

---

# Table of Contents

1. Document Control
2. Architectural Principles
3. Architectural Drivers
4. System Architecture Overview
5. Technology Stack
6. Request Lifecycle
7. AI Kernel
8. Module Architecture
9. Module Interface Contracts
10. Communication Protocol
11. Data Flow
12. Decision Flow
13. Failure Handling
14. API Specification
15. Database Schema
16. Agent Architecture
17. LLM Abstraction Layer
18. Frontend Architecture
19. Folder Structure
20. Deployment Architecture
21. Development Setup
22. Testing Strategy
23. Observability
24. Performance Targets
25. Security Architecture
26. Appendix: Sequence Diagrams

---

# 1. Document Control

| Version | Date       | Author | Changes                                          |
| ------- | ---------- | ------ | ------------------------------------------------ |
| 1.0     | 2026-07-27 | Core   | Initial architecture                             |
| 2.0     | 2026-07-27 | Core   | SAS upgrade: drivers, lifecycle, AI Kernel deep, |
|         |            |        | comm protocol, observability, decision flow,     |
|         |            |        | failure handling, per-module folders              |

---

# 2. Architectural Principles

## 2.1 Design Tenets

| Principle       | Meaning                                                   |
| --------------- | --------------------------------------------------------- |
| Objective First | Business objectives drive all module execution            |
| Explainability  | Every output includes structured reasoning                 |
| Human Oversight | AI recommends, humans approve (configurable threshold)    |
| Modularity      | Every AI module is independently replaceable               |
| Extensibility   | New modules integrate without redesigning the platform     |
| Evidence Driven | Every recommendation references supporting context         |

## 2.2 Key Architectural Decisions

| Decision                  | Choice                    | Rationale                                          |
| ------------------------- | ------------------------- | -------------------------------------------------- |
| Backend framework         | FastAPI                   | Async-native, Pydantic validation, OpenAPI docs    |
| Frontend framework        | Next.js 14+ App Router    | SSR, React Server Components, API routes           |
| Primary database          | Supabase (PostgreSQL)     | Managed Postgres, real-time, auth, pgvector        |
| Vector storage            | pgvector                  | Single database, no extra infra                     |
| LLM providers             | Multi-provider router     | No vendor lock-in, fallback, cost optimization     |
| Message protocol          | REST + WebSocket          | REST for CRUD, WebSocket for real-time state       |
| Caching                   | Redis                     | Distributed, fast, widely supported                |
| Deployment                | Docker + VPS              | Portable, simple, cost-effective for hackathon     |
| Auth                      | Supabase Auth + JWT       | Built-in, RLS integration, refresh tokens          |

---

# 3. Architectural Drivers

This section explains **why every major design decision exists**. These drivers constrain and guide all architectural choices.

## 3.1 Performance

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| Pipeline latency | Full cycle <30s            | Async execution, parallel module dispatch, caching  |
| LLM latency      | Varies by model (2-15s)    | Multi-model routing, timeout with fallback, streaming|
| UI responsiveness| Page load <2s P95          | SSR via Next.js, TanStack Query caching, CDN assets |

## 3.2 Scalability

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| Horizontal scale | Add modules without rewrites| Plugin registry pattern, stable module contracts   |
| Data growth      | Memory grows unbounded     | Tiered storage (hot/warm/cold), importance-based pruning|
| Concurrent objs  | Multiple objectives        | AI Kernel resource allocator, priority scheduling  |

## 3.3 Explainability

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| Auditability     | Every decision traceable   | Evidence Engine per claim, structured decision records|
| Confidence       | Calibrated trust signals   | Confidence scores from historical accuracy, thresholds|
| Transparency     | Human readable reasoning   | Natural language reasoning attached to every verdict|

## 3.4 Extensibility

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| Module addition  | Add without kernel changes | Module Registry, typed input/output contracts       |
| Provider swap    | Swap LLM provider          | Abstract LLM provider interface, model router       |
| Agent types      | New agent roles            | BaseAgent class, agent registration by capability   |

## 3.5 Human Oversight

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| Risk threshold   | High-risk needs approval   | Decision authority levels (recommend/approve/execute)|
| Feedback loop    | Humans improve AI          | Rejection reason capture, confidence calibration    |
| Intervention     | Manual override possible   | Manual dispatch, task reassignment, plan modification|

## 3.6 Low Coupling

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| Module isolation | One module failure scoped  | AI Kernel manages all inter-module communication    |
| Interface stable | Contracts versioned        | Pydantic schemas, JSON serialization, schema registry|
| Dependency       | No circular imports        | Strict layered dependency: Kernel → Modules → Agents|

## 3.7 High Cohesion

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| Single purpose   | Each module one job        | Planner plans, Risk Engine assesses, Evidence validates|
| Internal complexity| Hidden behind interface | Public API narrow, internal complexity encapsulated  |

## 3.8 Fault Tolerance

| Driver           | Constraint                 | Design Response                                     |
| ---------------- | -------------------------- | --------------------------------------------------- |
| LLM failure      | Provider outage            | Retry with backoff, fallback chain, degraded output |
| Module crash     | Module process dies        | Health heartbeat, auto-restart, state recovery      |
| Data corruption  | Bad memory entry           | Versioned entries, rollback capability, audit log   |

---

# 4. System Architecture Overview

## 4.1 Layered Architecture

OrchestraOS follows a layered architecture inspired by operating system design principles. Each layer provides services to the layer above and consumes services from below, with clear interfaces and separation of concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                   DECISION SURFACE                           │
│    (Next.js Frontend — Dashboard, Org Graph, Decisions)      │
│    Human-AI interface layer                                  │
├─────────────────────────────────────────────────────────────┤
│                   API GATEWAY                                 │
│    (FastAPI — REST endpoints, WebSocket, auth, routing)      │
├─────────────────────────────────────────────────────────────┤
│                   AI KERNEL                                   │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│    │Scheduler │ │  Memory  │ │  Msg Bus │ │  Module  │     │
│    │          │ │ Manager  │ │          │ │ Registry │     │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│    │  State   │ │  Health  │ │ Resource │                   │
│    │ Manager  │ │ Monitor  │ │ Allocator│                   │
│    └──────────┘ └──────────┘ └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│                   CORE MODULES                                │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│    │ Planner  │ │ Org Gen  │ │ Risk     │ │ Sim      │     │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│    │ Evidence │ │ Memory   │ │ Health   │ │ Objective│     │
│    │ Engine   │ │ Manager  │ │ Engine   │ │ Compiler │     │
│    └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
├─────────────────────────────────────────────────────────────┤
│                   AGENT LAYER                                 │
│    Dynamic departments with specialized agents               │
│    (PM, Engineering, Design, QA, DevOps, Marketing, Research)│
├─────────────────────────────────────────────────────────────┤
│                   LLM PROVIDER LAYER                          │
│    (OpenAI, Anthropic, Google — routed by task type)         │
│    Rate limiter, fallback chain, cost tracker                │
├─────────────────────────────────────────────────────────────┤
│                   DATA LAYER                                  │
│    (Supabase PostgreSQL + pgvector + Redis)                  │
│    Logs & metrics (structured logging, OpenTelemetry)        │
└─────────────────────────────────────────────────────────────┘
```

## 4.2 Module Dependency Graph

```
Objective Compiler  ──►  Planner  ──►  Org Generator  ──►  AI Kernel
       │                        │              │                │
       │                        │              │                ├──► Agents
       │                        │              │                │
       │                        ├──► Simulation Engine          ├──► Memory Manager
       │                        │                               │
       ├────────────────────────┼──► Risk Engine                ├──► Health Engine
       │                        │                               │
       └────────────────────────┼──► Evidence Engine            └──► Decision Surface
                                │
                          Memory Manager (all modules)
                                │
                     Observability Stack (all modules emit)
```

---

# 5. Technology Stack

## 5.1 Backend

| Component        | Technology       | Version  | Purpose                       |
| ---------------- | ---------------- | -------- | ----------------------------- |
| Framework        | FastAPI          | 0.111+   | Async Python web framework    |
| Runtime          | Python           | 3.12+    | Modern Python with pattern    |
| Validation       | Pydantic v2      | 2.7+     | Schema validation             |
| ASGI Server      | Uvicorn          | 0.29+    | Production ASGI server        |
| ORM              | SQLAlchemy       | 2.0+     | Database ORM                  |
| Async DB         | asyncpg          | 0.29+    | Async PostgreSQL driver       |
| Vector Search    | pgvector         | 0.7+     | Embedding similarity search   |
| LLM SDK          | openai, anthropic| Latest   | Provider SDKs                 |
| Caching          | redis-py         | 5.0+     | Redis client                  |
| Auth             | supabase-py      | 2.5+     | Supabase Auth client          |
| Observability    | OpenTelemetry    | 1.24+    | Traces, metrics, logs         |
| Structured logs  | structlog        | 24.1+    | JSON-formatted logging        |

## 5.2 Frontend

| Component       | Technology       | Purpose                    |
| --------------- | ---------------- | -------------------------- |
| Framework       | Next.js 14+      | React, SSR, App Router     |
| Styling         | Tailwind CSS     | Utility-first styling       |
| Org Graph       | React Flow       | Interactive org charts     |
| State (Server)  | TanStack Query   | Server state, caching      |
| State (Client)  | Zustand          | Lightweight client state   |
| Real-time       | Supabase JS      | Realtime subscriptions     |
| Animations      | Framer Motion    | UI transitions             |
| Charts          | Recharts         | Analytics & metrics        |
| Forms           | React Hook Form  | Form validation            |

## 5.3 Infrastructure

| Component    | Technology          | Purpose                  |
| ------------ | ------------------- | ------------------------ |
| Container    | Docker              | Portable deployment      |
| Orchestration| docker-compose      | Multi-service orchestration|
| Database     | Supabase            | Managed PostgreSQL       |
| Cache        | Redis (Upstash/Docker)| Distributed caching  |
| Hosting      | Railway / Render    | Simplified deployment    |
| CI/CD        | GitHub Actions      | Automated testing/deploy |

---

# 6. Request Lifecycle

This section traces a single user objective through the entire system.

## 6.1 Step-by-Step Walkthrough

```
User: "Launch an AI SaaS in 90 days"
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. HTTP POST /api/v1/objectives                                  │
│    Body: { raw_input: "Launch an AI SaaS in 90 days" }           │
│    │                                                             │
│    ▼                                                             │
│    API Gateway receives request                                  │
│    ├── Authenticate JWT                                          │
│    ├── Validate input shape                                      │
│    ├── Assign trace_id for observability                         │
│    └── Dispatch to Objective Compiler                            │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. Objective Compiler                                            │
│    ├── Select LLM: o3-mini (reasoning task)                      │
│    ├── Inject system prompt + user input into LLM                │
│    ├── Parse structured JSON output against CompiledGoal schema  │
│    ├── Validate: success_criteria > 0, confidence > 0            │
│    ├── Store compiled objective in database                      │
│    ├── Emit event: objective.compiled                            │
│    └── Return CompiledGoal to Kernel                             │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. AI Kernel — Dispatch                                          │
│    ├── Receive CompiledGoal                                      │
│    ├── Module Registry → route to Planner                        │
│    ├── Resource Allocator → estimate compute needed              │
│    ├── State Manager → create execution context                  │
│    └── Forward goal to Planner                                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Planner                                                        │
│    ├── Query Memory for similar past objectives                  │
│    ├── Select LLM: gpt-4o (complex planning)                     │
│    ├── Generate work streams with milestones & dependencies      │
│    ├── Run PERT analysis for critical path                       │
│    ├── Identify bottlenecks (min 3)                              │
│    ├── Generate 2+ contingency plans                             │
│    ├── Return Plan to Kernel                                     │
│    └── Emit event: plan.generated                                │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. AI Kernel — Parallel Dispatch                                  │
│    ├── Send Plan to Org Generator (synthesize departments)       │
│    ├── Send Plan to Risk Engine (assess risks)                   │
│    ├── Send Plan to Simulation Engine (compare strategies)       │
│    └── All run in parallel (async gather)                        │
└────┬─────────────────────────────────────────────────────────┬───┘
     │                                                         │
     ▼                                                         ▼
┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐
│ Org Generator       │  │ Risk Engine         │  │ Simulation Engine   │
│ ├── Analyze goal    │  │ ├── Rule-based scan │  │ ├── Generate Plan A │
│ ├── Create depts    │  │ ├── Historical lookup│  │ ├── Generate Plan B │
│ ├── Assign agents   │  │ ├── Monte Carlo sim  │  │ ├── Generate Plan C │
│ └── Register w/     │  │ └── Return risks     │  │ └── Compare & rank  │
│     Kernel          │  └────────────────────┘  └────────────────────┘
└────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 6. AI Kernel — Assemble Dashboard                                 │
│    ├── Collect results from all parallel modules                 │
│    ├── Request Evidence Engine validate key claims               │
│    ├── Build dashboard payload: plan + org + risks + simulations │
│    ├── Check authority level for each decision                   │
│    ├── Create Decision records requiring human approval          │
│    ├── Store complete state in Memory                            │
│    └── Push dashboard to Decision Surface via WebSocket          │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 7. Decision Surface                                              │
│    ├── Render dashboard (timeline, org graph, risks, comparisons)│
│    ├── Highlight pending decisions for human review              │
│    ├── Show evidence, confidence, alternatives for each decision │
│    ├── User reviews, may modify parameters                       │
│    ├── User approves or rejects                                  │
│    └── POST /api/v1/decisions/:id/approve → Kernel resumes      │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 8. Execution                                                     │
│    ├── Kernel receives approval                                  │
│    ├── Scheduler creates task queue from plan                    │
│    ├── Dispatch tasks to agent departments                       │
│    ├── Agents execute (may request evidence, memory, tools)      │
│    ├── Health Monitor tracks progress                            │
│    └── On completion: Memory stores outcome, emit objective.done │
└──────────────────────────────────────────────────────────────────┘
```

## 6.2 Timing Budget

| Step                    | Budget   | P95 Target |
| ----------------------- | -------- | ---------- |
| Objective compilation   | 5s       | 3s         |
| Planning                | 10s      | 7s         |
| Org synthesis (par)     | 3s       | 2s         |
| Risk assessment (par)   | 5s       | 3s         |
| Simulation (par)        | 10s      | 7s         |
| Evidence validation     | 3s       | 2s         |
| Dashboard assembly      | 2s       | 1s         |
| **Total wall clock**    | **~15s** | **~12s**   |

---

# 7. AI Kernel

The AI Kernel is the central nervous system of OrchestraOS. It behaves like an operating system kernel — managing resources, scheduling tasks, coordinating departments, and providing core services to all agents. This section expands the Kernel into its component subsystems.

## 7.1 Kernel Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        AI KERNEL                                  │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Scheduler   │  │  Memory     │  │  Message    │              │
│  │              │  │  Manager    │  │  Bus        │              │
│  │ • Priority Q │  │ • Tiered    │  │ • Pub/sub   │              │
│  │ • DAG resolver│  │   storage   │  │ • Routing   │              │
│  │ • Deadline    │  │ • Pruning   │  │ • Delivery  │              │
│  │   tracking   │  │ • Embedding │  │   guarantees│              │
│  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                 │                │                      │
│  ┌──────┴───────┐  ┌──────┴──────┐  ┌──────┴──────┐              │
│  │  Module      │  │  State      │  │  Health     │              │
│  │  Registry    │  │  Manager    │  │  Monitor    │              │
│  │              │  │             │  │             │              │
│  │ • Plugin     │  │ • Execution │  │ • Heartbeat │              │
│  │   discovery  │  │   context   │  │ • Latency   │              │
│  │ • Interface  │  │ • Snapshots │  │ • Failure   │              │
│  │   validation │  │ • Rollback  │  │   detection │              │
│  │ • Versioning │  │ • Locking   │  │ • Alerts    │              │
│  └──────────────┘  └─────────────┘  └─────────────┘              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Resource Allocator                                       │    │
│  │  • Token budget per module/provider                       │    │
│  │  • Model quota enforcement                                │    │
│  │  • Tool access control                                    │    │
│  │  • Priority-based preemption                              │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## 7.2 Scheduler

### Responsibility
Manage execution order of all tasks across modules and agents. Ensure dependency resolution, priority handling, and deadline tracking.

### Algorithm

```
Input: Task Queue (priority-ordered)
Output: Dispatch Order

1. Sort tasks by priority (P0 > P1 > P2)
2. Build dependency DAG from task dependencies
3. Topological sort → executable order
4. For each priority level:
   a. Batch tasks with no unmet dependencies
   b. Dispatch to Resource Allocator for capacity check
   c. Assign to Module Registry for routing
5. Track deadlines: if ETA > deadline, escalate to health monitor
6. Detect deadlocks via cycle detection in dependency graph
   - If cycle found: break by escalating lowest-priority task
```

### Priority Levels

| Level | Label     | Use Case                    | Preemption |
| ----- | --------- | --------------------------- | ---------- |
| P0    | Critical  | Human decision response     | Yes        |
| P1    | High      | Active objective tasks      | No         |
| P2    | Normal    | Background analysis         | No         |
| P3    | Low       | Memory maintenance, cleanup | No         |

## 7.3 Memory Manager

### Responsibility
Manage all read/write operations to Organizational Memory. Handle tiered storage, embedding search, importance-based pruning, and cache coherence.

### Tiered Storage

| Tier   | Technology     | Access Pattern    | Capacity     | Eviction Policy         |
| ------ | -------------- | ----------------- | ------------ | ----------------------- |
| Hot    | Redis          | Sub-millisecond   | 1GB          | LRU by importance score |
| Warm   | pgvector       | Millisecond       | 100K entries | Importance < 0.1 pruned |
| Cold   | PostgreSQL JSON| Second            | Unlimited    | Archived after 90 days  |

### Operations

```
write(entry):
  1. Compute embedding via LLM
  2. Assign importance score (0.0–1.0)
  3. Store in hot tier (Redis, TTL=1hr)
  4. Store in warm tier (pgvector, permanent)
  5. If importance > 0.9, broadcast to interested modules

query(text, type_filter, limit):
  1. Compute query embedding
  2. Search hot tier first (exact + semantic)
  3. If insufficient results, search warm tier (ANN via pgvector)
  4. Rank by cosine similarity × importance
  5. Return top-k results

prune():
  1. Hot tier: evict by LRU per TTL
  2. Warm tier: batch-delete entries where importance < threshold
  3. Cold tier: compress entries older than 90 days into summaries
```

## 7.4 Message Bus

### Responsibility
Provide reliable inter-module and inter-agent communication with routing, delivery guarantees, and traceability.

### Design

```
┌──────┐   ┌──────┐   ┌──────┐
│Module│   │Module│   │Agent │
│  A   │   │  B   │   │  C   │
└──┬───┘   └──┬───┘   └──┬───┘
   │          │          │
   ▼          ▼          ▼
┌─────────────────────────────────────┐
│           Message Bus                │
│  ┌──────────┐  ┌──────────────────┐ │
│  │ Exchange │  │ Delivery Queue   │ │
│  │ Router   │  │ • At-least-once  │ │
│  │ • topic  │  │ • Retry DLQ     │ │
│  │ • direct │  │ • Ack tracking  │ │
│  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────┘
```

### Message Schema

Defined in Section 10 — Communication Protocol.

## 7.5 Module Registry

### Responsibility
Discover, register, validate, and version all modules in the system. Acts as a service locator.

### Registration Contract

```python
class ModuleRegistration:
    module_id: str           # Unique identifier
    module_type: str         # "core" | "agent" | "tool"
    interface_version: str   # Semver
    dependencies: list[str]  # Required modules
    capabilities: list[str]  # What it can do
    config_schema: dict      # JSON Schema for config
```

### Lifecycle

```
Register → Validate Interface → Health Check → Ready → Deregister
     │            │                  │
     ▼            ▼                  ▼
  Fail if     Fail if           Mark
  duplicate   contract          unhealthy,
              mismatch          trigger alert
```

## 7.6 State Manager

### Responsibility
Maintain execution context for every active objective. Support snapshots for recovery and rollback.

### State Schema

```python
@dataclass
class ExecutionState:
    objective_id: str
    status: Literal["compiling", "planning", "awaiting_approval",
                    "executing", "completed", "failed", "rolled_back"]
    context: dict              # Module-specific state
    snapshot: str              # Serialized state for recovery
    version: int               # Monotonically increasing
    lock: Lock                 # Concurrency control
```

### Operations

```
get_state(objective_id) → ExecutionState or None
set_state(objective_id, state) → None
snapshot(objective_id) → str (serialized state for recovery)
rollback(objective_id, snapshot) → ExecutionState
```

## 7.7 Health Monitor

### Responsibility
Track liveness, latency, and resource usage of all modules, agents, LLM providers, and infrastructure. Alert when thresholds breach.

### Metrics Collected

| Metric              | Source           | Collection | Alert Threshold        |
| ------------------- | ---------------- | ---------- | ---------------------- |
| Module heartbeat    | Module ping      | 5s interval| Missed 3 pings = down  |
| Task latency        | Execution timer  | Per task   | >2× expected duration  |
| LLM error rate      | Provider wrapper | Per minute | >5% error rate         |
| Memory utilization  | Memory Manager   | Per minute | >80% hot tier capacity |
| Resource usage      | Resource Alloc.  | Per minute | Token budget >90%      |
| Decision backlog    | Decision Surface | Per minute | >10 pending decisions  |

## 7.8 Resource Allocator

### Responsibility
Track and enforce resource quotas across modules, agents, and LLM providers. Prevent any single consumer from starving others.

### Resource Types

| Resource      | Unit            | Per-Objective Limit | Per-Org Limit |
| ------------- | --------------- | ------------------- | ------------- |
| LLM tokens    | Tokens          | 100K                | 500K          |
| LLM requests  | Requests        | 500                 | 2500          |
| Memory writes | Entries         | 1000                | 5000          |
| Cache space   | MB              | 50                  | 250           |
| Agent runtime | CPU-seconds     | 600                 | 3000          |

### Allocation Strategy

```
1. Weighted fair queuing by objective priority
2. Burst allowance: 2× base limit for 60 seconds
3. Starvation prevention: minimum 10% reserved for low-priority
4. Backpressure when >80% consumed
```

---

# 8. Module Architecture

## 8.1 Objective Compiler

### Purpose
Converts natural language business objectives into structured, machine-executable goal representations.

### Pipeline
```
Raw Input
    │
    ▼
NLP Parser ──► Extract entities, deadlines, constraints
    │
    ▼
Ambiguity Resolver ──► LLM-based clarification
    │
    ▼
Constraint Encoder ──► Formal constraint expressions
    │
    ▼
Dependency Mapper ──► Critical path graph
    │
    ▼
Risk Analyzer ──► Identify risk factors
    │
    ▼
Feasibility Check ──► success_probability, confidence
    │
    ▼
Structured Goal (JSON)
```

### Output Schema
```json
{
  "goal_id": "g-001",
  "description": "Launch new SaaS product within 3 months",
  "success_criteria": [
    "MVP with core features deployed",
    "10 beta customers onboarded",
    "CI/CD pipeline operational"
  ],
  "constraints": {
    "timeline_days": 90,
    "team_size": 8,
    "budget_usd": 150000
  },
  "dependencies": [
    {"task": "Backend API", "depends_on": ["Database schema"]}
  ],
  "risk_factors": [
    {"risk": "Team ramp-up time", "severity": "medium", "likelihood": 0.6}
  ],
  "priority": "high",
  "success_probability": 0.72,
  "confidence": 0.85
}
```

## 8.2 Planner

### Purpose
Generates multi-strategy execution plans with work streams, milestones, dependency graphs, critical path analysis, and contingency plans.

### Input / Output
- **Input:** CompiledGoal, ResourceSpec, MemorySnippets
- **Output:** Plan (work_streams[], milestones[], dependencies[], critical_path[], bottlenecks[], contingency_plans[], resource_allocation, timeline_estimate)

### Algorithm
```
1. Decompose goal into milestones (reverse-chronological from deadline)
2. For each milestone, generate task groups by department
3. Build dependency graph between all tasks
4. Compute critical path (PERT: optimistic, most-likely, pessimistic)
5. Identify bottlenecks: tasks on critical path with single resource
6. Generate contingency plans: Plan B (add resources), Plan C (reduce scope)
```

## 8.3 Dynamic Organization Generator

### Purpose
Synthesizes optimal organizational structures based on compiled objectives.

### Lifecycle
```
Goal Analysis
    │
    ▼
Department Creation
    │
    ▼
Role Assignment
    │
    ▼
Resource Allocation
    │
    ▼
Execution
    │
    ▼
Health Monitoring
    │
    ▼
Restructuring (merge, split, scale, dissolve)
```

### Restructuring Rules

| Trigger                     | Action                   |
| --------------------------- | ------------------------ |
| workload_avg > 0.9          | Split department         |
| workload_avg < 0.2          | Merge into parent        |
| error_rate > 0.15           | Reassign agents          |
| decision_backlog > 10       | Add manager agent        |
| objective_complete          | Dissolve department      |
| new_objective_conflict      | Create parallel dept     |

## 8.4 Risk Engine

### Purpose
Identifies, categorizes, and quantifies risks using rule-based analysis, historical data, and Monte Carlo simulation.

### Risk Categories

| Category       | Examples                                            | Detection Method          |
| -------------- | --------------------------------------------------- | ------------------------- |
| Technical      | Architecture debt, integration failure, scalability | Rule-based pattern match  |
| Timeline       | Dependency chain length, resource contention        | PERT analysis             |
| Resource       | Skill gaps, availability conflicts, budget overrun  | Historical comparison     |
| Market         | Competitor timing, technology shift, adoption risk  | External data (future)    |

### Output
```json
{
  "risk_breakdown": [
    {"category": "technical", "score": 0.45, "top_risk": "API latency at scale",
     "risks": [{"risk": "Database connection pool exhaustion",
                "probability": 0.6, "impact": "high", "mitigation": "Connection pooling + read replicas"}]}
  ],
  "monte_carlo_results": {
    "on_time_probability": 0.62,
    "within_budget_probability": 0.75,
    "overall_success_probability": 0.72
  },
  "critical_risks": ["Dependency on third-party API without SLA"],
  "recommendation": "proceed_with_caution"
}
```

## 8.5 Simulation Engine

### Purpose
Generates and compares multiple execution strategies.

### Strategies

| Dimension     | Plan A (Recommended) | Plan B (Conservative) | Plan C (Aggressive) |
| ------------- | -------------------- | --------------------- | ------------------- |
| Timeline      | 90 days              | 120 days              | 60 days             |
| Cost          | $150,000             | $100,000              | $250,000            |
| Risk Score    | 0.35                 | 0.20                  | 0.65                |
| Quality Score | 0.85                 | 0.70                  | 0.50                |
| Success Prob  | 0.72                 | 0.80                  | 0.35                |
| Best For      | Optimal balance      | Risk-averse orgs      | First-mover advantage|

## 8.6 Evidence Engine

### Purpose
Validates every claim against sources, tracks provenance, identifies contradictions, and provides structured explainability.

### Validation Pipeline

```
Claim
  │
  ▼
Source Retrieval ──► Query memory, web, provided context
  │
  ▼
Source Scoring ──► Relevancy, authority, recency
  │
  ▼
Claim-Source Alignment ──► Semantic similarity check
  │
  ▼
Contradiction Detection ──► Conflicting evidence identified
  │
  ▼
Confidence Calibration ──► Adjusted by historical accuracy
  │
  ▼
Verdict ──► supported | partially_supported | unsupported | contradicted
```

### Output Schema
```json
{
  "claim": "Adding 2 engineers will reduce timeline by 30%",
  "evidence": [
    {
      "source": "Historical project data",
      "support": "Similar projects show 28-32% reduction",
      "confidence": 0.85,
      "methodology": "Statistical analysis of 15 similar projects"
    },
    {
      "source": "Brooks' Law analysis",
      "support": "Communication overhead may reduce gains for complex integrations",
      "confidence": 0.40,
      "methodology": "Software engineering research"
    }
  ],
  "overall_confidence": 0.72,
  "assumptions": ["Engineers have relevant domain experience"],
  "rejected_alternatives": [
    {"alternative": "Outsource to agency", "reason_rejected": "3x cost, lower quality control"}
  ],
  "supporting_facts": [],
  "contradicting_facts": [],
  "reasoning": "Based on historical velocity data from 15 similar projects...",
  "verdict": "partially_supported"
}
```

## 8.7 Organizational Memory

### Purpose
Persistent, structured knowledge base capturing decisions, outcomes, risks, and lessons learned.

### Memory Types

| Type       | Analogy       | Content                                      | Example                           |
| ---------- | ------------- | -------------------------------------------- | --------------------------------- |
| Episodic   | Experience    | Past projects, decisions, outcomes           | "Project X failed due to scope creep"|
| Semantic   | Knowledge     | Domain knowledge, best practices, patterns   | "SaaS launches average 6mo to PMF" |
| Procedural | Skills        | Processes, workflows, prompts                | "Incident response playbook"      |
| Social     | Relationships | Agent relationships, expertise maps          | "Backend agent has DB expertise"  |
| Contextual | Current state | Active objectives, departments, resources    | "Current resource utilization: 73%"|

## 8.8 Health Engine

### Purpose
Monitors organizational health across five dimensions. Triggers alerts and automatic remediation when thresholds breach.

### Metrics

| Metric            | Target  | Warning | Critical | Remediation                          |
| ----------------- | ------- | ------- | -------- | ------------------------------------ |
| Execution Score   | >90%    | <80%    | <60%     | Reallocate resources, split depts    |
| Coordination Score| >85%    | <75%    | <55%     | Reduce inter-dept dependencies       |
| Risk Index        | <0.30   | >0.50   | >0.70    | Pause execution, escalate to human   |
| Trust Score       | >80%    | <70%    | <50%     | Confidence calibration, more evidence |
| Decision Quality  | >85%    | <75%    | <55%     | Review decisions, update prompts     |

## 8.9 Decision Engine

### Purpose
Formalize decision-making between AI modules and humans. Track every decision through its lifecycle.

### Lifecycle

Defined in Section 12 — Decision Flow.

---

# 9. Module Interface Contracts

Every module exposes a typed, versioned interface. All inputs and outputs are validated Pydantic models.

## 9.1 Contract Definitions

| Source Module      | Target Module       | Method     | Input Type         | Output Type           |
| ------------------ | ------------------- | ---------- | ------------------ | --------------------- |
| Objective Compiler | Planner             | compile    | str                | CompiledGoal          |
| Planner            | Org Generator       | synthesize | CompiledGoal, ResourceSpec | OrgStructure    |
| Planner            | Simulation Engine   | simulate   | Plan               | SimulationResult      |
| Planner            | Risk Engine         | assess     | Plan, MemorySnippets| RiskAssessment        |
| Org Generator      | AI Kernel           | register   | OrgStructure       | RegistrationConfirmation|
| AI Kernel          | Any Agent           | dispatch   | Task               | TaskResult            |
| Any Module         | Evidence Engine     | validate   | Claim, Context     | EvidenceReport        |
| Any Module         | Memory Manager      | write      | MemoryEntry        | MemoryId              |
| Any Module         | Memory Manager      | read       | MemoryQuery        | list[MemoryEntry]     |
| AI Kernel          | Health Engine       | publish    | HealthMetrics      | HealthStatus          |

## 9.2 Pydantic Schemas

```python
class CompiledGoal(BaseModel):
    goal_id: str
    description: str
    success_criteria: list[str]
    constraints: Constraints
    dependencies: list[Dependency]
    risk_factors: list[RiskFactor]
    priority: Literal["low", "medium", "high", "critical"]
    success_probability: float  # 0.0–1.0
    confidence: float           # 0.0–1.0

class Plan(BaseModel):
    plan_id: str
    objective_id: str
    work_streams: list[WorkStream]
    critical_path: list[str]  # Task IDs
    bottlenecks: list[str]
    contingency_plans: list[ContingencyPlan]
    resource_allocation: dict[str, ResourceBudget]
    timeline_estimate: Timeline
    confidence: float

class OrgStructure(BaseModel):
    departments: list[Department]
    communication_channels: list[Channel]
    restructuring_rules: list[Rule]
    expected_overhead: float  # 0.0–1.0

class RiskAssessment(BaseModel):
    risk_breakdown: list[CategoryRisk]
    monte_carlo_results: MonteCarlo
    critical_risks: list[str]
    recommendation: Literal["proceed", "cautious", "restructure", "abort"]

class SimulationResult(BaseModel):
    scenarios: list[Scenario]  # Always 3: A, B, C
    comparison: ComparisonMatrix
    recommendation: ScenarioRef
    rationale: str

class EvidenceReport(BaseModel):
    claim: str
    evidence: list[EvidenceSource]
    overall_confidence: float
    assumptions: list[str]
    rejected_alternatives: list[RejectedAlternative]
    supporting_facts: list[str]
    contradicting_facts: list[str]
    reasoning: str
    verdict: Literal["supported", "partially_supported", "unsupported", "contradicted"]

class Task(BaseModel):
    task_id: str
    type: str
    params: dict
    context: ExecutionContext
    memory_access: list[str]  # Memory types allowed
    deadline: datetime | None

class TaskResult(BaseModel):
    task_id: str
    status: Literal["success", "failure", "partial"]
    output: dict
    evidence: EvidenceReport | None
    confidence: float
    duration_ms: int
```

---

# 10. Communication Protocol

Every inter-module message follows a standard envelope. This ensures traceability, debuggability, and consistent routing.

## 10.1 Message Envelope

```json
{
  "header": {
    "message_id": "msg_abc123",
    "trace_id": "trace_xyz789",
    "source": "Planner",
    "source_module_id": "planner_v2.1",
    "target": "RiskEngine",
    "target_module_id": "risk_engine_v1.4",
    "message_type": "command",
    "protocol_version": "1.0",
    "timestamp": "2026-07-27T14:30:00.123Z",
    "ttl_ms": 30000,
    "priority": "P1",
    "correlation_id": "obj_456"
  },
  "body": {
    "schema": "RiskAssessmentRequest",
    "schema_version": "1.0",
    "payload": {
      "plan_id": "plan_789",
      "include_monte_carlo": true,
      "risk_categories": ["technical", "timeline", "resource"]
    }
  },
  "metadata": {
    "auth_token": "eyJ...",
    "retry_count": 0,
    "max_retries": 3,
    "compressed": false,
    "size_bytes": 2048
  }
}
```

## 10.2 Message Types

| Type              | Direction            | Guarantee      | Use Case                   |
| ----------------- | -------------------- | -------------- | -------------------------- |
| command           | Module → Module      | At-least-once  | Request an action          |
| response          | Module → Module      | At-least-once  | Respond to command         |
| event             | Module → Bus         | At-most-once   | Broadcast state change     |
| query             | Module → Memory      | At-least-once  | Request data               |
| error             | Module → Kernel      | At-least-once  | Report failure             |
| heartbeat         | Agent → Kernel       | At-most-once   | Liveness signal            |

## 10.3 Routing Rules

| Message Type | Source           | Target                      | Route                       |
| ------------ | ---------------- | --------------------------- | --------------------------- |
| command      | AI Kernel        | Any module                  | Direct via Module Registry  |
| command      | Agent            | Other agent                 | Via Message Bus (topic:agent)|
| event        | Any module       | All subscribers             | Pub/sub (topic:module.events)|
| query        | Any module       | Memory Manager              | Direct                     |
| error        | Any module       | AI Kernel (Health Monitor)  | Priority queue              |
| heartbeat    | Agent            | AI Kernel (Health Monitor)  | Dedicated channel           |

## 10.4 Delivery Guarantees

| Guarantee      | Implementation                              |
| -------------- | ------------------------------------------- |
| At-least-once  | Persist to Redis queue, ack on processing   |
| At-most-once   | Fire-and-forget on event bus               |
| Ordered        | Per-source sequence numbers                |
| Dead letter    | Failed deliveries retried, then DLQ + alert |

---

# 11. Data Flow

## 11.1 Primary Execution Flow

```
User Input (Natural Language)
    │
    ▼
[1] Objective Compiler ──► Structured Goal
    │
    ▼
[2] Planner ──► Multi-strategy Plan
    │
    ▼
[3] Org Generator ──► Department & Agent Synthesis
    │
    ▼
[4] AI Kernel ──► Task Scheduling & Resource Allocation
    │
    ├──► Departments execute in parallel
    │       │
    │       ├──► Evidence Engine validates claims
    │       ├──► Risk Engine assesses continuously
    │       └──► Memory records all state changes
    │
    ▼
[5] Simulation Engine ──► Strategy Comparison
    │
    ▼
[6] Decision Surface ──► Human Review & Approval
    │
    ▼
[7] Execution ──► Agents run tasks, Memory stores outcomes
```

## 11.2 Real-Time Event Flow

```
AI Kernel Event Bus
    │
    ├──► Decision Required ──► Decision Surface (WebSocket push)
    │       │
    │       ▼
    │   Human Responds ──► AI Kernel resumes execution
    │
    ├──► Health Alert ──► Health Engine logs ──► Org Generator restructures
    │
    ├──► Agent State Change ──► Memory records ──► Decision Surface updates
    │
    └──► LLM Error ──► Model Router fallback ──► Kernel notified
```

## 11.3 Observability Data Flow

```
Every module emits:
    │
    ├──► Structured Log (structlog) ──► stdout/Logstash
    │
    ├──► Metric (OpenTelemetry) ──► Prometheus
    │       └──► Dashboard (Grafana)
    │
    ├──► Trace (OpenTelemetry) ──► Jaeger
    │
    └──► Audit Event ──► Audit Log Table (PostgreSQL)
```

---

# 12. Decision Flow

Every decision in OrchestraOS follows a formal lifecycle. This ensures explainability, auditability, and appropriate human oversight.

## 12.1 Decision Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                      DECISION LIFECYCLE                          │
│                                                                   │
│  ┌─────────┐                                                      │
│  │ PROPOSE │──► AI module identifies a decision is needed         │
│  └────┬────┘                                                      │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────┐                                                      │
│  │  GATHER │──► Evidence Engine validates supporting claims       │
│  │ EVIDENCE│──► Risk Engine assesses implications                │
│  └────┬────┘──► Memory queried for similar past decisions        │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────┐                                                      │
│  │  RENDER │──► Decision record created with:                    │
│  │         │      • Question                                     │
│  │         │      • Options (≥2)                                 │
│  │         │      • Recommendation (which option + why)          │
│  │         │      • Confidence (0.0–1.0)                         │
│  │         │      • Evidence (structured)                        │
│  │         │      • Risk assessment                              │
│  │         │      • Authority level required                     │
│  └────┬────┘                                                      │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────┐                                                      │
│  │ ROUTE   │──► Check authority level:                           │
│  │         │                                                     │
│  │         │  Auto-execute ──► if confidence > threshold          │
│  │         │                   AND risk < threshold               │
│  │         │                   AND authority = "recommend"        │
│  │         │                                                     │
│  │         │  Human review ──► if confidence < threshold          │
│  │         │                   OR risk > threshold                │
│  │         │                   OR authority = "approve/execute"   │
│  └────┬────┘                                                      │
│       │                                                           │
│       ├── (Auto-execute) ──► EXECUTE                              │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────┐     ┌──────────┐     ┌──────────┐                   │
│  │ REVIEW  │────►│ APPROVE  │────►│ EXECUTE  │                   │
│  │ (Human) │     │ /REJECT  │     │          │                   │
│  └─────────┘     └────┬─────┘     └────┬─────┘                   │
│                        │               │                          │
│                   ┌────▼─────┐    ┌─────▼─────┐                   │
│                   │ Reject   │    │ Execute   │                   │
│                   │ + reason │    │ + outcome │                   │
│                   └──────────┘    └─────┬─────┘                   │
│                                         │                         │
│                                         ▼                         │
│  ┌─────────┐                                                      │
│  │  STORE  │──► Decision + outcome stored in Memory              │
│  │ MEMORY  │──► Confidence score updated for future calibration  │
│  └────┬────┘──► Health Engine updates Decision Quality metric    │
│       │                                                           │
│       ▼                                                           │
│  ┌─────────┐                                                      │
│  │  LEARN  │──► If rejected: extract reason, adjust prompts      │
│  │         │──► If failed: store as negative example             │
│  │         │──► If succeeded: reinforce confidence               │
│  └─────────┘                                                      │
└──────────────────────────────────────────────────────────────────┘
```

## 12.2 Authority Level Determination

The authority level required for a decision is determined by:

```python
def determine_authority(confidence: float, risk_score: float,
                        decision_type: str) -> str:
    if decision_type == "strategic":
        return "execute"          # Always human
    if risk_score > 0.7:
        return "execute"          # High risk = human
    if confidence < 0.6:
        return "approve"          # Low confidence = manager
    if confidence > 0.9 and risk_score < 0.3:
        return "recommend"        # High confidence, low risk = auto
    return "approve"
```

## 12.3 Decision Record Schema

```json
{
  "decision_id": "dec_001",
  "objective_id": "obj_001",
  "created_at": "2026-07-27T14:30:00Z",
  "resolved_at": null,
  "question": "Should we use PostgreSQL or MongoDB for the primary database?",
  "options": [
    {"id": "opt_a", "label": "PostgreSQL", "pros": ["ACID", "pgvector"], "cons": ["Scaling complexity"]},
    {"id": "opt_b", "label": "MongoDB", "pros": ["Horizontal scaling"], "cons": ["No native vector search"]}
  ],
  "recommendation": {
    "option_id": "opt_a",
    "rationale": "pgvector eliminates need for separate vector DB, ACID compliance critical for organizational memory",
    "confidence": 0.88
  },
  "evidence_summary": "Evidence Engine found 12 supporting references, 2 contradicting",
  "risk_assessment": {"score": 0.25, "level": "low"},
  "authority_required": "approve",
  "status": "pending",
  "resolved_by": null,
  "resolution": null,
  "rejection_reason": null
}
```

---

# 13. Failure Handling

A production system must handle failures gracefully. This section defines the failure modes and responses for every layer.

## 13.1 LLM Provider Failure

```
LLM call fails (timeout, rate limit, server error)
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ Retry with exponential backoff                               │
│   Attempt 1: wait 1s                                         │
│   Attempt 2: wait 2s                                         │
│   Attempt 3: wait 4s                                         │
│   Attempt 4: fallback to next provider in chain              │
│   Attempt 5: return degraded response (cached or simplified) │
│   All failed: raise AllProvidersFailed                       │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ Degraded Response Strategy                                   │
│ ├── If cached result exists → return with warning            │
│ ├── If partial result exists → return with confidence=0      │
│ └── If nothing → return error to caller with trace_id        │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ AI Kernel Health Monitor                                     │
│ ├── Log incident (provider, model, error, duration)          │
│ ├── Update provider error rate metric                        │
│ ├── If error rate > 5% in 5min → alert + disable provider    │
│ └── Auto-re-enable provider after cooldown period            │
└──────────────────────────────────────────────────────────────┘
```

## 13.2 Module Failure

```
Module crash or timeout
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ Detection (Health Monitor)                                   │
│ ├── Heartbeat missed ≥3 consecutive checks (15s)             │
│ └── Task execution >2× expected duration                     │
└──────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ Recovery                                                     │
│ ├── AI Kernel marks module as "unhealthy"                    │
│ ├── Attempt restart: reload module from Module Registry      │
│ ├── Restore state from last snapshot (State Manager)         │
│ ├── Replay in-flight tasks from message queue                │
│ └── If restart fails ≥3 times → escalate to human            │
└──────────────────────────────────────────────────────────────┘
```

## 13.3 Agent Failure

```
Agent fails during task execution
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ Agent Failure Handling                                       │
│ ├── AI Kernel detects via: heartbeat + task timeout          │
│ ├── Log failure with trace_id and agent state                │
│ ├── Retry task on different agent (same department)          │
│ ├── If no alternative agent → request Org Generator spawn    │
│ ├── If spawn fails → escalate task to human via Decision     │
│ └── After 3 failures from same dept → trigger restructuring  │
└──────────────────────────────────────────────────────────────┘
```

## 13.4 Database Failure

```
Database connection failure
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│ Connection Pool Exhaustion                                   │
│ ├── Pool max_size hit → queue with backpressure signal      │
│ ├── Wait for available connection (max 5s)                   │
│ └── Fail with 503 Service Unavailable                        │
│                                                              │
│ Query Timeout                                                │
│ ├── Cancel query after statement_timeout                     │
│ ├── Log slow query for analysis                              │
│ ├── Return error to caller                                   │
│ └── Health Monitor updates DB latency metric                 │
│                                                              │
│ Complete Outage                                              │
│ ├── Switch to read-only mode (if replica available)          │
│ ├── Queue writes for replay after recovery                   │
│ └── Alert operations team                                    │
└──────────────────────────────────────────────────────────────┘
```

## 13.5 Circuit Breaker Pattern

For external dependencies (LLM providers, databases, external APIs):

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ CLOSED  │────►│  OPEN   │────►│ HALF-   │
│ (normal)│     │ (failing)│     │  OPEN   │
└────┬────┘     └────┬────┘     └────┬────┘
     │               │               │
     │               │               │
     │          ┌────▼────┐          │
     │          │ Requests │          │
     │          │ blocked  │          │
     │          │ for 30s  │──────────┘
     │          └─────────┘    (probe)
     │                              │
     └──────────────────────────────┘
       (success → close circuit)
```

## 13.6 Global Error Taxonomy

| Error Code | Name                   | HTTP Status | Retryable | Human Escalate |
| ---------- | ---------------------- | ----------- | --------- | -------------- |
| E-001      | LLM_PROVIDER_ERROR    | 502         | Yes       | After 5 retries|
| E-002      | MODULE_TIMEOUT        | 504         | Yes       | After 3 retries|
| E-003      | AGENT_FAILURE         | 500         | Yes       | After 3 retries|
| E-004      | DB_CONNECTION_ERROR   | 503         | Yes       | Immediate      |
| E-005      | VALIDATION_ERROR      | 422         | No        | No             |
| E-006      | AUTH_ERROR            | 401         | No        | No             |
| E-007      | RESOURCE_EXHAUSTED    | 429         | Yes       | After throttle |
| E-008      | DEADLOCK_DETECTED     | 409         | Yes       | After 3 retries|
| E-009      | CACHE_MISS            | 200 (stale) | No        | No             |
| E-010      | DEGRADED_RESPONSE     | 200 (warn)  | N/A       | No             |

---

# 14. API Specification

## 14.1 REST Endpoints

### Objectives
```
POST   /api/v1/objectives              Create new objective (raw input)
GET    /api/v1/objectives              List objectives (paginated, filterable)
GET    /api/v1/objectives/:id          Get objective with compiled spec
POST   /api/v1/objectives/:id/compile  Trigger re-compilation
DELETE /api/v1/objectives/:id          Delete objective
```

### Plans
```
GET    /api/v1/plans                   List plans
GET    /api/v1/plans/:id               Get plan details
POST   /api/v1/plans                   Create plan from objective
POST   /api/v1/plans/:id/simulate      Run simulation comparison
POST   /api/v1/plans/:id/approve       Approve plan for execution
```

### Departments
```
GET    /api/v1/departments             List departments
GET    /api/v1/departments/:id         Get department details
POST   /api/v1/departments/:id/restructure  Trigger restructure
GET    /api/v1/departments/:id/health  Get department health
```

### Agents
```
GET    /api/v1/agents                  List agents
GET    /api/v1/agents/:id              Get agent details
PATCH  /api/v1/agents/:id              Update agent config
POST   /api/v1/agents/:id/reset        Reset agent state
```

### Tasks
```
GET    /api/v1/tasks                   List tasks
GET    /api/v1/tasks/:id               Get task details
PATCH  /api/v1/tasks/:id/status        Update task status
POST   /api/v1/tasks/:id/assign        Assign task to agent
```

### Decisions
```
GET    /api/v1/decisions               List decisions
GET    /api/v1/decisions/:id           Get decision with evidence
POST   /api/v1/decisions/:id/approve   Approve decision
POST   /api/v1/decisions/:id/reject    Reject with feedback
```

### Memory
```
POST   /api/v1/memory/insert           Store memory entry
POST   /api/v1/memory/query            Semantic search
GET    /api/v1/memory/types            List memory types
DELETE /api/v1/memory/:id              Delete memory entry
```

### Health
```
GET    /api/v1/health                  Overall organizational health
GET    /api/v1/health/history          Health time-series data
GET    /api/v1/health/alerts           Active health alerts
```

## 14.2 WebSocket Events

```
Client subscribes to:
  objectives:{id}:state       Objective state changes
  plans:{id}:state            Plan state changes
  decisions:new               New decisions requiring review
  departments:{id}:state      Department changes (merge/split/scale)
  agents:{id}:state           Agent lifecycle events
  health:alerts               Health threshold alerts
  memory:updates              Memory store modifications
```

---

# 15. Database Schema

## 15.1 Entity Relationship

```
organizations ─── users
      │
      ├── objectives ─── plans ─── tasks
      │                     │
      │                decisions ─── evidence
      │                     │
      │               risk_assessments
      │               simulations
      │               decision_log (audit)
      │
      ├── departments ─── agents
      │
      ├── memory_entries (pgvector)
      │
      └── organizational_health (time-series)
```

## 15.2 Core Tables

```sql
-- Organizations & Users
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan_tier VARCHAR(50) DEFAULT 'starter',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objectives & Plans
CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    raw_input TEXT NOT NULL,
    compiled_spec JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    trace_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
    plan_data JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Departments & Agents
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    purpose TEXT,
    health_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dept_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    agent_type VARCHAR(100) NOT NULL,
    capabilities JSONB DEFAULT '[]',
    llm_config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'idle',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES plans(id),
    dept_id UUID REFERENCES departments(id),
    title VARCHAR(500) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    dependencies UUID[] DEFAULT '{}',
    estimated_hours DECIMAL(8,2),
    actual_hours DECIMAL(8,2),
    trace_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Decisions & Evidence
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB DEFAULT '[]',
    recommendation JSONB,
    confidence DECIMAL(4,3),
    authority_level VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    outcome VARCHAR(50),
    rejection_reason TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    claim TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    confidence DECIMAL(4,3),
    verdict VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Risk Assessments
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    risk_breakdown JSONB NOT NULL,
    monte_carlo_results JSONB,
    critical_risks JSONB DEFAULT '[]',
    recommendation VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Simulations
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
    scenarios JSONB NOT NULL,
    comparison JSONB NOT NULL,
    recommendation JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory (with vector support)
CREATE TABLE memory_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}',
    importance DECIMAL(3,2) DEFAULT 0.5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organizational Health (time-series)
CREATE TABLE organizational_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    execution_score DECIMAL(5,2),
    coordination_score DECIMAL(5,2),
    risk_index DECIMAL(5,2),
    trust_score DECIMAL(5,2),
    decision_quality DECIMAL(5,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE decision_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 15.3 Indexes

```sql
-- Primary access patterns
CREATE INDEX idx_objectives_org ON objectives(org_id);
CREATE INDEX idx_objectives_status ON objectives(status);
CREATE INDEX idx_plans_objective ON plans(objective_id);
CREATE INDEX idx_tasks_dept ON tasks(dept_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_decisions_objective ON decisions(objective_id);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_outcome ON decisions(outcome);
CREATE INDEX idx_memory_org ON memory_entries(org_id);
CREATE INDEX idx_memory_type ON memory_entries(memory_type);
CREATE INDEX idx_memory_importance ON memory_entries(importance DESC);
CREATE INDEX idx_health_org ON organizational_health(org_id);
CREATE INDEX idx_health_time ON organizational_health(recorded_at DESC);
CREATE INDEX idx_decision_log_org ON decision_log(org_id);
CREATE INDEX idx_decision_log_time ON decision_log(created_at DESC);

-- Vector index for semantic search
CREATE INDEX idx_memory_embedding ON memory_entries
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full-text search on objectives
CREATE INDEX idx_objectives_search ON objectives
    USING gin(to_tsvector('english', raw_input));
```

---

# 16. Agent Architecture

## 16.1 Base Agent Contract

```python
class BaseAgent:
    """All agents inherit from this base class."""

    async def initialize(self, config: AgentConfig) -> None:
        """Set up agent with role, capabilities, LLM config."""

    async def execute(self, task: Task) -> TaskResult:
        """Execute assigned task, return result with evidence."""

    async def communicate(self, message: Message) -> None:
        """Send/receive inter-agent messages via AI Kernel."""

    async def report_health(self) -> HealthMetrics:
        """Report current health status to Kernel."""
```

## 16.2 Agent Types

| Agent              | Responsibilities                                  | Inputs                  | Outputs                  | LLM Model       |
| ------------------ | ------------------------------------------------- | ----------------------- | ------------------------ | --------------- |
| Project Manager    | Break down objectives, assign tasks, track status | Compiled objective, plan| Task assignments, reports| gpt-4o          |
| Frontend Engineer  | Implement UI, integrate APIs, optimize performance| Design specs, API docs  | Components, CSS, tests   | claude-3.5-sonnet|
| Backend Engineer   | Design APIs, business logic, data management      | Feature specs, models   | Endpoints, migrations    | claude-3.5-sonnet|
| Designer           | Create mockups, design system, accessibility      | Requirements, brand     | Tokens, specs, flows     | gpt-4o          |
| QA Engineer        | Test plans, execute tests, report bugs            | Feature specs, env      | Test reports, bug reports| gpt-4o-mini     |
| DevOps             | CI/CD, infra, deployment, monitoring              | Build artifacts, config | Scripts, IaC, runbooks   | claude-3.5-haiku|
| Marketing          | Copy, campaigns, market analysis                  | Product, persona        | Copy, plans, KPIs        | gpt-4o          |
| Research           | Conduct research, evaluate tech, gather intel     | Questions, tools        | Briefs, analyses         | claude-3.5-haiku|

---

# 17. LLM Abstraction Layer

## 17.1 Model Router

```python
class ModelRouter:
    ROUTING_RULES = {
        "simple":     {"model": "gpt-4o-mini",       "max_tokens": 1000, "cost_per_1k": 0.00015},
        "complex":    {"model": "gpt-4o",            "max_tokens": 4000, "cost_per_1k": 0.0025},
        "reasoning":  {"model": "o3-mini",           "max_tokens": 8000, "cost_per_1k": 0.0011},
        "code":       {"model": "claude-3.5-sonnet",  "max_tokens": 8000, "cost_per_1k": 0.003},
        "research":   {"model": "claude-3.5-haiku",   "max_tokens": 4000, "cost_per_1k": 0.0008},
        "fallback":   {"model": "gemini-2.0-flash",   "max_tokens": 4000, "cost_per_1k": 0.0001},
    }

    def route(self, task: Task) -> str:
        if task.requires_reasoning:
            return "reasoning"
        if task.type == "code_generation":
            return "code"
        if task.complexity_score > 0.7:
            return "complex"
        return "simple"

    async def generate(self, prompt: str, schema: type[BaseModel],
                       task: Task, trace_id: str) -> BaseModel:
        last_error = None
        for attempt in range(self.max_retries):
            route_key = self.route(task)
            provider = self.get_provider(route_key)
            try:
                start = time.monotonic()
                result = await provider.generate(prompt, schema)
                duration = time.monotonic() - start
                # Record observability
                self.track_usage(route_key, prompt, result, duration)
                return result
            except RateLimitError as e:
                last_error = e
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
            except ProviderError as e:
                last_error = e
                # Fallback chain: current → next provider in priority
                provider = self.fallback_provider(route_key)
        raise AllProvidersFailed(last_error)
```

## 17.2 Provider Priorities

| Rank | Provider                 | Models                  | Best For                | Fallback To       |
| ---- | ------------------------ | ----------------------- | ----------------------- | ----------------- |
| 1    | OpenAI                   | gpt-4o, o3-mini         | Reasoning, structured   | Anthropic         |
| 2    | Anthropic                | claude-3.5-sonnet, haiku| Code, long-form         | Google            |
| 3    | Google                   | gemini-2.0-flash        | Fast fallback           | OpenRouter        |
| 4    | OpenRouter (fallback)    | Various                 | Last resort             | N/A (degraded)    |

## 17.3 Caching Strategy

| Layer | Technology       | TTL      | Invalidation              | Usage                          |
| ----- | ---------------- | -------- | ------------------------- | ------------------------------ |
| L1    | Python lru_cache | 60s      | Time-based                | Health metrics, agent status   |
| L2    | Redis            | 300s     | Semantic hash + TTL       | Semantic LLM response cache    |
| L3    | Supabase pgvector| Indefinite| Importance prune          | Memory entries, evidence       |

### Semantic Cache (L2)

```python
async def get_cached_response(prompt: str, model: str) -> str | None:
    """Check if a semantically similar prompt was cached."""
    embedding = await embed(prompt)
    # Cosine similarity > 0.95 → cache hit
    results = await vector_search(embedding, model_filter=model, threshold=0.95)
    return results[0] if results else None
```

---

# 18. Frontend Architecture

## 18.1 Pages

| Page               | Route              | Purpose                                 |
| ------------------ | ------------------ | --------------------------------------- |
| Dashboard          | /                  | Decision Surface — active decisions, health |
| Objectives         | /objectives        | List and create objectives              |
| Objective Detail   | /objectives/:id    | Full compiled spec, plan, risks         |
| Organization Graph | /organization      | Interactive department/agent graph      |
| Simulation View    | /simulation/:id    | Three-column plan comparison            |
| Decision History   | /decisions         | Searchable decision log with evidence   |
| Settings           | /settings          | User preferences, API keys              |

## 18.2 Component Tree

```
app/
  layout.tsx               Root layout (sidebar, header)
  page.tsx                 Dashboard (Decision Surface)
  objectives/
    page.tsx               Objectives list
    [id]/
      page.tsx             Objective detail + plan + risks
  organization/
    page.tsx               Org graph with React Flow
  decisions/
    page.tsx               Decision history
  settings/
    page.tsx               Settings page

components/
  layout/
    Sidebar.tsx
    Header.tsx
    Navigation.tsx
  dashboard/
    DecisionCard.tsx        Pending decision summary
    HealthMetrics.tsx       Five health metric gauges
    ActiveObjectives.tsx    Current objective status
    RecentActivity.tsx      Activity timeline
  organization/
    OrgGraph.tsx            React Flow wrapper
    DepartmentNode.tsx      Custom department node
    AgentNode.tsx           Custom agent node
    OrgControls.tsx         Zoom, fit, layout controls
  objectives/
    ObjectiveForm.tsx       Natural language input
    ObjectiveCard.tsx       Summary card
    ObjectiveDetail.tsx     Full compiled spec
  decisions/
    DecisionPanel.tsx       Decision review interface
    EvidenceView.tsx        Evidence sources display
    RiskSummary.tsx         Risk breakdown
    DecisionHistory.tsx     Filterable history table
  simulation/
    PlanComparison.tsx      Three-column comparison
    ComparisonChart.tsx     Radar/bar chart
    RecommendationCard.tsx  Recommended plan highlight
  ui/
    Button.tsx, Card.tsx, Badge.tsx, Modal.tsx,
    Spinner.tsx, Tooltip.tsx, Select.tsx
```

## 18.3 Real-Time Updates

The frontend subscribes to Supabase Realtime channels for department changes and decision updates. When a new decision is created by the AI, the Decision Surface updates within 200ms, enabling rapid human review cycles.

---

# 19. Folder Structure

## 19.1 Top-Level

```
orchestraos/
  docs/
    01_TPRD.md
    02_ARCHITECTURE.md
  backend/
    app/
    tests/
    requirements.txt
    Dockerfile
  frontend/
    app/
    components/
    lib/
    styles/
    next.config.js
    tailwind.config.ts
    package.json
    Dockerfile
  .env.example
  docker-compose.yml
  README.md
```

## 19.2 Backend Module Detail

Every core module follows a consistent internal structure. This ensures any developer can navigate any module without guesswork.

```
backend/app/core/
  objective_compiler/
    __init__.py                 # Public interface (compile())
    compiler.py                 # Main orchestration logic
    compiler_service.py         # Internal helpers
    compiler_schema.py          # Pydantic I/O models
    compiler_prompt.md          # LLM system prompt (separated from code)
    compiler_tests.py           # Unit tests
  planner/
    __init__.py
    planner.py
    planner_service.py
    planner_schema.py
    planner_prompt.md
    planner_tests.py
  org_generator/
    __init__.py
    generator.py
    generator_service.py
    generator_schema.py
    generator_prompt.md
    generator_tests.py
  risk_engine/
    __init__.py
    risk_engine.py
    risk_service.py
    risk_schema.py
    risk_prompt.md
    risk_tests.py
  simulation_engine/
    __init__.py
    simulation_engine.py
    simulation_service.py
    simulation_schema.py
    simulation_prompt.md
    simulation_tests.py
  evidence_engine/
    __init__.py
    evidence_engine.py
    evidence_service.py
    evidence_schema.py
    evidence_prompt.md
    evidence_tests.py
  health_engine/
    __init__.py
    health_engine.py
    health_schema.py
    health_tests.py
  decision_engine/
    __init__.py
    decision_engine.py
    decision_schema.py
    decision_tests.py

backend/app/agents/
  base_agent.py                 # Abstract base class
  project_manager/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py
  frontend_engineer/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py
  backend_engineer/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py
  designer/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py
  qa_engineer/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py
  devops/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py
  marketing/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py
  research/
    __init__.py
    agent.py
    agent_prompt.md
    agent_tests.py

backend/app/kernel/              # AI Kernel (moved from core/)
  __init__.py
  scheduler.py
  memory_manager.py
  message_bus.py
  module_registry.py
  state_manager.py
  health_monitor.py
  resource_allocator.py
  kernel_schema.py
  kernel_tests.py

backend/app/llm/
  __init__.py
  provider.py                    # Abstract provider interface
  model_router.py                # Routing logic
  openai_provider.py
  anthropic_provider.py
  google_provider.py
  openrouter_provider.py
  rate_limiter.py
  cost_tracker.py

backend/app/observability/
  __init__.py
  logger.py                     # structlog configuration
  metrics.py                    # OpenTelemetry metrics
  tracer.py                     # Distributed tracing
  audit.py                      # Audit trail writer

backend/app/api/v1/
  __init__.py
  objectives.py
  plans.py
  departments.py
  agents.py
  tasks.py
  decisions.py
  memory.py
  health.py
  ws.py                         # WebSocket event handlers
```

## 19.3 Frontend Module Detail

```
frontend/
  app/
    layout.tsx
    page.tsx                    # Dashboard
    objectives/
      page.tsx
      [id]/page.tsx
    organization/
      page.tsx
    decisions/
      page.tsx
    settings/
      page.tsx
  components/
    layout/
      Sidebar.tsx
      Header.tsx
    dashboard/
      DecisionCard.tsx
      HealthMetrics.tsx
      ActiveObjectives.tsx
      RecentActivity.tsx
    organization/
      OrgGraph.tsx
      DepartmentNode.tsx
      AgentNode.tsx
      OrgControls.tsx
    objectives/
      ObjectiveForm.tsx
      ObjectiveCard.tsx
      ObjectiveDetail.tsx
    decisions/
      DecisionPanel.tsx
      EvidenceView.tsx
      RiskSummary.tsx
      DecisionHistory.tsx
    simulation/
      PlanComparison.tsx
      ComparisonChart.tsx
      RecommendationCard.tsx
    ui/
      Button.tsx
      Card.tsx
      Badge.tsx
      Modal.tsx
      Spinner.tsx
      Tooltip.tsx
      Select.tsx
  lib/
    api.ts                      # Axios/Fetch client
    supabase.ts                 # Supabase client config
    websocket.ts                # WebSocket hook
    store.ts                    # Zustand stores
    types.ts                    # Shared TypeScript types
  styles/
    globals.css
  public/
  next.config.js
  tailwind.config.ts
  package.json
  Dockerfile
```

---

# 20. Deployment Architecture

## 20.1 Container Layout

```
┌──────────────────────────────────────────────────┐
│                  Reverse Proxy (Nginx)             │
│              SSL termination, static files          │
└────────┬──────────────┬──────────────┬────────────┘
         │              │              │
┌────────▼────────┐ ┌──▼───────────┐ ┌▼────────────┐
│   FastAPI App    │ │  Next.js SSR  │ │            │
│  (uvicorn:8000) │ │  (node:3000)  │ │   Redis     │
│  AI Kernel      │ │  Frontend     │ │   (6379)    │
│  All modules    │ │  Assets       │ │            │
└─────────────────┘ └──────────────┘ └─────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│              Supabase (Managed)                   │
│    PostgreSQL + pgvector + Auth + Realtime        │
└──────────────────────────────────────────────────┘
```

## 20.2 Environment Variables

```env
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# Redis
REDIS_URL=redis://...

# Auth
JWT_SECRET=...
JWT_EXPIRY=3600

# App
APP_ENV=development|staging|production
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000

# Observability
OTEL_EXPORTER_OTLP_ENDPOINT=http://...
OTEL_SERVICE_NAME=orchestraos-api

# Model Router
PRIMARY_PROVIDER=openai
FALLBACK_PROVIDER=anthropic
MAX_RETRIES=3
```

## 20.3 Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [redis]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    env_file: .env
    depends_on: [api]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  # Optional: OpenTelemetry collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    ports: ["4318:4318"]  # OTLP HTTP
    volumes:
      - ./otel-collector-config.yaml:/etc/otel/config.yaml
```

---

# 21. Development Setup

## 21.1 Prerequisites

- Python 3.12+
- Node.js 20+
- Docker Desktop
- Supabase account (free tier)
- OpenAI / Anthropic API keys

## 21.2 Local Development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Configure API keys
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

# 22. Testing Strategy

## 22.1 Test Levels

| Level     | Scope                    | Framework    | Target Coverage |
| --------- | ------------------------ | ------------ | --------------- |
| Unit      | Individual modules       | pytest       | 90%             |
| Integration| Module interactions     | pytest + httpx| 80%            |
| E2E       | Full pipeline            | Playwright   | Critical paths  |
| LLM       | Prompt output validation | pytest       | Per template    |
| Load      | Performance benchmarks  | locust       | Per endpoint    |

## 22.2 Key Test Cases

- Objective Compiler: parse various input formats, handle ambiguity
- Planner: generate valid work streams, identify critical path
- Org Generator: create departments for different objective types
- Evidence Engine: validate claims against known sources
- Risk Engine: detect common risk patterns
- Simulation Engine: produce distinct strategies
- AI Kernel: handle scheduling, resource allocation, failure recovery
- API: all CRUD endpoints, auth, validation errors

## 22.3 LLM Testing

```python
# Each prompt template has golden test cases
GOLDEN_OBJECTIVES = [
    "Launch an AI SaaS in 90 days with a team of 5",
    "Build a mobile app for food delivery in 6 months",
    "Migrate our monolith to microservices by Q3",
]

def test_objective_compiler_golden():
    for case in GOLDEN_OBJECTIVES:
        result = objective_compiler.compile(case)
        assert result.goal_id is not None
        assert len(result.success_criteria) > 0
        assert result.confidence > 0
```

---

# 23. Observability

Every production system needs visibility. This section defines the observability strategy for OrchestraOS.

## 23.1 Three Pillars

### Logging

| Aspect     | Decision               | Implementation                                  |
| ---------- | ---------------------- | ----------------------------------------------- |
| Format     | Structured JSON        | structlog with JSON renderer                    |
| Level      | INFO in prod, DEBUG in dev | Per-module level override                   |
| Fields     | timestamp, level, module, trace_id, message, duration_ms | Always included |
| Transport  | stdout (container) + optional Logstash | No file logging in containers |

```python
# Usage
log = logger.bind(module="planner", trace_id=trace_id)
log.info("plan.generated", plan_id=plan_id, work_streams=3, duration_ms=4500)
log.error("plan.failed", objective_id=obj_id, error=str(e), duration_ms=12000)
```

### Metrics

| Metric                    | Type      | Labels                    | Purpose                    |
| ------------------------- | --------- | ------------------------- | -------------------------- |
| objective_compile_duration| Histogram | status, model             | LLM performance            |
| plan_generate_count       | Counter   | status, work_streams      | Planning throughput        |
| decision_approval_latency | Histogram | authority_level           | Human-in-loop delay        |
| llm_request_duration      | Histogram | provider, model, status   | Provider performance       |
| llm_token_usage           | Counter   | provider, model           | Cost tracking              |
| module_health_status      | Gauge     | module_id                 | Liveness                   |
| memory_query_duration     | Histogram | memory_type, tier         | Retrieval performance      |
| active_objectives         | Gauge     | org_id                    | System load                |

### Distributed Tracing

| Aspect          | Decision                           | Implementation             |
| --------------- | ---------------------------------- | -------------------------- |
| Protocol        | OpenTelemetry OTLP                 | HTTP/gRPC export           |
| Sampling        | Head-based, 10% for P0, 100% for errors| Context propagation   |
| Spans           | Per module execution, per LLM call, per DB query | Automatic + manual|
| Export          | OpenTelemetry Collector → Jaeger   | Docker container           |

```python
# Usage
with tracer.start_as_current_span("objective.compile") as span:
    span.set_attribute("objective.id", obj_id)
    span.set_attribute("input.length", len(raw_input))
    result = await compiler.compile(raw_input)
    span.set_attribute("confidence", result.confidence)
```

## 23.2 Audit Trail

All state-changing operations are recorded in the `decision_log` table.

| Action                    | Resource   | Details                                  |
| ------------------------- | ---------- | ---------------------------------------- |
| objective.created         | objective  | raw_input, compiled_spec (summary)       |
| plan.generated            | plan       | work_stream_count, confidence            |
| organization.restructured | department | old_dept_ids, new_dept_ids, reason       |
| decision.approved         | decision   | decision_id, user_id, confidence_at_time |
| decision.rejected         | decision   | decision_id, user_id, rejection_reason   |
| memory.accessed           | memory     | query_summary, result_count              |
| objective.completed      | objective  | outcome_summary, duration                |
| system.error              | system     | error_code, module, trace_id             |

## 23.3 Health Check Endpoints

```
GET /health          → {"status": "ok", "version": "2.0", "uptime_seconds": 3600}
GET /health/readiness → Database connected? Redis connected? LLM providers reachable?
GET /health/liveness  → App process alive? (lightweight)
GET /health/modules   → Status of each registered module
GET /health/providers → Status of each LLM provider + latency percentiles
```

---

# 24. Performance Targets

| Operation              | Target     | P95 Target | Measurement                 |
| ---------------------- | ---------- | ---------- | --------------------------- |
| Objective compilation  | <5s        | <3s        | End-to-end latency          |
| Plan generation        | <10s       | <7s        | End-to-end latency          |
| Org synthesis          | <3s        | <2s        | Module runtime              |
| Evidence validation    | <3s        | <2s        | Per claim                   |
| Risk assessment        | <5s        | <3s        | Module runtime              |
| Simulation comparison  | <10s       | <7s        | Module runtime              |
| Full pipeline          | <30s       | <20s       | Objective to dashboard      |
| Decision surface load  | <2s        | <1s        | P95 page load               |
| Memory search          | <500ms     | <200ms     | P95 query time              |
| WebSocket push         | <200ms     | <100ms     | Event → client              |
| LLM fallover          | <10s       | <5s        | Provider → fallback         |
| Module restart         | <5s        | <3s        | Crash → ready               |

---

# 25. Security Architecture

## 25.1 Authentication

- JWT-based authentication via Supabase Auth
- Refresh token rotation (7-day refresh, 1-hour access)
- Session management per organization

## 25.2 Authorization

| Role     | Scope                 | Capabilities                          |
| -------- | --------------------- | ------------------------------------- |
| Admin    | Full organization     | All CRUD, manage users, config        |
| Manager  | Department-level      | Approve decisions, assign tasks       |
| Viewer   | Read-only             | View dashboards, decisions, history   |
| Agent    | System                | Execute tasks, read/write memory      |

## 25.3 Decision Authority Levels

| Level       | Scope                     | Human Required?     |
| ----------- | ------------------------- | ------------------- |
| Recommend   | All agents                | Yes, for high-risk  |
| Approve     | Department leads          | Configurable        |
| Execute     | High-risk decisions       | Always              |

## 25.4 Data Protection

- Encryption at rest (Supabase managed)
- Encryption in transit (TLS 1.3)
- Row-Level Security for organization isolation
- Audit logging for all state changes
- API rate limiting per key (100 req/min standard, 1000 req/min enterprise)
- Input sanitization on all user-provided text

---

# 26. Appendix: Sequence Diagrams

## 26.1 Full Pipeline

```
User          Decision Surface    AI Kernel    Modules         Agents      Memory
 │                    │               │            │              │           │
 ├─Objective─────────►               │            │              │           │
 │                    │               │            │              │           │
 │                    │──compile─────►│            │              │           │
 │                    │               │──objective─►Objective    │           │
 │                    │               │            │ Compiler    │           │
 │                    │               │◄─goal──────│              │           │
 │                    │               │            │              │           │
 │                    │               │──plan──────►Planner      │           │
 │                    │               │            │              │           │
 │                    │               │──simulate──►Simulation   │           │
 │                    │               │            │ Engine      │           │
 │                    │               │◄─scenarios──│             │           │
 │                    │               │            │              │           │
 │                    │               │──organize──►Org Generator │           │
 │                    │               │◄─structure──│             │           │
 │                    │               │            │              │           │
 │                    │               │──assess────►Risk Engine   │           │
 │                    │               │◄─risks──────│             │           │
 │                    │               │            │              │           │
 │                    │               │──register──►              ├─Agents───►│
 │                    │               │            │              │           │
 │                    │◄─dashboard────│            │              │           │
 │◄─Decisions─────────┤               │            │              │           │
 │                    │               │            │              │           │
 ├─Approve───────────►│               │            │              │           │
 │                    │──execute─────►│            │              │           │
 │                    │               │──dispatch──►              │           │
 │                    │               │            │              ├─result───►│
 │                    │               │◄─validated─►Evidence Engine│          │
 │                    │               │            │              │           │
 │                    │◄─complete─────│            │              │           │
 │◄─Complete──────────┤               │            │              │           │
```

## 26.2 Agent Communication

```
Agent A       AI Kernel        Agent B        Memory         Evidence Engine
   │               │               │              │                 │
   │──message──────►               │              │                 │
   │               │──route────────►              │                 │
   │               │               │              │                 │
   │               │               ├─query─context─►                 │
   │               │               │◄─context──────┤                 │
   │               │               │              │                 │
   │               │               ├─validate──claim─►─────►───────►│
   │               │               │◄─evidence──────────────────────┤
   │               │               │              │                 │
   │               │◄─response─────│              │                 │
   │◄─response──────┤               │              │                 │
```

## 26.3 Failure Recovery

```
Agent A         Health Monitor     Module Registry    State Manager    Org Generator
   │                    │                  │                │               │
   ├─heartbeat─────────►                  │                │               │
   │                    │                  │                │               │
   │         (missed ×3) │                  │                │               │
   │                    │                  │                │               │
   │                    │──detect_failure──►                │               │
   │                    │                  │                │               │
   │                    │──get_last_snapshot───────────────►│               │
   │                    │◄─snapshot────────│                │               │
   │                    │                  │                │               │
   │                    │──restart_module──►                │               │
   │                    │                  ├─new_instance───►               │
   │                    │                  │                │               │
   │                    │◄─ready───────────│                │               │
   │                    │                  │                │               │
   │                    │──queue_replay────►                │               │
   │                    │                  │                │               │
   │         [if restart fails ×3]         │                │               │
   │                    │                  │                │               │
   │                    │──request_human───────────────────────────────────►│
```

---

*End of Software Architecture Specification*
