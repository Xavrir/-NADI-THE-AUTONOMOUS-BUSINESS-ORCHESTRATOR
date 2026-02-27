# NADI Workflow: Host-First Ops Orchestrator (Demo-Ready Plan)

This `PLAN.md` is the authoritative build plan for **NADI Workflow**: a premium-looking, deterministic, demo-stable operations web app for Indonesian MSMEs.

The product is **not a chatbot**. The primary user loop is: **review** → **approve/reject** → **audit** → **run workflows**.

---

## TL;DR

Build a Next.js App Router ops app with:
- A recognizable industrial design system (**Utility Forge**) with strict primitives.
- A Host-first model: **NADI Host = system of record**; connectors are guests.
- Inbox-driven workflows: approvals + review queue + tasks.
- Finance slice: CSV import → classification confidence gate → ledger + unit economics.
- Workflow slice: templates + runs + builder canvas; run creates run history + node runs.
- Auditability everywhere: evidence IDs, before/after snapshots, cross-links.
- Deterministic seed data for the "Kopi Nadi" workspace.

Critical path:
1) Tokens + primitives + shell
2) Database + seed + read APIs
3) Inbox approve/reject → audit vertical slice
4) Finance import → ledger → review → audit

---

## Non-Negotiables

### Product constraints
- No chat UI, no prompt box, no "assistant" layout.
- English UI labels (finance inputs may accept Indonesian CSV headers).
- "Demo stable" means deterministic: no random data generation on refresh.
- Host-first: all numbers (cash, margin, totals) computed deterministically from the Host DB.

### Data & safety constraints
- All writes produce an `AuditLog` entry (and include evidence IDs).
- Any AI-like output is **bounded**, returns structured JSON, and is schema validated.
- Any "AI decision" that changes state must pass:
  - confidence gate (else create ReviewItem)
  - policy check (else block + create Approval)

### Engineering constraints
- Keep UI patterns consistent across pages; no page-specific one-offs.
- Heavy modules (builder canvas) must not be in the global bundle.
- Keyboard-first navigation for drawers/sheets; reduced-motion support.

---

## Goals, Non-Goals, and Definition of Done

### Primary goals
- Premium industrial UI that stays readable for dense tables.
- Demonstrable product loop:
  - Inbox: approve/reject/update review
  - Audit log reflects those actions with evidence IDs
  - Finance import creates ledger entries and review items
  - Workflows can run and create run history

### Non-goals (for demo MVP)
- Real auth/roles enforcement (single demo operator identity is OK).
- Full accounting engine (no complete SAK EMKM journal posting system).
- Reliance on external services being online (connectors are simulated by default).

### Definition of Done
- `npm run dev` runs; all routes render without runtime errors.
- `npm run lint` and `npm run typecheck` pass.
- `npm run build` succeeds.
- Playwright smoke suite passes and validates the 3 core demo flows.

---

## System Architecture (Host-First)

### Mental model
- **Host**: NADI DB + APIs + UI. Authoritative data + deterministic computations.
- **Guests (connectors)**: Shopify, WhatsApp, CSV importer. Guests ingest into Host but never become the source of truth.

### Boundary rules
- UI reads only from Host APIs (`/api/**`).
- Host APIs read/write Host DB (Prisma). No external dependency required to run the demo.
- Connectors:
  - Default to stub/simulated mode.
  - "Manual sync" buttons write audit entries and populate Host tables deterministically.

---

## Data Model (Prisma) - MVP Mapping

NADI is a workflow app. The DB must support:
- "Evidence" everywhere
- deterministic demo dataset
- run history + node runs
- approvals/review/tasks

The current Prisma models already map well to the MVP:
- `Product`, `Inventory`
- `TransactionRaw`, `LedgerEntry`
- `UnitEconomicsSnapshot`
- `Policy` (versioned)
- `Approval`, `ReviewItem`, `Task`
- `WorkflowTemplate`, `WorkflowRun`, `NodeRun`
- `AuditLog`
- `ConnectorConfig`

