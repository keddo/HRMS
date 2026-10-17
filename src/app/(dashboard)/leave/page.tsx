import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAbove, isAdmin } from "@/lib/rbac";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeaveBalanceCards, type BalanceRow } from "@/components/leave/leave-balance-cards";
import { RequestLeaveDialog } from "@/components/leave/request-leave-dialog";
import { MyRequestsTable, type MyLeaveRequest } from "@/components/leave/my-requests-table";
import { ApprovalsTable, type PendingLeaveRequest } from "@/components/leave/approvals-table";
import { LeaveTypesPanel } from "@/components/leave/leave-types-panel";

export default async function LeavePage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const year = new Date().getFullYear();
  const canApprove = isManagerOrAbove(session?.user.role);
  const canManageLeaveTypes = isAdmin(session?.user.role);

  const [leaveTypes, balances, myRequests, pendingRequests, upcomingHolidays] = await Promise.all([
    prisma.leaveType.findMany({
      include: { _count: { select: { leaveBalances: true, leaveRequests: true } } },
      orderBy: { name: "asc" },
    }),
    employeeId
      ? prisma.leaveBalance.findMany({
          where: { employeeId, year },
          include: { leaveType: true },
        })
      : Promise.resolve([]),
    employeeId
      ? prisma.leaveRequest.findMany({
          where: { employeeId },
          include: { leaveType: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canApprove
      ? prisma.leaveRequest.findMany({
          where: {
            status: "PENDING",
            employee: isAdmin(session?.user.role) ? undefined : { managerId: employeeId },
          },
          include: { employee: true, leaveType: true },
          orderBy: { createdAt: "asc" },
        })
      : Promise.resolve([]),
    prisma.holiday.findMany({
      where: { date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 5,
    }),
  ]);

  const requestableLeaveTypes = leaveTypes.filter((lt) => lt.isActive);

  const balanceRows: BalanceRow[] = leaveTypes
    .filter((lt) => lt.isActive || balances.some((bal) => bal.leaveTypeId === lt.id))
    .map((lt) => {
      const b = balances.find((bal) => bal.leaveTypeId === lt.id);
      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
        allocatedDays: b?.allocatedDays ?? lt.defaultDaysPerYear,
        usedDays: b?.usedDays ?? 0,
      };
    });

  const myRequestRows: MyLeaveRequest[] = myRequests.map((r) => ({
    id: r.id,
    leaveTypeName: r.leaveType.name,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    days: r.days,
    status: r.status,
    reason: r.reason,
  }));

  const pendingRows: PendingLeaveRequest[] = pendingRequests.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    leaveTypeName: r.leaveType.name,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    days: r.days,
    reason: r.reason,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
          <p className="text-sm text-muted-foreground">
            Manage your time off and review team requests.
          </p>
        </div>
        {employeeId && <RequestLeaveDialog leaveTypes={requestableLeaveTypes} />}
      </div>

      <LeaveBalanceCards balances={balanceRows} />

      <Tabs defaultValue="mine">
        <TabsList>
          <TabsTrigger value="mine">My Requests</TabsTrigger>
          {canApprove && (
            <TabsTrigger value="approvals">
              Approvals
              {pendingRows.length > 0 && (
                <span className="ml-1.5 rounded-full bg-warning px-1.5 text-xs text-warning-foreground">
                  {pendingRows.length}
                </span>
              )}
            </TabsTrigger>
          )}
          {canManageLeaveTypes && <TabsTrigger value="leave-types">Leave Types</TabsTrigger>}
        </TabsList>

        <TabsContent value="mine">
          <MyRequestsTable requests={myRequestRows} />
        </TabsContent>

        {canApprove && (
          <TabsContent value="approvals">
            <ApprovalsTable requests={pendingRows} />
          </TabsContent>
        )}

        {canManageLeaveTypes && (
          <TabsContent value="leave-types">
            <LeaveTypesPanel
              leaveTypes={leaveTypes.map((lt) => ({
                id: lt.id,
                name: lt.name,
                defaultDaysPerYear: lt.defaultDaysPerYear,
                isPaid: lt.isPaid,
                isActive: lt.isActive,
                usageCount: lt._count.leaveBalances + lt._count.leaveRequests,
              }))}
            />
          </TabsContent>
        )}
      </Tabs>

      {upcomingHolidays.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcomingHolidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span>{h.name}</span>
                <span className="text-muted-foreground">{h.date.toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
