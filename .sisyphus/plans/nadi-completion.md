# NADI Workflow — Completion Sprint Plan

## TL;DR

> **Quick Summary**: Close out the 12 remaining gaps in the NADI Workflow demo app — from a broken approve endpoint to a full LangGraph engine migration — to produce a production-stable, demo-ready autonomous business orchestrator.
>
> **Deliverables**:
> - Fixed approve endpoint (500 → 200)
> - Human-readable before/after diff chips on approval cards
> - LangGraph engine behind feature flag with real pause/resume at approval nodes
> - Shopify "Sync Now" button wired in Settings
> - Marketing calendar + content packs connected to real pipeline data
> - 3 new pipeline templates (Inbox Actions P0, Inventory Restock P5, CS Assist P6)
> - Sidebar CS Console truncation fixed
> - API naming consistency fix
> - Loading skeleton consistency across all pages
>
> **Estimated Effort**: XL (8–10 tasks, 2 large)
> **Parallel Execution**: YES — Tasks 1, 2, 4, 7, 8, 9 can run in parallel after setup
> **Critical Path**: Task 1 (approve fix) → Task 3 (LangGraph, depends on approve working for resume)

---

## Research Findings

### Codebase Reality Check (vs. stated "NOT built")
Several items listed as missing are **already implemented**:
- ✅ **CSV import wizard** — Full 3-step Dialog in `finance/_components/csv-import-wizard.tsx` (upload → Papa Parse → POST to `/api/finance/import-csv`)
- ✅ **Audit log detail drawer** — `audit-log/_content.tsx` has full right-side Sheet with before/after/evidence/policy JSON sections, clickable timeline entries
- ✅ **Workflow run detail view** — `workflows/_components/runs-tab.tsx` has a Dialog with node-by-node timeline (icon, type, duration, message)

What is **genuinely missing or broken** is documented below.

### Root Cause: Approve Endpoint 500
The bug is in `src/app/api/approvals/[id]/approve/route.ts` → `executePriceChange()`.

The seeded approval `apr-001` has:
```json
afterJson: { "price": 399000, "channel": "tiktok_shop", "netMarginPct": 0.571 }
```
No `sku` field. But `executePriceChange` reads `afterState.sku` (undefined), then calls:
```typescript
prisma.unitEconomicsSnapshot.create({ data: { sku: undefined, ... } }) // throws!
prisma.product.update({ where: { sku: undefined } })                   // throws!
```
Fix: fall back to `approval.targetId` (which IS the SKU: `"NADI-CARGO-GRY"`), and patch the seed data's `afterJson` to include `sku`.

### LangGraph SDK (v1.2.0, confirmed Feb 2026)
- Packages: `@langchain/langgraph@^1.2.0`, `@langchain/langgraph-checkpoint-sqlite@^1.0.1`
- `interrupt()` pauses a node; graph returns `{ __interrupt__: [{ id, value }] }`
- Resume via `graph.invoke(new Command({ resume: value }), { configurable: { thread_id } })`
- `SqliteSaver.fromConnString("./path/to.db")` for file persistence
- thread_id = WorkflowRun.id for checkpoint lookup
- Feature flag: `WORKFLOW_ENGINE=langgraph` in `.env`

### Marketing Page
Currently uses hardcoded `MOCK_EVENTS` and `CONTENT_PACKS` arrays. Marketing Weekly template (`tpl-marketing-weekly`) exists in DB with AI node. When the pipeline runs, `NodeRun.outputJson` from the AI node contains structured content. Need to fetch actual run data and render it.

---

## Must NOT Do (Guardrails)

- **Do NOT rebuild** the CSV import wizard, audit drawer, or run detail view — they already work
- **Do NOT use `any` types** in LangGraph nodes — define proper TypeScript state annotations
- **Do NOT break the custom run-engine** — LangGraph is behind a feature flag, both must coexist
- **Do NOT touch Shopify scopes** — only `read_products` + `write_products` are granted; don't add cart/order calls
- **Do NOT replace mock marketing data entirely** — fall back gracefully to mocks when no pipeline runs exist
- **Do NOT change Prisma schema** for the LangGraph integration — use a separate SQLite file for checkpoints
- **Do NOT commit `.env`** with real Shopify tokens
- **Do NOT apply `shadcn` upgrades** during this sprint — stay on current radix-ui/shadcn versions
- **No emoji in UI** — maintain Industrial Gen Z aesthetic

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — all independent):
├── Task 1: Fix approve endpoint 500
├── Task 2: Before/after diff chips on approval cards
├── Task 4: Shopify sync button in Settings
├── Task 7: Fix CS Console sidebar truncation
├── Task 8: Fix create-from-template API naming
└── Task 9: Loading skeleton consistency

Wave 2 (After Wave 1 — Task 3 needs Task 1 fixed):
├── Task 3: LangGraph integration (needs approve endpoint working)
└── Task 5: Marketing content packs (independent of Wave 1 but complex)

