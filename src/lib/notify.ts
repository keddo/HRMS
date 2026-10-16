import { prisma } from "@/lib/prisma";

export async function notifyUsers(
  userIds: string[],
  data: { title: string; body?: string; link?: string }
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...data })),
  });
}

export async function notifyUser(userId: string, data: { title: string; body?: string; link?: string }) {
  await notifyUsers([userId], data);
}