### Required data conventions
- Money amounts are integers in IDR (no decimals).
- IDs exposed to the UI use stable prefixes:
  - Evidence IDs: `EVD-YYYY-######`
  - Run IDs (display): `RUN-YYYY-######`
  - Approval IDs (display): `APR-YYYY-######`
  (DB IDs can remain cuid; display IDs can be derived or stored.)

### "Evidence" payload shape (string JSON in DB)
Standardize JSON shapes early to keep the UI consistent:
```json
{
  "evidenceId": "EVD-2026-000123",
  "refs": {
    "orderId": "...",
    "transactionId": "...",
    "sku": "KOPI-SUSU-250",
    "importBatch": "CSV-2026-02-27-A"
  },
  "artifacts": [
    {"type": "csv_row", "sha": "..."},
    {"type": "screenshot", "path": ".sisyphus/evidence/finance-import-preview.png"}
  ]
}
```

---

## API Surface (Next.js Route Handlers)

### API principles
- Keep it simple and demo-stable: JSON only; no streaming.
- Zod-validate responses and request bodies at the boundary.
- Writes:
  - mutate the DB
  - write one or more `AuditLog` rows
  - return the updated object used to update UI caches

### Endpoints (MVP)

Dashboard:
- `GET /api/dashboard`

Inbox:
- `GET /api/inbox/approvals`
- `GET /api/inbox/review`
- `GET /api/inbox/tasks`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`
- `POST /api/review/:id/save`

Audit:
- `GET /api/audit`
- `GET /api/audit/:id`

Finance:
- `GET /api/finance/ledger`
- `POST /api/finance/import-csv`
- `GET /api/finance/unit-economics`
- `POST /api/finance/draft-price-change`

Workflows:
- `GET /api/workflows/templates`
- `POST /api/workflows/create-from-template`
- `POST /api/workflows/run`
- `GET /api/workflows/runs`
- `GET /api/workflows/runs/:id`

Governance/settings:
- `GET /api/policies/current`
- `POST /api/policies/update`
- `GET /api/settings/integrations`
- `POST /api/settings/test-connection`
- `POST /api/integrations/shopify/sync` (manual pull; stubbed by default)

### Response contracts (MVP)

These are "UI-shaped" contracts: the API should return values already formatted for rendering
(e.g. parsed JSON objects, display IDs, and precomputed summaries) to keep pages thin.

Approval (Inbox > Approvals):
```ts
type ApprovalStatus = 'pending' | 'approved' | 'rejected'
type RiskLevel = 'low' | 'medium' | 'high'

