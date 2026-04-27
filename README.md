# Grevia — ESG & CSRD Compliance Intelligence Platform

Grevia is a full-stack sustainability intelligence platform that helps companies meet CSRD/ESRS reporting obligations. It combines document ingestion, multi-agent AI analysis, and structured data management to produce auditor-ready outputs across emissions tracking, double materiality assessment, policy governance, and ESG reporting.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Features](#features)
6. [Data Models](#data-models)
7. [API Reference](#api-reference)
8. [Frontend Pages](#frontend-pages)
9. [AI & Agent System](#ai--agent-system)
10. [Compliance Frameworks](#compliance-frameworks)
11. [Environment Variables](#environment-variables)
12. [Getting Started](#getting-started)

---

## Overview

Grevia covers four core compliance workflows:

| Module | What it does |
|---|---|
| **Hot Store** | Centralised document library. Upload PDFs, DOCX, XLSX, CSVs. Text is chunked on upload and reused across all AI calls. |
| **Emissions Ledger** | AI extracts Scope 1/2/3 data from documents, maps to ESRS/GRI/TCFD/ISSB, flags gaps and outliers, generates narrative disclosures. |
| **Double Materiality** | A LangGraph multi-agent pipeline scores every ESRS sub-topic on financial and impact materiality, streamed to the client via SSE. |
| **Policy Mapper** | Extracts MDR-P (policies) and MDR-A (actions) from documents and tracks them on a Kanban board through to outcome verification. |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                    │
│  Pages Router · React 19 · TypeScript · Recharts/D3    │
└──────────────────────┬──────────────────────────────────┘
                       │  REST + SSE
┌──────────────────────▼──────────────────────────────────┐
│                    FastAPI Backend                       │
│  /api/v1/{auth,companies,workspace,hot-store,           │
│           emissions,policy,materiality,assistant}       │
└──────┬──────────────────────────────┬───────────────────┘
       │                              │
┌──────▼──────┐              ┌────────▼────────┐
│  MySQL / PG │              │  Cloudflare R2  │
│  SQLAlchemy │              │  (file storage) │
└─────────────┘              └─────────────────┘
                                      │
                              ┌───────▼────────┐
                              │  LLM Provider  │
                              │  OpenAI / Anthropic │
                              └────────────────┘
```

The backend is a single FastAPI app. All routes are prefixed `/api/v1/` and protected by JWT Bearer authentication. File storage is Cloudflare R2 (S3-compatible); when `R2_ACCOUNT_ID` is absent the app falls back to local disk (`backend/storage/`).

---

## Tech Stack

### Backend
| Dependency | Purpose |
|---|---|
| FastAPI + Uvicorn | API server |
| SQLAlchemy + Alembic | ORM and migrations |
| PyMySQL / cryptography | MySQL driver |
| python-jose / passlib[bcrypt] | JWT auth + password hashing |
| anthropic / openai | LLM providers (switchable via `LLM_PROVIDER` env var) |
| LangGraph | Multi-agent ESRS materiality workflow |
| boto3 | Cloudflare R2 / S3 file storage |
| PyMuPDF | PDF text extraction |
| python-docx | DOCX text extraction |
| openpyxl | XLSX text extraction |
| python-multipart | Multipart file uploads |

### Frontend
| Dependency | Purpose |
|---|---|
| Next.js 16 (Pages Router) | React framework |
| React 19 + TypeScript | UI + type safety |
| Recharts | Emissions timeline charts |
| D3.js | Materiality matrix scatter plot |
| @dnd-kit/core | Drag-and-drop policy Kanban |
| notistack | Toast notifications |

---

## Project Structure

```
grevia/
├── backend/
│   ├── main.py                          # FastAPI app, CORS, router registration
│   ├── models/
│   │   ├── database.py                  # SQLAlchemy Base + session factory
│   │   ├── company.py                   # Company (auth entity)
│   │   ├── workspace.py                 # ESG workspace config per company
│   │   ├── hot_store.py                 # Document records
│   │   ├── emission_record.py           # Scope 1/2/3 records
│   │   ├── policy_item.py               # MDR-P / MDR-A kanban items
│   │   ├── policy_action.py             # Actions linked to policies
│   │   ├── materiality_assessment.py    # Assessment header
│   │   ├── materiality_assessment_breakdown.py  # Per-topic scores
│   │   └── materiality_assessment_file.py       # Doc ↔ assessment join
│   ├── routers/
│   │   ├── auth.py                      # Signup, signin, password reset
│   │   ├── company.py                   # Company profile
│   │   ├── workspace.py                 # Workspace CRUD
│   │   ├── hot_store.py                 # Upload, list, preview, hot reports
│   │   ├── emissions.py                 # Analyze, list, update, narratives, timeline
│   │   ├── policy.py                    # Extract, CRUD, kanban move, actions
│   │   ├── materiality.py               # Assess (SSE), retrieve, export
│   │   └── assistant.py                 # AI chat assistant
│   ├── schemas/                         # Pydantic request/response models
│   ├── helpers/
│   │   ├── auth.py                      # JWT + bcrypt utilities
│   │   ├── llm.py                       # chat() wrapper (OpenAI / Anthropic)
│   │   ├── extract_text.py              # PDF/DOCX/XLSX/CSV/TXT → plain text
│   │   ├── storage.py                   # upload/download/delete (R2 or local)
│   │   └── file_detection.py            # Filename → FileType enum
│   ├── agents/
│   │   └── esrs/                        # LangGraph double materiality graph
│   │       ├── graph.py                 # Sequential E→S→G→output_guardrail flow
│   │       ├── base.py                  # GraphState TypedDict
│   │       └── guardrails.py            # Input/output validation nodes
│   └── rag/
│       └── guardrails.py                # Regex + LLM input safety checks
│
└── frontend/
    ├── pages/
    │   ├── _app.tsx / _document.tsx
    │   ├── index.tsx                    # Dashboard
    │   ├── signin.tsx / signup.tsx
    │   ├── forgot-password.tsx / reset-password.tsx
    │   ├── settings.tsx
    │   ├── hot-store.tsx                # Document library
    │   ├── emissions-ledger.tsx         # Emissions table + chart
    │   ├── p2a-mapper.tsx               # Policy Kanban board
    │   └── double-materiality/
    │       ├── index.tsx                # Assessment launcher
    │       └── [id].tsx                 # Results viewer
    ├── components/
    │   ├── Layout.tsx                   # App shell (nav + header)
    │   ├── modals/
    │   │   ├── Upload.tsx
    │   │   ├── HotReport.tsx
    │   │   ├── Preview.tsx
    │   │   ├── DocumentSelector.tsx
    │   │   └── ...
    │   └── kanban/                      # KanbanCol, PolicyCard, OnboardingBanner
    ├── context/
    │   ├── AuthContext.tsx              # JWT token management
    │   └── CompanyContext.tsx           # Authenticated company + workspaces
    ├── helpers/                         # authFetch, formatBytes, FILE_ICONS, etc.
    └── types/                           # TypeScript interfaces mirroring backend models
```

---

## Features

### Document Management (Hot Store)
- Upload PDF, DOCX, XLSX, CSV, TXT files (up to 250 MB each)
- Text is extracted and chunked (1,500 chars/chunk) on upload for fast reuse across all AI calls
- Filter by category, file type, and date range
- Preview documents inline: PDF, plain text, and HTML reports render in-modal
- Soft-delete with physical file removal from R2

### Hot Reports
- Select documents + write a custom instruction
- AI generates a fully-formatted, self-contained HTML ESG report including Chart.js visualisations
- Report is saved back to the Hot Store as a first-class document and can be previewed in an iframe
- Document content is validated before submission: total input must be under 5,000 characters

### Emissions Ledger
- Run AI extraction against any documents in the Hot Store
- Extracts Scope 1, 2, 3 records with: category, tCO₂e, confidence (high/medium/low), status (ok/gap/outlier/unverified)
- Automatically maps each record to ESRS E1, GRI 305, TCFD Metrics & Targets, and ISSB IFRS S2
- Gap and outlier records are flagged; click any status badge to open a detail modal with the narrative disclosure
- "Generate Narratives" calls the AI to write professional CSRD-compliant disclosure paragraphs for all gaps and outliers
- Timeline chart aggregates emissions by period across Scope 1/2/3
- Server-side pagination and scope filtering

### Double Materiality Assessment
- Configure company profile and select source documents in a guided workspace setup
- Launches a LangGraph agent pipeline: Input Guardrail → Environment (E1–E5) → Social (S1–S4) → Governance (G1) → Output Guardrail
- Progress streams to the browser via Server-Sent Events with per-step status
- Results show financial materiality and impact materiality scores for every ESRS sub-disclosure
- Interactive matrix chart (quadrant scatter) with tabbed breakdown table
- Export to XBRL/XML

### Policy to Action Mapper
- Upload documents and run AI extraction to pull out all MDR-P (policy statements) and MDR-A (actions & targets) per ESRS reference
- Kanban board with six stages: Policy Defined → Action Planned → In Progress → Blocked → Implemented → Outcome Verified
- Drag-and-drop cards between columns; changes persist immediately via PATCH
- Filter by ESRS pillar (E/S/G), MDR type, and priority (critical/high/medium/low)
- Open any card for full detail: description, ESRS reference, assignee, due date, check frequency, and linked actions

---

## Data Models

### Company
The primary auth entity. One company = one account.

| Field | Type | Notes |
|---|---|---|
| `company_id` | int PK | |
| `name` | str | |
| `email` | str unique | Login credential |
| `password` | str | bcrypt hash |
| `industry`, `region`, `country` | str | |
| `employee_count`, `revenue` | int/decimal | |

### Workspace
Per-company ESG profile. A company may have multiple workspaces.

| Field | Type | Notes |
|---|---|---|
| `workspace_id` | int PK | |
| `company_id` | FK → Company | |
| `industry`, `region`, `hq_country` | str | |
| `business_description` | text | Used as LLM context |
| `key_stakeholders` | JSON | |
| `sustainability_goals` | text | |

### HotStore (documents)
| Field | Type | Notes |
|---|---|---|
| `hot_store_id` | int PK | |
| `company_id` | FK → Company | |
| `file_type` | enum | PDF/DOCX/XLSX/CSV/TXT/OTHER |
| `category` | enum | policy/report/legal/contract/financial/other |
| `file_path` | str | R2 key or local path |
| `file_size` | int | bytes |
| `chunks` | JSON text | `[{"text": "...", "index": 0}, ...]` |
| `is_hot_report` | bool | True for AI-generated reports |
| `deleted` | bool | Soft delete flag |
| `status` | enum | processing/ready/error |

### EmissionRecord
| Field | Type | Notes |
|---|---|---|
| `emission_record_id` | int PK | |
| `company_id` | FK → Company | |
| `scope` | int | 1, 2, or 3 |
| `category` | str | GHG Protocol category |
| `tco2e` | decimal | Tonnes CO₂ equivalent |
| `percentage_of_total` | decimal | 0–100 |
| `confidence` | enum | high/medium/low |
| `status` | enum | ok/gap/outlier/unverified |
| `esrs_reference` | str | e.g. "ESRS E1-6" |
| `gri_reference` | str | e.g. "GRI 305-1" |
| `tcfd_reference` | str | e.g. "Metrics & Targets" |
| `issb_reference` | str | e.g. "IFRS S2 C6" |
| `narrative_disclosure` | text | AI-generated disclosure paragraph |
| `year`, `period` | int/str | Reporting period |

### PolicyItem
| Field | Type | Notes |
|---|---|---|
| `policy_item_id` | int PK | |
| `company_id` | FK → Company | |
| `mdr_type` | enum | MDR-P (policy) / MDR-A (action) |
| `kanban_column` | enum | policy_defined / action_planned / action_progress / action_blocked / action_implemented / outcome_verified |
| `priority` | enum | critical / high / medium / low |
| `esrs_reference` | str | e.g. "ESRS S1-1" |
| `due_date` | date | |
| `assignee` | str | |
| `check_frequency` | enum | 3_days / 1_week / 2_weeks / 1_month |

### MaterialityAssessment / Breakdown
One assessment per run. Each breakdown row covers one ESRS sub-disclosure (e.g. E1-1 through G1-6) with:
- `financial_materiality_score` — how much the topic affects company finances
- `impact_materiality_score` — how much the company impacts that topic
- `recommendations`, `datapoints`, `metric_target`, `metric_unit`

---

## API Reference

All endpoints require `Authorization: Bearer <token>` except `/api/v1/auth/signin` and `/api/v1/auth/signup`.

### Auth — `/api/v1/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/signup` | Register a new company |
| POST | `/signin` | Authenticate; returns `{ token }` |
| POST | `/forgot-password` | Request password reset token |
| POST | `/reset-password` | Complete reset with token + new password |
| POST | `/change-password` | Update password (authenticated) |
| GET | `/me` | Get authenticated company profile |

### Workspace — `/api/v1/companies/workspace`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List workspaces for authenticated company |
| POST | `/` | Create workspace |
| GET | `/{workspace_id}` | Get workspace |
| PUT | `/{workspace_id}` | Update workspace |

### Hot Store — `/api/v1/hot-store`
| Method | Path | Description |
|---|---|---|
| POST | `/upload` | Upload a document (multipart) |
| GET | `/documents` | List documents — filters: `category`, `file_type`, `date_from`, `date_to`, `is_hot_report`, `page`, `limit` |
| DELETE | `/documents/{id}` | Soft-delete document |
| GET | `/documents/{id}/preview` | Preview: returns `{type, data}` where type is `pdf`, `text`, `html`, or `unsupported` |
| POST | `/hot-reports` | Generate HTML ESG report from selected documents |

### Emissions — `/api/v1/emissions`
| Method | Path | Description |
|---|---|---|
| POST | `/analyze` | AI extraction from hot-store documents |
| GET | `/` | List records — filters: `year`, `scope`, `page`, `limit` |
| PUT | `/{emission_id}` | Update a record |
| POST | `/narrative` | Generate narrative disclosures for gaps/outliers |
| GET | `/timeline` | Aggregated scope 1/2/3 by period |

### Policy — `/api/v1/policy`
| Method | Path | Description |
|---|---|---|
| POST | `/extract` | AI extraction of MDR-P/MDR-A from documents |
| GET | `/` | Board — returns object keyed by kanban column |
| POST | `/` | Create policy item manually |
| PUT | `/{policy_id}` | Update policy |
| PATCH | `/{policy_id}/move` | Move to different kanban column |
| DELETE | `/{policy_id}` | Delete policy |
| GET | `/{policy_id}/actions` | List actions for a policy |
| POST | `/{policy_id}/actions` | Create action |

### Materiality — `/api/v1/materiality`
| Method | Path | Description |
|---|---|---|
| POST | `/assess` | Launch assessment (SSE stream of progress events) |
| GET | `/{assessment_id}` | Retrieve results with breakdowns |
| GET | `/` | List assessments for authenticated company |
| POST | `/{assessment_id}/export` | Export as XBRL/XML |

---

## Frontend Pages

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Summary stats and quick-access cards |
| `/signin` | Sign In | JWT login form |
| `/signup` | Sign Up | Company registration |
| `/settings` | Settings | Company profile and workspace configuration |
| `/hot-store` | Hot Store | Document library with upload, preview, and hot report generation |
| `/emissions-ledger` | Emissions Ledger | Scope 1/2/3 table, timeline chart, narrative generation |
| `/p2a-mapper` | Policy Mapper | Kanban board for MDR-P and MDR-A tracking |
| `/double-materiality` | Materiality Studio | Assessment configuration and launch |
| `/double-materiality/[id]` | Assessment Detail | Results matrix, scores, topic breakdowns, export |

---

## AI & Agent System

### LLM Helper (`helpers/llm.py`)
A single `chat()` function abstracts both OpenAI and Anthropic. Switch providers with `LLM_PROVIDER=anthropic|openai`.

```
Tiers:
  default → gpt-4.1 / claude-sonnet-4-5
  strong  → gpt-5.4 / claude-opus-4-5
  fast    → (fast inference, used for guardrails)
```

Structured output is supported via `response_schema: Type[BaseModel]` — uses OpenAI's `responses.parse` or Anthropic's tool-use mechanism.

### LangGraph Materiality Pipeline (`agents/esrs/`)
Sequential node graph:

```
input_guardrail → environment → social → governance → output_guardrail
```

Each domain agent (environment, social, governance) processes company context and document chunks, writes scored `MaterialityAssessmentBreakdown` rows to the database, then hands off to the next. Progress is streamed to the frontend as SSE events.

A separate LLM-based input guardrail (`rag/guardrails.py`) checks for prompt injection, jailbreak attempts, and off-topic content before the pipeline runs.

---

## Compliance Frameworks

| Standard | Coverage |
|---|---|
| **ESRS E1–E5** | Climate, pollution, water, biodiversity, resource use |
| **ESRS S1–S4** | Own workforce, value chain workers, communities, consumers |
| **ESRS G1** | Business conduct and governance |
| **CSRD** | Mandatory disclosure driver; MDR-P, MDR-A, MDR-T |
| **GRI 305** | Emissions disclosures 305-1 through 305-3 |
| **TCFD** | Strategy, Risk Management, Metrics & Targets pillars |
| **ISSB IFRS S1/S2** | Climate-related financial disclosures |

---

## Environment Variables

### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/grevia

# Auth
JWT_SECRET=your-secret-key-change-in-prod

# LLM
LLM_PROVIDER=openai          # or "anthropic"
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Cloudflare R2 (omit for local disk storage)
R2_ACCOUNT_ID=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_BUCKET=grevia
R2_PUBLIC_URL=https://your-r2-public-url
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- MySQL or PostgreSQL
- [uv](https://github.com/astral-sh/uv) (Python package manager)

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Copy and configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, and LLM keys

# Run migrations
alembic upgrade head

# Start the server
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Docker (optional)

Both services have Dockerfiles in their respective directories. A deployment script is available at `deployment/deploy.py` for pushing to AWS App Runner via ECR.

```bash
# Deploy both services
python deployment/deploy.py

# Deploy backend only
python deployment/deploy.py --backend-only

# Deploy frontend only
python deployment/deploy.py --frontend-only
```

---

## License

Proprietary — all rights reserved.
