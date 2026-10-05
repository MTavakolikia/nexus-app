# NEXUS — AI-Native Engineering Control Plane

> **Build. Ship. Observe. Improve.** — A full-featured internal developer platform for modern engineering teams, powered by AI.

[![Release](https://img.shields.io/github/v/release/anomalyco/nexus-app)](https://github.com/anomalyco/nexus-app/releases)
[![License](https://img.shields.io/github/license/anomalyco/nexus-app)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-000000?logo=nextdotjs)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3749?logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.0-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-764abc?logo=redux)](https://zustand-demo.js.org/)
[![TanStack Query](https://img.shields-IO50-4688?logo=reactquery)](https://tanstack.sh/query/latest)
[![Zod](https://img.shields.io/badge/Zod-4.0-4b78e3?logo=zod)](https://zod.dev/)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Development](#development)
- [Database](#database)
- [API Reference](#api-reference)
- [State Management](#state-management)
- [Deployment](#deployment)
- [Testing](#testing)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

NEXUS is a unified **Engineering Control Plane** designed for engineering teams that need to ship, observe, and improve software at scale. It combines service cataloging, deployment orchestration, observability, incident response, feature flagging, and an **AI engineering assistant** into a single cohesive interface.

### Key Scenarios

- **On-call engineer**: Correlate a latency spike across metrics → logs → traces → incident timeline in one click
- **Product manager**: Track DORA metrics, feature flag rollouts, and release health across environments
- **Platform engineer**: Manage the service catalog, enforce deployment gates, and respond to incidents with AI assistance
- **Security engineer**: Audit permissions, review vulnerabilities, and investigate security events

---

## Features

### 🏗️ Service Catalog

Maintain a real-time catalog of all services. Each service entry tracks:

- Health status (healthy / degraded / down)
- Language, framework, tier classification
- Team ownership with contact information
- Linked repository with build status and open PRs

[View the services API](src/app/api/services/route.ts) · [Service types](src/lib/types.ts)

### 🚀 Deployments

Full CI/CD pipeline visualization:

- **8-stage pipelines**: Install → Lint → Typecheck → Unit Tests → Integration Tests → E2E Tests → Security Scan → Build → Deploy
- **SSE streaming** for live pipeline progress updates
- **Bundle size analysis** with delta tracking
- **One-click rollbacks** with automatic version pinning

[Deployment API](src/app/api/deployments/route.ts) · [Deploy engine](src/server/deploy-engine.ts)

### 📊 Observability

Unified observability dashboard:

- **Metrics**: Requests, error rate, p95 latency, availability (7-day trends)
- **Logs**: Structured log search with level and service filtering
- **Traces**: Distributed trace visualization with span detail and bottleneck detection

[Observability API](src/app/api/observability/route.ts)

### ⚠️ Incidents

Incident management with AI assistance:

- **Severity-based routing** (SEV-1 through SEV-4)
- **Interactive timeline** with event, alert, signal, analysis, and recovery markers
- **AI-generated postmortems** with summary, impact, root cause, resolution, lessons learned, and actionable follow-ups

[Incidents API](src/app/api/incidents/route.ts)

### 🏁 Feature Flags

Progressive delivery with full auditability:

- **Percentage rollouts** with regional and team targeting rules
- **Full audit trail** for every flag mutation (who, what, when, why)
- **Optimistic updates** with rollback on failure

[Flags API](src/app/api/flags/route.ts)

### 🧭 Architecture Diagram

Interactive service dependency graph powered by XY Flow:

- Visualizes service nodes, tech stacks, and dependency edges
- Click-to-drill into service details

[Architecture API](src/app/api/architecture/route.ts) · [Architecture view](src/features/architecture/architecture-view.tsx)

### 🤖 AI Engineering Assistant

Z.ai-powered copilot with scoped tool access:

- **getService** — Retrieve service details by slug
- **listDeployments** — Query deployments with filtering
- **getMetrics** — Fetch metrics for a service
- **getIncidents** — Retrieve incidents with severity filtering
- **getPerformanceData** — Get web vitals and performance data
- **searchKnowledge** — RAG search over ADRs, runbooks, and postmortems
- **getArchitecture** — Retrieve the service dependency graph

[AI chat API](src/app/api/ai/chat/route.ts) · [AI provider](src/server/ai.ts)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Next.js 16)                  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │   Features   │  │    Shell     │  │    shadcn/ui      │ │
│  │ (12 views)   │  │ (sidebar,    │  │  (48 components)  │ │
│  │              │  │  cmd palette)│  │                   │ │
│  └──────┬───────┘  └──────┬───────┘  └─────────┬─────────┘ │
│         │                 │                    │           │
│         ▼                 ▼                    ▼           │
│  ┌────────────────────────────────────────────────┐        │
│  │           State Management (Zustand)           │        │
│  │  UI state only: view, sidebar, palette       │        │
│  └──────────────┬─────────────────┬─────────────┘        │
│                 │                 │                      │
│                 ▼                 ▼                      │
│  ┌─────────────────────┐  ┌──────────────────────┐       │
│  │   TanStack Query    │  │   React Hook Form    │       │
│  │  (Server state)     │  │   + Zod schemas    │       │
│  └────────┬────────────┘  └────────┬─────────────┘       │
│           │                         │                     │
│           ▼                         ▼                     │
│  ┌──────────────────────────────────────────┐             │
│  │         Next.js App Router /api/*        │             │
│  │       (Route Handlers / Server Actions)  │             │
│  └──────────────────┬───────────────────────┘             │
│                     │                                     │
└─────────────────────┼─────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Server Layer (src/server/*)               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ AI       │  │ Queries  │  │ Deploy   │  │  Prisma  │   │
│  │ Provider │  │ (data    │  │ Engine   │  │  Client  │   │
│  │ (Z.ai)   │  │  fetch)  │  │ (mock)   │  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └────┬─────┘   │
│                                                 │          │
│                                                 ▼          │
│                                   ┌──────────────────────┐ │
│                                   │     PostgreSQL       │ │
│                                   │     (sqlite-dev)     │ │
│                                   │   + pgvector(RAG)    │ │
│                                   └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

- **Server Components by default** — All data fetching happens server-side via React Server Components for minimal JS
- **Client islands for interactivity** — Charts, tables with sorting, command palette, and dialogs use Client Components
- **TanStack Query owns server state** — All API data flows through QueryClient with declarative caching and invalidation
- **Zustand for UI state only** — Navigation, sidebar, density, command palette state
- **Zod is the schema boundary** — The same schema validates route handlers, server actions, and AI tool inputs
- **SSE for real-time** — Deployment pipelines stream via Server-Sent Events over HTTP

### Key ADRs

The project contains architectural decision records accessible in-app and in the [knowledge base](src/features/company/company-views.tsx):

| ADR | Title |
|-----|-------|
| ADR-001 | Server Components Strategy |
| ADR-002 | TanStack Query vs Global State |
| ADR-003 | Zustand State Boundaries |
| ADR-004 | SSE vs WebSockets |
| ADR-005 | PostgreSQL + pgvector |
| ADR-006 | RBAC Architecture |
| ADR-007 | AI Tool Architecture |
| ADR-008 | Feature Flag Model |
| ADR-009 | Observability Architecture |

---

## Tech Stack

### Core

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime | Node.js 22 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 (semantic tokens) |
| Fonts | Geist / Geist Mono |

### Data & State

| Concern | Tool |
|---------|------|
| ORM | Prisma 6 |
| Database | SQLite (dev/demo), PostgreSQL + pgvector (production) |
| Server State | TanStack Query 5 |
| UI State | Zustand 5 |
| Validation | Zod 4 |

### UI & UX

| Component | Library |
|-----------|---------|
| Components | shadcn/ui (Radix UI) |
| Icons | lucide-react |
| Charts | recharts |
| Graph Visualization | @xyflow/react |
| Forms | react-hook-form + @hookform/resolvers |
| Notifications | sonner |
| Drag & Drop | @dnd-kit |
| Markdown | react-markdown |
| Syntax Highlighting | react-syntax-highlighter |

### AI & Tooling

| Feature | Library |
|---------|---------|
| AI Provider | Z.ai API (+ deterministic fallback) |
| Markdown Editor | @mdxeditor/editor |
| UUID Generation | uuid |
| Date Utilities | date-fns |
| Env Detection | @reactuses/core |

---

## Getting Started

### Prerequisites

- **Node.js** 22+ (built and tested with 22)
- **npm** 10+ or **pnpm** 9+
- **PostgreSQL** 16+ (optional, for production; SQLite works for development)
- **Z.ai API key** (optional, for AI assistant; falls back to mock provider)

### Installation

```bash
# Clone the repository
git clone https://github.com/anomalyco/nexus-app.git
cd nexus-app

# Install dependencies
npm install
# or
pnpm install
```

### Configuration

Create a `.env` file in the project root:

```bash
# Database (SQLite for development)
DATABASE_URL="file:./dev.db"

# Next.js
NEXTAUTH_URL=http://localhost:3100

# Z.ai (optional — AI assistant features)
Z_AI_API_KEY="your-api-key-here"

# Caddy port transformation (for WebSocket example proxy)
# See Caddyfile
```

### Database Setup

```bash
# Push schema to database (creates tables, doesn't migrate)
npm run db:push

# Generate Prisma client
npm run db:generate

# Seed with demo data (golden dataset)
npm run db:seed
```

### Development Server

```bash
npm run dev
```

The server runs with logging output to `dev.log`. Open [http://localhost:3100](http://localhost:3100).

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (port 3100) |
| `npm run build` | Production build with standalone copy |
| `npm start` | Start production server |
| `npm run typecheck` | Run TypeScript type check |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:reset` | Reset database with migrations |
| `npm run db:seed` | Seed database with demo data |

---

## Development

### Project Structure

```
nexus-app/
├── prisma/
│   ├── schema.prisma     # Data model
│   └── seed.ts           # Demo seed script
├── src/
│   ├── app/
│   │   ├── api/          # API routes (route handlers)
│   │   │   ├── ai/chat/  # AI assistant endpoint
│   │   │   ├── services/ # Service catalog
│   │   │   ├── deployments/
│   │   │   ├── incidents/
│   │   │   ├── observability/
│   │   │   ├── performance/
│   │   │   ├── security/
│   │   │   ├── audit/
│   │   │   ├── productivity/
│   │   │   ├── architecture/
│   │   │   ├── flags/
│   │   │   ├── knowledge/
│   │   │   ├── docs/
│   │   │   ├── bootstrap/
│   │   │   ├── session/
│   │   │   └── route.ts  # Health check
│   │   ├── globals.css
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # App shell entry
│   ├── components/
│   │   ├── ui/           # shadcn/ui components (48 files)
│   │   ├── shell/        # App shell (sidebar, command palette)
│   │   └── shared/       # Shared utilities (kit.tsx)
│   ├── features/         # Feature views (12 domains)
│   │   ├── overview/     # Dashboard
│   │   ├── services/     # Service catalog
│   │   ├── deployments/  # Deployment pipelines
│   │   ├── incidents/    # Incident management
│   │   ├── observability/# Metrics, logs, traces
│   │   ├── performance/  # Web vitals, regressions
│   │   ├── security/     # Vulnerabilities, events
│   │   ├── flags/        # Feature flags
│   │   ├── architecture/ # Dependency graph
│   │   ├── assistant/    # AI copilot
│   │   ├── design-system/# Component showcase
│   │   └── company/      # Recruiter, case study, ADRs
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Shared libraries (api, db, utils, types)
│   ├── providers/        # React providers
│   ├── server/           # Server-side logic
│   │   ├── ai.ts         # AI provider
│   │   ├── queries.ts    # Data queries
│   │   └── deploy-engine.ts
│   └── stores/           # Zustand stores
├── public/               # Static assets
├── scripts/              # Build/dev scripts
├── tests/                # Test scripts
├── examples/             # Example integrations
├── mini-services/        # Future microservice scaffolding
├── Caddyfile             # Reverse proxy config
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Development Guidelines

- **All UI components** use shadcn/ui conventions with `class-variance-authority`
- **Server state** is managed via TanStack Query — never use global stores for API data
- **UI state** (sidebar, view navigation, command palette) lives in Zustand
- **Schemas** are defined in `src/lib/types.ts` and validated with Zod
- **API routes** are thin — business logic lives in `src/server/`
- **Feature flags** follow the model in ADR-008 (enabled, rollout, targeting rules, audit trail)

### Persona Switching

Press `Ctrl/Cmd + Shift + P` in the app to switch demo personas (Mohammad, Sarah, Alex, Emma, etc.). Each persona has different roles and permissions per ADR-006.

---

## Database

### Schema Overview

The Prisma schema (`prisma/schema.prisma`) defines 30+ models across these domains:

| Domain | Models |
|--------|--------|
| Identity | Organization, Team, User, Membership |
| Catalog | Repository, Service, Environment |
| Delivery | Deployment, PipelineStage |
| Observability | Metric, LogEntry, TraceSpan, PerformanceSnapshot |
| Incidents | Incident, IncidentTimeline, Postmortem |
| Feature Flags | FeatureFlag, FeatureFlagAudit |
| Architecture | ArchitectureNode, ArchitectureEdge |
| Knowledge | Document, KnowledgeChunk |
| Governance | AuditLog, Notification, SecurityEvent, Vulnerability |
| AI | AIConversation, AIMessage |
| Analytics | DailyStat |

### Seed Data

The seed script generates a coherent golden-demo dataset centered around a real incident:

> **Story**: checkout-web v3.18.2 ships analytics-client@4.1.0 (+183KB), causing an LCP regression. INC-1042 is declared, DPL-1043 rolls back to v3.18.1, and an AI-generated postmortem is published.

The seed includes:
- **Acme Engineering** organization with 8 users across 6 teams
- **13 services** with repositories, environments, and health status
- **30 days** of deployment history with pipeline stages
- **Hourly metrics** (requests, error rate, p95 latency, availability)
- **Incident-correlated logs and traces**
- **Primary incident INC-1042** with full timeline and postmortem
- **2 secondary incidents** (INC-1041, INC-1039, INC-1036)
- **5 feature flags** with audit trails and regional/team rollout rules
- **Architecture graph** (19 nodes, 27 edges)
- **Knowledge base** (ADRs, runbooks, postmortems, guidelines)

Uses a deterministic PRNG (mulberry32) for reproducible demos.

---

## API Reference

All API routes return JSON. Server errors return `{ error: "message" }` with appropriate HTTP status codes.

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api` | Health check |
| `GET` | `/api/bootstrap` | Complete dashboard data (KPIs, trends, recent data) |
| `POST` | `/api/session` | Persona switching for demo users |

### Service Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/services` | List all services (filter by team/status/tier) |
| `GET` | `/api/services/[slug]` | Service detail with health metrics |

### Deployments

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/deployments` | List deployments (paginate/filter by status) |
| `GET` | `/api/deployments/[ref]` | Deployment detail with pipeline stages |
| `POST` | `/api/deployments` | Create a new deployment |
| `POST` | `/api/deployments/[ref]/rollback` | Initiate rollback |
| `GET` | `/api/deployments/[ref]/stream` | SSE stream for live pipeline progress |

### Incidents

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/incidents` | List incidents (filter by severity/status) |
| `GET` | `/api/incidents/[ref]` | Incident detail with timeline |
| `POST` | `/api/incidents` | Create a new incident |
| `PATCH` | `/api/incidents/[ref]` | Update incident status/resolution |
| `POST` | `/api/incidents/[ref]/postmortem` | Generate AI postmortem |

### Observability

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/observability` | Combined observability dashboard |
| `GET` | `/api/logs` | Structured log search (filter by level/service) |
| `GET` | `/api/traces` | Trace list with span details |
| `GET` | `/api/performance` | Web vitals, regressions, Core Web Vitals |

### Security & Governance

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/security` | Vulnerabilities and security events |
| `GET` | `/api/audit` | Organization audit trail |
| `GET` | `/api/productivity` | DORA metrics and trends |

### Platform

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/flags` | Feature flags with targeting rules |
| `PATCH` | `/api/flags` | Update flag (enabled, rollout, reason) |
| `GET` | `/api/architecture` | Service dependency graph |
| `GET` | `/api/knowledge` | RAG search over docs and knowledge base |
| `GET` | `/api/docs` | Documentation retrieval |

### AI Assistant

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/chat` | Chat with the AI engineering copilot |

---

## State Management

### Zustand Store (`src/stores/app-store.ts`)

Three slices manage all non-server state:

```ts
// UI slice — persisted to localStorage
sidebar: { collapsed, mobileOpen }
theme: 'light' | 'dark' | 'system'
density: 'compact' | 'normal' | 'comfortable'

// Navigation slice — view-based routing (not URL-based)
view: ViewKey  // 'overview' | 'services' | 'deployments' | ...
params: Record<string, string>  // e.g. { slug: 'checkout-web' }

// Palette slice — command palette state
commandPalette: { open: boolean, query: string }
```

**View-based navigation**: The app uses a single-page shell with a view router in `page.tsx`, not file-based routing. This allows instant transitions without re-renders of the shell.

### TanStack Query

All server state flows through React Query with:

- **Query key convention**: `['service', slug]`, `['deployments', { status }]`, etc.
- **Stale time**: 30s for dynamic data, 5min for static reference data
- **Cache time**: 5min after components unmount
- **Refetch on window focus**: enabled for production data

---

## Deployment

### Production Build

```bash
npm run build
```

The build process:
1. Runs `next build` (Turbopack)
2. Runs `scripts/copy-standalone.mjs` to copy static assets

### Standalone Deployment

```bash
npm start
```

The production server runs the standalone build with logging to `server.log`.

### Docker/Caddy

The `Caddyfile` configures:

- Reverse proxy from port 81 → Next.js (port 3000)
- WebSocket port transformation via `?XTransformPort=` query parameter
- Proper header forwarding for X-Forwarded-* headers

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | Database connection string |
| `NEXTAUTH_URL` | Yes | - | Next.js URL |
| `Z_AI_API_KEY` | No | - | Z.ai API key for AI features |
| `NODE_ENV` | No | `development` | Node environment |

---

## Testing

### Database Runtime Build Tests

The `tests/` directory contains bash scripts for testing the database runtime build process:

```bash
# Test database initialization and migration
bash tests/database-runtime-build.sh

# Test Python runtime container builds
bash tests/python-runtime-build.sh
bash tests/python-runtime-container.sh
```

These tests verify that:
- The database initializes correctly with the schema
- Preview databases are handled properly
- Build artifacts are copied correctly

---

## Documentation

### In-App Documentation

The app includes a knowledge base accessible via:

- **ADR Viewer** (`/adr` view): Architectural decision records
- **Runbooks** (`/runbook` view): Operational procedures
- **Postmortems** (`/postmortem` view): Incident analysis
- **Guidelines** (`/guideline` view): Style and process guides

### Example Content

- `examples/websocket/` — WebSocket real-time example (frontend + server)

### ADRs

1. [ADR-001](#adr-001-server-components-strategy) — Server Components Strategy
2. [ADR-002](#adr-002-tanstack-query-vs-global-state) — TanStack Query vs Global State
3. [ADR-003](#adr-003-zustand-state-boundaries) — Zustand State Boundaries
4. [ADR-004](#adr-004-sse-vs-websockets) — SSE vs WebSockets for Deployment State
5. [ADR-005](#adr-005-postgresql--pgvector) — PostgreSQL + pgvector
6. [ADR-006](#adr-006-rbac-architecture) — RBAC Architecture
7. [ADR-007](#adr-007-ai-tool-architecture) — AI Tool Architecture
8. [ADR-008](#adr-008-feature-flag-model) — Feature Flag Model
9. [ADR-009](#adr-009-observability-architecture) — Observability Architecture

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Contributing

Contributions are welcome! Please see the following resources:

- **Git conventions**: Uses [Conventional Commits](https://www.conventionalcommits.org/)
- **Type safety**: Run `npm run typecheck` before committing
- **Linting**: Run `npm run lint` before committing

### Commit Format

```
<type>(<scope>): <subject>

<body>
```

Types: `feat`, `fix`, `chore`, `docs`, `ui`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `revert`

---

*Built with ❤️ using Next.js, Prisma, shadcn/ui, and Z.ai*