# Sprint 2 — Persistence Layer

## What Was Built

A production-grade PostgreSQL persistence layer for the first vertical slice (User → Submit Objective → Create Job → Poll Job).

## Architecture

```
┌──────────────────────────────────────────┐
│              FastAPI App                  │
├──────────────────────────────────────────┤
│              Repositories                 │
│  BaseRepository[T] — generic CRUD         │
│  UserRepository     ObjectiveRepository   │
│  JobRepository                            │
├──────────────────────────────────────────┤
│               SQLAlchemy Models           │
│  BaseEntity (id, created_at, updated_at,  │
│  deleted_at, created_by, updated_by,      │
│  version, metadata JSONB)                 │
│  User · Objective · Job                   │
├──────────────────────────────────────────┤
│              PostgreSQL + pgvector        │
│  Async engine · Connection pooling        │
│  Alembic migrations · Soft delete         │
│  UUIDv7 · Indexes · FKs                  │
└──────────────────────────────────────────┘
```

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `app/database/uuid7.py` | UUIDv7 generator (RFC 4122 compliant) |
| `app/models/__init__.py` | Model exports |
| `app/models/base.py` | `BaseEntity` mixin with all common fields |
| `app/models/user.py` | User model (display_name, email, role, organization, auth_user_id) |
| `app/models/objective.py` | Objective model (raw_input, summary, goal, constraints, criteria, confidence, status, stages) |
| `app/models/job.py` | Job model (job_type, status, progress, result, error, worker, timestamps) |
| `app/repositories/__init__.py` | Repository exports |
| `app/repositories/base.py` | Generic CRUD with soft delete, version increment, pagination |
| `app/repositories/user_repository.py` | User-specific queries (get_by_email, list_by_role, get_or_create) |
| `app/repositories/objective_repository.py` | Objective-specific queries (list_by_user, list_by_status) |
| `app/repositories/job_repository.py` | Job-specific queries (list_pending, mark_started/completed/failed) |
| `migrations/versions/20260728_initial_schema.py` | Initial Alembic migration |
| `tests/test_models.py` | 39 unit tests for UUIDv7 and all models |
| `tests/test_repositories.py` | Integration tests for all repositories |
| `tests/test_migrations.py` | Integration tests for migration |
| `docs/database.md` | ER diagram, relationships, indexes, migration guide |

### Modified Files

