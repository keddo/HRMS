"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dates";
import { assertEmployeeExists } from "@/lib/session";

const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 15;

export async function clockIn() {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");
  await assertEmployeeExists(session.user.employeeId);

  const today = startOfDay(new Date());
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: session.user.employeeId, date: today } },
  });
  if (existing?.clockIn) throw new Error("You have already clocked in today.");

  const isLate =
    now.getHours() > LATE_THRESHOLD_HOUR ||
    (now.getHours() === LATE_THRESHOLD_HOUR && now.getMinutes() > LATE_THRESHOLD_MINUTE);

  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId: session.user.employeeId, date: today } },
    update: { clockIn: now, status: isLate ? "LATE" : "PRESENT" },
    create: {
      employeeId: session.user.employeeId,
      date: today,
      clockIn: now,
      status: isLate ? "LATE" : "PRESENT",
    },
  });

  revalidatePath("/attendance");
}

export async function clockOut() {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");
  await assertEmployeeExists(session.user.employeeId);

  const today = startOfDay(new Date());
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: session.user.employeeId, date: today } },
  });
  if (!existing?.clockIn) throw new Error("You haven't clocked in today.");
  if (existing.clockOut) throw new Error("You have already clocked out today.");

  await prisma.attendance.update({
    where: { employeeId_date: { employeeId: session.user.employeeId, date: today } },
    data: { clockOut: new Date() },
  });

  revalidatePath("/attendance");
}
