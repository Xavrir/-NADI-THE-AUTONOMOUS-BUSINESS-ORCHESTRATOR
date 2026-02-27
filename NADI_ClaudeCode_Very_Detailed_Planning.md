# NADI: The Autonomous Business Orchestrator
## Very detailed planning for Claude Code (Website + API + Demo connector)

This document is a build plan you can paste into Claude Code in small chunks to generate a production-looking hackathon MVP of **NADI**, a workflow automation product for MSMEs.  
The product is **not a chatbot**. The UI is a **workflow engine** with pipelines, approvals, review queues, and auditability.

The end result should be demo-stable, visually premium, and fully consistent with the Host first approach:
- **NADI Host** is the system of record
- **Shopify** is a **Guest connector** used for demo ingestion
- **AI** is only used inside bounded decision nodes and never directly calls Shopify

---

## 0. Core constraints and non negotiables

### Product positioning
- NADI is a business workflow orchestrator for MSMEs
- The main interaction is **Approve, Reject, Fix Review, Run Workflow**
- Avoid any UI that resembles a chat room

### Technical guardrails
- Numbers for finance and margin are computed deterministically from the Host DB
- LLM output must be structured JSON and validated by schema
- Confidence gate and policy checks are mandatory for any AI decision that changes state
- High risk actions require one click approval
- Every run and action writes to audit log with evidence IDs

### UI constraints
- English is the main language across the app
- Dark premium UI with warm orange accents, consistent on every page
- Minimal icons, no emoji heavy UI
- Avoid decorative noise that looks like AI generated UI

### Demo constraints
- Must be stable for a 2 minute recording
- Must not depend on an external marketplace being online
- All core flows must work with seeded data and offline simulation

---

## 1. MVP scope for hackathon

### Must ship
1) App shell and navigation
2) Dashboard with KPIs and suggested actions
3) Inbox with three tabs
   - Approvals
   - Review queue
   - Tasks
4) Workflows
   - Templates
   - Runs (run history and node timeline)
   - Builder canvas (React Flow style) with Node Inspector
5) Finance
   - Ledger table
   - CSV import that creates ledger entries and review items
   - Review correction updates ledger
6) Unit economics
   - Margin table by SKU and channel
   - Draft price change creates an approval
7) Audit log
   - Timeline, filters, detail drawer
8) Governance
   - Policy editor
   - Approval rules mapping
   - Roles and access matrix
9) Settings
   - Connector cards for Shopify, WhatsApp, CSV importer
   - Test connection UI actions
10) Seeded dataset so every page looks alive

### Nice to have
- Marketing weekly factory page with content pack drawer and export CSV
- Inventory page with restock tasks and low stock highlight
- CS console read only page with escalation to tasks
- Shopify manual sync button for orders and products (pull based)

---

## 2. Target pages and feature specification

### Global layout
- Persistent Top Bar
  - Left: NADI Workflow logo + label “BUSINESS ORCHESTRATOR”
  - Center: Version selector like “v1.2 - Yesterday”
  - Right: History icon, Settings icon, primary Run button, avatar
- Persistent left Sidebar in this order
  1. Dashboard
  2. Inbox
  3. Workflows
  4. Finance
  5. Marketing
  6. Inventory
  7. CS Console (Read only)
  8. Governance
  9. Audit Log
  10. Settings
- Right side patterns
  - Builder uses a right inspector panel
  - Operational pages use a right drawer for details

### Page: Dashboard
Purpose: daily brief for the Owner
Sections:
- KPI cards: Cash today, Revenue this week, Margin health, Pending approvals
- Top risks list: fee spike, review backlog, low stock, margin breach
- Suggested actions: buttons to run Finance Close, Generate weekly content, Review approvals
Rules:
- All numbers computed from Host DB summaries
- When no items, show calm empty states with clear CTA

### Page: Inbox
Tabs:
- Approvals: action cards waiting decision
- Review: low confidence items needing correction
- Tasks: operational follow ups

Approvals card content:
- Title, risk chip, confidence
- Before and After preview
- Evidence chips: tx_id, order_id, sku_id
- Buttons: Approve, Reject, Edit
- “View evidence” opens right drawer with decision trace

