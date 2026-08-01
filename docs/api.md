# OrchestraOS — API Specification

**Version:** 2.0
**Status:** Final for Engineering Review
**Owner:** OrchestraOS Core Team
**Based On:** SAS v2.0, TPRD v1.0

---

# Table of Contents

1. Document Control
2. API Overview
3. Authentication
4. Common Patterns
5. Error Handling
6. Rate Limiting
7. Public API — Objectives
8. Public API — Plans
9. Public API — Dashboard
10. Public API — Decisions
11. Public API — Jobs
12. Public API — Health
13. WebSocket Events
14. Internal API — Overview
15. Internal API — Endpoints
16. API Versioning
17. SDK & Client Libraries

---

# 1. Document Control

| Version | Date       | Author | Changes                                          |
| ------- | ---------- | ------ | ------------------------------------------------ |
| 1.0     | 2026-07-27 | Core   | Initial API specification                        |
| 2.0     | 2026-07-27 | Core   | Public/Internal split, jobs pattern, UUIDv7,     |
|         |            |        | dashboard aggregation, three-tier health         |

---

# 2. API Overview

## 2.1 Design Principle

> **External API speaks business language.**
> **Internal API speaks AI language.**

The public API exposes ~12 endpoints that map to user intent. The AI Kernel internally orchestrates ~10 service endpoints that the frontend never calls directly.

## 2.2 Base URLs

| Environment | Public API                           | Internal API                   |
| ----------- | ------------------------------------ | ------------------------------ |
| Development | `http://localhost:8000/api/v1`       | `http://localhost:8000/internal` |
| Staging     | `https://staging-api.orchestraos.io/api/v1` | `http://ai-service:8000/internal` |
| Production  | `https://api.orchestraos.io/api/v1`  | (cluster-internal)             |

The Internal API is **not exposed to the internet**. It lives on an internal network and is only callable by the AI Kernel.

## 2.3 Protocol

HTTPS in production. JSON request/response bodies. ISO 8601 dates with timezone.

```
Content-Type: application/json
Accept: application/json
```

## 2.4 ID Format

All resource IDs use **UUIDv7** — time-ordered, sortable, production-friendly:

```
018f3a6b-7e5c-7b00-b3c2-9c3a1b2c3d4e
```

## 2.5 Public API Surface

| Category    | Endpoints                              | Purpose                              |
| ----------- | -------------------------------------- | ------------------------------------ |
| Objectives  | `POST /objectives`                     | Submit business objective            |
|             | `GET /objectives/:id`                  | Get compiled objective               |
|             | `POST /objectives/:id/generate`        | Start planning (async, returns job)  |
| Plans       | `GET /plans/:id`                       | Get execution plan                   |
|             | `POST /plans/:id/approve`              | Approve plan for execution           |
| Dashboard   | `GET /dashboard/:objectiveId`          | Aggregated view of everything        |
| Decisions   | `GET /decisions`                       | List pending decisions               |
|             | `GET /decisions/:id`                   | Get decision with evidence           |
|             | `POST /decisions/:id/approve`          | Approve a decision                   |
|             | `POST /decisions/:id/reject`           | Reject a decision                    |
| Jobs        | `GET /jobs/:id`                        | Poll long-running operation status   |
| Health      | `GET /health/system`                   | System health                        |
|             | `GET /health/ai`                       | AI module health                     |
|             | `GET /health/organization`             | Organizational health metrics        |

## 2.6 Internal API Surface

| Service                  | Endpoint                        | Purpose                              |
| ------------------------ | ------------------------------- | ------------------------------------ |
| Objective Compiler       | `POST /internal/compile`        | Parse natural language → structured goal |
| Planner                  | `POST /internal/generate-plan`  | Create execution plan                |
| Organization Generator   | `POST /internal/generate-org`   | Synthesize department structure      |
| Risk Engine              | `POST /internal/analyze-risk`   | Assess plan risks                    |
| Simulation Engine        | `POST /internal/simulate`       | Compare execution strategies         |
| Evidence Engine          | `POST /internal/generate-evidence` | Validate claims                 |
| Memory                   | `POST /internal/memory/insert`  | Store memory entry                   |
|                          | `POST /internal/memory/query`   | Semantic memory search               |
| Decision Engine          | `POST /internal/create-decision` | Formalize decision record          |
| Agent Manager            | `POST /internal/agents/assign`  | Assign task to agent                 |

---
# OrchestraOS — Sprint 1
## Foundation & Project Scaffold

You are the Lead Staff Software Engineer responsible for building OrchestraOS.

Your task is NOT to build the application.

Your task is to build the engineering foundation that every future feature will rely on.

Think like an engineer working at Stripe, Linear, Vercel, or OpenAI.

Everything should be production-ready.

Never generate fake business logic.

Never generate mocked AI modules.

