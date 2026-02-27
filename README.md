# NADI: The Autonomous Business Orchestrator

NADI is a deterministic workflow automation and operations orchestration platform built for Indonesian MSMEs. It is not a chatbot or conversational assistant. It is a structured operations system centered on approval workflows, review queues, audit trails, and reproducible business process execution.

The core premise: every business action should be traceable, every AI output should be bounded and schema-validated, and every decision should pass through a policy gate before it changes state.

---

## Overview

NADI sits between your data sources and your operators. It ingests raw data from connectors (CSV, Shopify, marketplace APIs), runs it through deterministic or AI-assisted nodes, enforces confidence thresholds and policy rules, and routes anything uncertain to a human review queue. Operators see a clean inbox of approvals, reviews, and tasks. Every write produces an immutable audit log entry with an evidence ID.

The system is designed around a Host-First model. NADI is the source of truth. External integrations (Shopify, Tokopedia, TikTok Shop) are guests that feed data in but never own the numbers.

---

## Key Capabilities

**Inbox and Approval Workflows**
All high-risk or policy-blocked actions surface in the Inbox as Approvals. Operators review the full context, see the before/after diff, and approve or reject with a single action. Every decision is written to the audit log.

**Review Queue**
AI-generated outputs that fall below a configurable confidence threshold are routed to the Review Queue rather than being committed automatically. Operators can correct classifications, confirm interpretations, and save. Nothing uncertain auto-commits.

**Workflow Engine**
Template-based workflows define a graph of nodes: triggers, logic transforms, AI decisions, confidence gates, policy checks, approval wait states, execute actions, and audit writes. Workflows are versioned. Runs are stored with a full node timeline. The execution model is deterministic and idempotent.

**Finance Operations**
CSV import pipeline with column mapping, auto-classification into a double-entry ledger, confidence scoring per row, and duplicate detection via composite hash. Unit economics by SKU and channel. Price change proposals flow through the approval system before committing.

**Audit Log**
Every state-changing action produces an immutable AuditLog entry with an evidence ID (format: `EVD-YYYY-######`), a before/after snapshot, and a payload. The audit trail is queryable by entity, action type, date range, and actor.

**Governance and Policy**
Business rules are versioned policies. Confidence thresholds, minimum margins, and discount caps are configurable. Policy checks run automatically within workflows. Any action that violates an active policy creates an Approval rather than executing immediately.

---

## Architecture

```
External Sources (Guests)
  CSV Import
  Shopify (pull-based)
  Tokopedia / TikTok Shop (simulated)
  WhatsApp (future)
        |
        v
NADI Host (Source of Truth)
  Prisma + SQLite
  Deterministic computation
  All writes produce AuditLog entries
        |
        v
Workflow Engine (LangChain + LangGraph)
  Trigger -> Logic -> AIDecision -> ConfidenceGate
  -> PolicyCheck -> Approval -> ExecuteAction -> WriteAudit
        |
        v
Operator Interface (Next.js App Router)
  Dashboard / Inbox / Audit Log
  Finance / Workflows / Governance / Settings
```

**Design principles:**
- Guests ingest into Host; they never become the source of truth
- AI nodes output bounded, schema-validated JSON only; they never compute money
- ConfidenceGate routes low-confidence AI output to ReviewItem, never auto-commits
- PolicyCheck creates Approval if a rule is violated; the operator decides
- Every execute action is idempotent; re-running the same request produces no duplicates

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5 (App Router, TypeScript) |
| UI | React 19, TailwindCSS 4, Shadcn/ui, Radix UI |
| Data fetching | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Workflow canvas | XYFlow v12 (React Flow) |
| AI orchestration | LangChain Core v1.1, LangGraph v1.2 |
| Run persistence | LangGraph SQLite Checkpoint |
| ORM | Prisma v6 |
| Database | SQLite |
| Validation | Zod v3 |
| CSV parsing | PapaParse v5 |
| E2E testing | Playwright v1 |
| Language | TypeScript v5 (strict) |

---

## Data Model

Core entities managed by Prisma:

