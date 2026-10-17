import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyPayslipsTable, type MyPayslipRow } from "@/components/payroll/my-payslips-table";
import { PayrollRunsTable, type PayrollRunRow } from "@/components/payroll/payroll-runs-table";
import { RunPayrollButton } from "@/components/payroll/run-payroll-button";

export default async function PayrollPage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const admin = isAdmin(session?.user.role);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [myPayslips, runs, currentRun, mySalary] = await Promise.all([
    employeeId
      ? prisma.payslip.findMany({
          where: { employeeId },
          include: { payrollRun: true },
          orderBy: [{ payrollRun: { year: "desc" } }, { payrollRun: { month: "desc" } }],
        })
      : Promise.resolve([]),
    admin
      ? prisma.payrollRun.findMany({
          include: { payslips: true },
          orderBy: [{ year: "desc" }, { month: "desc" }],
        })
      : Promise.resolve([]),
    admin
      ? prisma.payrollRun.findUnique({ where: { month_year: { month: currentMonth, year: currentYear } } })
      : Promise.resolve(null),
    employeeId
      ? prisma.employeeSalary.findUnique({ where: { employeeId }, select: { currency: true } })
      : Promise.resolve(null),
  ]);

  const currency = mySalary?.currency ?? "ETB";

  const myPayslipRows: MyPayslipRow[] = myPayslips.map((p) => ({
    id: p.id,
    month: p.payrollRun.month,
    year: p.payrollRun.year,
    grossPay: p.grossPay,
    totalDeductions: p.totalDeductions,
    netPay: p.netPay,
    currency,
  }));

  const runRows: PayrollRunRow[] = runs.map((r) => ({
    id: r.id,
    month: r.month,
    year: r.year,
    status: r.status,
    employeeCount: r.payslips.length,
    totalNetPay: r.payslips.reduce((sum, p) => sum + p.netPay, 0),
    currency,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            {admin ? "Run payroll and view payslips." : "View your payslip history."}
          </p>
        </div>
        {admin && (
          <RunPayrollButton
            month={currentMonth}
            year={currentYear}
            label={currentRun ? "Already Run This Month" : "Run Payroll This Month"}
            disabled={!!currentRun}
          />
        )}
      </div>

      <Tabs defaultValue={admin ? "runs" : "mine"}>
        <TabsList>
          <TabsTrigger value="mine">My Payslips</TabsTrigger>
          {admin && <TabsTrigger value="runs">Payroll Runs</TabsTrigger>}
        </TabsList>

        <TabsContent value="mine">
          <MyPayslipsTable payslips={myPayslipRows} />
        </TabsContent>

        {admin && (
          <TabsContent value="runs">
            <PayrollRunsTable runs={runRows} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