Never implement placeholder Planner, Risk Engine, Simulation Engine or Memory Engine.

Those belong to later sprints.

--------------------------------------------------
PROJECT OVERVIEW
--------------------------------------------------

Project Name:
OrchestraOS

Mission:

Transform business objectives into autonomous execution through AI orchestration.

The application will eventually contain:

• Objective Compiler
• AI Kernel
• Planner
• Simulation Engine
• Risk Engine
• Evidence Engine
• Organization Generator
• Decision Engine
• Dashboard

DO NOT IMPLEMENT THEM.

Build only the infrastructure.

--------------------------------------------------
PRIMARY GOAL
--------------------------------------------------

At the end of this sprint I should be able to run

docker compose up

and have

✓ Frontend running

✓ Backend running

✓ Redis running

✓ Health endpoints working

✓ Logging working

✓ Configuration working

✓ API routing working

✓ Docker working

✓ Environment variables working

Nothing else.

--------------------------------------------------
TECH STACK
--------------------------------------------------

Frontend

Next.js 15

React 19

TypeScript

TailwindCSS

shadcn/ui

Framer Motion

React Flow

TanStack Query

React Hook Form

Zod

Zustand

Backend

Python 3.12

FastAPI

SQLAlchemy 2

Alembic

Pydantic v2

Redis

Supabase PostgreSQL

LiteLLM

httpx

uv

Infrastructure

Docker

Docker Compose

GitHub Actions

--------------------------------------------------
FOLDER STRUCTURE
--------------------------------------------------

Create

orchestraos/

frontend/

backend/

docs/

docker/

scripts/

.github/

README.md

docker-compose.yml

.gitignore

.env.example

--------------------------------------------------
BACKEND STRUCTURE
--------------------------------------------------

Create

backend/app

api/

core/

database/

middleware/

models/

schemas/

repositories/

services/

kernel/

llm/

memory/

workers/

utils/

tests/

Inside api

v1/

health.py

objectives.py

plans.py

dashboard.py

decisions.py

jobs.py

main.py

--------------------------------------------------
FRONTEND STRUCTURE
--------------------------------------------------

Create

app/

dashboard/

objective/

plan/

decisions/

components/

layout/

ui/

forms/

hooks/

lib/

services/

store/

styles/

types/

providers/

--------------------------------------------------
CONFIGURATION
--------------------------------------------------

Create

config.py

settings.py

logging.py

dependencies.py

exceptions.py

router.py

middleware.py

database.py

Everything should be configurable using environment variables.

Never hardcode secrets.

--------------------------------------------------
ENVIRONMENT VARIABLES
--------------------------------------------------

Generate .env.example

Backend

DATABASE_URL

SUPABASE_URL

SUPABASE_ANON_KEY

SUPABASE_SERVICE_KEY

REDIS_URL

OPENAI_API_KEY

ANTHROPIC_API_KEY

GOOGLE_API_KEY

LITELLM_MASTER_KEY

JWT_SECRET

SECRET_KEY

LOG_LEVEL

Frontend

NEXT_PUBLIC_API_URL

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

--------------------------------------------------
DATABASE
--------------------------------------------------

Configure SQLAlchemy.

Configure Alembic.

Create Base model.

Create session management.

Dependency Injection.

No tables yet.

--------------------------------------------------
REDIS
--------------------------------------------------

Create Redis client.

Connection manager.

Health check.

--------------------------------------------------
LOGGING
--------------------------------------------------

Implement structured JSON logging.

Every request logs

Request ID

Trace ID

Method

Route

Duration

Status Code

Errors

Log format should be machine readable.

--------------------------------------------------
MIDDLEWARE
--------------------------------------------------

Implement

CORS

Security Headers

Request ID

Trace ID

Request Timer

Exception Handler

Request Logger

Compression

--------------------------------------------------
ERROR HANDLING
--------------------------------------------------

Central exception middleware.

Consistent error format

{
  error:{
      code,
      message,
      trace_id
  }
}

--------------------------------------------------
AUTH
--------------------------------------------------

Prepare authentication middleware.

Supabase JWT validation.

Do not implement login.

--------------------------------------------------
HEALTH ENDPOINTS
--------------------------------------------------

Implement

GET /api/v1/health/system

Checks

Redis

Supabase connectivity

Environment variables

Application version

GET /api/v1/health/ai

Return

status

No AI logic yet.

GET /api/v1/health/organization

Return

status

No organization logic yet.

--------------------------------------------------
API ROUTES
--------------------------------------------------

Register routes for

Objectives

Plans

Dashboard

Decisions

Jobs

Health

Endpoints should exist.

Return HTTP 501

except Health.

--------------------------------------------------
DOCKER
--------------------------------------------------

Create

Backend Dockerfile

Frontend Dockerfile

docker-compose.yml

Compose should run

Backend

Frontend

Redis

Database is external.

--------------------------------------------------
README
--------------------------------------------------