type ApprovalDTO = {
  id: string
  displayId: string // e.g. APR-2026-000123
  title: string
  description?: string
  actionType: string
  targetType: string
  targetId?: string
  riskLevel: RiskLevel
  status: ApprovalStatus
  confidence?: number
  evidence: {
    evidenceId: string
    refs?: Record<string, string>
  }
  before?: unknown
  after?: unknown
  createdAt: string
}
```

Audit log entry (Audit Log):
```ts
type AuditLogDTO = {
  id: string
  eventType: string
  actor: string
  summary: string
  targetType?: string
  targetId?: string
  runId?: string
  approvalId?: string
  evidence?: {
    evidenceId?: string
    refs?: Record<string, string>
  }
  before?: unknown
  after?: unknown
  createdAt: string
}
```

Finance ledger row (Finance > Ledger):
```ts
type LedgerRowDTO = {
  id: string
  date: string
  description: string
  debit: number
  credit: number
  category: string
  confidence: number
  status: 'posted' | 'needs_review'
  evidence: {
    evidenceId: string
  }
}
```

Notes:
- DB stores JSON as strings (`beforeJson`, `afterJson`, `evidenceJson`). The API should parse these into objects so the UI never needs `JSON.parse` sprinkled across components.
- Dates should be ISO strings.
- If a field is unavailable, omit it rather than returning `null` everywhere.

---

## Frontend Architecture (Next.js App Router)

### Route structure (recommended)
- `app/(app)/layout.tsx` - persistent shell
- `app/(app)/page.tsx` - dashboard
- `app/(app)/inbox/page.tsx`
- `app/(app)/audit-log/page.tsx`
- `app/(app)/finance/page.tsx` (or `/finance/ledger` + `/finance/unit-economics`)
- `app/(app)/workflows/page.tsx`
- `app/(app)/workflows/builder/page.tsx` - dynamic import + client-only
- `app/(app)/marketing/page.tsx`
- `app/(app)/inventory/page.tsx`
- `app/(app)/cs-console/page.tsx`
- `app/(app)/governance/page.tsx`
- `app/(app)/settings/page.tsx`

### State & data
- TanStack Query for reads + mutations.
- URL-driven state for drawers (shareable demo moments):
  - `?drawer=approval&id=...`
  - `?drawer=audit&id=...`

### Error handling
- Route handlers: return non-2xx with `{ error: { code, message } }`.
- UI: show "industrial" inline banners; avoid raw stack traces.

### Project conventions (recommended)

Foldering:
- `components/shell/` - TopBar, Sidebar, AppShell
- `components/primitives/` - PageHeader, DetailsDrawer, StatusChip, EvidenceChip, EmptyState
- `components/finance/`, `components/inbox/`, `components/workflows/` - feature components only
- `lib/db/` - Prisma client wrapper, server-only helpers
- `lib/evidence/` - evidence ID generation + evidence JSON helpers
- `lib/api-schemas/` - Zod schemas shared across API + UI
- `lib/format/` - currency/date formatting helpers (single source)

Data formatting rules:
- UI never computes money totals from raw strings; totals are computed in API or server utilities.
- Evidence IDs are displayed in mono and always copyable.

---

## Design System: Utility Forge (Industrial + Gen Z)

### Visual language
Industrial feel:
- crisp 1px/2px borders and grid rhythm
- mono microcopy for IDs and evidence
- sparing high-visibility accent usage

Gen Z graphic-designer cues (bounded):
- characterful headline font + neutral UI font
- one signature "stamp" motif (Evidence ID)
- optional low-opacity grain overlay (respect reduced-motion/contrast)

### Base tokens
Use as base and derive semantic tokens:
- Background `#0F0A07`
- Surface `#16120F`
- Card `#20160F`
- Border `#2A1C12`
- Primary `#F9802C`
- Hover `#EF7B2A`
- Muted accent `#81461C`
- Text primary `#F5F3F2`
- Text secondary `#C4C2C0`
- Text muted `#92948D`
- Caution Yellow `#FFD000`

### Typography (recommended)
- Headings/brand: Bricolage Grotesque (600-800)
- UI/body: IBM Plex Sans (400/500/600)
- Evidence IDs: IBM Plex Mono (400/500)

Rules:
- Tables default to `tabular-nums`.
- Provide density toggle (comfortable/dense) for tables.

### Interaction primitives (mandatory)
Define once; reuse everywhere:
1) `PageHeader` (title + subtitle + primary action + filters)
2) `DataTable` (comfortable/dense; consistent row actions)
3) `DetailsDrawer` (right drawer; URL state; ESC closes; focus return)
4) `StatusChip` (icon + label; never color-only)
5) `EvidenceChip` (copyable) + `EvidenceStamp` (signature motif)
6) `EmptyState` (intentional empty states, consistent copy)
7) `InlineBanner` (warnings/errors; consistent tone)

---

## Workflow Model (Product Semantics)

This section is the "workflow automation" core of NADI. It defines what a workflow is, how runs execute,
and how runs produce approvals/review items/audit logs.

### Key concepts
- A **WorkflowTemplate** is a versioned, named graph of nodes + edges + parameters.
- A **WorkflowRun** is one execution of a template against Host data.
- A **NodeRun** is one node's execution inside a run, capturing inputs/outputs/evidence.
- Workflow execution is **deterministic by default**: the same seed data and run inputs yield the same outputs.

### Entities and relationships
- `WorkflowTemplate` (1) -> (many) `WorkflowRun`
- `WorkflowRun` (1) -> (many) `NodeRun`
- `WorkflowRun` may create:
  - `Approval` rows (for high-risk / policy-blocked actions)
  - `ReviewItem` rows (for low-confidence AI outputs or data issues)
  - `Task` rows (for follow-ups)