| Entity | Purpose |
|---|---|
| `Product` | SKU, COGS, price, reorder point |
| `Inventory` | Available and reserved stock |
| `TransactionRaw` | Raw transactions from CSV import |
| `LedgerEntry` | Classified transactions with confidence and evidence |
| `UnitEconomicsSnapshot` | Margin tracking by SKU and channel |
| `Policy` | Versioned business rules |
| `Approval` | High-risk actions awaiting operator decision |
| `ReviewItem` | Low-confidence AI outputs pending human review |
| `Task` | Follow-up actions and reminders |
| `WorkflowTemplate` | Versioned workflow graph definitions |
| `WorkflowRun` | Execution instance of a template |
| `NodeRun` | Individual node execution with inputs, outputs, evidence |
| `AuditLog` | Immutable audit trail with evidence payloads |
| `ConnectorConfig` | Integration status and configuration |

**Conventions:**
- All monetary amounts are stored as integers in IDR (no decimals, no floating point)
- Evidence IDs: `EVD-YYYY-######`
- Run IDs: `RUN-YYYY-######`
- Approval IDs: `APR-YYYY-######`
- JSON payloads stored as strings in the database, parsed at the API boundary

---

## Project Structure

```
nadi-workflow/
  prisma/
    schema.prisma       Database schema
    seed.ts             Demo dataset (NADI Streetwear workspace)
  src/
    app/
      (app)/
        page.tsx        Dashboard
        inbox/          Approvals, review queue, tasks
        audit-log/      Audit timeline with filters
        finance/        Ledger, CSV import, unit economics
        workflows/      Templates, runs, workflow builder
        governance/     Policy editor
        settings/       Integration configuration
    components/
      shell/            TopBar, Sidebar
      primitives/       PageHeader, DataTable, DetailsDrawer,
                        StatusChip, EvidenceChip, EmptyState, InlineBanner
      features/         Domain-specific components per page
    lib/
      db.ts             Prisma client
      evidence.ts       Evidence ID generation
      format.ts         IDR formatting, date utilities
  tests/
    smoke/              Playwright E2E tests (3 core demo flows)
PLAN.md                 Authoritative product specification
planv2.md               Extended feature specifications
```

---

## Getting Started

**Prerequisites:** Node.js 20+, npm

```bash
# Clone the repository
git clone https://github.com/Xavrir/-NADI-THE-AUTONOMOUS-BUSINESS-ORCHESTRATOR
cd -NADI-THE-AUTONOMOUS-BUSINESS-ORCHESTRATOR/nadi-workflow

# Install dependencies
npm install

# Set up the database
npx prisma migrate dev

# Seed demo data
npx prisma db seed

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The demo workspace is pre-loaded with "NADI Streetwear" data: products, transactions, pending approvals, review items, workflow runs, and audit entries.

---

## Development Commands

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint check
npm run typecheck    # TypeScript check (tsc --noEmit)
```

**Database:**
```bash
npx prisma migrate dev   # Run migrations
npx prisma db seed       # Seed demo data
npx prisma studio        # Open Prisma Studio
```

**Testing:**
```bash
npx playwright test      # Run E2E smoke tests
```

---

## Demo Dataset

The seed script provisions a complete "NADI Streetwear" workspace with deterministic, refresh-stable data:

**Products:** 7 SKUs including Oversized Tee, Cargo Jogger, Hoodie, Snapback Cap, Sling Bag, Graphic Tee, Track Shorts

**Pre-seeded state:**
- 6 raw transactions from a sample CSV import
- 6 ledger entries (4 posted, 2 pending review)
- Unit economics by SKU across Shopify, Tokopedia, and TikTok Shop
- 3 pending approvals (price changes, policy-blocked actions)
- 2 review items (low-confidence classifications)
- 3 tasks (restock reminders, escalations)
- 7 audit log entries with evidence IDs
- 2 workflow templates (Finance Close, Restock Automation)
- 1 completed workflow run with full node timeline

This dataset supports three core demo flows without requiring any external API credentials.

---

## Demo Flows