Wave 3 (After Wave 2):
├── Task 6: Additional pipeline templates P0/P5/P6
└── Task 10: End-to-end smoke test + demo reset validation
```

---

## TODOs

---

- [ ] 1. Fix approve endpoint 500 error

  **What to do**:
  - In `executePriceChange()`, change `afterState.sku` to fall back to `approval.targetId`:
    ```typescript
    const sku = afterState.sku ?? approval.targetId ?? "";
    if (!sku) { console.warn("executePriceChange: no sku found"); return; }
    ```
  - Update `executePriceChange` function signature to also receive `targetId`:
    ```typescript
    async function executePriceChange(
      approval: { targetId: string | null; afterJson: string | null },
      approvalId: string
    )
    ```
    This is already in the signature — just use `approval.targetId` as the SKU source.
  - Patch `prisma/seed.ts` approval `apr-001` `afterJson` to include `sku`:
    ```typescript
    afterJson: JSON.stringify({
      sku: "NADI-CARGO-GRY",
      price: 399000,
      channel: "tiktok_shop",
      netMarginPct: 0.571,
      cogs: 120000,
      feePct: 0.18,
      status: "warning",
    }),
    ```
  - Add a top-level try/catch in the POST handler so any error returns a proper JSON error (not naked 500):
    ```typescript
    export async function POST(...) {
      try {
        // ... existing code
      } catch (err) {
        console.error("Approve error:", err);
        return NextResponse.json({ error: err instanceof Error ? err.message : "Approve failed" }, { status: 500 });
      }
    }
    ```

  **Must NOT do**:
  - Don't change the approval data model
  - Don't remove the `price_change` side-effect logic — it's needed for the demo

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [] (pure bug fix, no special domain)

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 3 (LangGraph resume depends on approve working)
  - **Blocked By**: None

  **References**:
  - `nadi-workflow/src/app/api/approvals/[id]/approve/route.ts` — Full file, fix `executePriceChange`
  - `nadi-workflow/prisma/seed.ts:87-133` — Approval seed data, patch `apr-001.afterJson`
  - `nadi-workflow/prisma/schema.prisma:98-118` — Approval model (targetId is String?)

  **Acceptance Criteria**:
  ```bash
  # Start the app (in tmux session 'nadi')
  # Then test:
  curl -s -X POST http://localhost:3000/api/approvals/apr-001/approve \
    -H "Cookie: $(curl -sc /tmp/cookies.txt -X POST http://localhost:3000/api/auth/login \
      -H 'Content-Type: application/json' \
      -d '{"email":"owner@nadi.id","password":"demo123"}' \
      -w '' | head -1)" \
    -b /tmp/cookies.txt | jq '.status'
  # Assert: Returns "approved" (not error)

  # Also verify audit log entry created:
  curl -s http://localhost:3000/api/audit -b /tmp/cookies.txt | \
    jq '[.[] | select(.eventType=="approval_resolved")] | length'
  # Assert: Returns >= 1
  ```

  **Commit**: YES
  - Message: `fix(approvals): resolve approve endpoint 500 — sku fallback + seed data patch`
  - Files: `src/app/api/approvals/[id]/approve/route.ts`, `prisma/seed.ts`

---

- [ ] 2. Render before/after diff inline on approval cards

  **What to do**:
  - In `approvals-tab.tsx`, after the description `<p>`, add an inline diff section that only renders when `beforeJson` and `afterJson` are present
  - Parse the JSON and display changed fields as "key: old → new" chips:
    ```tsx
    {approval.beforeJson && approval.afterJson && (
      <div className="flex flex-wrap gap-1.5 pt-1">
        {Object.keys(approval.afterJson).map((key) => {
          const before = approval.beforeJson![key];
          const after = approval.afterJson![key];
          if (before === after || before === undefined) return null;
          // Format numbers with IDR if they look like prices (> 1000)
          const fmt = (v: unknown) =>
            typeof v === "number" && v > 1000
              ? `Rp ${v.toLocaleString("id-ID")}`
              : typeof v === "number"
              ? `${(v * 100).toFixed(1)}%`
              : String(v);
          return (
            <span key={key} className="inline-flex items-center gap-1 rounded-sm border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
              <span className="text-[var(--text-muted)] uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span className="text-[var(--danger)] line-through">{fmt(before)}</span>
              <span className="text-[var(--text-muted)]">→</span>
              <span className="text-[var(--success)]">{fmt(after)}</span>
            </span>
          );
        })}
      </div>
    )}
    ```
  - The formatter logic: if value is a number > 1000, treat as IDR price; if number 0–1, treat as percentage; else stringify
  - This renders on the card face — the full JSON raw view remains available in the detail drawer (no change needed there)

  **Must NOT do**:
  - Don't change the detail drawer (before/after JSON is already there)
  - Don't try to guess all field types — keep the formatter simple

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Styling inline diff chips to match Industrial Gen Z aesthetic

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None (but testing is easier after Task 1 is fixed so approvals actually resolve)

  **References**:
  - `nadi-workflow/src/app/(app)/inbox/_components/approvals-tab.tsx:76-148` — Card layout to extend
  - `nadi-workflow/prisma/seed.ts:88-132` — Approval seed data showing beforeJson/afterJson shapes:
    - `apr-001`: `before: { price, channel, netMarginPct }`, `after: { sku, price, channel, netMarginPct, cogs, feePct, status }`
    - `apr-002`: `before: { available, reorderPoint }`, `after: { orderQty, estimatedCost }`
    - `apr-003`: `before: { discount, netMarginPct }`, `after: { discount, netMarginPct }`
  - `nadi-workflow/src/app/globals.css` — CSS variables for colors (--primary, --danger, --success, --border)

  **Acceptance Criteria**:
  - Navigate to http://localhost:3000/inbox → Approvals tab
  - The "Price increase: Cargo Jogger on TikTok Shop" card must show inline diff chips:
    - `PRICE: Rp 349,000 → Rp 399,000`
    - `NET MARGIN PCT: 47.6% → 57.1%`
  - The "Emergency restock" card must show:
    - `AVAILABLE: 3 → 30` (or similar from before/after)
  - Chips use danger color for old value (strikethrough), success color for new value
  - Detail drawer still shows raw JSON (unchanged)

  **Commit**: YES
  - Message: `feat(inbox): add inline before/after diff chips on approval cards`
  - Files: `src/app/(app)/inbox/_components/approvals-tab.tsx`

---

- [ ] 3. LangGraph engine integration (behind feature flag)

  **What to do**:

  **Step A — Install packages** (in `nadi-workflow/`):
  ```bash
  npm install @langchain/langgraph@^1.2.0 @langchain/core@^1.1.16 @langchain/langgraph-checkpoint-sqlite@^1.0.1
  ```
  Note: `better-sqlite3` is a transitive dependency of `@langchain/langgraph-checkpoint-sqlite` — may need `npm install better-sqlite3 @types/better-sqlite3 -D`

  **Step B — Add feature flag to `.env`**:
  ```
  WORKFLOW_ENGINE=langgraph
  ```
  (Keep `custom` as the fallback so existing engine still works when flag is absent)

  **Step C — Create `src/lib/langgraph/state.ts`**:
  ```typescript
  import { Annotation } from "@langchain/langgraph";

  export const WorkflowStateAnnotation = Annotation.Root({
    runId: Annotation<string>(),
    templateId: Annotation<string>(),
    templateName: Annotation<string>(),
    triggerType: Annotation<string>(),
    data: Annotation<Record<string, unknown>>({
      reducer: (a, b) => ({ ...a, ...b }),
      default: () => ({}),
    }),
    confidence: Annotation<number | undefined>(),
    policyResult: Annotation<"pass" | "blocked" | undefined>(),
    branchPath: Annotation<string | undefined>(),
    nodesCompleted: Annotation<number>({
      reducer: (a, b) => a + b,
      default: () => 0,
    }),
    nodesFailed: Annotation<number>({
      reducer: (a, b) => a + b,
      default: () => 0,
    }),
    sideEffects: Annotation<Array<{ type: string; id?: string }>>({
      reducer: (a, b) => [...a, ...b],
      default: () => [],
    }),
    // Approval interrupt payload — set when approval node pauses
    approvalInterrupt: Annotation<{
      approvalId: string;
      title: string;
      riskLevel: string;
    } | undefined>(),
  });

  export type WorkflowState = typeof WorkflowStateAnnotation.State;
  ```

  **Step D — Create `src/lib/langgraph/checkpointer.ts`**:
  ```typescript
  import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
  import path from "path";

  // Use a separate file from Prisma's dev.db to avoid conflicts
  const CHECKPOINT_DB_PATH = path.join(process.cwd(), "prisma", "langgraph-checkpoints.db");

  let _checkpointer: SqliteSaver | null = null;

  export function getCheckpointer(): SqliteSaver {
    if (!_checkpointer) {
      _checkpointer = SqliteSaver.fromConnString(CHECKPOINT_DB_PATH);
    }
    return _checkpointer;
  }
  ```

  **Step E — Create `src/lib/langgraph/nodes.ts`**:
  - This file re-implements the same 8 node executors from `run-engine.ts`, adapted to return state partial updates
  - Key difference: the `approval` node type now uses `interrupt()` instead of a no-op:
    ```typescript
    import { interrupt } from "@langchain/langgraph";

    export async function approvalNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
      // Create Approval record in DB
      const approval = await prisma.approval.create({ data: { ... } });

      // Pause the graph — returns control to API caller
      // Will resume when POST /api/workflows/runs/:id/resume is called
      const decision = interrupt({
        approvalId: approval.id,
        title: approval.title,
        riskLevel: approval.riskLevel,
      });

      // decision is { approved: boolean } from resume call
      const status = decision.approved ? "approved" : "rejected";
      await prisma.approval.update({ where: { id: approval.id }, data: { status, resolvedBy: "owner", resolvedAt: new Date() } });

      return { approvalInterrupt: undefined, nodesCompleted: 1 };
    }
    ```
  - All other nodes (trigger, logic, ai, confidence_gate, policy_check, execute, audit) are adapted versions of run-engine.ts executors, returning state partial updates and writing NodeRun records to Prisma

  **Step F — Create `src/lib/langgraph/build-graph.ts`**:
  ```typescript
  import { StateGraph, START, END } from "@langchain/langgraph";
  import { WorkflowStateAnnotation } from "./state";
  import { getCheckpointer } from "./checkpointer";
  import * as Nodes from "./nodes";

  interface NodeConfig { id: string; type: string; label: string; config?: Record<string, unknown>; }
  interface EdgeConfig { source: string; target: string; label?: string; when?: string; }

  export function buildGraph(nodes: NodeConfig[], edges: EdgeConfig[]) {
    const graph = new StateGraph(WorkflowStateAnnotation);

    // Add all nodes
    for (const node of nodes) {
      const executor = Nodes.getExecutor(node);
      graph.addNode(node.id, executor);
    }

    // Add edges (START → entryNode, regular edges, conditional edges)
    const entryNode = nodes[0]?.id;
    if (entryNode) graph.addEdge(START, entryNode as never);

    for (const edge of edges) {
      // Detect conditional routing (edges with label/when)
      // Group outgoing edges by source to identify conditional fans
      graph.addEdge(edge.source as never, edge.target as never);
    }

    // Terminal nodes (no outgoing edges) → END
    const hasOutgoing = new Set(edges.map((e) => e.source));
    for (const node of nodes) {
      if (!hasOutgoing.has(node.id)) {
        graph.addEdge(node.id as never, END);
      }
    }

    const checkpointer = getCheckpointer();
    return graph.compile({ checkpointer });
  }
  ```
  Note: Conditional branching needs `addConditionalEdges` — implement a router function that reads state.branchPath set by confidence_gate/policy_check nodes.

  **Step G — Create `src/lib/langgraph/runner.ts`**:
  ```typescript
  import { Command, isInterrupted, INTERRUPT } from "@langchain/langgraph";
  import { prisma } from "@/lib/db";
  import { buildGraph } from "./build-graph";
  import { writeAudit } from "@/lib/audit";

  export async function runWorkflowLangGraph(templateId: string, triggerType = "manual") {
    const template = await prisma.workflowTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new Error(`Template not found: ${templateId}`);

    const config = JSON.parse(template.configJson);
    const run = await prisma.workflowRun.create({
      data: { templateId, triggerType, status: "running", startedAt: new Date() },
    });

    const graph = buildGraph(config.nodes, config.edges);
    const threadConfig = { configurable: { thread_id: run.id } };

    const initialState = {
      runId: run.id,
      templateId,
      templateName: template.name,
      triggerType,
      data: {},
    };

    const result = await graph.invoke(initialState, threadConfig);

    if (isInterrupted(result)) {
      // Graph paused at approval node
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: "awaiting_approval" },
      });
      return {
        runId: run.id,
        status: "awaiting_approval",
        interrupted: true,
        interruptValue: result[INTERRUPT][0].value,
        nodesCompleted: result.nodesCompleted ?? 0,
        nodesFailed: 0,
        sideEffects: [],
      };
    }

    // Completed
    const finalStatus = result.nodesFailed > 0 ? "failed" : "completed";
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: finalStatus, completedAt: new Date() },
    });

    await writeAudit({
      eventType: "workflow_run_created",
      actor: "system",
      targetType: "workflow_run",
      targetId: run.id,
      summary: `Workflow "${template.name}" completed via LangGraph`,
      runId: run.id,
    });

    return {
      runId: run.id,
      status: finalStatus,
      nodesCompleted: result.nodesCompleted ?? 0,
      nodesFailed: result.nodesFailed ?? 0,
      sideEffects: result.sideEffects ?? [],
    };
  }

  export async function resumeWorkflow(runId: string, decision: { approved: boolean }) {
    const run = await prisma.workflowRun.findUnique({
      where: { id: runId },
      include: { template: true },
    });
    if (!run) throw new Error(`Run not found: ${runId}`);
    if (run.status !== "awaiting_approval") throw new Error("Run is not awaiting approval");

    const config = JSON.parse(run.template.configJson);
    const graph = buildGraph(config.nodes, config.edges);
    const threadConfig = { configurable: { thread_id: runId } };

    const result = await graph.invoke(new Command({ resume: decision }), threadConfig);

    const finalStatus = (result.nodesFailed ?? 0) > 0 ? "failed" : "completed";
    await prisma.workflowRun.update({
      where: { id: runId },
      data: { status: finalStatus, completedAt: new Date() },
    });

    return { runId, status: finalStatus };
  }
  ```

  **Step H — Update `src/app/api/workflows/runs/route.ts`** to use LangGraph when flag is set:
  ```typescript
  const useEngine = process.env.WORKFLOW_ENGINE === "langgraph"
    ? (await import("@/lib/langgraph/runner")).runWorkflowLangGraph
    : (await import("@/lib/run-engine")).runWorkflow;
  const result = await useEngine(templateId, triggerType ?? "manual");
  ```

  **Step I — Create `src/app/api/workflows/runs/[id]/resume/route.ts`**:
  ```typescript
  import { NextRequest, NextResponse } from "next/server";
  import { resumeWorkflow } from "@/lib/langgraph/runner";

  export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const { decision } = await req.json(); // { approved: boolean }
      const result = await resumeWorkflow(id, decision);
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Resume failed" },
        { status: 500 }
      );
    }
  }
  ```

  **Must NOT do**:
  - Don't delete or disable `run-engine.ts` — it must work when `WORKFLOW_ENGINE` is not set to `langgraph`
  - Don't share the same SQLite file as Prisma — use `prisma/langgraph-checkpoints.db`
  - Don't add `interruptBefore`/`interruptAfter` compile options — use `interrupt()` inside nodes
  - Don't implement streaming responses in the MVP — `invoke()` is sufficient

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: [] (pure backend TypeScript/Node.js work)

  **Parallelization**:
  - **Can Run In Parallel**: NO — run after Task 1 is confirmed fixed
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: Nothing
  - **Blocked By**: Task 1 (approve endpoint must work for resume flow to be testable)

  **References**:
  - `nadi-workflow/src/lib/run-engine.ts:1-720` — Full existing engine to port to LangGraph nodes
  - `nadi-workflow/src/app/api/workflows/runs/route.ts` — Entry point to modify for feature flag
  - `nadi-workflow/src/app/api/workflows/runs/[id]/route.ts` — Pattern for dynamic route handlers
  - `nadi-workflow/prisma/schema.prisma:165-198` — WorkflowRun and NodeRun models
  - `nadi-workflow/.env` — Add `WORKFLOW_ENGINE=langgraph`
  - LangGraph SDK imports:
    - `import { StateGraph, Annotation, START, END, interrupt, Command, isInterrupted, INTERRUPT } from "@langchain/langgraph"`
    - `import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite"`
  - LangGraph patterns:
    - `interrupt(value)` inside a node pauses execution, returns resume value
    - `graph.invoke(new Command({ resume: value }), { configurable: { thread_id: runId } })` resumes
    - `isInterrupted(result)` checks if result has `__interrupt__` key
    - `SqliteSaver.fromConnString("./prisma/langgraph-checkpoints.db")` for persistence

  **Acceptance Criteria**:
  ```bash
  # 1. Verify engine flag activates LangGraph
  # .env should have WORKFLOW_ENGINE=langgraph
  # Restart the dev server

  # 2. Trigger a run on Finance Close template (has no approval node — should complete)
  curl -s -X POST http://localhost:3000/api/workflows/runs \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d '{"templateId":"tpl-finance-close","triggerType":"manual"}' | jq '.status'
  # Assert: "completed"

  # 3. Trigger a run on Margin Sentinel (has approval node — should pause)
  curl -s -X POST http://localhost:3000/api/workflows/runs \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d '{"templateId":"tpl-margin-sentinel","triggerType":"manual"}' | jq '{status,interrupted}'
  # Assert: { "status": "awaiting_approval", "interrupted": true }

  # 4. Save the runId from above, then resume:
  RUN_ID="<from step 3>"
  curl -s -X POST http://localhost:3000/api/workflows/runs/$RUN_ID/resume \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d '{"decision":{"approved":true}}' | jq '.status'
  # Assert: "completed"

  # 5. Verify checkpoint DB was created:
  ls nadi-workflow/prisma/langgraph-checkpoints.db
  # Assert: File exists and has size > 0

  # 6. TypeScript check passes:
  cd nadi-workflow && npm run typecheck 2>&1 | grep -c "error"
  # Assert: 0
  ```

  **Commit**: YES
  - Message: `feat(engine): add LangGraph integration with SQLite checkpointing and real pause/resume at approval nodes`
  - Files: `src/lib/langgraph/state.ts`, `checkpointer.ts`, `nodes.ts`, `build-graph.ts`, `runner.ts`, `src/app/api/workflows/runs/route.ts`, `src/app/api/workflows/runs/[id]/resume/route.ts`, `.env`, `package.json`, `package-lock.json`

