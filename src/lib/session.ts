import { prisma } from "@/lib/prisma";

const STALE_SESSION_MESSAGE = "Your session is out of date. Please sign out and sign in again.";

/** Throws a friendly error if the session's employeeId no longer exists (e.g. after a database reseed). */
export async function assertEmployeeExists(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true },
  });
  if (!employee) throw new Error(STALE_SESSION_MESSAGE);
}

/** Throws a friendly error if the session's user id no longer exists (e.g. after a database reseed). */
export async function assertUserExists(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new Error(STALE_SESSION_MESSAGE);
}
