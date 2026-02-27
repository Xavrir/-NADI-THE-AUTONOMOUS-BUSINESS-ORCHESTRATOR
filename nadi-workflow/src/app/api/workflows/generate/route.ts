import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { generateEvidenceId } from "@/lib/utils";

const VALID_NODE_TYPES = ["trigger", "logic", "ai", "confidence_gate", "policy_check", "approval", "execute", "audit"] as const;
const VALID_TRIGGER_TYPES = ["csv_import", "manual", "weekly_schedule", "order_webhook", "approval_created", "schedule", "cs_ticket", "wa_event"];
const VALID_TASKS = ["normalize_deduplicate", "fetch_unit_economics", "compute_net_margin", "scan_low_stock", "check_stock_availability", "normalize_order", "build_wa_payload", "fetch_market_signals", "classify_ledger_row", "draft_content_strategy", "classify_order_action", "classify_general"];
const VALID_ACTION_TYPES = ["post_ledger_entries", "apply_price_change", "draft_price_change", "confirm_order", "hold_order", "create_review_item", "create_restock_order", "draft_cs_response", "auto_resolve_low_risk", "export_content_csv", "send_wa_message", "queue_wa_manual"];
const VALID_POLICY_KEYS = ["margin_check", "marketing_budget", "restock_cost", "approval_routing"];
const VALID_EVENT_TYPES = ["workflow_executed", "marketing_plan_generated", "order_processed", "inbox_action_processed", "restock_initiated", "cs_ticket_processed", "wa_notification_sent"];

const SYSTEM_PROMPT = [
  "You are NADI Workflow Builder AI. You generate workflow template configurations for an Indonesian streetwear dropship business called NADI Streetwear.",
  "Given a natural-language description, produce a valid JSON workflow template.",
  "",
  "STRICT RULES:",
  "1. Return ONLY valid JSON — no markdown, no explanation, no wrapping.",
  "2. Every workflow MUST start with exactly one 'trigger' node and end with exactly one 'audit' node.",
  "3. Node IDs must be lowercase alphanumeric with underscores, unique within the workflow.",
  "4. entryNodeId must match the trigger node's id.",
  "",
  "AVAILABLE NODE TYPES AND THEIR REQUIRED config FIELDS:",
  `- trigger: { triggerType: ${JSON.stringify(VALID_TRIGGER_TYPES)} }`,
  `- logic: { task: ${JSON.stringify(VALID_TASKS)} }`,
  `- ai: { task: "classify_ledger_row" | "draft_content_strategy" | "classify_order_action" | "classify_general" }`,
  "- confidence_gate: { threshold: number 0.0-1.0 }",
  `- policy_check: { policyKey: ${JSON.stringify(VALID_POLICY_KEYS)} }`,
  `- execute: { actionType: ${JSON.stringify(VALID_ACTION_TYPES)} }`,
  "- approval: { approvalType: \"owner\" | \"cs_agent\" }",
  `- audit: { eventType: ${JSON.stringify(VALID_EVENT_TYPES)} }`,
  "",
  "EDGE LABELS: Only use 'high' | 'low' for confidence_gate branches, 'pass' | 'blocked' for policy_check branches. Other edges have no label.",
  "",
  "JSON SCHEMA:",
  '{',
  '  "name": "string (short descriptive name)",',
  '  "description": "string (one-line description)",',
  '  "entryNodeId": "string (must match trigger node id)",',
  '  "nodes": [{ "id": "string", "type": "string", "label": "string", "config": {} }],',
  '  "edges": [{ "source": "string", "target": "string", "label?": "string" }]',
  '}',
].join("\n");

function validateGeneratedConfig(data: Record<string, unknown>): string | null {
  if (!data.entryNodeId || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
    return "Missing required fields: entryNodeId, nodes, edges";
  }

  const nodes = data.nodes as Array<Record<string, unknown>>;
  if (nodes.length < 2) return "Workflow must have at least 2 nodes";
  if (nodes.length > 15) return "Workflow cannot exceed 15 nodes";

  const nodeIds = new Set(nodes.map((n) => n.id));
  if (nodeIds.size !== nodes.length) return "Duplicate node IDs detected";

  const triggerNodes = nodes.filter((n) => n.type === "trigger");
  if (triggerNodes.length !== 1) return "Exactly one trigger node required";
  if (data.entryNodeId !== triggerNodes[0].id) return "entryNodeId must match trigger node id";

  for (const node of nodes) {
    if (!VALID_NODE_TYPES.includes(node.type as typeof VALID_NODE_TYPES[number])) {
      return `Invalid node type: ${node.type}`;
    }
  }

  const edges = data.edges as Array<Record<string, unknown>>;
  for (const edge of edges) {
    if (!nodeIds.has(edge.source as string)) return `Edge source "${edge.source}" not found in nodes`;
    if (!nodeIds.has(edge.target as string)) return `Edge target "${edge.target}" not found in nodes`;
  }

  return null;
}

function extractJSON(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 5) {
      return NextResponse.json({ error: "Prompt must be at least 5 characters" }, { status: 400 });
    }

    const userPrompt = `Create a workflow for: ${prompt.trim()}\n\nReturn ONLY the JSON object, nothing else.`;

    const apiKey = process.env.POLLINATIONS_API_KEY;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const endpoint = apiKey
      ? "https://gen.pollinations.ai/v1/chat/completions"
      : "https://text.pollinations.ai/openai";
    const model = apiKey ? "openai-large" : "openai-fast";

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `AI provider error: ${res.status}`, detail: text }, { status: 502 });
    }

    const aiData = await res.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";
    const parsed = extractJSON(content);

    if (!parsed) {
      return NextResponse.json({
        error: "AI returned invalid JSON",
        rawContent: content.slice(0, 500),
      }, { status: 422 });
    }

    const validationError = validateGeneratedConfig(parsed);
    if (validationError) {
      return NextResponse.json({
        error: `Validation failed: ${validationError}`,
        generated: parsed,
      }, { status: 422 });
    }

    const name = (parsed.name as string) ?? "AI Generated Workflow";
    const description = (parsed.description as string) ?? prompt.trim().slice(0, 100);

    const configJson = {
      entryNodeId: parsed.entryNodeId,
      nodes: parsed.nodes,
      edges: parsed.edges,
    };

    const template = await prisma.workflowTemplate.create({
      data: {
        name,
        description,
        version: 1,
        configJson: JSON.stringify(configJson),
        isActive: true,
      },
    });

    await writeAudit({
      eventType: "workflow_template_generated",
      actor: "ai_builder",
      targetType: "workflow_template",
      targetId: template.id,
      summary: `AI generated workflow template "${name}" from prompt: "${prompt.trim().slice(0, 80)}"`,
      evidenceJson: {
        evidenceId: generateEvidenceId(),
        prompt: prompt.trim(),
        model: aiData.model ?? "openai",
        nodeCount: (parsed.nodes as unknown[]).length,
        edgeCount: (parsed.edges as unknown[]).length,
      },
    });

    return NextResponse.json({
      template: {
        ...template,
        configJson,
      },
      generated: true,
    });
  } catch (err) {
    console.error("Generate workflow error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}