| File | Change |
|------|--------|
| `app/database/base.py` | Added `MappedAsDataclass` for Python-level defaults |
| `app/database/session.py` | Production pool config (20 conns, recycle, timeouts) |
| `app/database/__init__.py` | Added uuid7, get_transaction_session exports |
| `app/config.py` | Redis default changed to `localhost:6379` for local dev |
| `app/main.py` | Resilient lifespan (doesn't crash if Redis unavailable) |
| `migrations/env.py` | Imports models for autodetect |
| `migrations/script.py.mako` | Added postgresql import |
| `pyproject.toml` | Added pgvector dep, ruff per-file-ignores, package discovery |
| `tests/conftest.py` | Async session fixture |

## Key Design Decisions

### 1. UUIDv7 for All IDs
```
tttttttt-tttt-7xxx-[89ab]xxx-xxxxxxxxxxxx
```
- **Monotonically increasing** → B-tree friendly primary keys
- **Client-generated** → no DB round-trip for IDs
- **Globally unique** → safe for distributed systems

### 2. BaseEntity Mixin
Every table shares:
- `id` (UUIDv7 PK, auto-generated)
- `created_at` / `updated_at` (auto-managed UTC timestamps)
- `deleted_at` (soft delete marker)
- `created_by` / `updated_by` (audit trail)
- `version` (optimistic locking, increments on update)
- `metadata` (JSONB for flexible attributes)

### 3. Soft Delete
- All queries filter `WHERE deleted_at IS NULL`
- `soft_delete()` sets `deleted_at` instead of hard-deleting
- No hard deletes — data is preserved for audit

### 4. Repository Pattern
- `BaseRepository[T]` provides: create, get, get_by_ids, list, update, soft_delete, count, exists
- Subclasses add domain-specific queries
- All operations use injected session (transaction managed by caller)

### 5. MappedAsDataclass
- `Base(DeclarativeBase, MappedAsDataclass)` provides auto-generated `__init__`
- Python-level defaults work correctly (no need to pass id, created_at, etc.)
- `init=False` on computed fields, relationship fields

### 6. Production Pooling
- 20 connections + 10 overflow
- Connection recycle every 3600s
- Pre-ping health checks
- 30s command timeout
- Statement cache disabled

### 7. Resilient Startup
- Server starts even if Redis is unavailable
- Database connections are lazy (not at startup)

## Tables

### User
| Column | Type | Notes |
|--------|------|-------|
| id | UUIDv7 PK | |
| display_name | VARCHAR(255) | |
| email | VARCHAR(320) | UNIQUE INDEX |
| role | VARCHAR(50) | INDEXED |
| organization | VARCHAR(255) | nullable |
| auth_user_id | VARCHAR(255) | Supabase mapping |

### Objective
| Column | Type | Notes |
|--------|------|-------|
| id | UUIDv7 PK | |
| raw_input | TEXT | Original user request |
| compiled_summary | TEXT | nullable |
| structured_goal | TEXT | nullable |
| constraints | JSONB | nullable |
| success_criteria | JSONB | nullable |
| confidence | FLOAT | 0.0–1.0, nullable |
| status | VARCHAR(50) | INDEXED, default 'draft' |
| current_stage | VARCHAR(100) | nullable |
| user_id | UUID | FK → users, INDEXED, nullable |

### Job
| Column | Type | Notes |
|--------|------|-------|
| id | UUIDv7 PK | |
| job_type | VARCHAR(100) | INDEXED |
| status | VARCHAR(50) | INDEXED, default 'pending' |
| progress | FLOAT | 0.0–100.0 |
| started_at | TIMESTAMPTZ | nullable |
| finished_at | TIMESTAMPTZ | nullable |
| worker | VARCHAR(255) | nullable |
| result | JSONB | nullable |
| error | JSONB | nullable |
| user_id | UUID | FK → users, INDEXED, nullable |
| objective_id | UUID | FK → objectives, INDEXED, nullable |

## Indexes (15 total)

### Users
- `ix_users_email` — UNIQUE on email
- `ix_users_role` — B-tree on role
- `ix_users_created_at` — B-tree on created_at
- `ix_users_deleted_at` — B-tree on deleted_at

### Objectives
- `ix_objectives_status` — B-tree on status
- `ix_objectives_user_id` — B-tree on user_id
- `ix_objectives_created_at` — B-tree on created_at
- `ix_objectives_updated_at` — B-tree on updated_at
- `ix_objectives_deleted_at` — B-tree on deleted_at

### Jobs
- `ix_jobs_status` — B-tree on status
- `ix_jobs_job_type` — B-tree on job_type
- `ix_jobs_user_id` — B-tree on user_id
- `ix_jobs_objective_id` — B-tree on objective_id
- `ix_jobs_created_at` — B-tree on created_at
- `ix_jobs_updated_at` — B-tree on updated_at
- `ix_jobs_deleted_at` — B-tree on deleted_at

## Relationships

| From | To | Type | Via |
|------|----|------|-----|
| User | Objective | 1:N | Objective.user_id |
| User | Job | 1:N | Job.user_id |
| Objective | Job | 1:N | Job.objective_id |

Lazy loading: `selectin` (eager for single-item access, avoids N+1 for lists)

## Tests

```
tests/test_models.py — 39 tests, all passing
  TestUUID7          — 5 tests (valid, version 7, RFC 4122, unique, monotonic)
  TestUserModel      — 11 tests (create, defaults, nullable fields, all fields)
  TestObjectiveModel — 11 tests (create, defaults, nullable fields, all fields)
  TestJobModel       — 12 tests (create, defaults, nullable fields, all fields)
```

Integration tests (require PostgreSQL, marked `@pytest.mark.integration`):
- `tests/test_repositories.py` — CRUD, soft delete, custom queries for all repositories
- `tests/test_migrations.py` — Schema creation, table/column inspection

## Running the Server

```bash
cd backend
py -3.13 -m uvicorn app.main:app --reload --port 8000
```

Available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`
Health check at `http://localhost:8000/api/v1/health/system`

## Next Steps (Sprint 3+)

- API endpoints for Users, Objectives, Jobs
- Objective Compiler (AI integration)
- Add remaining tables: Plans, Strategies, Departments, Agents, Tasks, Decisions, Evidence, Events, Memories