Review items:
- Suggested category and confidence
- Dropdown to fix category
- Save writes audit entry and updates ledger if linked

Tasks:
- Task list with due date, status, and source link

### Page: Workflows
Tabs:
- Templates: cards for Finance Close, Margin Sentinel, Marketing Weekly, CS Assist
- Builder: node canvas with inspector panel
- Runs: run history and timeline view

Builder requirements:
- Node types: Trigger, Logic, AI, Confidence Gate, Policy Check, Approval, Execute, Audit
- Inspector shows success rate and average processing time, input fields, output preview, view JSON toggle
- Run button animates nodes and creates a run record with node runs

### Page: Finance Ledger
- Ledger table columns: Date, Description, Debit, Credit, Category, Confidence, Evidence, Status
- Inline actions: Accept, Change category, Send to review
- Row click opens explain drawer with evidence and reason summary
- CSV import creates TransactionRaw, LedgerEntry, and ReviewItem based on confidence threshold

### Page: Finance Unit Economics
- Table shows SKU, Price, COGS, Fee percent, Net margin percent, status chip
- Draft price change modal shows before price, after price, expected margin impact
- Create approval writes Approval and AuditLog entry
- Approved change updates Host DB and writes audit

### Page: Audit Log
- Timeline with filters: workflow, user, risk, date, channel
- Each entry shows event type, timestamp, summary, evidence chips
- Click opens drawer with before and after snapshots and links to run and approval

### Page: Governance
- Policy editor
  - Confidence threshold
  - Minimum margin percent
  - Maximum discount percent
  - High value transaction threshold
- Approval rules mapping: action type to approver role
- Roles matrix: Owner, Finance, Marketing, CS read only
- Saving creates new policy version and audit entry

### Page: Settings
- Integration cards
  - Shopify connector status
  - Bank CSV importer status
  - WhatsApp sender status
  - Social scheduler status
- Test connection buttons create audit entries
- Host database health indicator

---

## 3. Pipeline set for the product

### Global run states
- Queued
- Running
- Needs Review
- Awaiting Approval
- Executed
- Failed
- Logged

### Guardrails used across pipelines
- AI output must be valid JSON and schema validated
- Confidence gate routes uncertain items to Review
- Policy check blocks actions that violate business rules
- High risk actions require approval
- Audit log is written at each key decision and execution step

### Pipeline P0: Inbox Actions and Approvals
Trigger: action draft created by other pipelines  
Outputs:
- Approval card
- Audit entries for created, approved, rejected, executed
Behavior:
- High risk always waits for approval
- Execution writes before and after snapshots

### Pipeline P1: Finance Close
Trigger: CSV import or scheduled run  
Steps:
- Ingestion and normalization
- Deduplication
- AI classification node returns category and confidence
- Confidence gate routes to Review
- Ledger post for high confidence
- Deterministic cash summary
- Flags and tasks
- Audit entries for import summary, postings, review items

### Pipeline P2: Margin and Fee Sentinel
Trigger: scheduled run or manual run  
Steps:
- Fetch economics from Host DB
- Deterministic net margin compute per SKU per channel
- Policy evaluation for min margin and max discount
- Draft action, usually price change or stop promo
- Create approval with before and after snapshots
- Execute on approval and write audit

### Pipeline P3: Marketing Weekly Factory
Trigger: weekly schedule or overstock event  
Steps:
- Fetch signals from Host DB
- AI produces weekly plan JSON and content packs JSON
- Policy check blocks unsafe promotions
- Approval required to publish
- Export schedule CSV artifact and write audit

### Pipeline P4: New Order Ops
Trigger: Shopify order webhook or manual sync  
Steps:
- Normalize order payload to Host schema
- Check stock from Host inventory
- Decide action, rules first then AI optional
- Send WhatsApp confirmation or create hold approval
- Write audit and create tasks if needed

### Pipeline P5: Inventory Restock
Trigger: daily schedule or low stock event  
Steps:
- Detect low stock based on reorder points
- Create restock task
- Write audit entry

### Pipeline P6: CS Assist Read Only
Trigger: ticket created  
Steps:
- Fetch order and inventory context
- AI drafts reply text
- Sensitive cases route to escalation task
- Audit entry

