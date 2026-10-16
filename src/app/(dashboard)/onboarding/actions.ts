"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { assertUserExists } from "@/lib/session";

const assignSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["ONBOARDING", "OFFBOARDING"]),
});

export async function assignChecklist(formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to assign checklists.");

  const parsed = assignSchema.parse({
    employeeId: formData.get("employeeId"),
    type: formData.get("type"),
  });

  const template = await prisma.checklistTemplate.findFirst({
    where: { type: parsed.type },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!template) throw new Error(`No ${parsed.type.toLowerCase()} template is configured.`);

  await prisma.employeeChecklist.create({
    data: {
      employeeId: parsed.employeeId,
      type: parsed.type,
      items: {
        createMany: {
          data: template.items.map((i) => ({ title: i.title, order: i.order })),
        },
      },
    },
  });

  revalidatePath("/onboarding");
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to update checklists.");
  await assertUserExists(session!.user.id);

  const item = await prisma.employeeChecklistItem.update({
    where: { id: itemId },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
      completedById: completed ? session!.user.id : null,
    },
  });

  const remaining = await prisma.employeeChecklistItem.count({
    where: { checklistId: item.checklistId, completed: false },
  });

  await prisma.employeeChecklist.update({
    where: { id: item.checklistId },
    data: { status: remaining === 0 ? "COMPLETED" : "IN_PROGRESS" },
  });

  revalidatePath("/onboarding");
}