- `AuditLog` rows link back to the originating `runId` and optionally `approvalId`.

### Global run states
- queued
- running
- needs_review
- awaiting_approval
- executed
- failed
- logged

### Node types (builder)
- Trigger
- Logic
- AIDecision (bounded JSON output)
- ConfidenceGate
- PolicyCheck
- Approval
- ExecuteAction
- WriteAudit

### Template config (stored in `WorkflowTemplate.configJson`)

Workflow templates are stored as JSON so the builder and the run engine share one source of truth.

Minimum viable shape:
```json
{
  "id": "tmpl_finance_close_v1",
  "name": "Finance Close",
  "version": 1,
  "entryNodeId": "n_trigger",
  "nodes": [
    {
      "id": "n_trigger",
      "type": "Trigger",
      "config": {"triggerType": "manual"}
    },
    {
      "id": "n_classify",
      "type": "AIDecision",
      "config": {"task": "classify_ledger_row"}
    },
    {
      "id": "n_gate",
      "type": "ConfidenceGate",
      "config": {"threshold": 0.9}
    },
    {
      "id": "n_policy",
      "type": "PolicyCheck",
      "config": {"policyKey": "finance_import"}
    },
    {
      "id": "n_execute",
      "type": "ExecuteAction",
      "config": {"actionType": "post_ledger_entries"}
    },
    {
      "id": "n_audit",
      "type": "WriteAudit",
      "config": {"eventType": "workflow_executed"}
    }
  ],
  "edges": [
    {"from": "n_trigger", "to": "n_classify"},
    {"from": "n_classify", "to": "n_gate"},
    {"from": "n_gate", "to": "n_policy", "when": "pass"},
    {"from": "n_gate", "to": "n_audit", "when": "needs_review"},
    {"from": "n_policy", "to": "n_execute", "when": "pass"},
    {"from": "n_policy", "to": "n_audit", "when": "blocked"},
    {"from": "n_execute", "to": "n_audit"}
  ]
}
```

Notes:
- `when` enables branching without inventing a full programming language.
- Config stays deliberately small for hackathon MVP; this is a UI product, not a general compute engine.

### Run execution model (server-side simulator)

The MVP run engine is a server-side "simulator" that:
1) Loads template config JSON
2) Walks nodes in a deterministic order (topological traversal from entry)
3) Persists a `NodeRun` per node
4) Emits side effects into Host DB in a controlled, auditable way

Execution algorithm requirements:
- Deterministic traversal: no parallelism in MVP (parallel can be future).
- Idempotency: re-running the same run request should not duplicate side effects.
- Side effects only happen inside `ExecuteAction` nodes.
- Every node writes evidence into `NodeRun.evidenceJson`.

### Node semantics (what each node actually does)

Trigger:
- Produces an initial `context` object for the run (e.g. importBatch, sku, channel).

Logic:
- Deterministic transforms on context (no external calls).

AIDecision (bounded):
- Produces structured JSON `{ data, confidence, rationale }`.
- Default provider is deterministic stub.

ConfidenceGate:
- If `confidence < threshold`:
  - create `ReviewItem` (status pending)
  - set run state to `needs_review`
  - continue along a `when: needs_review` edge (usually to audit + stop)
- Else continue `when: pass`.

PolicyCheck:
- Loads current `Policy` and evaluates rules against the proposed action.
- If blocked:
  - create `Approval` (status pending) with before/after snapshots
  - set run state to `awaiting_approval`
  - continue along a `when: blocked` edge (usually to audit + stop)
- Else continue `when: pass`.

Approval:
- Represents an explicit "wait" state in the workflow graph.
- MVP behavior: this node does not auto-resume runs; Inbox actions trigger a follow-up execution.

ExecuteAction:
- Applies a deterministic Host mutation (e.g. post ledger entries, create tasks, update unit economics).
- Must include:
  - explicit before/after snapshots
  - evidence payload
  - audit entries

WriteAudit:
- Writes an `AuditLog` entry that summarizes the run or a branch outcome.