### Pipeline P7: Audit Writer
Always called by other pipelines  
Stores:
- event type
- actor
- timestamps
- before and after snapshots
- evidence IDs
- links to run and approval

---

## 4. Tech stack plan for hackathon MVP

### Frontend
- Next.js App Router with TypeScript
- Tailwind CSS with custom tokens
- shadcn ui components
- TanStack Query for data fetching and cache
- TanStack Table for Finance and Unit economics tables
- React Flow for workflow builder canvas
- Zod for schema validation in UI and API boundaries
- Papaparse for CSV import parsing
- date-fns for date formatting
- lucide-react for icons

### Backend inside Next.js
- Next.js route handlers for API endpoints
- Prisma ORM
- SQLite for demo and local dev
- Postgres as the future production DB

### Observability for MVP
- Structured logs to console
- Run history table and node run logs in DB
- Audit log UI is the primary observability surface for hackathon

### Deployment
- Local dev: SQLite
- Demo deploy: Vercel or Render for Next.js
- If webhooks needed: use a public HTTPS tunnel like ngrok

---

## 5. LLM plan

### LLM is a bounded component
LLM is only used in AI decision nodes for:
- Transaction classification
- Marketing content drafting
- Optional decision explanations

LLM is not allowed to:
- compute totals, margin, cash, or any monetary numbers
- call Shopify or external services
- bypass policy checks or approvals

### Provider abstraction
Implement an interface:
- `generateJSON(schema, prompt, context) -> { data, confidence, raw }`

Providers:
1) Stub provider for deterministic demo outputs
2) Ollama provider for local open models
3) Optional hosted provider later

### Open model recommendation for local use
Use one of these via Ollama:
- Qwen2.5 Instruct (good structured outputs)
- Llama 3.1 Instruct
- Mistral Instruct

For hackathon stability, keep Stub provider enabled by default and allow a Settings toggle to switch provider.

### JSON schemas you must enforce
1) Finance classification output schema
- category
- confidence
- rationale

2) Marketing weekly plan schema
- week theme
- hero SKUs
- channel mix
- daily posts list

3) Content pack schema
- IG caption, hashtags, CTA variants
- TikTok hook, script, shot list, on screen text
- X thread list

### Prompt rules
- Always request JSON only
- Provide a strict schema in the prompt
- Include examples
- Require a numeric confidence between 0 and 1

---

## 6. Shopify connector plan

### What to build for demo
Use pull based integration first to avoid public URL dependency:
- Store domain
- Admin API access token
- Manual sync button in Settings or Workflows

Later add webhooks:
- Public URL required
- Verify webhook signature
- Idempotency key based on webhook id

### Adapter interface
Create a connector module:
- `shopify.pullOrders(since)`
- `shopify.pullProducts()`
- `shopify.pullInventoryLevels()`
- `shopify.verifyWebhook(headers, rawBody)`
- `shopify.normalizeOrder(payload) -> HostOrder`

Store in DB:
- shop domain
- token encrypted in a simple way for demo
- last sync timestamp

### Host mapping for Shopify
- Shopify `order_id` becomes evidence and external reference
- Shopify `variant_id` maps to Host `sku`
- Always store both Host SKU and Shopify variant id for traceability

---

## 7. Data model for MVP (Prisma)

You will implement these models:
- Product: sku, name, cogs, reorderPoint
- Inventory: sku, available, updatedAt
- TransactionRaw: date, description, debit, credit, reference
- LedgerEntry: category, confidence, evidenceId, status
- UnitEconomicsSnapshot: sku, channel, price, feePct, netMarginPct
- Policy: versioned thresholds
- Approval: actionType, target, riskLevel, status, confidence, beforeJson, afterJson, evidenceJson
- ReviewItem: suggestedJson, confidence, userFixJson
- Task: title, status, dueDate, sourceJson
- WorkflowTemplate: name, version, configJson
- WorkflowRun: triggerType, status, summaryJson
- NodeRun: nodeId, status, inputJson, outputJson, evidenceJson
- AuditLog: eventType, actor, beforeJson, afterJson, evidenceJson, policyJson

Seed a workspace named “Kopi Nadi” with realistic data and a few approvals, review items, tasks, and audit entries.

---

## 8. API specification (Next.js route handlers)

