import { prisma } from "@/lib/prisma";

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

export async function recordAudit(params: {
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
}) {
  await prisma.auditLog.create({ data: params });
}