---

- [ ] 4. Wire Shopify sync button in Settings UI

  **What to do**:
  - In `settings/page.tsx`, update the Shopify connector card's "Test Connection" button:
    - Remove `disabled` prop
    - Add `onClick` handler that calls `POST /api/integrations/shopify/sync`
    - Show loading spinner during sync
    - Show success count or error message after
  - Specific changes in the `connectors?.map(...)` block:
    ```tsx
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [syncResults, setSyncResults] = useState<Record<string, string>>({});

    const handleSync = async (connType: string) => {
      if (connType !== "shopify") return;
      setSyncingId(connType);
      try {
        const res = await fetch("/api/integrations/shopify/sync", { method: "POST" });
        const data = await res.json();
        setSyncResults((prev) => ({
          ...prev,
          [connType]: data.success
            ? `Synced ${data.synced} products`
            : `Error: ${data.error}`,
        }));
        queryClient.invalidateQueries({ queryKey: ["integrations"] });
      } catch {
        setSyncResults((prev) => ({ ...prev, [connType]: "Network error" }));
      } finally {
        setSyncingId(null);
      }
    };
    ```
  - Update the "Test Connection" button:
    ```tsx
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={conn.type !== "shopify" || syncingId === conn.type}
      onClick={() => handleSync(conn.type)}
    >
      {syncingId === conn.type ? (
        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing...</>
      ) : (
        <><RefreshCw className="h-3.5 w-3.5" /> Sync Now</>
      )}
    </Button>
    ```
  - Show `syncResults[conn.type]` below the button if it exists (small monospace text)
  - Keep "Configure" button disabled for all connectors

  **Must NOT do**:
  - Don't enable Test Connection for non-Shopify connectors
  - Don't add OAuth flows or API key input forms

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `nadi-workflow/src/app/(app)/settings/page.tsx:41-170` — Current connector card render, add state + handler
  - `nadi-workflow/src/app/api/integrations/shopify/sync/route.ts` — Returns `{ success, synced, skipped, total, details, timestamp }`
  - `nadi-workflow/src/app/(app)/settings/page.tsx:1-10` — Add `Loader2` to lucide imports

  **Acceptance Criteria**:
  ```bash
  # Navigate to http://localhost:3000/settings
  # The Shopify card's "Test Connection" button must be clickable (not disabled)
  # Click it → button shows "Syncing..." with spinner
  # After completion → shows "Synced N products" message below button
  # Verify API was called:
  curl -s -X POST http://localhost:3000/api/integrations/shopify/sync \
    -b /tmp/cookies.txt | jq '{success, synced}'
  # Assert: { "success": true, "synced": <number> }
  ```

  **Commit**: YES
  - Message: `feat(settings): wire Shopify sync button — Test Connection triggers real product sync`
  - Files: `src/app/(app)/settings/page.tsx`

