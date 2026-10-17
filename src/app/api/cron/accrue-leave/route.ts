import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Monthly leave accrual. Vercel Cron calls this via GET, automatically attaching
 * `Authorization: Bearer $CRON_SECRET` (see vercel.json). A host-level cron elsewhere
 * can call it manually the same way:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/accrue-leave
 *
 * Adds (defaultDaysPerYear / 12) to each active employee's allocated balance for every
 * paid leave type, for the current year. Safe to call more than once in the same month
 * only if you don't mind double-accrual — schedule it monthly, not more often.
 */
async function handleAccrual(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const year = new Date().getFullYear();
  const [employees, leaveTypes] = await Promise.all([
    prisma.employee.findMany({ where: { employmentStatus: "ACTIVE" }, select: { id: true } }),
    prisma.leaveType.findMany({
      where: { isPaid: true, defaultDaysPerYear: { gt: 0 }, isActive: true },
    }),
  ]);

  let updated = 0;
  for (const employee of employees) {
    for (const leaveType of leaveTypes) {
      const monthlyAccrual = leaveType.defaultDaysPerYear / 12;
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            year,
          },
        },
        update: { allocatedDays: { increment: monthlyAccrual } },
        create: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          year,
          allocatedDays: monthlyAccrual,
          usedDays: 0,
        },
      });
      updated++;
    }
  }

  return NextResponse.json({ ok: true, employees: employees.length, leaveTypes: leaveTypes.length, updated });
}

export const GET = handleAccrual;
export const POST = handleAccrual;
