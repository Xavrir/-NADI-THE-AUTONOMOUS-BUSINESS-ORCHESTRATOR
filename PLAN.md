# NADI Workflow: Industrial Gen Z Frontend + Demoable Ops App

## TL;DR

> **Quick Summary**: Build a demoable Next.js ops web app (not a chatbot) with an industrial “Utility Forge” design system, inbox-driven workflows, auditability, and deterministic seeded data for an Indonesian UMKM/MSME scenario.
>
> **Deliverables**:
> - Next.js App Router app with persistent shell (TopBar + Sidebar) and routes
> - Design system (tokens, typography, density, status semantics) + recognizable “Evidence ID / Gate” motifs
> - Prisma + SQLite schema + seed data for “Kopi Nadi”
> - Inbox, Audit Log, Finance (CSV import + ledger + unit economics), Workflows (templates/runs/builder), Inventory, Marketing, Governance, Settings
> - Minimal automated verification: Typecheck + ESLint + Playwright smoke tests for core demo flows
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES (2 waves after foundation)
> **Critical Path**: Foundation (tokens + primitives) → DB seed + API reads → Inbox→Audit vertical slice → Finance import slice

---

## Context

### Original Request
- “Check/improve the frontend design” to match **industrial** + **Gen Z graphic-designer** typography/colors, make it recognizable, and easy for **UMKM/MSME**.
- New project from scratch; user provided a step-by-step build plan (Prompts 0–14) for NADI Workflow.

### Key Decisions (confirmed)
- Product is a **workflow automation UI**, not a chatbot; **no chat UI** anywhere.
- UI language **English**.
- Design direction: **Utility Forge** (industrial + warm orange + mono evidence IDs).
- Verification: **Minimal automated** (typecheck + lint + Playwright smoke tests).

### Defaults Applied (override if needed)
- **Database**: SQLite day-one (fastest, deterministic demo); Prisma schema designed for later Postgres.
- **Auth**: out of scope for MVP demo (single demo user). Approvals are “operator actions” without real identity.
- **Finance model**: keep a simplified ledger/import model for the demo (no full SAK EMKM journal engine). Use SAK EMKM-inspired categories/labels where helpful, but do not build accounting product complexity.

### Metis Review Guardrails (applied)
- Prevent “UI drift”: define tokens + interaction primitives before building feature pages.
- Prevent bundle creep: keep global layout server-first; dynamically import heavy routes (Builder/React Flow).
- Prevent accessibility regressions: keyboard-first drawers; no color-only status; reduced-motion support.

---

## Work Objectives

### Core Objective
Deliver a clickable, professional ops product demo that feels industrial and Gen Z designer-led, while remaining highly readable for dense tables and workflow review.

### Definition of Done
- `npm run dev` boots and you can navigate all routes without runtime errors.
- Core demo flows work end-to-end and are validated by Playwright smoke tests.
- Dark theme is readable (contrast) and consistent (tokens + primitives).

### Must Have
- Inbox-driven operations (Approvals/Review/Tasks) with a consistent details drawer.
- Audit log with evidence IDs and cross-links.
- Finance CSV import (wizard), ledger table, unit economics table, and “draft price change” → Approval.

### Must NOT Have (guardrails)
- No chat UI, chat prompt box, or conversational layout.
- No random/dynamic generation that changes on every refresh (demo must be deterministic).
- No one-off UI patterns per page (reuse primitives).

---

## Frontend Design System (Utility Forge)

### Visual Language
- **Industrial feel** comes from:
  - crisp 1px/2px borders and grid rhythm
  - label system with mono microcopy (evidence IDs, run IDs)
  - high-visibility accent used sparingly (orange for primary actions; yellow for warnings)
- **Gen Z graphic-designer cues** (without hurting ops usability):
  - characterful headline font; neutral, highly readable UI font
  - one signature “stamp” component (Evidence ID) used consistently
  - micro-grain overlay at very low opacity (optional; respect reduced motion/contrast)

### Tokens (starting palette, provided)
Use these as the base and derive semantic tokens (status, focus, selection):
- Background `#0F0A07`
- Surface `#16120F`
- Card `#20160F`
- Border `#2A1C12`
- Primary `#F9802C` (CTA)
- Hover `#EF7B2A`
- Muted accent `#81461C`
- Text primary `#F5F3F2`
- Text secondary `#C4C2C0`
- Text muted `#92948D`

