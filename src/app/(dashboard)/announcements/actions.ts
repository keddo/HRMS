"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { notifyUsers } from "@/lib/notify";

const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  pinned: z.coerce.boolean().default(false),
});

export async function createAnnouncement(formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to post announcements.");

  const parsed = announcementSchema.parse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  });

  const announcement = await prisma.announcement.create({
    data: { ...parsed, authorId: session!.user.id },
  });

  const allUsers = await prisma.user.findMany({ select: { id: true } });
  await notifyUsers(allUsers.map((u) => u.id), {
    title: `New announcement: ${announcement.title}`,
    link: "/announcements",
  });

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncement(id: string) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to delete announcements.");

  await prisma.announcement.delete({ where: { id } });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}
