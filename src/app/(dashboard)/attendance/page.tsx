import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isManagerOrAbove } from "@/lib/rbac";
import { startOfDay } from "@/lib/dates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClockWidget } from "@/components/attendance/clock-widget";
import { AttendanceTable, type AttendanceRow } from "@/components/attendance/attendance-table";

export default async function AttendancePage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const canSeeTeam = isManagerOrAbove(session?.user.role);
  const today = startOfDay(new Date());
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [todayRecord, myHistory, teamToday] = await Promise.all([
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
            employee: isAdmin(session?.user.role) ? undefined : { managerId: employeeId },
          },
          include: { employee: true },
          orderBy: { employee: { firstName: "asc" } },
        })
      : Promise.resolve([]),
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Track daily clock in/out and view history.</p>
      </div>

      {employeeId && (
        <ClockWidget
          clockInTime={todayRecord?.clockIn?.toISOString() ?? null}
          clockOutTime={todayRecord?.clockOut?.toISOString() ?? null}
        />
      )}

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My History</TabsTrigger>
          {canSeeTeam && <TabsTrigger value="team">Team Today</TabsTrigger>}
        </TabsList>
        <TabsContent value="mine">
          <AttendanceTable rows={myHistoryRows} />
        </TabsContent>
        {canSeeTeam && (
          <TabsContent value="team">
            <AttendanceTable rows={teamRows} showEmployee />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
