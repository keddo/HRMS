import Link from "next/link";
import { Users, UserPlus, CalendarClock, UserCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "@/lib/dates";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default async function DashboardPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const today = startOfDay(new Date());

  const [headcount, clockedInToday, newHiresThisMonth, pendingLeave, departments, recentHires, announcements] =
    await Promise.all([
      prisma.employee.count(),
      prisma.attendance.count({ where: { date: today, clockIn: { not: null } } }),
      prisma.employee.count({ where: { hireDate: { gte: startOfMonth } } }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.department.findMany({
        include: { _count: { select: { employees: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        orderBy: { hireDate: "desc" },
        take: 5,
        include: { department: true, position: true },
      }),
      prisma.announcement.findMany({
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        take: 3,
      }),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your organization&apos;s workforce.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={headcount} icon={Users} accent="primary" />
        <StatCard label="Clocked In Today" value={clockedInToday} icon={UserCheck} accent="success" />
        <StatCard
          label="New Hires (this month)"
          value={newHiresThisMonth}
          icon={UserPlus}
          accent="info"
        />
        <Link href="/leave">
          <StatCard
            label="Pending Leave Requests"
            value={pendingLeave}
            icon={CalendarClock}
            accent="warning"
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recently Hired</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {recentHires.length === 0 && (
              <p className="text-sm text-muted-foreground">No employees yet.</p>
            )}
            {recentHires.map((emp) => (
              <Link
                key={emp.id}
                href={`/employees/${emp.id}`}
                className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(emp.firstName, emp.lastName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {emp.firstName} {emp.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {emp.position?.title ?? "—"} · {emp.department?.name ?? "—"}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {emp.hireDate.toLocaleDateString()}
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between text-sm">
                <span>{dept.name}</span>
                <Badge variant="secondary">{dept._count.employees}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest Announcements</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {announcements.length === 0 && (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
          {announcements.map((a) => (
            <Link
              key={a.id}
              href="/announcements"
              className="rounded-md px-2 py-2 text-sm hover:bg-muted"
            >
              <p className="font-medium">{a.title}</p>
              <p className="line-clamp-1 text-muted-foreground">{a.body}</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