---

- [ ] 5. Connect Marketing page to real pipeline data

  **What to do**:
  - Fetch Marketing Weekly workflow runs from `/api/workflows/runs` and extract AI node outputs
  - Replace the hardcoded `CONTENT_PACKS` with data derived from actual `NodeRun` records where `nodeType === "ai"`
  - Keep `MOCK_EVENTS` as a fallback (marketing calendar is still UI-only for now; connecting it to real events would require a new `MarketingEvent` model, out of scope)
  - Add a new section: "AI-Generated Content Packs" that shows the 3 most recent Marketing Weekly runs, each with its AI output (topic, copy, channels)
  - Fetch pattern:
    ```typescript
    const { data: runs } = useQuery({
      queryKey: ["marketing-runs"],
      queryFn: () =>
        fetch("/api/workflows/runs").then((r) => r.json()).then((runs) =>
          runs.filter((r) => r.templateName?.includes("Marketing"))
        ),
    });
    ```
  - For each Marketing run, find the nodeRun with `nodeType === "ai"` and parse its `outputJson`:
    ```typescript
    const aiOutput = run.nodeRuns?.find((n) => n.nodeType === "ai")?.outputJson;
    // aiOutput contains: { topic, products, data: { channels, caption, hashtags }, rationale }
    ```
  - Render each run as a Content Pack card with:
    - Pack title from `aiOutput.data.topic` or `run.templateName + run.createdAt`
    - Status chip based on `run.status`
    - Description from `aiOutput.rationale`
    - Channel tags from `aiOutput.data.channels` (array of strings)
    - Caption preview from `aiOutput.data.caption`
    - Created date
  - If no Marketing runs exist in DB, show the 3 hardcoded `CONTENT_PACKS` as placeholders
  - Add a "Run Marketing Weekly" button that calls `POST /api/workflows/runs` with the Marketing Weekly template ID:
    ```typescript
    // Need to fetch template to get its ID
    const { data: templates } = useQuery({ queryKey: ["workflow-templates"], ... });
    const marketingTemplate = templates?.find(t => t.name.includes("Marketing"));
    ```

  **Must NOT do**:
  - Don't add a new Prisma model for marketing events
  - Don't hardcode template IDs — always look up by name
  - Don't remove the calendar section — keep MOCK_EVENTS for the calendar grid

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`frontend-ui-ux`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 2, but independent of LangGraph)
  - **Parallel Group**: Wave 2
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `nadi-workflow/src/app/(app)/marketing/page.tsx:1-182` — Full current page with MOCK_EVENTS and CONTENT_PACKS
  - `nadi-workflow/src/app/api/workflows/runs/route.ts` — GET returns runs with nodeRuns included
  - `nadi-workflow/prisma/seed.ts:174-300` — Marketing Weekly template definition (nodes include `ai` node with `task: "draft_content_strategy"`)
  - `nadi-workflow/src/lib/llm-provider.ts` — AI output structure from `draft_content_strategy` task: `{ data: { channels, caption, hashtags }, rationale, confidence }`
  - `nadi-workflow/src/components/shared/status-chip.tsx` — StatusChip component for run status
  - `nadi-workflow/src/components/ui/button.tsx` — Button component

  **Acceptance Criteria**:
  - Navigate to http://localhost:3000/marketing
  - If Marketing Weekly has been run at least once: show real AI output cards instead of placeholder packs
  - If no runs: show the 3 hardcoded placeholder pack cards (graceful fallback)
  - "Run Marketing Weekly" button exists in page header actions
  - Clicking it triggers a run and refreshes the content packs section
  - Cards show channel tags (IG, TikTok, etc.) and caption preview

  **Commit**: YES
  - Message: `feat(marketing): connect content packs to real Marketing Weekly pipeline runs`
  - Files: `src/app/(app)/marketing/page.tsx`

