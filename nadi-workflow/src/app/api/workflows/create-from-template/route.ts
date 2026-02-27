import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { sourceTemplateId, templateId, name, description } = await req.json();
    const resolvedTemplateId = sourceTemplateId ?? templateId;

    if (!resolvedTemplateId || !name) {
      return NextResponse.json(
        { error: "templateId or sourceTemplateId and name are required" },
        { status: 400 }
      );
    }

    const source = await prisma.workflowTemplate.findUnique({
      where: { id: resolvedTemplateId },
    });

    if (!source) {
      return NextResponse.json({ error: "Source template not found" }, { status: 404 });
    }

    const newTemplate = await prisma.workflowTemplate.create({
      data: {
        name,
        description: description ?? source.description,
        version: 1,
        configJson: source.configJson,
        isActive: true,
      },
    });

    await writeAudit({
      eventType: "workflow_template_created",
      actor: "user",
      targetType: "workflow_template",
      targetId: newTemplate.id,
      summary: `Created workflow "${name}" from template "${source.name}"`,
      afterJson: {
        id: newTemplate.id,
        name: newTemplate.name,
        sourceTemplateId,
        sourceTemplateName: source.name,
      },
    });

    return NextResponse.json({
      id: newTemplate.id,
      name: newTemplate.name,
      description: newTemplate.description,
      version: newTemplate.version,
      configJson: JSON.parse(newTemplate.configJson),
      isActive: newTemplate.isActive,
      createdAt: newTemplate.createdAt,
    });
  } catch (err) {
    console.error("Create from template error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Creation failed" },
      { status: 500 }
    );
  }
}