### Guardrails (enforced by implementation)
- AIDecision never computes money; money always computed deterministically.
- ConfidenceGate routes uncertain output into `ReviewItem`.
- PolicyCheck blocks rule-breaking actions and creates `Approval`.

### Audit event taxonomy (recommended)

Keep event types small and consistent so the Audit Log filters stay usable:
- `workflow_run_created`
- `workflow_node_completed`
- `workflow_needs_review`
- `workflow_awaiting_approval`
- `workflow_executed`
- `approval_created`
- `approval_approved`
- `approval_rejected`
- `review_item_created`
- `review_item_resolved`

### Determinism and idempotency rules

Determinism rules:
- No `Math.random()` in run engine outputs.
- Stub provider output is derived from stable inputs (e.g. hash of transactionId/sku).
- Dates/timestamps displayed in UI come from DB timestamps, not client-generated.

Idempotency rules:
- `POST /api/workflows/run` should accept a client-generated idempotency key.
- If a run is re-triggered with the same key, return the existing run rather than duplicating side effects.

---

## Finance Slice (CSV Import -> Ledger -> Review)

### Import workflow
1) Upload CSV
2) Parse (PapaParse worker)
3) Column mapping (auto-suggest; Indonesian header support)
4) Preview + validations
5) Commit:
   - write `TransactionRaw`
   - classify into `LedgerEntry` with confidence
   - create `ReviewItem` for low-confidence rows
   - write `AuditLog` entries (import summary + per-row exceptions)

### Duplicate detection
Soft detection only:
- composite hash: `date + amount + normalized_description`
- duplicates flagged in preview; user can choose to skip

### Currency formatting
- `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })`

---

## LLM Plan (Bounded, Stubbed by Default)

For demo stability, default to a deterministic "stub provider".

If/when real providers are added:
- Provider interface returns JSON validated by Zod.
- Required fields include `confidence` as a number `0..1`.
- No direct external calls by the model.

---

## Connector Plan (Shopify as Guest)

MVP: manual sync (pull-based), stubbed by default.

Persistence:
- `ConnectorConfig` stores connector status and config JSON.
- Any sync writes `AuditLog` entries.

---

## Verification Strategy (Minimal Automated)

### Commands
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Build: `npm run build`
- Smoke tests: `npx playwright test`

### Playwright smoke flows (must be stable)
- Flow A: Inbox -> open approval -> approve -> audit shows new entry with evidence chip
- Flow B: Finance -> import CSV -> ledger rows appear -> review queue increases for low-confidence
- Flow C: Workflows -> run -> runs list shows a new run

---

## Execution Plan (Milestones + Task Breakdown)

This is structured to support parallel execution after the foundation.

### Milestone 0: Repo & runtime foundation
Outcome: dev server runs, lint/typecheck/build exist, smoke harness exists.

### Milestone 1: Design system + primitives
Outcome: shell + primitives are consistent and reusable across all pages.

### Milestone 2: Host DB + seed + read APIs
Outcome: all pages can render non-empty deterministic data.

### Milestone 3: Inbox->Audit vertical slice
Outcome: approve/reject writes DB + audit; UI updates without refresh.

### Milestone 4: Finance import vertical slice
Outcome: CSV import writes transactions/ledger/review + audit; UI stable.

### Milestone 5: Workflows vertical slice
Outcome: template->run creates run + node runs; builder looks premium.

### Milestone 6: Secondary modules + demo hardening
Outcome: no dead ends; performance and a11y pass; recordable demo.

---

## Detailed TODOs (Implementation-Ready)

Each task includes acceptance criteria intended to be unambiguous and testable.

### 1) Foundation: project bootstrap + scripts + baseline CI-style checks

What to do:
- Ensure `nadi-workflow/` is the working Next.js App Router TypeScript app.
- Ensure scripts exist and run:
  - `dev`, `lint`, `typecheck`, `build`
- Ensure Playwright is installed and can run.