---

- [ ] 6. Add P0/P5/P6 pipeline templates to seed

  **What to do**:
  - Add 3 new workflow templates to `prisma/seed.ts` within the existing template creation block:

  **P0: Inbox Actions** — Processes incoming approval requests and routes to correct handler
  ```typescript
  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-inbox-actions",
      name: "Inbox Actions",
      description: "Classify incoming approval requests by urgency, check policy, route to owner or auto-resolve low-risk items",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "New Approval", config: { triggerType: "approval_created" } },
          { id: "classify", type: "ai", label: "Classify Urgency", config: { task: "classify_general" } },
          { id: "confidence", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.85 } },
          { id: "policy", type: "policy_check", label: "Policy Check", config: { policyKey: "approval_routing" } },
          { id: "auto_resolve", type: "execute", label: "Auto Resolve", config: { actionType: "auto_resolve_low_risk" } },
          { id: "route_owner", type: "approval", label: "Route to Owner", config: { approvalType: "owner" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "inbox_action_processed" } },
        ],
        edges: [
          { source: "trigger", target: "classify" },
          { source: "classify", target: "confidence" },
          { source: "confidence", target: "policy", label: "high" },
          { source: "confidence", target: "route_owner", label: "low" },
          { source: "policy", target: "auto_resolve", label: "pass" },
          { source: "policy", target: "route_owner", label: "blocked" },
          { source: "auto_resolve", target: "audit" },
          { source: "route_owner", target: "audit" },
        ],
      }),
    },
  });
  ```

  **P5: Inventory Restock** — Detects low stock and creates restock orders
  ```typescript
  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-inventory-restock",
      name: "Inventory Restock",
      description: "Scan inventory levels, flag below-reorder-point SKUs, create restock approval for high-cost orders",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "Stock Monitor", config: { triggerType: "schedule" } },
          { id: "scan", type: "logic", label: "Scan Inventory", config: { task: "scan_low_stock" } },
          { id: "ai_restock", type: "ai", label: "AI Restock Plan", config: { task: "classify_general" } },
          { id: "policy", type: "policy_check", label: "Cost Policy Check", config: { policyKey: "restock_cost" } },
          { id: "approval", type: "approval", label: "Owner Approval", config: { approvalType: "owner" } },
          { id: "create_order", type: "execute", label: "Create Restock Order", config: { actionType: "create_restock_order" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "restock_initiated" } },
        ],
        edges: [
          { source: "trigger", target: "scan" },
          { source: "scan", target: "ai_restock" },
          { source: "ai_restock", target: "policy" },
          { source: "policy", target: "approval", label: "blocked" },
          { source: "policy", target: "create_order", label: "pass" },
          { source: "approval", target: "create_order" },
          { source: "create_order", target: "audit" },
        ],
      }),
    },
  });
  ```

  **P6: CS Assist** — Classifies customer service tickets and escalates or auto-responds
  ```typescript
  await prisma.workflowTemplate.create({
    data: {
      id: "tpl-cs-assist",
      name: "CS Assist",
      description: "Classify incoming CS tickets by category and sentiment, auto-draft response for common issues, escalate complex cases",
      version: 1,
      configJson: JSON.stringify({
        entryNodeId: "trigger",
        nodes: [
          { id: "trigger", type: "trigger", label: "CS Ticket", config: { triggerType: "cs_ticket" } },
          { id: "classify", type: "ai", label: "Classify & Sentiment", config: { task: "classify_general" } },
          { id: "confidence", type: "confidence_gate", label: "Confidence Gate", config: { threshold: 0.80 } },
          { id: "draft_response", type: "execute", label: "Draft Response", config: { actionType: "draft_cs_response" } },
          { id: "escalate", type: "approval", label: "Escalate to Human", config: { approvalType: "cs_agent" } },
          { id: "audit", type: "audit", label: "Write Audit", config: { eventType: "cs_ticket_processed" } },
        ],
        edges: [
          { source: "trigger", target: "classify" },
          { source: "classify", target: "confidence" },
          { source: "confidence", target: "draft_response", label: "high" },
          { source: "confidence", target: "escalate", label: "low" },
          { source: "draft_response", target: "audit" },
          { source: "escalate", target: "audit" },
        ],
      }),
    },
  });
  ```
  - Also update `prisma/seed.ts`'s `main()` to call these creates before the connector config block
  - Update the `reset-demo` API route to include these templates in its cleanup + re-seed logic (check `src/app/api/settings/reset-demo/route.ts`)

  **Must NOT do**:
  - Don't create new Prisma models for these templates
  - Don't add new node types — reuse existing 8 types from run-engine.ts

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (Wave 3, after core tasks done)
  - **Parallel Group**: Wave 3
  - **Blocks**: Nothing
  - **Blocked By**: None (but better to verify run-engine + LangGraph work first)

  **References**:
  - `nadi-workflow/prisma/seed.ts:174-250` — Existing template creation patterns (Finance Close, Margin Sentinel)
  - `nadi-workflow/src/app/api/settings/reset-demo/route.ts` — Check if it re-seeds or just deletes
  - `nadi-workflow/src/lib/run-engine.ts:444-453` — Supported node types

  **Acceptance Criteria**:
  ```bash
  # After running: npm run db:seed (or resetting demo)
  curl -s http://localhost:3000/api/workflows/templates -b /tmp/cookies.txt | \
    jq '[.[] | .name]'
  # Assert: Array includes "Inbox Actions", "Inventory Restock", "CS Assist"

  # Verify each template has nodes:
  curl -s http://localhost:3000/api/workflows/templates -b /tmp/cookies.txt | \
    jq '.[] | select(.name == "CS Assist") | .configJson.nodes | length'
  # Assert: 6

  # Navigate to /workflows → Templates tab
  # Assert: All 3 new templates appear as cards with node pipeline preview
  ```

  **Commit**: YES
  - Message: `feat(templates): add P0 Inbox Actions, P5 Inventory Restock, P6 CS Assist pipeline templates`
  - Files: `prisma/seed.ts`, `src/app/api/settings/reset-demo/route.ts`

