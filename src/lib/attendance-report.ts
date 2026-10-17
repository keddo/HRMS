import { prisma } from "@/lib/prisma";
import { addDays, isWeekday, startOfDay } from "@/lib/dates";

export type AttendanceRecord = {
  employeeId: string;
  date: Date;
  status: string;
  clockIn: Date | null;
  clockOut: Date | null;
};

export type LeaveRange = {
  employeeId: string;
  startDate: Date;
  endDate: Date;
};

export type EmployeeRef = {
  id: string;
  firstName: string;
  lastName: string;
};

/** A day's resolved attendance for one employee: a stored record, an approved leave day, an
 * inferred absence (past weekday with neither), or null (future date or weekend — not counted). */
export type DayStatus = "PRESENT" | "LATE" | "HALF_DAY" | "ON_LEAVE" | "ABSENT" | null;

function isOnApprovedLeave(employeeId: string, date: Date, leaveRanges: LeaveRange[]): boolean {
  return leaveRanges.some(
    (r) => r.employeeId === employeeId && date >= startOfDay(r.startDate) && date <= startOfDay(r.endDate)
  );
}

/** Resolves a single employee/day cell, used by both the weekly grid and the monthly summary. */
export function resolveDayStatus(
  employeeId: string,
  date: Date,
  attendance: AttendanceRecord[],
  leaveRanges: LeaveRange[],
  today: Date
): DayStatus {
  const day = startOfDay(date);
  const record = attendance.find(
    (a) => a.employeeId === employeeId && startOfDay(a.date).getTime() === day.getTime()
  );
  if (record) return record.status as DayStatus;
  if (isOnApprovedLeave(employeeId, day, leaveRanges)) return "ON_LEAVE";
  if (day > today || !isWeekday(day)) return null;
  return "ABSENT";
}

export type EmployeeAttendanceSummary = {
  employeeId: string;
  employeeName: string;
  present: number;
  late: number;
  halfDay: number;
  onLeave: number;
  absent: number;
  totalHours: number;
};

/** Per-employee counts over [periodStart, periodEnd] (inclusive), for the monthly summary and exports. */
export function summarizeAttendance(
  employees: EmployeeRef[],
  attendance: AttendanceRecord[],
  leaveRanges: LeaveRange[],
  periodStart: Date,
  periodEnd: Date
): EmployeeAttendanceSummary[] {
  const today = startOfDay(new Date());
  const end = startOfDay(periodEnd);

  return employees.map((emp) => {
    const summary: EmployeeAttendanceSummary = {
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      present: 0,
      late: 0,
      halfDay: 0,
      onLeave: 0,
      absent: 0,
      totalHours: 0,
    };

    for (let d = startOfDay(periodStart); d <= end; d = addDays(d, 1)) {
      const status = resolveDayStatus(emp.id, d, attendance, leaveRanges, today);
      if (status === "PRESENT") summary.present++;
      else if (status === "LATE") summary.late++;
      else if (status === "HALF_DAY") summary.halfDay++;
      else if (status === "ON_LEAVE") summary.onLeave++;
      else if (status === "ABSENT") summary.absent++;
    }

    summary.totalHours = attendance
      .filter(
        (a) =>
          a.employeeId === emp.id &&
          a.clockIn &&
          a.clockOut &&
          startOfDay(a.date) >= startOfDay(periodStart) &&
          startOfDay(a.date) <= end
      )
      .reduce((sum, a) => sum + (a.clockOut!.getTime() - a.clockIn!.getTime()) / 3_600_000, 0);
    summary.totalHours = Math.round(summary.totalHours * 10) / 10;

    return summary;
  });
}

/** Fetches everything `summarizeAttendance`/`buildWeeklyGrid` need for one period, scoped by an
 * optional employee filter (e.g. `{ managerId }` for a manager's team, `{ id }` for just one person). */
export async function fetchAttendancePeriodData(
  periodStart: Date,
  periodEnd: Date,
  employeeFilter?: Record<string, unknown>
) {
  const employees = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE", ...employeeFilter },
    select: { id: true, firstName: true, lastName: true },
    orderBy: { firstName: "asc" },
  });
  const employeeIds = employees.map((e) => e.id);

  const [attendance, leaveRequests] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: { in: employeeIds }, date: { gte: periodStart, lte: periodEnd } },
      select: { employeeId: true, date: true, status: true, clockIn: true, clockOut: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId: { in: employeeIds },
        status: "APPROVED",
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
      },
      select: { employeeId: true, startDate: true, endDate: true },
    }),
  ]);

  const leaveRanges: LeaveRange[] = leaveRequests.map((r) => ({
    employeeId: r.employeeId,
    startDate: r.startDate,
    endDate: r.endDate,
  }));

  return { employees, attendance, leaveRanges };
}

export type EmployeeWeekRow = {
  employeeId: string;
  employeeName: string;
  days: DayStatus[];
};

/** Per-employee, per-day statuses for a Mon-Sun week, for the weekly grid and export. */
export function buildWeeklyGrid(
  employees: EmployeeRef[],
  attendance: AttendanceRecord[],
  leaveRanges: LeaveRange[],
  weekStart: Date
): EmployeeWeekRow[] {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(weekStart), i));

  return employees.map((emp) => ({
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    days: days.map((d) => resolveDayStatus(emp.id, d, attendance, leaveRanges, today)),
  }));
}