Acceptance criteria:
- `cd nadi-workflow && npm run dev` serves HTTP 200 on `/`.
- `cd nadi-workflow && npm run lint` exits 0.
- `cd nadi-workflow && npm run typecheck` exits 0.
- `cd nadi-workflow && npx playwright --version` prints a version.

### 2) Utility Forge tokens + typography (global)

What to do:
- Define CSS variables in `nadi-workflow/app/globals.css`.
- Load fonts via `next/font` in `nadi-workflow/app/layout.tsx` and expose as CSS variables.
- Apply defaults:
  - `tabular-nums` for tables
  - reduced-motion handling

Acceptance criteria:
- UI surfaces/background/borders render consistently across all routes.
- A basic Playwright theme smoke test can screenshot `/inbox`.

### 3) App shell + navigation contract

What to do:
- Implement persistent layout in `nadi-workflow/app/(app)/layout.tsx`.
- TopBar contract:
  - product label "BUSINESS ORCHESTRATOR"
  - version selector (demo-only; local state OK)
  - History + Settings icons
  - primary "Run" button
- Sidebar contract (stable order): Dashboard, Inbox, Workflows, Finance, Marketing, Inventory, CS Console, Governance, Audit Log, Settings.

Acceptance criteria:
- Navigation never remounts the entire shell.
- Every route renders a `PageHeader` with a title and a primary action placeholder.

### 4) Shared primitives + URL-driven drawer state

What to do:
- Implement and reuse:
  - `PageHeader`
  - `DetailsDrawer`
  - `StatusChip`
  - `EvidenceChip`/`EvidenceStamp`
  - `EmptyState`
- Drawer requirements:
  - URL query param controls open/close
  - ESC closes
  - focus returns to trigger element

Acceptance criteria:
- A drawer smoke test verifies query param state, Back navigation, ESC close, focus return.

### 5) Prisma + SQLite + deterministic seed data ("Kopi Nadi")

What to do:
- Ensure Prisma schema supports the models listed earlier.
- Seed dataset must ensure every primary page is non-empty:
  - approvals, review items, tasks
  - audit entries
  - finance ledger rows and at least one low-confidence review row
  - at least one unit economics breach
  - at least one workflow template + run history seed

Acceptance criteria:
- `cd nadi-workflow && npx prisma migrate dev` succeeds.
- `cd nadi-workflow && npx prisma db seed` succeeds.
- With dev server running, `GET /api/inbox/approvals` returns `> 0` items.

Suggested verification commands:
```bash
cd nadi-workflow
node -e "fetch('http://localhost:3000/api/inbox/approvals').then(r=>r.json()).then(j=>console.log(j.length))"
node -e "fetch('http://localhost:3000/api/audit').then(r=>r.json()).then(j=>console.log(j.length))"
```

### 6) Read APIs for all pages + Zod response schemas

What to do:
- Implement route handlers under `nadi-workflow/app/api/**/route.ts`.
- Create Zod schemas under `nadi-workflow/lib/api-schemas/`.

Acceptance criteria:
- All read endpoints return stable JSON for seeded dataset.
- No endpoint returns internal Prisma fields that the UI should not depend on.

Suggested verification commands:
```bash
cd nadi-workflow
node -e "fetch('http://localhost:3000/api/dashboard').then(r=>r.json()).then(j=>console.log(Object.keys(j)))"
node -e "fetch('http://localhost:3000/api/finance/ledger').then(r=>r.json()).then(j=>console.log(j.length))"
node -e "fetch('http://localhost:3000/api/workflows/templates').then(r=>r.json()).then(j=>console.log(j.length))"
```

### 7) Inbox UI (Approvals/Review/Tasks)

What to do:
- `/inbox` has three tabs.
- Approvals: show risk chip, confidence, before/after preview, evidence chips, actions.
- Review: editable correction UI with save.
- Tasks: stable list with due dates/status and source links.

Acceptance criteria:
- Inbox renders from APIs via TanStack Query.
- Clicking "View evidence" opens the `DetailsDrawer`.

### 8) Write APIs: approve/reject/save-review + optimistic UI + audit writing

What to do:
- Implement write endpoints:
  - `POST /api/approvals/:id/approve`
  - `POST /api/approvals/:id/reject`
  - `POST /api/review/:id/save`