---

- [ ] 7. Fix CS Console sidebar label truncation

  **What to do**:
  - In `sidebar.tsx`, the "CS Console" nav link has both the label text AND a tag. The `truncate` class on `<span className="truncate">` clips the label when the tag pushes it.
  - The tag uses `ml-auto` which creates a flex gap. With a `w-60` sidebar (240px), `px-4` on nav, `px-3` on link, icon 16px, gap-3 = 12px, the available text space is ~175px which is fine for "CS Console" (9 chars) but tight with a "Read only" tag.
  - Fix: Add `min-w-0` to the span for proper truncation, or add `flex-shrink-0` to the tag, or use `overflow-hidden` on the link container:
    ```tsx
    <span className="truncate min-w-0 flex-1">{item.label}</span>
    {item.tag && (
      <span className={cn(
        "shrink-0 ml-1 text-[9px] font-mono px-1.5 py-0.5 border rounded-sm whitespace-nowrap",
        isActive ? "border-[#000]/20 text-[#000]" : "border-[var(--border)] text-[var(--text-muted)]"
      )}>
        {item.tag}
      </span>
    )}
    ```
  - The key change: `shrink-0` on the tag (so it never compresses), `flex-1 truncate min-w-0` on the label (so it takes remaining space and truncates cleanly)

  **Must NOT do**:
  - Don't change the sidebar width
  - Don't remove the "Read only" tag

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `nadi-workflow/src/components/shell/sidebar.tsx:92-113` — Nav link render with tag

  **Acceptance Criteria**:
  - Navigate to any page in the app
  - Sidebar shows "CS Console" label fully visible (not "CS Con..." or "CS CON...")
  - "Read only" tag is visible next to the label without overlap
  - No horizontal scrollbar on the sidebar

  **Commit**: YES (groups with Task 8)
  - Message: `fix(sidebar): prevent CS Console label truncation with shrink-0 tag`
  - Files: `src/components/shell/sidebar.tsx`

