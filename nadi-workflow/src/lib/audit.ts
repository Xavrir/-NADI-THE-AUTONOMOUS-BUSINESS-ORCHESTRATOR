import { prisma } from "@/lib/db";
import { generateEvidenceId } from "@/lib/utils";

interface AuditEntry {
  eventType: string;
  actor?: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  beforeJson?: unknown;
  afterJson?: unknown;
  evidenceJson?: unknown;
  policyJson?: unknown;
  runId?: string;
  approvalId?: string;
}

export async function writeAudit(entry: AuditEntry) {
  const evidenceId = generateEvidenceId();

  const evidencePayload = {
    evidenceId,
    ...(typeof entry.evidenceJson === "object" && entry.evidenceJson !== null
      ? entry.evidenceJson
      : {}),
  };

  return prisma.auditLog.create({
    data: {
      eventType: entry.eventType,
      actor: entry.actor ?? "system",
      targetType: entry.targetType,
      targetId: entry.targetId,
      summary: entry.summary,
      beforeJson: entry.beforeJson ? JSON.stringify(entry.beforeJson) : null,
      afterJson: entry.afterJson ? JSON.stringify(entry.afterJson) : null,
      evidenceJson: JSON.stringify(evidencePayload),
      policyJson: entry.policyJson ? JSON.stringify(entry.policyJson) : null,
      runId: entry.runId,
      approvalId: entry.approvalId,
    },
  });
}