Generate professional README.

Include

Installation

Environment

Docker

Development

Folder structure

Commands

--------------------------------------------------
CODE QUALITY
--------------------------------------------------

Strict typing.

No "any".

No TODO.

No commented code.

No fake implementations.

Follow SOLID.

Repository pattern.

Dependency Injection.

Clean Architecture.

--------------------------------------------------
TOOLS
--------------------------------------------------

Configure

ruff

black

mypy

pytest

eslint

prettier

husky

lint-staged

--------------------------------------------------
CI/CD
--------------------------------------------------

GitHub Actions

Backend lint

Frontend lint

Type checking

Build

--------------------------------------------------
SUCCESS CRITERIA
--------------------------------------------------

docker compose up

works

Health endpoints return 200

Logging works

Environment loading works

Redis connects

Supabase configuration loads

Frontend loads

Backend loads

No business logic exists

No fake data exists

No AI modules exist

Stop after scaffold is complete.

Do not continue into Sprint 2.
# 3. Authentication

## 3.1 Public API

All public API requests require a **Bearer JWT** token:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

| Token          | Lifetime | Source        | Usage                          |
| -------------- | -------- | ------------- | ------------------------------ |
| Access Token   | 1 hour   | Supabase Auth | All public API requests        |
| Refresh Token  | 7 days   | Supabase Auth | Get new access token           |
| Service Key    | Permanent| Supabase      | Server-to-server (admin only)  |

## 3.2 Internal API

Internal API uses a shared **service-to-service API key** via the `X-Internal-Key` header. This key is injected via environment variable and never exposed to clients.

```
X-Internal-Key: isk_abc123def456
```

## 3.3 Token Errors

- **401** — Missing token, expired, invalid signature
- **403** — Valid token but insufficient role

---

# 4. Common Patterns

## 4.1 Jobs for Long-Running Operations

Operations that take >1s (planning, simulation, risk analysis) use an **async job pattern**:

```
POST /objectives/:id/generate
  → 202 Accepted
  → { job_id: "018f3a6b-..." }

GET /jobs/:job_id
  → 200 OK
  → { status: "running" | "completed" | "failed", result: {...} }
```

The frontend polls `GET /jobs/:id` and receives real-time WebSocket progress updates.

## 4.2 Pagination

List endpoints use cursor-based pagination:

```
GET /decisions?cursor=2026-07-27T14:30:00Z&limit=20
```

| Parameter | Type   | Default | Description                     |
| --------- | ------ | ------- | ------------------------------- |
| `cursor`  | string | —       | ISO 8601 timestamp of last item |
| `limit`   | int    | 20      | Items per page (max 100)        |

