import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { generateEvidenceId } from "@/lib/utils";

/* -- Indonesian CSV header mapping -------------------------------- */
const HEADER_MAP: Record<string, string> = {
  tanggal: "date",
  tgl: "date",
  date: "date",
  keterangan: "description",
  uraian: "description",
  description: "description",
  debit: "debit",
  debet: "debit",
  kredit: "credit",
  credit: "credit",
  referensi: "reference",
  ref: "reference",
  reference: "reference",
  nomor: "reference",
  no: "reference",
  saldo: "balance",
  balance: "balance",
};

/* -- Stub AI classifier (deterministic keyword matching) ---------- */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Revenue - Online Sales": ["shopee", "tokopedia", "shopify", "penjualan", "sale", "order", "payment received", "switching cr"],
  "COGS - Raw Materials": ["bahan", "kain", "cotton", "benang", "resleting", "zipper", "raw material"],
  "COGS - Production Services": ["sablon", "printing", "jahit", "sewing"],
  "COGS - Packaging": ["kemasan", "packaging"],
  "Operating Expense - General": ["gaji", "salary", "listrik", "electric", "sewa", "rent", "internet", "transport", "grab", "gojek"],
  "Marketing Expense": ["iklan", "ads", "promo", "diskon", "discount", "campaign", "meta", "google ads"],
  "Logistics - Shipping": ["ongkir", "shipping", "jne", "jnt", "sicepat", "anteraja", "kurir", "courier"],
  "Tax & Compliance": ["pajak", "ppn", "pph", "tax"],
  "Other": [],
};

function classifyTransaction(description: string): { category: string; confidence: number; rationale: string } {
  const desc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "Other") continue;
    for (const kw of keywords) {
      if (desc.includes(kw)) {
        return {
          category,
          confidence: 0.92,
          rationale: `Keyword "${kw}" matched category "${category}"`,
        };
      }
    }
  }

  return {
    category: "Other",
    confidence: 0.35,
    rationale: "No keyword match found — requires human review",
  };
}

/* -- Helpers ------------------------------------------------------- */
function normalizeHeaders(raw: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw)) {
    const clean = key.trim().toLowerCase().replace(/[^a-z]/g, "");
    const mapped = HEADER_MAP[clean];
    if (mapped) normalized[mapped] = val?.trim() ?? "";
  }
  return normalized;
}

function parseIDR(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^\d.,\-]/g, "").replace(/\./g, "").replace(",", ".");
  return Math.round(Number(cleaned) || 0);
}

function parseDate(val: string): Date {
  const ddmm = val.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (ddmm) {
    const year = ddmm[3].length === 2 ? `20${ddmm[3]}` : ddmm[3];
    return new Date(`${year}-${ddmm[2].padStart(2, "0")}-${ddmm[1].padStart(2, "0")}T00:00:00Z`);
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/* -- Confidence threshold from active policy ---------------------- */
async function getConfidenceThreshold(): Promise<number> {
  const policy = await prisma.policy.findFirst({
    where: { isActive: true },
    orderBy: { version: "desc" },
  });
  return policy?.confidenceThreshold ?? 0.9;
}

/* -- POST /api/finance/import-csv --------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: Record<string, string>[] = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const batchId = `BATCH-${Date.now()}`;
    const threshold = await getConfidenceThreshold();

    const results = { posted: 0, review: 0, skipped: 0, duplicates: 0, entries: [] as Array<{ description: string; category: string; confidence: number; status: string }> };

    const existingTxns = await prisma.transactionRaw.findMany({
      select: { date: true, description: true, debit: true, credit: true },
    });
    const existingRefs = new Set<string>(
      existingTxns.map(t => `${t.date.toISOString().slice(0, 10)}-${t.description}-${t.debit}-${t.credit}`)
    );

    for (const rawRow of rows) {
      const row = normalizeHeaders(rawRow);

      if (!row.date || !row.description) {
        results.skipped++;
        continue;
      }

      const debit = parseIDR(row.debit);
      const credit = parseIDR(row.credit);

      if (debit === 0 && credit === 0) {
        results.skipped++;
        continue;
      }

      const parsedDate = parseDate(row.date);
      const dedupKey = `${parsedDate.toISOString().slice(0, 10)}-${row.description}-${debit}-${credit}`;
      if (existingRefs.has(dedupKey)) {
        results.duplicates++;
        results.skipped++;
        continue;
      }
      existingRefs.add(dedupKey);

      const txn = await prisma.transactionRaw.create({
        data: {
          date: parseDate(row.date),
          description: row.description,
          debit,
          credit,
          reference: row.reference || null,
          source: "csv",
          importBatch: batchId,
        },
      });

      const classification = classifyTransaction(row.description);
      const evidenceId = generateEvidenceId();

      if (classification.confidence >= threshold) {
        await prisma.ledgerEntry.create({
          data: {
            transactionId: txn.id,
            category: classification.category,
            confidence: classification.confidence,
            evidenceId,
            status: "posted",
            aiRationale: classification.rationale,
          },
        });

        results.posted++;
        results.entries.push({
          description: row.description,
          category: classification.category,
          confidence: classification.confidence,
          status: "posted",
        });
      } else {
        await prisma.ledgerEntry.create({
          data: {
            transactionId: txn.id,
            category: classification.category,
            confidence: classification.confidence,
            evidenceId,
            status: "needs_review",
            aiRationale: classification.rationale,
          },
        });

        await prisma.reviewItem.create({
          data: {
            sourceType: "ledger_entry",
            sourceId: txn.id,
            suggestedJson: JSON.stringify({
              category: classification.category,
              confidence: classification.confidence,
              rationale: classification.rationale,
              description: row.description,
              debit,
              credit,
            }),
            confidence: classification.confidence,
            status: "pending",
          },
        });

        results.review++;
        results.entries.push({
          description: row.description,
          category: classification.category,
          confidence: classification.confidence,
          status: "needs_review",
        });
      }
    }

    await writeAudit({
      eventType: "finance.csv_import",
      actor: "operator",
      targetType: "batch",
      targetId: batchId,
      summary: `CSV import: ${results.posted} posted, ${results.review} to review, ${results.skipped} skipped`,
      afterJson: {
        batchId,
        totalRows: rows.length,
        posted: results.posted,
        review: results.review,
        skipped: results.skipped,
      },
      evidenceJson: {
        threshold,
        classifierType: "keyword_stub",
      },
    });

    return NextResponse.json({
      batchId,
      posted: results.posted,
      review: results.review,
      skipped: results.skipped,
      duplicates: results.duplicates,
      entries: results.entries,
      total: rows.length,
    });
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
