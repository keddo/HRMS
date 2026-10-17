"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAbove } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";

async function requireManagerOrAbove() {
  const session = await auth();
  if (!isManagerOrAbove(session?.user.role)) {
    throw new Error("You do not have permission to manage the organization.");
  }
  return session!;
}

const CODE_REGEX = /^[A-Z0-9-]+$/;
const codeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(CODE_REGEX, "Capital letters, digits and dashes only, e.g. SALES.")
  .optional()
  .or(z.literal(""));

// ---------- Departments ----------

const departmentSchema = z.object({
  name: z.string().min(1),
  code: codeSchema,
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export async function createDepartment(formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = departmentSchema.parse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    description: formData.get("description") || undefined,
    parentId: formData.get("parentId") || undefined,
  });

  const existing = await prisma.department.findUnique({ where: { name: parsed.name } });
  if (existing) throw new Error("A department with this name already exists.");

  const department = await prisma.department.create({
    data: {
      name: parsed.name,
      code: parsed.code || null,
      description: parsed.description || null,
      parentId: parsed.parentId || null,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Department",
    entityId: department.id,
    summary: `Created department ${department.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

export async function updateDepartment(id: string, formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = departmentSchema.parse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    description: formData.get("description") || undefined,
    parentId: formData.get("parentId") || undefined,
  });

  if (parsed.parentId === id) {
    throw new Error("A department can't be its own parent.");
  }

  const existing = await prisma.department.findUnique({ where: { name: parsed.name } });
  if (existing && existing.id !== id) {
    throw new Error("A department with this name already exists.");
  }

  await prisma.department.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code || null,
      description: parsed.description || null,
      parentId: parsed.parentId || null,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Department",
    entityId: id,
    summary: `Updated department ${parsed.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

export async function setDepartmentActive(id: string, isActive: boolean) {
  const session = await requireManagerOrAbove();

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) throw new Error("Department not found.");

  await prisma.department.update({ where: { id }, data: { isActive } });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Department",
    entityId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} department ${department.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

// ---------- Positions ----------

const positionSchema = z.object({
  title: z.string().min(1),
  departmentId: z.string().optional(),
  level: z.coerce.number().int().positive().default(1),
});

export async function createPosition(formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = positionSchema.parse({
    title: formData.get("title"),
    departmentId: formData.get("departmentId") || undefined,
    level: formData.get("level") || undefined,
  });

  const existing = parsed.departmentId
    ? await prisma.position.findUnique({
        where: { title_departmentId: { title: parsed.title, departmentId: parsed.departmentId } },
      })
    : await prisma.position.findFirst({ where: { title: parsed.title, departmentId: null } });
  if (existing) throw new Error("This position already exists there.");

  const position = await prisma.position.create({
    data: {
      title: parsed.title,
      departmentId: parsed.departmentId || null,
      level: parsed.level,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "Position",
    entityId: position.id,
    summary: `Created position ${position.title}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

export async function updatePosition(id: string, formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = positionSchema.parse({
    title: formData.get("title"),
    departmentId: formData.get("departmentId") || undefined,
    level: formData.get("level") || undefined,
  });

  const existing = parsed.departmentId
    ? await prisma.position.findUnique({
        where: { title_departmentId: { title: parsed.title, departmentId: parsed.departmentId } },
      })
    : await prisma.position.findFirst({ where: { title: parsed.title, departmentId: null } });
  if (existing && existing.id !== id) throw new Error("This position already exists there.");

  await prisma.position.update({
    where: { id },
    data: {
      title: parsed.title,
      departmentId: parsed.departmentId || null,
      level: parsed.level,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Position",
    entityId: id,
    summary: `Updated position ${parsed.title}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

export async function setPositionActive(id: string, isActive: boolean) {
  const session = await requireManagerOrAbove();

  const position = await prisma.position.findUnique({ where: { id } });
  if (!position) throw new Error("Position not found.");

  await prisma.position.update({ where: { id }, data: { isActive } });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Position",
    entityId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} position ${position.title}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

// ---------- Work Locations ----------

const workLocationKindEnum = z.enum(["HEAD_OFFICE", "BRANCH", "REGION", "OTHER"]);

const workLocationSchema = z.object({
  name: z.string().min(1),
  code: codeSchema,
  kind: workLocationKindEnum.default("OTHER"),
  address: z.string().optional(),
});

export async function createWorkLocation(formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = workLocationSchema.parse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    kind: formData.get("kind") || undefined,
    address: formData.get("address") || undefined,
  });

  const existing = await prisma.workLocation.findUnique({ where: { name: parsed.name } });
  if (existing) throw new Error("A work location with this name already exists.");

  const location = await prisma.workLocation.create({
    data: {
      name: parsed.name,
      code: parsed.code || null,
      kind: parsed.kind,
      address: parsed.address || null,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "WorkLocation",
    entityId: location.id,
    summary: `Created work location ${location.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

export async function updateWorkLocation(id: string, formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = workLocationSchema.parse({
    name: formData.get("name"),
    code: formData.get("code") || undefined,
    kind: formData.get("kind") || undefined,
    address: formData.get("address") || undefined,
  });

  const existing = await prisma.workLocation.findUnique({ where: { name: parsed.name } });
  if (existing && existing.id !== id) {
    throw new Error("A work location with this name already exists.");
  }

  await prisma.workLocation.update({
    where: { id },
    data: {
      name: parsed.name,
      code: parsed.code || null,
      kind: parsed.kind,
      address: parsed.address || null,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "WorkLocation",
    entityId: id,
    summary: `Updated work location ${parsed.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

export async function setWorkLocationActive(id: string, isActive: boolean) {
  const session = await requireManagerOrAbove();

  const location = await prisma.workLocation.findUnique({ where: { id } });
  if (!location) throw new Error("Work location not found.");

  await prisma.workLocation.update({ where: { id }, data: { isActive } });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "WorkLocation",
    entityId: id,
    summary: `${isActive ? "Reactivated" : "Deactivated"} work location ${location.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}