Response:
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "2026-07-27T15:00:00Z",
    "has_more": true,
    "limit": 20
  }
}
```

## 4.3 Field Selection

```
GET /objectives/:id?fields=id,raw_input,status
```

## 4.4 Trace ID

Every request receives `X-Trace-Id` in response headers:

```
X-Trace-Id: trace_abc123
```

## 4.5 Standard Response Envelope

```json
{
  "data": { ... },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:00Z"
  }
}
```

Error responses:
```json
{
  "error": {
    "code": "E-005",
    "message": "Validation error",
    "details": [
      {"field": "raw_input", "message": "Field is required"}
    ],
    "trace_id": "trace_abc123"
  }
}
```

---

# 5. Error Handling

## 5.1 Error Codes

| Code   | HTTP | Name                | Description                     | Retryable |
| ------ | ---- | ------------------- | ------------------------------- | --------- |
| E-001  | 502  | LLM_PROVIDER_ERROR  | Underlying LLM call failed      | Yes       |
| E-002  | 504  | MODULE_TIMEOUT      | AI module exceeded time budget  | Yes       |
| E-003  | 500  | AGENT_FAILURE       | Agent execution failed          | Yes       |
| E-004  | 503  | DB_CONNECTION_ERROR | Database unavailable            | Yes       |
| E-005  | 422  | VALIDATION_ERROR    | Request body failed validation  | No        |
| E-006  | 401  | AUTH_ERROR          | Missing or invalid token        | No        |
| E-007  | 403  | FORBIDDEN           | Token valid but insufficient    | No        |
| E-008  | 404  | NOT_FOUND           | Resource does not exist         | No        |
| E-009  | 429  | RATE_LIMITED        | Too many requests               | Yes       |
| E-010  | 409  | CONFLICT            | Resource state conflict         | No        |
| E-011  | 507  | RESOURCE_EXHAUSTED  | Token budget or quota exceeded  | Yes       |
| E-012  | 400  | BAD_REQUEST         | Malformed request               | No        |

## 5.2 Retry-After

Retryable errors include `Retry-After` header (seconds).

---

# 6. Rate Limiting

| Tier      | Requests/min | Burst | Applied To        |
| --------- | ------------ | ----- | ----------------- |
| Free      | 60           | 100   | Per API key       |
| Pro       | 600          | 1000  | Per API key       |
| Enterprise| 6000         | 10000 | Per organization  |

Headers:
```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 542
X-RateLimit-Reset: 1627399200
```

Health endpoints are exempt.

---

# 7. Public API — Objectives

## 7.1 Submit Objective

Creates a new business objective. Compilation runs synchronously (<5s) and returns the structured goal.

```
POST /api/v1/objectives
```

**Request:**
```json
{
  "raw_input": "Launch an AI SaaS in 90 days with a team of 5",
  "context": {
    "organization": "Acme Corp",
    "industry": "technology"
  }
}
```

| Field       | Type   | Required | Description                              |
| ----------- | ------ | -------- | ---------------------------------------- |
| `raw_input` | string | Yes      | Natural language (10–10000 chars)        |
| `context`   | object | No       | Optional business context                |

**Response 201:**
```json
{
  "data": {
    "id": "018f3a6b-7e5c-7b00-b3c2-9c3a1b2c3d4e",
    "raw_input": "Launch an AI SaaS in 90 days with a team of 5",
    "status": "compiled",
    "summary": "Launch new AI SaaS product with a team of 5 within 90 days",
    "constraints": {
      "timeline_days": 90,
      "team_size": 5,
      "budget_usd": null
    },
    "success_criteria": [
      "MVP with core features deployed",
      "10 beta customers onboarded",
      "CI/CD pipeline operational"
    ],
    "confidence": 0.85,
    "created_at": "2026-07-27T14:30:00Z"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

**Errors:**
| Code   | Condition                        |
| ------ | -------------------------------- |
| E-005  | `raw_input` missing or <10 chars |
| E-001  | LLM compilation failed           |

## 7.2 Get Objective

```
GET /api/v1/objectives/:id
```

Returns full objective detail including compiled spec.

## 7.3 Generate Plan (Async)

Kicks off planning, risk analysis, simulation, and organization synthesis asynchronously.

```
POST /api/v1/objectives/:id/generate
```

**Response 202:**
```json
{
  "data": {
    "job_id": "018f3a7c-8e6d-4a00-c3d4-5e6f7a8b9c0d",
    "status": "queued",
    "estimated_duration_seconds": 25
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

The frontend polls `GET /jobs/:job_id` and receives WebSocket progress events.

The AI Kernel internally chains:
```
Planner → Memory Lookup → Risk Engine → Simulation → Org Generator → Evidence → Decision Creation
```

---

# 8. Public API — Plans

## 8.1 Get Plan

```
GET /api/v1/plans/:id
```

**Response 200:**
```json
{
  "data": {
    "id": "018f3a8d-9f7e-5b00-a3c4-1d2e3f4a5b6c",
    "objective_id": "018f3a6b-7e5c-7b00-b3c2-9c3a1b2c3d4e",
    "status": "generated",
    "selected_strategy": "Plan A (Recommended)",
    "strategies": [
      {
        "name": "Plan A (Recommended)",
        "timeline_days": 90,
        "cost_usd": 150000,
        "risk_score": 0.35,
        "success_probability": 0.72,
        "summary": "Optimal balance of speed and safety"
      },
      {
        "name": "Plan B (Conservative)",
        "timeline_days": 120,
        "cost_usd": 100000,
        "risk_score": 0.20,
        "success_probability": 0.80,
        "summary": "Best for risk-averse teams"
      },
      {
        "name": "Plan C (Aggressive)",
        "timeline_days": 60,
        "cost_usd": 250000,
        "risk_score": 0.65,
        "success_probability": 0.35,
        "summary": "Best for first-mover advantage"
      }
    ],
    "critical_path": ["Database schema", "Backend API", "Frontend UI"],
    "risks": [
      {"category": "technical", "risk": "API latency at scale", "probability": 0.6, "mitigation": "Connection pooling + read replicas"}
    ],
    "confidence": 0.82,
    "created_at": "2026-07-27T14:30:00Z"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

## 8.2 Approve Plan

Approves a plan for execution. Internally triggers organization synthesis and task creation.

```
POST /api/v1/plans/:id/approve
```

**Request:**
```json
{
  "selected_strategy": "Plan A (Recommended)",
  "modifications": {
    "timeline_days": 95
  }
}
```

| Field               | Type   | Required | Description                      |
| ------------------- | ------ | -------- | -------------------------------- |
| `selected_strategy` | string | Yes      | Name of chosen strategy          |
| `modifications`     | object | No       | Override specific parameters     |

**Response 200:**
```json
{
  "data": {
    "plan_id": "018f3a8d-...",
    "status": "approved",
    "organization": {
      "departments_created": 3,
      "total_agents": 8
    },
    "tasks_created": 12,
    "approved_at": "2026-07-27T14:30:00Z"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

---

# 9. Public API — Dashboard

A single endpoint that aggregates everything the frontend needs. The backend collects decisions, plan status, organization structure, health metrics, and recent activity in one call.

```
GET /api/v1/dashboard/:objectiveId
```

**Response 200:**
```json
{
  "data": {
    "objective": {
      "id": "018f3a6b-...",
      "summary": "Launch new AI SaaS product",
      "status": "executing",
      "progress_percent": 35,
      "current_step": "Executing tasks"
    },
    "organization": {
      "departments": [
        {
          "name": "Engineering",
          "status": "active",
          "agent_count": 3,
          "health_score": 0.92
        },
        {
          "name": "Marketing",
          "status": "active",
          "agent_count": 1,
          "health_score": 0.85
        }
      ],
      "total_agents": 8,
      "health": {
        "execution_score": 0.92,
        "coordination_score": 0.88,
        "risk_index": 0.25,
        "trust_score": 0.85,
        "decision_quality": 0.90
      }
    },
    "plan": {
      "id": "018f3a8d-...",
      "status": "approved",
      "selected_strategy": "Plan A (Recommended)",
      "timeline_days": 90,
      "days_elapsed": 5,
      "days_remaining": 85,
      "critical_path": ["Database schema", "Backend API", "Frontend UI"],
      "top_risks": ["API latency at scale", "Single frontend resource"]
    },
    "pending_decisions": 3,
    "recent_activity": [
      {"type": "task.completed", "description": "Database schema designed", "timestamp": "2026-07-27T14:25:00Z"},
      {"type": "decision.created", "description": "Frontend framework decision", "timestamp": "2026-07-27T14:20:00Z"}
    ]
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

---

# 10. Public API — Decisions

## 10.1 List Decisions

```
GET /api/v1/decisions?status=pending&objective_id=018f3a6b-...
```

| Parameter      | Type   | Values                                             |
| -------------- | ------ | -------------------------------------------------- |
| `status`       | string | `pending`, `approved`, `rejected`, `auto_executed` |
| `objective_id` | string | Filter by objective                                |
| `authority`    | string | `recommend`, `approve`, `execute`                  |

**Response 200:**
```json
{
  "data": [
    {
      "id": "018f3a9e-0a8b-6c00-d3e4-5f6a7b8c9d0e",
      "objective_id": "018f3a6b-...",
      "question": "Which frontend framework should we use?",
      "options": [
        {"id": "opt_a", "label": "React + Next.js"},
        {"id": "opt_b", "label": "Vue + Nuxt"}
      ],
      "recommendation": {
        "option_id": "opt_a",
        "summary": "Next.js provides SSR, App Router, and larger ecosystem",
        "confidence": 0.91
      },
      "confidence": 0.91,
      "authority_level": "recommend",
      "status": "pending",
      "created_at": "2026-07-27T14:20:00Z"
    }
  ],
  "pagination": {
    "next_cursor": "2026-07-27T14:30:00Z",
    "has_more": true,
    "limit": 20
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

## 10.2 Get Decision

```
GET /api/v1/decisions/:id
```

Returns the full decision including all evidence and risk assessment.

## 10.3 Approve Decision

```
POST /api/v1/decisions/:id/approve
```

**Request:**
```json
{
  "approved": true,
  "option_id": "opt_a",
  "reason": "Next.js aligns with our team's expertise",
  "feedback": "Consider using the Pages Router for simpler MVP",
  "attachments": []
}
```

| Field       | Type    | Required | Description                     |
| ----------- | ------- | -------- | ------------------------------- |
| `approved`  | boolean | Yes      | Must be `true` for approval     |
| `option_id` | string  | Yes      | Selected option ID              |
| `reason`    | string  | Yes      | Human rationale for audit trail |
| `feedback`  | string  | No       | Instructions for the AI         |
| `attachments`| string[]| No      | References or links             |

**Response 200:**
```json
{
  "data": {
    "decision_id": "018f3a9e-...",
    "status": "approved",
    "resolved_by": "user_abc123",
    "resolved_at": "2026-07-27T14:30:01Z",
    "accepted_option": "React + Next.js"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

## 10.4 Reject Decision

```
POST /api/v1/decisions/:id/reject
```

**Request:**
```json
{
  "approved": false,
  "option_id": "opt_b",
  "reason": "Team has more Vue experience",
  "feedback": "Please regenerate the plan with Vue + Nuxt as the frontend stack",
  "attachments": ["https://team-skill-matrix.internal"]
}
```

| Field       | Type    | Required | Description                           |
| ----------- | ------- | -------- | ------------------------------------- |
| `approved`  | boolean | Yes      | Must be `false` for rejection         |
| `option_id` | string  | Yes      | The preferred alternative             |
| `reason`    | string  | Yes      | Required explanation                  |
| `feedback`  | string  | No       | Instructions for re-analysis          |
| `attachments`| string[]| No      | Supporting references                 |

**Response 200:**
```json
{
  "data": {
    "decision_id": "018f3a9e-...",
    "status": "rejected",
    "resolved_by": "user_abc123",
    "resolved_at": "2026-07-27T14:30:01Z",
    "rejection_reason": "Team has more Vue experience"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

---

# 11. Public API — Jobs

## 11.1 Get Job Status

Polls the status of any long-running operation.

```
GET /api/v1/jobs/:job_id
```

**Response 200 (running):**
```json
{
  "data": {
    "id": "018f3a7c-8e6d-4a00-c3d4-5e6f7a8b9c0d",
    "type": "plan_generation",
    "status": "running",
    "progress": {
      "percent": 65,
      "step": "Simulation Engine",
      "message": "Comparing execution strategies"
    },
    "created_at": "2026-07-27T14:30:00Z",
    "started_at": "2026-07-27T14:30:01Z",
    "estimated_completion_at": "2026-07-27T14:30:25Z"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:16Z"
  }
}
```

**Response 200 (completed):**
```json
{
  "data": {
    "id": "018f3a7c-...",
    "type": "plan_generation",
    "status": "completed",
    "progress": {
      "percent": 100,
      "step": "Complete",
      "message": "Plan generation finished"
    },
    "result": {
      "plan_id": "018f3a8d-...",
      "decision_ids": ["018f3a9e-...", "018f3aaf-..."],
      "duration_seconds": 22
    },
    "created_at": "2026-07-27T14:30:00Z",
    "started_at": "2026-07-27T14:30:01Z",
    "completed_at": "2026-07-27T14:30:23Z"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:23Z"
  }
}
```

**Response 200 (failed):**
```json
{
  "data": {
    "id": "018f3a7c-...",
    "type": "plan_generation",
    "status": "failed",
    "progress": {
      "percent": 35,
      "step": "Risk Engine",
      "message": "Risk analysis failed"
    },
    "error": {
      "code": "E-001",
      "message": "LLM provider unavailable after 3 retries"
    },
    "created_at": "2026-07-27T14:30:00Z",
    "started_at": "2026-07-27T14:30:01Z",
    "failed_at": "2026-07-27T14:30:15Z"
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:15Z"
  }
}
```

## 11.2 Job Types

| Job Type            | Created By                     | Typical Duration |
| ------------------- | ------------------------------ | ---------------- |
| `plan_generation`   | `POST /objectives/:id/generate` | 15–30s          |
| `plan_approval`     | `POST /plans/:id/approve`       | 5–10s           |
| `recompilation`     | `POST /objectives/:id/generate` | 3–5s            |

---

# 12. Public API — Health

Three distinct health endpoints for three distinct concerns.

## 12.1 System Health

Technical infrastructure status.

```
GET /api/v1/health/system
```

**Response 200:**
```json
{
  "data": {
    "status": "healthy",
    "version": "2.0",
    "uptime_seconds": 3600,
    "dependencies": {
      "database": {"status": "ok", "latency_ms": 5},
      "redis": {"status": "ok", "latency_ms": 2},
      "openai": {"status": "ok", "latency_ms": 350},
      "anthropic": {"status": "degraded", "latency_ms": 2800}
    }
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

## 12.2 AI Health

Internal module and agent status.

```
GET /api/v1/health/ai
```

**Response 200:**
```json
{
  "data": {
    "status": "healthy",
    "modules": [
      {"name": "ObjectiveCompiler", "status": "healthy", "uptime_seconds": 3600, "last_heartbeat": "..."},
      {"name": "Planner", "status": "healthy", "uptime_seconds": 3600},
      {"name": "RiskEngine", "status": "degraded", "error_rate_5min": 0.06},
      {"name": "EvidenceEngine", "status": "healthy"}
    ],
    "active_agents": 21,
    "pending_tasks": 8
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

## 12.3 Organization Health

Business-level health metrics.

```
GET /api/v1/health/organization
```

**Response 200:**
```json
{
  "data": {
    "status": "healthy",
    "metrics": {
      "execution_score": 0.92,
      "coordination_score": 0.88,
      "risk_index": 0.25,
      "trust_score": 0.85,
      "decision_quality": 0.90
    },
    "active_objectives": 3,
    "active_departments": 7,
    "pending_decisions": 4,
    "objective_summaries": [
      {"id": "018f3a6b-...", "summary": "Launch AI SaaS", "status": "executing", "progress": 35},
      {"id": "018f3b7c-...", "summary": "Mobile app redesign", "status": "planning", "progress": 0}
    ]
  },
  "meta": {
    "trace_id": "trace_abc123",
    "timestamp": "2026-07-27T14:30:01Z"
  }
}
```

---

# 13. WebSocket Events

## 13.1 Connection

```
wss://api.orchestraos.io/ws/v1?token=eyJ...
```

## 13.2 Subscription

```json
{
  "type": "subscribe",
  "channels": [
    "objective:018f3a6b-...:progress",
    "decisions:new",
    "organization:health"
  ]
}
```

## 13.3 Event Channels

| Channel Pattern                        | Direction   | Payload                                              | Frequency        |
| -------------------------------------- | ----------- | ---------------------------------------------------- | ---------------- |
| `objective:{id}:progress`              | Server→Client | `{ objective_id, percent, step, message }`          | Every step       |
| `objective:{id}:state`                 | Server→Client | `{ objective_id, status }`                          | On state change  |
| `plan:{id}:state`                      | Server→Client | `{ plan_id, status }`                               | On state change  |
| `decisions:new`                        | Server→Client | `{ decision_id, question, confidence }`             | New decision     |
| `decisions:{id}:resolved`              | Server→Client | `{ decision_id, status, resolved_by }`              | On resolution    |
| `organization:{id}:restructured`       | Server→Client | `{ dept_name, action }`                             | On merge/split   |
| `health:alert`                         | Server→Client | `{ metric, value, threshold, severity }`            | Threshold breach |
| `job:{id}:progress`                    | Server→Client | `{ job_id, percent, step, status }`                 | Running job      |
| `system:error`                         | Server→Client | `{ error_code, message, trace_id }`                 | System error     |

## 13.4 Progress Event Example

```json
{
  "channel": "objective:018f3a6b-...:progress",
  "event": "objective.progress",
  "data": {
    "objective_id": "018f3a6b-...",
    "percent": 65,
    "step": "Simulation Engine",
    "message": "Comparing execution strategies. 3 scenarios generated."
  },
  "timestamp": "2026-07-27T14:30:16.123Z"
}
```

## 13.5 Client Messages

| Message      | Payload                    | Purpose                 |
| ------------ | -------------------------- | ----------------------- |
| `subscribe`  | `{ channels: string[] }`   | Subscribe to events     |
| `unsubscribe`| `{ channels: string[] }`   | Unsubscribe             |
| `ping`       | `{}`                       | Keepalive               |
| `pong`       | `{}`                       | Keepalive response      |

---

# 14. Internal API — Overview

The Internal API is used exclusively by the AI Kernel for service-to-service communication. It is not exposed to the internet.

## 14.1 Authentication

```
X-Internal-Key: isk_abc123def456
```

## 14.2 Request Flow

```
AI Kernel
    │
    ├── POST /internal/compile           (Objective Compiler)
    ├── POST /internal/memory/query      (Memory)
    ├── POST /internal/generate-plan     (Planner)
    ├── POST /internal/analyze-risk      (Risk Engine)
    ├── POST /internal/simulate          (Simulation Engine)
    ├── POST /internal/generate-org      (Org Generator)
    ├── POST /internal/generate-evidence (Evidence Engine)
    ├── POST /internal/create-decision   (Decision Engine)
    └── POST /internal/agents/assign     (Agent Manager)
```

## 14.3 Internal Error Format

```json
{
  "error": {
    "code": "E-001",
    "message": "LLM call failed after 3 retries",
    "details": {
      "provider": "openai",
      "model": "gpt-4o",
      "attempts": 3,
      "last_error": "Rate limit exceeded"
    },
    "trace_id": "trace_abc123"
  }
}
```

---

# 15. Internal API — Endpoints

## 15.1 Objective Compiler

```
POST /internal/compile
```

**Request:**
```json
{
  "raw_input": "Launch an AI SaaS in 90 days",
  "context": {},
  "trace_id": "trace_abc123"
}
```

**Response 200:**
```json
{
  "goal_id": "018f3a6b-...",
  "compiled_spec": { "...full compiled goal..." },
  "confidence": 0.85,
  "duration_ms": 3200
}
```

## 15.2 Planner

```
POST /internal/generate-plan
```

**Request:**
```json
{
  "goal_id": "018f3a6b-...",
  "compiled_spec": {},
  "trace_id": "trace_abc123"
}
```

**Response 200:**
```json
{
  "plan_id": "018f3a8d-...",
  "plan_data": { "...full plan..." },
  "confidence": 0.82,
  "duration_ms": 8500
}
```

## 15.3 Risk Engine

```
POST /internal/analyze-risk
```

**Request:**
```json
{
  "plan_id": "018f3a8d-...",
  "plan_data": {},
  "trace_id": "trace_abc123"
}
```

## 15.4 Simulation Engine

```
POST /internal/simulate
```

**Request:**
```json
{
  "plan_id": "018f3a8d-...",
  "plan_data": {},
  "strategies": ["conservative", "balanced", "aggressive"],
  "trace_id": "trace_abc123"
}
```

## 15.5 Organization Generator

```
POST /internal/generate-org
```

**Request:**
```json
{
  "plan_id": "018f3a8d-...",
  "objective_id": "018f3a6b-...",
  "trace_id": "trace_abc123"
}
```

## 15.6 Evidence Engine

```
POST /internal/generate-evidence
```

**Request:**
```json
{
  "claim": "Adding 2 engineers will reduce timeline by 30%",
  "context": {},
  "trace_id": "trace_abc123"
}
```

## 15.7 Memory

```
POST /internal/memory/insert
```

**Request:**
```json
{
  "memory_type": "episodic",
  "content": "Project X failed due to scope creep",
  "metadata": { "tags": ["lesson"] },
  "importance": 0.85,
  "trace_id": "trace_abc123"
}
```

```
POST /internal/memory/query
```

**Request:**
```json
{
  "query": "What caused previous project failures?",
  "memory_types": ["episodic"],
  "limit": 10,
  "threshold": 0.7,
  "trace_id": "trace_abc123"
}
```

## 15.8 Decision Engine

```
POST /internal/create-decision
```

**Request:**
```json
{
  "objective_id": "018f3a6b-...",
  "plan_id": "018f3a8d-...",
  "question": "Which frontend framework should we use?",
  "options": [
    {"id": "opt_a", "label": "React + Next.js"},
    {"id": "opt_b", "label": "Vue + Nuxt"}
  ],
  "recommendation": {
    "option_id": "opt_a",
    "rationale": "Next.js provides SSR, App Router, and larger ecosystem"
  },
  "confidence": 0.91,
  "evidence": [],
  "authority_level": "recommend",
  "trace_id": "trace_abc123"
}
```

## 15.9 Agent Manager

```
POST /internal/agents/assign
```

**Request:**
```json
{
  "task_id": "018f3b8d-...",
  "required_capabilities": ["api_design", "database"],
  "department_id": "018f3b7c-...",
  "trace_id": "trace_abc123"
}
```

---

# 16. API Versioning

URL path versioning: `/api/v1/objectives`, `/api/v2/objectives`.

| Phase      | Duration | Behavior                                 |
| ---------- | -------- | ---------------------------------------- |
| Active     | —        | Full support                             |
| Deprecated | 6 months | Functional, `Sunset` + `Deprecation` headers |
| Sunset     | —        | Returns 410 Gone                         |

```
Sunset: Sat, 27 Jan 2027 00:00:00 GMT
Deprecation: true
```

| Version | Date       | Changes                       |
| ------- | ---------- | ----------------------------- |
| v1      | 2026-07-27 | Initial release               |

---

# 17. SDK & Client Libraries

## 17.1 Python

```python
from orchestraos import OrchestraOS

client = OrchestraOS(api_key="sk-...")

obj = client.objectives.create("Launch an AI SaaS in 90 days")

# Async generation
job = client.objectives.generate(obj.id)
while (status := client.jobs.get(job.id)).status == "running":
    print(f"Progress: {status.progress.percent}%")
    time.sleep(2)

plan = client.plans.get(status.result.plan_id)
client.plans.approve(plan.id, strategy="Plan A (Recommended)")

# Review decisions
for decision in client.decisions.list(status="pending"):
    client.decisions.approve(decision.id, option_id="opt_a")

# Dashboard
dashboard = client.dashboard.get(obj.id)
```

## 17.2 JavaScript

```javascript
import { OrchestraOS } from '@orchestraos/sdk';

const client = new OrchestraOS({ apiKey: 'sk-...' });

const obj = await client.objectives.create('Launch an AI SaaS in 90 days');
const job = await client.objectives.generate(obj.id);

const plan = await client.jobs.poll(job.id, { interval: 2000 });
await client.plans.approve(plan.plan_id, { strategy: 'Plan A (Recommended)' });

const decisions = await client.decisions.list({ status: 'pending' });
for (const d of decisions) {
  await client.decisions.approve(d.id, { optionId: 'opt_a' });
}

const dashboard = await client.dashboard.get(obj.id);
```

## 17.3 cURL

```bash
# Submit objective
curl -X POST https://api.orchestraos.io/api/v1/objectives \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"raw_input": "Launch an AI SaaS in 90 days"}'

# Generate plan (async)
curl -X POST https://api.orchestraos.io/api/v1/objectives/018f3a6b-.../generate \
  -H "Authorization: Bearer eyJ..."

# Poll job
curl https://api.orchestraos.io/api/v1/jobs/018f3a7c-... \
  -H "Authorization: Bearer eyJ..."

# Get dashboard
curl https://api.orchestraos.io/api/v1/dashboard/018f3a6b-... \
  -H "Authorization: Bearer eyJ..."

# Approve decision
curl -X POST https://api.orchestraos.io/api/v1/decisions/018f3a9e-.../approve \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"approved": true, "option_id": "opt_a", "reason": "Best fit for our stack"}'
```

---

*End of API Specification*
