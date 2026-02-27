import { generateEvidenceId } from "@/lib/utils";

export interface LLMRequest {
  task: string;
  prompt: string;
  systemPrompt?: string;
  schema?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface LLMResponse {
  data: Record<string, unknown>;
  confidence: number;
  rationale: string;
  rawContent: string;
  provider: string;
  model: string;
  promptVersion: string;
  evidenceId: string;
  latencyMs: number;
}

const PROMPT_TEMPLATES: Record<string, { version: string; system: string; user: (ctx: Record<string, unknown>) => string }> = {
  classify_ledger_row: {
    version: "v1.0",
    system: [
      "You classify financial transactions for an Indonesian streetwear dropship business called NADI Streetwear.",
      "Categories: COGS - Raw Materials, COGS - Production Services, COGS - Packaging, Revenue - Online Sales, Revenue - Platform Settlement,",
      "Operating Expense - Shipping, Operating Expense - Marketing, Operating Expense - Warehouse, Other Expense, Other Revenue.",
      "Return ONLY valid JSON with no markdown wrapping. Schema:",
      '{"category": string, "confidence": number (0-1), "rationale": string}',
    ].join(" "),
    user: (ctx) =>
      `Classify this transaction: "${ctx.description ?? "Unknown"}", ` +
      `${ctx.debit ? `debit ${ctx.debit} IDR` : ""}${ctx.credit ? `credit ${ctx.credit} IDR` : ""}` +
      `${ctx.reference ? `, reference: ${ctx.reference}` : ""}.` +
      ` Return JSON: {"category": string, "confidence": number 0-1, "rationale": string}`,
  },

  draft_content_strategy: {
    version: "v1.0",
    system: [
      "You are a marketing strategist for NADI Streetwear, an Indonesian fashion dropship brand.",
      "Draft streetwear brand content strategies for Gen Z audience.",
      "Return ONLY valid JSON with no markdown. Schema:",
      '{"strategy": string, "platforms": string[], "confidence": number (0-1), "rationale": string}',
    ].join(" "),
    user: (ctx) =>
      `Create a content strategy for: ${ctx.topic ?? "weekly promotion"}. ` +
      `Available products: ${ctx.products ?? "oversized tees, cargo joggers, hoodies, caps, sling bags"}. ` +
      `Return JSON: {"strategy": string, "platforms": string[], "confidence": number, "rationale": string}`,
  },

  classify_order_action: {
    version: "v1.0",
    system: [
      "You are an order routing AI for NADI Streetwear, an Indonesian fashion dropship brand.",
      "Decide whether an incoming order should be fulfilled immediately or held for review.",
      "Consider: stock availability, order size, delivery address clarity, payment status.",
      "Return ONLY valid JSON with no markdown. Schema:",
      '{"action": "fulfill" | "hold", "confidence": number (0-1), "rationale": string}',
    ].join(" "),
    user: (ctx) =>
      `Route this order: ${ctx.orderId ?? "unknown"}, ` +
      `items: ${ctx.items ?? "assorted streetwear products"}, ` +
      `stock status: ${ctx.stockStatus ?? "available"}, ` +
      `channel: ${ctx.channel ?? "shopify"}.` +
      ` Return JSON: {"action": "fulfill" or "hold", "confidence": number 0-1, "rationale": string}`,
  },

  classify_general: {
    version: "v1.0",
    system: [
      "You are an AI decision node in NADI Workflow, an autonomous business orchestrator for NADI Streetwear.",
      "Analyze the input and return a structured classification.",
      "Return ONLY valid JSON with no markdown. Schema:",
      '{"classification": string, "confidence": number (0-1), "rationale": string}',
    ].join(" "),
    user: (ctx) =>
      `Analyze: ${JSON.stringify(ctx)}. ` +
      `Return JSON: {"classification": string, "confidence": number 0-1, "rationale": string}`,
  },
};

function extractJSON(text: string): Record<string, unknown> | null {
  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callPollinations(
  systemPrompt: string,
  userPrompt: string,
  model: string = "openai-large"
): Promise<{ content: string; model: string; latencyMs: number }> {
  const start = Date.now();

  const apiKey = process.env.POLLINATIONS_API_KEY;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const endpoint = apiKey
    ? "https://gen.pollinations.ai/v1/chat/completions"
    : "https://text.pollinations.ai/openai";
  const resolvedModel = apiKey ? model : "openai-fast";

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: resolvedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    throw new Error(`Pollinations API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  const usedModel = data.model ?? model;

  return { content, model: usedModel, latencyMs: Date.now() - start };
}

function generateStubResponse(task: string, context: Record<string, unknown>): LLMResponse {
  // Hash context for deterministic but diverse confidence values
  const contextStr = JSON.stringify(context);
  let hash = 0;
  for (let i = 0; i < contextStr.length; i++) {
    hash = ((hash << 5) - hash + contextStr.charCodeAt(i)) | 0;
  }
  const hashNorm = (Math.abs(hash) % 100) / 100;

  let confidence: number;
  if (task === "classify_ledger_row") {
    // Range 0.78–0.97: some transactions pass 0.90 threshold, some don't
    confidence = 0.78 + hashNorm * 0.19;
  } else if (task === "classify_order_action") {
    // Range 0.72–0.95
    confidence = 0.72 + hashNorm * 0.23;
  } else if (task === "draft_content_strategy") {
    confidence = 0.82 + hashNorm * 0.14;
  } else {
    confidence = 0.80 + hashNorm * 0.15;
  }
  confidence = Math.min(0.98, Math.max(0.60, confidence));

  const data: Record<string, unknown> = { confidence };

  if (task === "classify_ledger_row") {
    const desc = ((context.description as string) ?? "").toLowerCase();
    if (desc.includes("penjualan") || desc.includes("revenue") || desc.includes("shopify") || desc.includes("settlement")) {
      data.category = "Revenue - Online Sales";
    } else if (desc.includes("sablon") || desc.includes("jahit")) {
      data.category = "COGS - Production Services";
    } else if (desc.includes("packaging") || desc.includes("box")) {
      data.category = "COGS - Packaging";
    } else if (desc.includes("kain") || desc.includes("bahan") || desc.includes("pembelian")) {
      data.category = "COGS - Raw Materials";
    } else {
      data.category = "Other Expense";
    }
    data.classification = data.category;
  } else if (task === "classify_order_action") {
    const stockStatus = ((context.stockStatus as string) ?? "").toLowerCase();
    data.action = stockStatus.includes("low") || stockStatus.includes("out") ? "hold" : "fulfill";
    data.classification = data.action;
    data.category = data.action;
  } else if (task === "draft_content_strategy") {
    data.strategy = `Weekly ${(context.topic as string) ?? "streetwear"} campaign — target Gen Z via TikTok + IG Reels`;
    data.platforms = ["tiktok", "instagram", "shopee"];
    data.category = "content_strategy";
    data.classification = "content_strategy";
  } else {
    data.category = "auto_classified";
    data.classification = "auto_classified";
  }

  return {
    data,
    confidence,
    rationale: `Deterministic stub for task "${task}" — no LLM call made`,
    rawContent: "",
    provider: "stub",
    model: "deterministic-stub",
    promptVersion: PROMPT_TEMPLATES[task]?.version ?? "v0.0",
    evidenceId: generateEvidenceId(),
    latencyMs: 0,
  };
}

export type ProviderType = "stub" | "pollinations";

const globalForLLM = globalThis as unknown as { nadiLLMProvider?: ProviderType };

export function setProvider(provider: ProviderType) {
  globalForLLM.nadiLLMProvider = provider;
}

export function getProvider(): ProviderType {
  return globalForLLM.nadiLLMProvider ?? "stub";
}

export async function generateJSON(request: LLMRequest): Promise<LLMResponse> {
  const template = PROMPT_TEMPLATES[request.task] ?? PROMPT_TEMPLATES.classify_general;
  const context = request.context ?? {};

  if (getProvider() === "stub") {
    return generateStubResponse(request.task, context);
  }

  const systemPrompt = request.systemPrompt || template.system;
  const userPrompt = request.prompt || template.user(context);

  try {
    const { content, model, latencyMs } = await callPollinations(systemPrompt, userPrompt);

    const parsed = extractJSON(content);

    if (!parsed) {
      return {
        data: { raw: content, parseError: true },
        confidence: 0.0,
        rationale: "LLM returned non-JSON output — routed to review",
        rawContent: content,
        provider: "pollinations",
        model,
        promptVersion: template.version,
        evidenceId: generateEvidenceId(),
        latencyMs,
      };
    }

    const confidence = typeof parsed.confidence === "number"
      ? parsed.confidence
      : 0.5;

    return {
      data: parsed,
      confidence,
      rationale: (parsed.rationale as string) ?? "No rationale provided",
      rawContent: content,
      provider: "pollinations",
      model,
      promptVersion: template.version,
      evidenceId: generateEvidenceId(),
      latencyMs,
    };
  } catch (err) {
    console.error("LLM provider error, falling back to stub:", err);
    const stub = generateStubResponse(request.task, context);
    stub.rationale = `LLM call failed (${err instanceof Error ? err.message : "unknown"}), using stub fallback`;
    stub.provider = "pollinations-fallback";
    return stub;
  }
}