### Dashboard
- GET `/api/dashboard`
  - KPIs
  - top risks
  - suggested actions

### Inbox
- GET `/api/inbox/approvals`
- GET `/api/inbox/review`
- GET `/api/inbox/tasks`
- POST `/api/approvals/{id}/approve`
- POST `/api/approvals/{id}/reject`
- POST `/api/review/{id}/save`

### Audit
- GET `/api/audit`
- GET `/api/audit/{id}`

### Finance
- GET `/api/finance/ledger`
- POST `/api/finance/import-csv`
- GET `/api/finance/unit-economics`
- POST `/api/finance/draft-price-change`

### Workflows
- GET `/api/workflows/templates`
- POST `/api/workflows/create-from-template`
- POST `/api/workflows/run`
- GET `/api/workflows/runs`
- GET `/api/workflows/runs/{id}`

### Governance and settings
- GET `/api/policies/current`
- POST `/api/policies/update`
- GET `/api/settings/integrations`
- POST `/api/settings/test-connection`
- POST `/api/integrations/shopify/sync` (manual pull)

All write endpoints must create audit log entries.

---

## 9. Frontend components and patterns

### Shared components
- `AppShell`: layout wrapper
- `TopBar`: version selector, Run button, profile
- `Sidebar`: nav items with active highlight
- `RightDrawer`: sheet for details across Inbox and Audit
- `StatusChip` and `RiskChip`
- `EvidenceChips`
- `EmptyState` components

### Inbox
- `ApprovalCard`
- `ApprovalDetailDrawer`
- `ReviewTable`
- `TaskList`

### Finance
- `LedgerTable` with inline edit controls
- `CsvImportDialog`
- `ExplainDrawer`

### Workflows
- `TemplateCards`
- `RunHistoryTable`
- `RunDetailTimeline`
- `WorkflowCanvas` using React Flow
- `NodeInspectorPanel`

### Governance
- `PolicyForm`
- `ApprovalRulesTable`
- `RoleMatrix`

---

## 10. Visual system and theme tokens

### Base colors (dark premium)
Use these hex values:
- Background: `#0F0A07`
- Surface: `#16120F`
- Card: `#20160F`
- Border: `#2A1C12`
- Primary: `#F9802C`
- Hover: `#EF7B2A`
- Muted accent: `#81461C`
- Text primary: `#F5F3F2`
- Text secondary: `#C4C2C0`
- Text muted: `#92948D`

### Typography
- Use a modern sans like Inter if available
- Headings: bold, compact
- Body: readable, 14 to 16 px in UI
- Tables: 12 to 13 px with enough padding

### UI rules to avoid “sloppy AI UI”
- Keep spacing consistent, use an 8px grid
- Use fewer gradients and more solid surfaces
- Avoid too many shadows, use subtle border and elevation
- Make empty states look intentional
- Always show a clear primary action on each page

---

## 11. Claude Code build plan (step by step)

Use these steps in order. After each step, run the app and confirm the acceptance checklist.

### Step 1: Bootstrap repo and dependencies
Goal: working Next.js app with theme tokens
Acceptance:
- App runs
- theme is applied
- layout shell exists

Prompt for Claude Code:
- Initialize Next.js App Router TypeScript project
- Add Tailwind and shadcn ui
- Add React Flow, TanStack Query, TanStack Table, Prisma, Zod, Papaparse, date-fns, lucide-react
- Implement theme tokens and a sample page

### Step 2: App shell and routing
Goal: navigation and placeholder pages
Acceptance:
- Sidebar and top bar persistent
- All routes render

Prompt:
- Build TopBar and Sidebar components
- Create routes for all target pages with correct titles
- English UI labels

### Step 3: Prisma schema and seed
Goal: real data so UI is not empty
Acceptance:
- migrations run
- seed script populates “Kopi Nadi” data
- API can read DB

Prompt:
- Create Prisma schema with the tables listed in Section 7
- Add seed script generating products, inventory, economics, approvals, review items, tasks, audit log entries
- Provide commands for migrate and seed

### Step 4: Read APIs
Goal: UI can render with real data
Acceptance:
- GET endpoints return stable JSON
- No runtime errors

