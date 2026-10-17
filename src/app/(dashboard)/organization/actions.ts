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
    throw new Error("You do not have permission to manage organization settings.");
  }
  return session!;
}

const departmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function createDepartment(formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = departmentSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  const existing = await prisma.department.findUnique({ where: { name: parsed.name } });
  if (existing) throw new Error("A department with this name already exists.");

  const department = await prisma.department.create({
    data: { name: parsed.name, description: parsed.description || null },
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

export async function deleteDepartment(id: string) {
  const session = await requireManagerOrAbove();

  const department = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { employees: true, positions: true } } },
  });
  if (!department) throw new Error("Department not found.");
  if (department._count.employees > 0 || department._count.positions > 0) {
    throw new Error(
      "Can't delete a department that still has employees or positions assigned to it."
    );
  }

  await prisma.department.delete({ where: { id } });

  await recordAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Department",
    entityId: id,
    summary: `Deleted department ${department.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

const positionSchema = z.object({
  title: z.string().min(1),
  departmentId: z.string().min(1),
  level: z.coerce.number().int().positive().default(1),
});

export async function createPosition(formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = positionSchema.parse({
    title: formData.get("title"),
    departmentId: formData.get("departmentId"),
    level: formData.get("level") || undefined,
  });

  const existing = await prisma.position.findUnique({
    where: { title_departmentId: { title: parsed.title, departmentId: parsed.departmentId } },
  });
  if (existing) throw new Error("This position already exists in that department.");

  const position = await prisma.position.create({
    data: { title: parsed.title, departmentId: parsed.departmentId, level: parsed.level },
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

export async function deletePosition(id: string) {
  const session = await requireManagerOrAbove();

  const position = await prisma.position.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });
  if (!position) throw new Error("Position not found.");
  if (position._count.employees > 0) {
    throw new Error("Can't delete a position that still has employees assigned to it.");
  }

  await prisma.position.delete({ where: { id } });

  await recordAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "Position",
    entityId: id,
    summary: `Deleted position ${position.title}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}

const workLocationSchema = z.object({
  name: z.string().min(1),
});

export async function createWorkLocation(formData: FormData) {
  const session = await requireManagerOrAbove();
  const parsed = workLocationSchema.parse({ name: formData.get("name") });

  const existing = await prisma.workLocation.findUnique({ where: { name: parsed.name } });
  if (existing) throw new Error("A work location with this name already exists.");

  const location = await prisma.workLocation.create({ data: { name: parsed.name } });

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

export async function deleteWorkLocation(id: string) {
  const session = await requireManagerOrAbove();

  const location = await prisma.workLocation.findUnique({
    where: { id },
    include: { _count: { select: { employees: true } } },
  });
  if (!location) throw new Error("Work location not found.");
  if (location._count.employees > 0) {
    throw new Error("Can't delete a work location that still has employees assigned to it.");
  }

  await prisma.workLocation.delete({ where: { id } });

  await recordAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "WorkLocation",
    entityId: id,
    summary: `Deleted work location ${location.name}`,
  });

  revalidatePath("/organization");
  revalidatePath("/employees/new");
}