---

- [ ] 8. Fix create-from-template API naming inconsistency

  **What to do**:
  - `src/app/api/workflows/create-from-template/route.ts` currently expects `sourceTemplateId`
  - Some UI code or external callers might send `templateId`
  - Accept both fields with fallback:
    ```typescript
    const { sourceTemplateId, templateId, name, description } = await req.json();
    const resolvedTemplateId = sourceTemplateId ?? templateId;
    if (!resolvedTemplateId || !name) {
      return NextResponse.json(
        { error: "sourceTemplateId (or templateId) and name are required" },
        { status: 400 }
      );
    }
    ```
  - Replace all uses of `sourceTemplateId` in the handler with `resolvedTemplateId`
  - This is a defensive fix — no UI changes needed

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `nadi-workflow/src/app/api/workflows/create-from-template/route.ts:5-15` — Fix body parsing

  **Acceptance Criteria**:
  ```bash
  # Test with templateId (old name)
  curl -s -X POST http://localhost:3000/api/workflows/create-from-template \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d '{"templateId":"tpl-finance-close","name":"My Finance Copy"}' | jq '.id'
  # Assert: Returns a new template ID (not null/error)

  # Test with sourceTemplateId (correct name)
  curl -s -X POST http://localhost:3000/api/workflows/create-from-template \
    -H "Content-Type: application/json" \
    -b /tmp/cookies.txt \
    -d '{"sourceTemplateId":"tpl-finance-close","name":"My Finance Copy 2"}' | jq '.id'
  # Assert: Returns a new template ID
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `fix(sidebar): prevent CS Console truncation; fix(api): accept templateId alias in create-from-template`
  - Files: `src/components/shell/sidebar.tsx`, `src/app/api/workflows/create-from-template/route.ts`

---

- [ ] 9. Loading skeleton consistency across pages

  **What to do**:
  - Audit which pages have loading skeletons and which don't
  - Pages already with skeletons: Finance (Suspense + Skeleton), Inbox (Suspense + Skeleton), Audit Log (inline `isLoading` array of Skeletons), Workflows (Skeleton), Settings (Skeleton for connectors and LLM)
  - Pages that need skeletons added:
    - **Dashboard**: Add `if (isLoading) return <DashboardSkeleton />` — create a skeleton with 4 KPI card skeletons + 2 section skeletons
    - **Inventory**: Check `inventory/page.tsx` — if it uses `isLoading` check, add Skeleton table rows
    - **CS Console**: Check `cs-console/page.tsx` — add skeleton for ticket list
    - **Governance**: Check `governance/page.tsx` — add skeleton for policy form and role matrix
    - **Marketing**: Already has no loading state (mock data) — add conditional loading for the real pipeline runs query
  - Pattern to use consistently (matches existing pages):
    ```tsx
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      );
    }
    ```
  - For KPI card skeletons on Dashboard:
    ```tsx
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
    ```

  **Must NOT do**:
  - Don't add loading states to pages that already have them
  - Don't create separate skeleton components — inline Skeleton usage is consistent with existing code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `nadi-workflow/src/app/(app)/audit-log/_content.tsx:84-90` — Reference skeleton pattern (array of `<Skeleton>` with height)
  - `nadi-workflow/src/app/(app)/settings/page.tsx:107-113` — Grid skeleton pattern
  - `nadi-workflow/src/app/(app)/dashboard/page.tsx` — Read current state to determine what's missing
  - `nadi-workflow/src/app/(app)/inventory/page.tsx` — Read current state
  - `nadi-workflow/src/app/(app)/cs-console/page.tsx` — Read current state
  - `nadi-workflow/src/app/(app)/governance/page.tsx` — Read current state
  - `nadi-workflow/src/components/ui/skeleton.tsx` — Skeleton primitive

  **Acceptance Criteria**:
  - On first page load (or with slow network throttled in DevTools to Slow 3G):
    - Dashboard shows 4 KPI card skeletons while loading
    - All pages that fetch data show skeleton states instead of empty/broken layouts
  - No page ever shows a blank white area or undefined layout while loading
  - Skeletons disappear and content appears after data loads

  **Commit**: YES
  - Message: `fix(ux): add consistent loading skeletons to Dashboard, Inventory, CS Console, Governance pages`
  - Files: Multiple page files (dashboard, inventory, cs-console, governance)

---

- [ ] 10. End-to-end smoke test + demo reset validation

  **What to do**:
  - Validate the complete demo flow works after all tasks above:

  **Flow 1: Finance Close workflow**
  1. Go to Settings → Click "Reset Demo Data"
  2. Go to Finance → Click "Import CSV" → drop a CSV file → Import
  3. Verify: Ledger shows new entries, some go to Inbox → Review
  4. Go to Inbox → Approvals → Approve the price change approval
  5. Go to Audit Log → Verify events appear for import + approval

  **Flow 2: LangGraph approval pause/resume** (if WORKFLOW_ENGINE=langgraph)
  1. Go to Workflows → Templates → Click "Run" on Margin Sentinel
  2. Check Workflow Runs → Should show status "awaiting_approval"
  3. Go to Inbox → Approvals → Approve the generated approval
  4. Verify: WorkflowRun status changes to "completed" in Runs tab

  **Flow 3: Shopify sync**
  1. Go to Settings → Click "Sync Now" on Shopify card
  2. Verify: Success message shows "Synced N products"
  3. Go to Audit Log → Verify `shopify_sync` event appears

  **What to check via curl for CI-like validation**:
  ```bash
  # Reset demo
  curl -s -X POST http://localhost:3000/api/settings/reset-demo -b /tmp/cookies.txt | jq '.success'

  # Verify new templates exist
  curl -s http://localhost:3000/api/workflows/templates -b /tmp/cookies.txt | jq 'length'
  # Assert: >= 7 (4 original + 3 new)

  # TypeScript + lint
  cd nadi-workflow && npm run typecheck && npm run lint
  # Assert: 0 errors
  ```

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: NO — must run last
  - **Parallel Group**: Wave 3 (final validation)
  - **Blocks**: Nothing
  - **Blocked By**: All other tasks

  **References**:
  - `nadi-workflow/playwright.config.ts` — Playwright configuration
  - `nadi-workflow/tests/` — Existing test files (check what's there)
  - `nadi-workflow/src/app/api/settings/reset-demo/route.ts` — Reset API

  **Acceptance Criteria**:
  ```bash
  # All three flows complete without error
  # npm run typecheck — 0 errors
  # npm run lint — 0 errors (or only pre-existing warnings)
  # Demo reset button in Settings clears all dynamic data
  # After reset: Workflows page shows 7+ templates, Inbox shows 2 pending approvals, Audit Log shows seed events
  ```

  **Commit**: NO (validation only)

---

## Commit Strategy

| After Task | Message | Key Files |
|------------|---------|-----------|
| 1 | `fix(approvals): resolve approve 500 — sku fallback + seed patch` | `approve/route.ts`, `seed.ts` |
| 2 | `feat(inbox): add inline before/after diff chips on approval cards` | `approvals-tab.tsx` |
| 3 | `feat(engine): LangGraph integration with SQLite checkpointing` | `src/lib/langgraph/*`, `runs/route.ts`, `resume/route.ts`, `package.json` |
| 4 | `feat(settings): wire Shopify sync button` | `settings/page.tsx` |
| 5 | `feat(marketing): connect content packs to pipeline runs` | `marketing/page.tsx` |
| 6 | `feat(templates): add P0/P5/P6 pipeline templates` | `seed.ts`, `reset-demo/route.ts` |
| 7+8 | `fix(sidebar+api): CS Console truncation + templateId alias` | `sidebar.tsx`, `create-from-template/route.ts` |
| 9 | `fix(ux): consistent loading skeletons across all pages` | Multiple page files |

---

## Success Criteria

### Verification Commands

```bash
cd /home/xavrir/-NADI-THE-AUTONOMOUS-BUSINESS-ORCHESTRATOR/nadi-workflow

# TypeScript clean
npm run typecheck
# Expected: No errors

# Lint clean
npm run lint
# Expected: No errors (or pre-existing warnings only)

# Demo reset works
curl -s -X POST http://localhost:3000/api/settings/reset-demo \
  -b /tmp/cookies.txt | jq '.success'
# Expected: true

# Approve works (no 500)
curl -s -X POST http://localhost:3000/api/approvals/apr-001/approve \
  -b /tmp/cookies.txt | jq '.status'
# Expected: "approved"

# 7+ templates exist after reset
curl -s http://localhost:3000/api/workflows/templates -b /tmp/cookies.txt | jq 'length'
# Expected: >= 7

# Shopify sync works
curl -s -X POST http://localhost:3000/api/integrations/shopify/sync \
  -b /tmp/cookies.txt | jq '.success'
# Expected: true
```

### Final Checklist

- [ ] Approve endpoint returns 200 with `{ status: "approved" }`
- [ ] Approval cards show human-readable before/after diff chips inline
- [ ] LangGraph runner activates when `WORKFLOW_ENGINE=langgraph` in `.env`
- [ ] Margin Sentinel run pauses at approval node (status: awaiting_approval)
- [ ] Resume endpoint completes the paused run
- [ ] Shopify "Sync Now" button works in Settings
- [ ] Marketing page shows AI content packs from real pipeline runs (or graceful fallback)
- [ ] Inbox Actions, Inventory Restock, CS Assist templates appear in template gallery
- [ ] CS Console shows full label in sidebar (no truncation)
- [ ] `templateId` alias accepted by create-from-template API
- [ ] All pages show loading skeletons instead of blank layouts
- [ ] `npm run typecheck` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors
- [ ] Demo reset reseeds cleanly with all new templates