Prompt:
- Build route handlers for dashboard, inbox, finance, workflows, audit, policies
- Validate responses with Zod

### Step 5: Inbox UI + write actions + audit
Goal: core product loop works
Acceptance:
- Approve and reject change DB and UI
- Audit log updates

Prompt:
- Build Inbox tabs
- Add approve, reject, save review endpoints
- Add optimistic updates and drawers

### Step 6: Audit log page
Goal: traceability visible
Acceptance:
- timeline filters work
- detail drawer shows before and after snapshots

Prompt:
- Build Audit Log page and detail drawer
- Link entries to approvals and runs

### Step 7: Finance ledger + CSV import
Goal: show Finance Close pipeline effect
Acceptance:
- CSV import creates transactions and ledger entries
- low confidence routes to review
- audit entry created

Prompt:
- Build Finance Ledger page with CSV upload
- Create import endpoint that parses CSV and creates review items by confidence threshold
- Explain drawer shows evidence details

### Step 8: Unit economics + draft price change approval
Goal: show Margin Sentinel pipeline effect
Acceptance:
- Price change draft creates approval
- Approve updates economics and audit

Prompt:
- Build Unit economics table and modal
- Draft price change endpoint creates approval
- Approve endpoint applies change deterministically and writes audit

### Step 9: Workflows templates + runs
Goal: workflow engine story becomes real
Acceptance:
- templates exist and can create workflows
- run creates run history and node runs

Prompt:
- Build Workflows section with Templates and Runs
- Implement run endpoint that writes WorkflowRun and NodeRuns
- Run detail view shows node timeline

### Step 10: Workflow builder canvas with inspector
Goal: visual differentiator
Acceptance:
- canvas looks premium
- inspector updates
- run animation stable

Prompt:
- Build React Flow canvas with node components and edges
- Node inspector panel with metrics and JSON view toggle
- Run button triggers animation and creates run record

### Step 11: Governance and Settings
Goal: product completeness
Acceptance:
- policy update writes new version and audit
- integrations show statuses

Prompt:
- Build Governance page with policy editor and role matrix
- Build Settings page with connector cards and test connection actions

### Step 12: Optional pages
Goal: expand story
Acceptance:
- marketing and inventory pages exist with meaningful UI
- CS console read only clear

Prompt:
- Build Marketing weekly calendar and content pack drawer with stub content generation
- Build Inventory low stock and restock tasks
- Build CS Console read only view with escalation tasks

### Step 13: Demo mode and hardening
Goal: stable 2 minute recording
Acceptance:
- seeded data stable
- no random outputs
- guided demo flow from Dashboard works

Prompt:
- Add Demo Mode toggle
- Add loading skeletons and empty states
- Add a guided demo flow with links and CTA buttons

---

## 12. Demo flows you should support in the product

### Flow A: Finance Close
- Upload CSV
- See transactions classified
- Low confidence appears in Review tab
- Fix category
- Ledger updates
- Audit log shows import and review actions

### Flow B: Margin Sentinel
- Open Unit economics
- See margin breach chip
- Draft price change
- Approval appears in Inbox
- Approve
- Unit economics updates
- Audit log records approval and execution

### Flow C: Workflow engine view
- Open Builder
- Run workflow
- Watch node status change
- Open Runs
- Open run detail timeline
- Evidence chips present

---

## 13. Definition of done checklist

### Product and UX
- No chat UI exists
- All pages in sidebar exist and render
- Inbox approvals and review flows work end to end
- Audit log always reflects user actions
- Builder canvas and inspector look premium
- English UI labels consistent

### Data and logic
- Host DB is the source of truth
- Deterministic compute used for margin and finance summaries
- AI outputs validated by schema and gated by confidence
- All writes produce audit entries

### Demo readiness
- Demo mode stable
- No hard dependency on external API uptime
- Recording can be done without errors in a 2 minute run

---

## 14. Claude Code operating rules
When you run Claude Code, enforce these rules each time:
- Implement in small steps, do not attempt everything in one patch
- After each step, provide a list of files changed
- Do not add chat UI or conversational flows
- Use Zod schema validation for any LLM output and any external connector payload
- Prefer deterministic stubs over random generation for demo stability
- Keep UI clean, aligned, and consistent with the dark theme tokens
