"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { uploadCompanyLogoBlob } from "@/lib/blob-storage";

async function requireAdmin() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) {
    throw new Error("You do not have permission to manage company settings.");
  }
  return session!;
}

// ---------- Company Profile ----------

const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const companyProfileSchema = z.object({
  companyName: z.string().min(1),
});

export async function updateCompanyProfile(formData: FormData) {
  const session = await requireAdmin();
  const parsed = companyProfileSchema.parse({ companyName: formData.get("companyName") });

  let logoUrl: string | undefined;
  const file = formData.get("logo");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_LOGO_SIZE) throw new Error("Logo image is too large (max 5MB).");
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      throw new Error("Please upload a PNG, JPEG, or WEBP image.");
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    logoUrl = await uploadCompanyLogoBlob(buffer, file.type);
  }

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: { companyName: parsed.companyName, ...(logoUrl ? { logoUrl } : {}) },
    create: { id: "singleton", companyName: parsed.companyName, logoUrl },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "CompanySettings",
    entityId: "singleton",
    summary: "Updated company profile",
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

// ---------- Security ----------

const securitySettingsSchema = z.object({
  minPasswordLength: z.coerce.number().int().min(6).max(64),
});

export async function updateSecuritySettings(formData: FormData) {
  const session = await requireAdmin();
  const parsed = securitySettingsSchema.parse({
    minPasswordLength: formData.get("minPasswordLength"),
  });

  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: { minPasswordLength: parsed.minPasswordLength },
    create: { id: "singleton", minPasswordLength: parsed.minPasswordLength },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "CompanySettings",
    entityId: "singleton",
    summary: `Set minimum password length to ${parsed.minPasswordLength}`,
  });

  revalidatePath("/settings");
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
