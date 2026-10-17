import { redirect } from "next/navigation";
import { Download, Users, UserMinus, UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { formatCurrency } from "@/lib/currency";
import { startOfDay } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { BarChart, type BarDatum } from "@/components/reports/bar-chart";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export default async function ReportsPage() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/dashboard");

  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const fourteenDaysAgo = startOfDay(new Date());
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

  const [
    totalHeadcount,
    activeHeadcount,
    terminatedThisYear,
    newHiresThisYear,
    departments,
    hiresRaw,
    attendanceRecent,
    activeEmployeeCount,
    leaveBalances,
    payrollRuns,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.employee.count({ where: { employmentStatus: "TERMINATED", terminationDate: { gte: startOfYear } } }),
    prisma.employee.count({ where: { hireDate: { gte: startOfYear } } }),
    prisma.department.findMany({ include: { _count: { select: { employees: true } } } }),
    prisma.employee.findMany({ where: { hireDate: { gte: new Date(year, now.getMonth() - 5, 1) } }, select: { hireDate: true } }),
    prisma.attendance.findMany({
      where: { date: { gte: fourteenDaysAgo }, clockIn: { not: null } },
      select: { date: true },
    }),
    prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.leaveBalance.groupBy({
      by: ["leaveTypeId"],
      where: { year },
      _sum: { usedDays: true },
    }),
    prisma.payrollRun.findMany({
      include: { payslips: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
      take: 6,
    }),
  ]);

  const departmentData: BarDatum[] = departments
    .map((d) => ({ label: d.name, value: d._count.employees }))
    .sort((a, b) => b.value - a.value);

  const hiresByMonth = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, now.getMonth() - i, 1);
    hiresByMonth.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  for (const h of hiresRaw) {
    const key = `${h.hireDate.getFullYear()}-${h.hireDate.getMonth()}`;
    if (hiresByMonth.has(key)) hiresByMonth.set(key, (hiresByMonth.get(key) ?? 0) + 1);
  }
  const hiresData: BarDatum[] = Array.from(hiresByMonth.entries()).map(([key, value]) => {
    const [, month] = key.split("-").map(Number);
    return { label: MONTH_NAMES[month], value };
  });

  const attendanceByDay = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(fourteenDaysAgo);
    d.setDate(d.getDate() + (13 - i));
    attendanceByDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const a of attendanceRecent) {
    const key = a.date.toISOString().slice(0, 10);
    if (attendanceByDay.has(key)) attendanceByDay.set(key, (attendanceByDay.get(key) ?? 0) + 1);
  }
  const attendanceData: BarDatum[] = Array.from(attendanceByDay.entries()).map(([date, count]) => ({
    label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    value: activeEmployeeCount > 0 ? Math.round((count / activeEmployeeCount) * 100) : 0,
  }));

  const leaveTypes = await prisma.leaveType.findMany();
  const leaveData: BarDatum[] = leaveBalances
    .map((lb) => ({
      label: leaveTypes.find((lt) => lt.id === lb.leaveTypeId)?.name ?? "Unknown",
      value: Math.round(lb._sum.usedDays ?? 0),
    }))
    .sort((a, b) => b.value - a.value);

  const payrollData: BarDatum[] = payrollRuns.map((r) => ({
    label: `${MONTH_NAMES[r.month - 1]} ${r.year}`,
    value: Math.round(r.payslips.reduce((sum, p) => sum + p.netPay, 0)),
  }));
  const payrollCurrency = "ETB";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">Workforce trends and summaries.</p>
        </div>
        <Button variant="outline" asChild>
          <a href="/api/reports/employees.csv" download>
            <Download className="size-4" />
            Export Employees CSV
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={totalHeadcount} icon={Users} accent="primary" />
        <StatCard label="Active" value={activeHeadcount} icon={Users} accent="success" />
        <StatCard label="New Hires (YTD)" value={newHiresThisYear} icon={UserPlus} accent="info" />
        <StatCard label="Departures (YTD)" value={terminatedThisYear} icon={UserMinus} accent="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={departmentData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Hires (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={hiresData} color="var(--chart-2)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Rate (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={attendanceData} valueFormatter={(v) => `${v}%`} color="var(--chart-3)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave Days Used by Type ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={leaveData} color="var(--chart-4)" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payroll Cost (Net Pay, Last 6 Runs)</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={payrollData}
              valueFormatter={(v) => formatCurrency(v, payrollCurrency)}
              color="var(--chart-5)"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
