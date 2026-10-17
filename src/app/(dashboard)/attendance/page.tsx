import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isManagerOrAbove } from "@/lib/rbac";
import { addDays, startOfDay, startOfWeek, startOfMonth, endOfMonth } from "@/lib/dates";
import {
  fetchAttendancePeriodData,
  summarizeAttendance,
  buildWeeklyGrid,
} from "@/lib/attendance-report";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClockWidget } from "@/components/attendance/clock-widget";
import { AttendanceTable, type AttendanceRow } from "@/components/attendance/attendance-table";
import { WeeklyAttendanceGrid } from "@/components/attendance/weekly-attendance-grid";
import { MonthlyAttendanceSummary } from "@/components/attendance/monthly-attendance-summary";
import { PeriodNav } from "@/components/attendance/period-nav";
import { ExportButtons } from "@/components/attendance/export-buttons";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; month?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const admin = isAdmin(session?.user.role);
  const canSeeTeam = isManagerOrAbove(session?.user.role);
  const today = startOfDay(new Date());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Scope: admins see everyone, managers see their reports, everyone else sees just themselves.
  const scopeFilter = admin
    ? undefined
    : canSeeTeam
      ? { managerId: employeeId ?? "__none__" }
      : { id: employeeId ?? "__none__" };

  const weekRefDate = params.week ? new Date(params.week) : today;
  const weekStart = startOfWeek(Number.isNaN(weekRefDate.getTime()) ? today : weekRefDate);
  const weekEnd = addDays(weekStart, 6);

  const monthRefDate = params.month ? new Date(`${params.month}-01`) : today;
  const monthStart = startOfMonth(Number.isNaN(monthRefDate.getTime()) ? today : monthRefDate);
  const monthEnd = endOfMonth(monthStart);

  const [todayRecord, myHistory, teamToday, weeklyData, monthlyData] = await Promise.all([
    employeeId
      ? prisma.attendance.findUnique({
          where: { employeeId_date: { employeeId, date: today } },
        })
      : Promise.resolve(null),
    employeeId
      ? prisma.attendance.findMany({
          where: { employeeId, date: { gte: thirtyDaysAgo } },
          orderBy: { date: "desc" },
        })
      : Promise.resolve([]),
    canSeeTeam
      ? prisma.attendance.findMany({
          where: {
            date: today,
            employee: admin ? undefined : { managerId: employeeId },
          },
          include: { employee: true },
          orderBy: { employee: { firstName: "asc" } },
        })
      : Promise.resolve([]),
    fetchAttendancePeriodData(weekStart, weekEnd, scopeFilter),
    fetchAttendancePeriodData(monthStart, monthEnd, scopeFilter),
  ]);

  const myHistoryRows: AttendanceRow[] = myHistory.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    clockIn: a.clockIn?.toISOString() ?? null,
    clockOut: a.clockOut?.toISOString() ?? null,
    status: a.status,
  }));

  const teamRows: AttendanceRow[] = teamToday.map((a) => ({
    id: a.id,
    employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
    date: a.date.toISOString(),
    clockIn: a.clockIn?.toISOString() ?? null,
    clockOut: a.clockOut?.toISOString() ?? null,
    status: a.status,
  }));

  const weeklyRows = buildWeeklyGrid(
    weeklyData.employees,
    weeklyData.attendance,
    weeklyData.leaveRanges,
    weekStart
  );
  const dayLabels = DAY_NAMES.map((name, i) => `${name} ${addDays(weekStart, i).toLocaleDateString()}`);

  const monthlySummaries = summarizeAttendance(
    monthlyData.employees,
    monthlyData.attendance,
    monthlyData.leaveRanges,
    monthStart,
    monthEnd
  );

  const prevWeek = addDays(weekStart, -7).toISOString().slice(0, 10);
  const nextWeek = addDays(weekStart, 7).toISOString().slice(0, 10);
  const thisWeek = startOfWeek(today).toISOString().slice(0, 10);

  const prevMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1)
    .toISOString()
    .slice(0, 7);
  const nextMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    .toISOString()
    .slice(0, 7);
  const thisMonth = startOfMonth(today).toISOString().slice(0, 7);

  const activeTab = params.tab ?? "mine";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Track daily clock in/out, and review weekly and monthly attendance.
        </p>
      </div>

      {employeeId && (
        <ClockWidget
          clockInTime={todayRecord?.clockIn?.toISOString() ?? null}
          clockOutTime={todayRecord?.clockOut?.toISOString() ?? null}
        />
      )}

      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="mine">My History</TabsTrigger>
          {canSeeTeam && <TabsTrigger value="team">Team Today</TabsTrigger>}
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>

        <TabsContent value="mine">
          <AttendanceTable rows={myHistoryRows} />
        </TabsContent>

        {canSeeTeam && (
          <TabsContent value="team">
            <AttendanceTable rows={teamRows} showEmployee />
          </TabsContent>
        )}

        <TabsContent value="weekly" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PeriodNav
              label={`${weekStart.toLocaleDateString()} – ${weekEnd.toLocaleDateString()}`}
              prevHref={`?tab=weekly&week=${prevWeek}`}
              nextHref={`?tab=weekly&week=${nextWeek}`}
              todayHref={`?tab=weekly&week=${thisWeek}`}
            />
            {admin && <ExportButtons period="week" date={weekStart.toISOString().slice(0, 10)} />}
          </div>
          <WeeklyAttendanceGrid rows={weeklyRows} dayLabels={dayLabels} />
        </TabsContent>

        <TabsContent value="monthly" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PeriodNav
              label={monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              prevHref={`?tab=monthly&month=${prevMonth}`}
              nextHref={`?tab=monthly&month=${nextMonth}`}
              todayHref={`?tab=monthly&month=${thisMonth}`}
            />
            {admin && <ExportButtons period="month" date={monthStart.toISOString().slice(0, 10)} />}
          </div>
          <MonthlyAttendanceSummary summaries={monthlySummaries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
