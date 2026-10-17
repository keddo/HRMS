"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) {
    throw new Error("You do not have permission to manage company settings.");
  }
  return session!;
}

// ---------- Leave Types ----------

const leaveTypeSchema = z.object({
  name: z.string().min(1),
  defaultDaysPerYear: z.coerce.number().int().min(0),
  isPaid: z.coerce.boolean(),
});

export async function createLeaveType(formData: FormData) {
  const session = await requireAdmin();
  const parsed = leaveTypeSchema.parse({
    name: formData.get("name"),
    defaultDaysPerYear: formData.get("defaultDaysPerYear"),
    isPaid: formData.get("isPaid") === "on",
  });

  const existing = await prisma.leaveType.findUnique({ where: { name: parsed.name } });
  if (existing) throw new Error("A leave type with this name already exists.");

  const leaveType = await prisma.leaveType.create({ data: parsed });

  await recordAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "LeaveType",
    entityId: leaveType.id,
    summary: `Created leave type ${leaveType.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/leave");
}

export async function updateLeaveType(id: string, formData: FormData) {
  const session = await requireAdmin();
  const parsed = leaveTypeSchema.parse({
    name: formData.get("name"),
    defaultDaysPerYear: formData.get("defaultDaysPerYear"),
    isPaid: formData.get("isPaid") === "on",
  });

  const existing = await prisma.leaveType.findUnique({ where: { name: parsed.name } });
  if (existing && existing.id !== id) {
    throw new Error("A leave type with this name already exists.");
  }

  await prisma.leaveType.update({ where: { id }, data: parsed });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "LeaveType",
    entityId: id,
    summary: `Updated leave type ${parsed.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/leave");
}

export async function setLeaveTypeActive(id: string, isActive: boolean) {
  const session = await requireAdmin();

  const leaveType = await prisma.leaveType.findUnique({ where: { id } });
  if (!leaveType) throw new Error("Leave type not found.");

  await prisma.leaveType.update({ where: { id }, data: { isActive } });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "LeaveType",
    entityId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} leave type ${leaveType.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/leave");
}

// ---------- Holidays ----------

const holidaySchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
});

export async function createHoliday(formData: FormData) {
  const session = await requireAdmin();
  const parsed = holidaySchema.parse({
    name: formData.get("name"),
    date: formData.get("date"),
  });

  const existing = await prisma.holiday.findUnique({ where: { date: new Date(parsed.date) } });
  if (existing) throw new Error("A holiday is already set on that date.");

  const holiday = await prisma.holiday.create({
    data: { name: parsed.name, date: new Date(parsed.date) },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Holiday",
    entityId: holiday.id,
    summary: `Added holiday ${holiday.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/leave");
  revalidatePath("/attendance");
}

export async function deleteHoliday(id: string) {
  const session = await requireAdmin();

  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday) throw new Error("Holiday not found.");

  await prisma.holiday.delete({ where: { id } });

  await recordAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Holiday",
    entityId: id,
    summary: `Removed holiday ${holiday.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/leave");
  revalidatePath("/attendance");
}

// ---------- Pay Components ----------

const payComponentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["EARNING", "DEDUCTION"]),
  isPercentage: z.coerce.boolean(),
  defaultValue: z.coerce.number().min(0),
});

export async function createPayComponent(formData: FormData) {
  const session = await requireAdmin();
  const parsed = payComponentSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    isPercentage: formData.get("isPercentage") === "on",
    defaultValue: formData.get("defaultValue"),
  });

  const existing = await prisma.payComponent.findUnique({ where: { name: parsed.name } });
  if (existing) throw new Error("A pay component with this name already exists.");

  const component = await prisma.payComponent.create({ data: parsed });

  await recordAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "PayComponent",
    entityId: component.id,
    summary: `Created pay component ${component.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/payroll");
}

export async function updatePayComponent(id: string, formData: FormData) {
  const session = await requireAdmin();
  const parsed = payComponentSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    isPercentage: formData.get("isPercentage") === "on",
    defaultValue: formData.get("defaultValue"),
  });

  const existing = await prisma.payComponent.findUnique({ where: { name: parsed.name } });
  if (existing && existing.id !== id) {
    throw new Error("A pay component with this name already exists.");
  }

  await prisma.payComponent.update({ where: { id }, data: parsed });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "PayComponent",
    entityId: id,
    summary: `Updated pay component ${parsed.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/payroll");
}

export async function setPayComponentActive(id: string, isActive: boolean) {
  const session = await requireAdmin();

  const component = await prisma.payComponent.findUnique({ where: { id } });
  if (!component) throw new Error("Pay component not found.");

  await prisma.payComponent.update({ where: { id }, data: { isActive } });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "PayComponent",
    entityId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} pay component ${component.name}`,
  });

  revalidatePath("/settings");
  revalidatePath("/payroll");
}