**Flow A: Inbox to Audit**
Open Inbox, open a pending approval in the details drawer, approve it, open the Audit Log, and verify the new entry with its evidence chip.

**Flow B: Finance CSV Import**
Open Finance, import a sample CSV, review the column mapping and low-confidence warnings, commit the import, verify new ledger rows and an increased Review tab count.

**Flow C: Workflow Execution**
Open Workflows, run a template, open the Runs list to see the new run, open the run detail to inspect the node timeline.

---

## API Reference

All endpoints are Next.js Route Handlers under `/api/`.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/dashboard` | GET | KPIs and suggested actions |
| `/api/inbox/approvals` | GET | Pending approvals |
| `/api/inbox/review` | GET | Review queue items |
| `/api/inbox/tasks` | GET | Task list |
| `/api/approvals/:id/approve` | POST | Approve an action |
| `/api/approvals/:id/reject` | POST | Reject an action |
| `/api/review/:id/save` | POST | Save a correction |
| `/api/audit` | GET | Audit timeline with filters |
| `/api/audit/:id` | GET | Audit entry detail |
| `/api/finance/ledger` | GET | Ledger table |
| `/api/finance/import-csv` | POST | CSV import workflow |
| `/api/finance/unit-economics` | GET | Margin by SKU and channel |
| `/api/finance/draft-price-change` | POST | Create price change approval |
| `/api/workflows/templates` | GET | Available templates |
| `/api/workflows/create-from-template` | POST | Instantiate a template |
| `/api/workflows/run` | POST | Execute a workflow |
| `/api/workflows/runs` | GET | Run history |
| `/api/workflows/runs/:id` | GET | Run detail and node timeline |
| `/api/policies/current` | GET | Active policy version |
| `/api/policies/update` | POST | Update policy (creates new version) |
| `/api/settings/integrations` | GET | Connector status |
| `/api/settings/test-connection` | POST | Test a connector |

---

## Design System

The visual language is Utility Forge: industrial precision combined with a distinctive brand character.

**Typography**
- Headings: Bricolage Grotesque (600-800 weight)
- UI and body: IBM Plex Sans (400/500/600)
- Evidence IDs and mono values: IBM Plex Mono (400/500)

**Color Tokens**
- Background: `#0F0A07`
- Surface: `#16120F`
- Card: `#20160F`
- Border: `#2A1C12`
- Primary: `#F9802C`
- Text primary: `#F5F3F2`
- Text secondary: `#C4C2C0`
- Caution: `#FFD000`

**Principles**
- 1px/2px borders throughout; no decorative shadows without function
- Evidence IDs rendered with a stamp motif and are copyable
- Status chips always use icon plus label; never color alone
- Empty states are intentional and informative
- Heavy modules (workflow builder canvas) are dynamically imported

---

## Non-Negotiables

**Product constraints:**
- No chat UI, no prompt box, no conversational assistant layout
- UI labels are in English; the CSV importer supports Indonesian column headers
- Data is deterministic and stable across refreshes; no random generation
- All numbers are computed by the Host; AI nodes are advisory only

**Engineering constraints:**
- Every write produces an AuditLog entry with an evidence ID
- AI decision outputs are schema-validated JSON; they never directly mutate state
- All AI output passes through a ConfidenceGate and PolicyCheck before execution
- Type assertions (`as any`), `@ts-ignore`, and empty catch blocks are not permitted

---

## Definition of Done

The MVP is complete when:

- `npm run dev` starts without errors
- `npm run lint` and `npm run typecheck` both pass
- `npm run build` succeeds
- All pages render non-empty deterministic data
- Approve, reject, and save-review actions write to the database and produce audit entries
- CSV import creates ledger rows and review items
- Workflows can be executed and produce a run history with node timelines
- Playwright smoke suite passes all three core demo flows

---

## Specification

The full product specification is available in [PLAN.md](./PLAN.md) and [planv2.md](./planv2.md). These documents cover the complete data model, API contracts, component inventory, workflow semantics, and implementation task breakdown.

---

## License

This project does not currently have an open source license. All rights reserved.