Add a **secondary signal** color used sparingly:
- Caution Yellow `#FFD000` (review gates, warnings, “needs attention”)

### Typography (recommended)
- Headings/brand: **Bricolage Grotesque** (600–800)
- UI/body: **IBM Plex Sans** (400/500/600)
- Evidence IDs / microcopy: **IBM Plex Mono** (400/500)

Typography rules:
- Default to `font-variant-numeric: tabular-nums;` in tables and finance views.
- “Dense mode” = `text-xs` table rows with fixed heights and consistent padding.

### Interaction Primitives (mandatory)
Define and reuse across modules:
1) `PageHeader` (title, subtitle, primary action slot, filters slot)
2) `DataTable` with density variants (comfortable/dense) and consistent row actions
3) `DetailsDrawer` (Right drawer) with URL state (query param), ESC close, focus return
4) `StatusChip` (risk/severity) + icon + label (never color-only)
5) `EvidenceChip` (copyable evidence ID) + `EvidenceStamp` (distinct brand motif)

---

## Verification Strategy (Minimal Automated)

### Automated checks
- Lint: `npm run lint` (ensure script exists)
- Typecheck: `npm run typecheck` (ensure script exists; recommended: `tsc --noEmit`)
- Build: `npm run build`
- Playwright smoke: `npx playwright test`

### Playwright smoke scenarios (must be stable)
- **Flow A**: Inbox → open approval → Approve → Audit Log shows new entry with evidence chip
- **Flow B**: Finance → open CSV import wizard → import sample CSV → ledger rows appear → review queue increases for low-confidence
- **Flow C**: Workflows → Builder → Run animation triggers → Runs list shows a new run

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Foundation)
- Project bootstrap + deps
- Design tokens + typography + primitives
- Prisma schema + seed data skeleton

Wave 2 (Feature slices, parallel where safe)
- Inbox + Audit vertical slice
- Finance CSV import wizard + ledger + unit economics
- Workflows templates/runs + Builder route skeleton (React Flow route-scoped)

Wave 3 (Secondary modules + polish)
- Marketing, Inventory, CS Console, Governance, Settings
- Demo hardening + performance + accessibility pass

---

## TODOs

> Each task includes agent-executable acceptance criteria.

- [ ] 1. Bootstrap Next.js App Router project + dependencies

  **What to do**:
  - Create `nadi-workflow/` Next.js App Router + TypeScript app
  - Add Tailwind CSS
  - Install shadcn/ui
  - Add deps: TanStack Query/Table, Prisma, Zod, Papaparse, date-fns, lucide-react, @xyflow/react (React Flow)
  - Add Playwright for smoke tests

  **Acceptance Criteria**:
  - `cd nadi-workflow && npm run dev` starts without errors and serves HTTP 200 on `/`
  - `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/` prints `200`
  - `npm run lint` exists (can be stubbed initially but must run)
  - `npm run typecheck` exists (must run `tsc --noEmit`)
  - `npx playwright --version` prints a version

- [ ] 2. Implement Utility Forge design tokens + fonts (global)

  **What to do**:
  - Define CSS variables in `nadi-workflow/app/globals.css` (background/surface/card/border/primary/text + semantic status tokens)
  - Load fonts via `next/font` in `nadi-workflow/app/layout.tsx` and expose as CSS variables
  - Set base typography + `tabular-nums` defaults for tables
  - Set reduced motion defaults for animated UI affordances
  - Scaffold Playwright smoke test harness:
    - `nadi-workflow/playwright.config.*` baseURL `http://localhost:3000`
    - `nadi-workflow/tests/smoke/` folder
    - First test: `nadi-workflow/tests/smoke/theme.spec.ts` visits `/inbox` and screenshots the shell

  **Acceptance Criteria**:
  - `npx playwright test tests/smoke/theme.spec.ts` passes
  - Playwright captures screenshot artifact: `.sisyphus/evidence/theme-home.png`