- Every write creates audit entries with:
  - event type
  - actor (demo identity OK)
  - before/after snapshots
  - evidence payload

Acceptance criteria:
- Approving updates approval status in Inbox without refresh.
- Audit log shows a new entry for the action with evidence chip.

### 9) Audit log UI

What to do:
- Timeline layout with filters.
- Detail drawer shows summary + before/after JSON + cross-links.

Acceptance criteria:
- Newly created actions appear immediately.
- Drawer can deep-link via URL.

### 10) Finance: ledger table + CSV import wizard + explain drawer

What to do:
- Ledger table using TanStack Table.
- CSV import wizard:
  1) upload + parse (worker)
  2) mapping with auto-suggest (support Indonesian headers)
  3) preview + validation + commit
- Row explain drawer.

Acceptance criteria:
- Import produces ledger rows and review items deterministically.
- Audit log includes an "import" summary entry.

### 11) Unit economics + draft price change -> approval

What to do:
- Unit economics table with breach highlight.
- Draft price change modal computes deterministic impact.
- Draft creates `Approval` + `AuditLog`.

Acceptance criteria:
- Draft -> Inbox shows new approval.
- Approve -> unit economics updates and audit records execution.

### 12) Workflows: templates + runs + run detail

What to do:
- `/workflows` contains Templates and Runs.
- Create-from-template and run endpoints persist `WorkflowRun` and `NodeRun` rows.
- Run detail view shows a node timeline.

Acceptance criteria:
- Running a workflow creates run history and node runs.

### 13) Builder canvas (XYFlow) + inspector + run animation

What to do:
- `/workflows/builder` must be route-scoped and dynamically imported.
- Nodes render with Utility Forge styling.
- Inspector panel shows config + JSON view toggle.

Acceptance criteria:
- Triggering a run animates nodes and persists a run.

### 14) Secondary modules (Marketing, Inventory, CS Console, Governance, Settings)

What to do:
- Marketing: deterministic content packs; export artifact.
- Inventory: low-stock highlight; create restock tasks.
- CS Console: read-only with visibly locked controls.
- Governance: policy editor creates a new version + audit.
- Settings: integration cards + test connection actions.

Acceptance criteria:
- No dead ends; each page has either seeded content or intentional empty state.

### 15) Demo hardening (performance, a11y, determinism)

What to do:
- Density toggle across tables.
- Loading skeletons + empty states.
- Performance: builder deps not included on non-builder routes.
- Accessibility: keyboard navigation + visible focus; reduced motion.
- Demo Mode toggle; optional "reset demo data" action (can be dev-only).

Acceptance criteria:
- `cd nadi-workflow && npm run lint` passes.
- `cd nadi-workflow && npm run typecheck` passes.
- `cd nadi-workflow && npm run build` succeeds.
- `cd nadi-workflow && npx playwright test` passes.

---

## Demo Script (2-minute recording)

Flow A (Inbox -> Audit):
1) Open Inbox
2) Open a pending approval (drawer)
3) Approve
4) Open Audit Log and show the new entry + evidence chip

Flow B (Finance import):
1) Open Finance
2) Import sample CSV
3) Show preview warnings / low-confidence routing
4) Show ledger rows
5) Show Review tab count increased

Flow C (Workflows):
1) Open Builder
2) Run
3) Open Runs and show new run
4) Open Run detail timeline

---

## Risks and Mitigations

- UI drift across pages: enforce primitives (`PageHeader`, `DetailsDrawer`, `DataTable`) before feature work.
- Bundle/perf regressions: builder route must be dynamic import; validate build output if needed.
- Non-deterministic demo: keep seed + stub providers stable; avoid `Math.random()` in UI.
- Audit gaps: centralize audit write helper; require audit writes in every mutation acceptance criteria.
- CSV edge cases: validate early; show clear preview errors; keep mapping UI forgiving but strict at commit.

---

## Final verification commands

```bash
cd nadi-workflow
npm run dev
npm run lint
npm run typecheck
npm run build
npx playwright test
```
