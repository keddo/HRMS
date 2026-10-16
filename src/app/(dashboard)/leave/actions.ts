"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canApproveFor } from "@/lib/rbac";
import { countWeekdays } from "@/lib/dates";
import { assertEmployeeExists, assertUserExists } from "@/lib/session";
import { notifyUser } from "@/lib/notify";
import { recordAudit } from "@/lib/audit";

const requestLeaveSchema = z.object({
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});

export async function requestLeave(formData: FormData) {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");
  await assertEmployeeExists(session.user.employeeId);

  const parsed = requestLeaveSchema.parse({
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    reason: formData.get("reason") || undefined,
  });

  const start = new Date(parsed.startDate);
  const end = new Date(parsed.endDate);
  if (end < start) throw new Error("End date must be after start date.");

  const days = countWeekdays(start, end);
  if (days <= 0) throw new Error("Selected range contains no working days.");

  const year = start.getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: session.user.employeeId,
        leaveTypeId: parsed.leaveTypeId,
        year,
      },
    },
  });

  if (balance && balance.allocatedDays - balance.usedDays < days) {
    throw new Error(
      `Insufficient balance: ${balance.allocatedDays - balance.usedDays} day(s) remaining.`
    );
  }

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: session.user.employeeId },
    select: { firstName: true, lastName: true, manager: { select: { user: { select: { id: true } } } } },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: session.user.employeeId,
      leaveTypeId: parsed.leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      reason: parsed.reason,
    },
  });

  if (employee.manager?.user) {
    await notifyUser(employee.manager.user.id, {
      title: `${employee.firstName} ${employee.lastName} requested leave`,
      body: `${days} day(s) from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
      link: "/leave",
    });
  }

  revalidatePath("/leave");
}

export async function cancelLeaveRequest(requestId: string) {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");

  const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
  if (!request || request.employeeId !== session.user.employeeId) {
    throw new Error("Request not found.");
  }
  if (request.status !== "PENDING") {
    throw new Error("Only pending requests can be cancelled.");
  }

  await prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });

  revalidatePath("/leave");
}

export async function decideLeaveRequest(requestId: string, decision: "APPROVED" | "REJECTED") {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  await assertUserExists(session.user.id);

  const request = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: { employee: { include: { user: true } } },
  });
  if (!request) throw new Error("Request not found.");
  if (request.status !== "PENDING") throw new Error("Request has already been decided.");

  const authorized = canApproveFor(
    session.user.role,
    session.user.employeeId,
    request.employee.managerId
  );
  if (!authorized) throw new Error("You are not authorized to decide this request.");

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: requestId },
      data: { status: decision, approverId: session.user.id, decidedAt: new Date() },
    });

    if (decision === "APPROVED") {
      const year = request.startDate.getFullYear();
      await tx.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year,
          },
        },
        update: { usedDays: { increment: request.days } },
        create: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          year,
          allocatedDays: 0,
          usedDays: request.days,
        },
      });
    }
  });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "LeaveRequest",
    entityId: requestId,
    summary: `${decision} leave request for ${request.employee.firstName} ${request.employee.lastName}`,
  });

  if (request.employee.user) {
    await notifyUser(request.employee.user.id, {
      title: `Your leave request was ${decision.toLowerCase()}`,
      link: "/leave",
    });
  }

  revalidatePath("/leave");
}