- [ ] 3. Build app shell: TopBar + Sidebar + route placeholders

  **What to do**:
  - Implement persistent layout under `nadi-workflow/app/(app)/layout.tsx`
  - TopBar: logo + “BUSINESS ORCHESTRATOR”, version selector, History icon, Settings icon, primary “Run” button, avatar
  - Sidebar routes: Dashboard, Inbox, Workflows, Finance, Marketing, Inventory, CS Console (Read only), Governance, Audit Log, Settings
  - Ensure active item state uses orange accent; inactive is muted

  **Acceptance Criteria**:
  - Clicking each sidebar item navigates to a page with a `PageHeader`
  - Layout remains stable across navigation; no content jump

- [ ] 4. Implement shared primitives (PageHeader, DetailsDrawer, StatusChip, EvidenceChip)

  **What to do**:
  - Create reusable components in `nadi-workflow/components/` (shell/common)
  - Drawer uses shadcn Sheet; supports URL-state via query param (e.g. `?drawer=approval&id=...`)
  - EvidenceChip supports copy-to-clipboard and consistent format (e.g. `EVD-2026-000123`)
  - Add smoke test: `nadi-workflow/tests/smoke/drawer-url-state.spec.ts`

  **Acceptance Criteria**:
  - `npx playwright test tests/smoke/drawer-url-state.spec.ts` passes
  - Test asserts: URL includes drawer query param; Back navigates; ESC closes drawer; focus returns to trigger

- [ ] 5. Prisma schema + SQLite setup + seed data for “Kopi Nadi”

  **What to do**:
  - Implement Prisma + SQLite in `nadi-workflow/prisma/schema.prisma`
  - Add seed script `nadi-workflow/prisma/seed.ts`
  - Seed:
    - Products: Kopi Susu 250ml, Gula Aren 1L
    - Inventory: low stock for Gula Aren 1L
    - Unit economics: Kopi Susu 250ml below margin threshold
    - Policy v1: confidence 0.90, min margin 0.20, max discount 0.15, high value 2,000,000
    - 3 approvals, 3 review items, multiple audit entries
  - Use integer storage for IDR amounts (no decimals)

  **Acceptance Criteria**:
  - `npx prisma migrate dev` succeeds
  - `npx prisma db seed` succeeds (ensure seed command is configured in `package.json`)
  - With dev server running:
    - `node -e "fetch('http://localhost:3000/api/inbox/approvals').then(r=>r.json()).then(j=>console.log(j.length))"` prints a number `> 0`

  **Decision Note**:
  - Keep current simplified ledger model unless the user explicitly wants full SAK EMKM journal/accounts.

- [ ] 6. Build read APIs (route handlers) for core pages

  **What to do**:
  - Create Next.js route handlers under `nadi-workflow/app/api/**/route.ts`
  - Endpoints:
    - `GET /api/dashboard`
    - `GET /api/inbox/approvals`
    - `GET /api/inbox/review`
    - `GET /api/inbox/tasks`
    - `GET /api/audit`
    - `GET /api/finance/ledger`
    - `GET /api/finance/unit-economics`
    - `GET /api/workflows/templates`
    - `GET /api/workflows/runs`
  - Define Zod schemas for responses in `nadi-workflow/lib/api-schemas/`

  **Acceptance Criteria**:
  - With dev server running:
    - `node -e "fetch('http://localhost:3000/api/inbox/approvals').then(r=>r.json()).then(j=>console.log(j.length))"` prints a number `> 0`
    - `node -e "fetch('http://localhost:3000/api/audit').then(r=>r.json()).then(j=>console.log(j.length))"` prints a number `> 0`

- [ ] 7. Inbox UI (Approvals/Review/Tasks) using shared primitives

  **What to do**:
  - Build `/inbox` with tabs
  - Approvals: cards or table rows with risk chip, confidence, before/after preview, evidence chips, actions
  - Review: rows for low confidence classification + editable dropdown
  - Tasks: list with due date/status/source
  - TanStack Query reads from APIs

  **Acceptance Criteria**:
  - Inbox renders seeded approvals and review items
  - Clicking “View evidence” opens the DetailsDrawer and shows evidence chips

- [ ] 8. Write APIs + optimistic UI for approvals/review actions (and audit writing)

  **What to do**:
  - Endpoints:
    - `POST /api/approvals/:id/approve`
    - `POST /api/approvals/:id/reject`
    - `POST /api/review/:id/save`
  - Each write must also create an AuditLog entry with before/after snapshots + evidence
  - TanStack Query mutations update UI without refresh
  - Add smoke test: `nadi-workflow/tests/smoke/inbox-approve-audit.spec.ts`

  **Acceptance Criteria**:
  - `npx playwright test tests/smoke/inbox-approve-audit.spec.ts` passes
  - Test asserts: approving changes status; audit page shows new entry; evidence chip visible

