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
      "You classify financial transactions for an Indonesian MSME coffee business called Kopi Nadi.",
      "Categories: COGS - Raw Materials, Revenue - Online Sales, Revenue - Platform Settlement,",
      "Revenue - Walk-in, Operating Expense - Utilities, Operating Expense - Rent,",
      "Operating Expense - Wages, Operating Expense - Marketing, Other Expense, Other Revenue.",
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
      "You are a marketing strategist for Kopi Nadi, an Indonesian coffee MSME.",
      "Draft concise social media content strategies.",
      "Return ONLY valid JSON with no markdown. Schema:",
      '{"strategy": string, "platforms": string[], "confidence": number (0-1), "rationale": string}',
    ].join(" "),
    user: (ctx) =>
      `Create a content strategy for: ${ctx.topic ?? "weekly promotion"}. ` +
      `Available products: ${ctx.products ?? "coffee, latte, matcha"}. ` +
      `Return JSON: {"strategy": string, "platforms": string[], "confidence": number, "rationale": string}`,
  },

  classify_general: {
    version: "v1.0",
    system: [
      "You are an AI decision node in NADI Workflow, an autonomous business orchestrator.",
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
  model: string = "openai"
): Promise<{ content: string; model: string; latencyMs: number }> {
  const start = Date.now();

  const res = await fetch("https://text.pollinations.ai/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
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
  const baseConfidence = 0.85 + ((task.length + JSON.stringify(context).length) % 10) * 0.012;
  const confidence = Math.min(0.98, Math.max(0.60, baseConfidence));

  const categoryMap: Record<string, string> = {
    classify_ledger_row: "COGS - Raw Materials",
    draft_content_strategy: "Weekly social media push",
    classify_general: "auto_classified",
  };

  return {
    data: {
      category: categoryMap[task] ?? "unclassified",
      classification: categoryMap[task] ?? "auto_classified",
      confidence,
    },
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