- [ ] 9. Audit Log UI: timeline + filters + drawer

  **What to do**:
  - Build `/audit-log` timeline layout
  - Clicking entry opens DetailsDrawer with before/after JSON and cross-links

  **Acceptance Criteria**:
  - Audit page shows seeded entries + newly created entries

- [ ] 10. Finance: Ledger table + CSV import wizard + explain drawer

  **What to do**:
  - Build `/finance/ledger` (or `/finance`) with TanStack Table
  - CSV import as 3-step wizard:
    1) Upload + parse via PapaParse **worker: true**
    2) Column mapping with auto-suggest (supports Indonesian headers like `Tanggal`, `Keterangan`, `Jumlah`)
    3) Preview + row-level validation + commit
  - Soft duplicate detection (composite hash: date+amount+description)
  - Currency formatting: `id-ID`, `IDR`, 0 decimals
  - Explain drawer per row
  - Add smoke test: `nadi-workflow/tests/smoke/finance-import-ledger.spec.ts`

  **Acceptance Criteria**:
  - `npx playwright test tests/smoke/finance-import-ledger.spec.ts` passes
  - Evidence captured: `.sisyphus/evidence/finance-import-preview.png`

- [ ] 11. Finance: Unit economics + “Draft price change” → Approval

  **What to do**:
  - Build `/finance/unit-economics` table
  - Highlight Kopi Susu 250ml below threshold
  - Draft price change modal computes impact deterministically
  - Endpoint `POST /api/finance/draft-price-change` creates Approval + AuditLog

  **Acceptance Criteria**:
  - Draft price change → approval appears in Inbox and Audit Log shows `approval_created`

- [ ] 12. Workflows: Templates + Runs + Run detail

  **What to do**:
  - `/workflows` with tabs Templates and Runs
  - Create-from-template endpoint + run endpoint
  - Runs list + run detail view (node timeline)

  **Acceptance Criteria**:
  - Create and run a workflow → run appears in Runs list

- [ ] 13. Workflow Builder (React Flow/XYFlow) + inspector + run animation

  **What to do**:
  - `/workflows/builder` route-scoped and dynamically imported
  - Nodes: Trigger, Logic, Action, Confidence Gate, Policy Check, Owner Approval, Execute Action, Write Audit
  - Inspector panel uses shared tokens and typography
  - “Run” triggers UI node state animation and persists WorkflowRun + NodeRuns
  - Add smoke test: `nadi-workflow/tests/smoke/builder-run-creates-run.spec.ts`

  **Acceptance Criteria**:
  - `npx playwright test tests/smoke/builder-run-creates-run.spec.ts` passes
  - Test asserts: new run appears in Runs list after run

- [ ] 14. Secondary modules: Marketing, Inventory, CS Console, Governance, Settings

  **What to do**:
  - Marketing calendar + content pack drawer (deterministic stub content)
  - Inventory table + low-stock highlight + restock task creation
  - CS Console read-only: visibly locked controls
  - Governance policy editor versioning + audit
  - Settings integrations cards + test connection (demo)

  **Acceptance Criteria**:
  - Each route has seeded content + intentional empty states (no dead ends)

- [ ] 15. Polish + demo hardening + smoke test suite

  **What to do**:
  - Density toggle (comfortable/dense) across tables
  - Loading skeletons + empty states
  - Performance pass: ensure Builder heavy deps not in global bundle
  - Accessibility pass: keyboard navigation + visible focus + reduced-motion
  - Add “Demo Mode” toggle + optional “Reset demo data” action
  - Implement Playwright tests for 3 core flows

  **Acceptance Criteria**:
  - `npm run lint` + `npm run typecheck` succeed
  - `npx playwright test` passes (core smoke flows)

---

## Success Criteria

### Final verification commands
```bash
cd nadi-workflow
npm run dev
npm run lint
npm run typecheck
npm run build
npx playwright test
```

### Final checklist
- [ ] No chat UI exists
- [ ] UI tokens consistent across modules
- [ ] Inbox→Approve→Audit flow works (and is tested)
- [ ] Finance CSV import works with preview and errors
- [ ] Builder does not slow other routes
