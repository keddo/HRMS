import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEmployee } from "@/lib/rbac";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrintButton } from "@/components/payroll/print-button";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PayslipDetailPage({
  params,
}: {
  params: Promise<{ payslipId: string }>;
}) {
  const { payslipId } = await params;
  const session = await auth();

  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: {
      payrollRun: true,
      employee: { include: { department: true, position: true, salary: true } },
      lines: true,
    },
  });

  if (!payslip) notFound();

  const authorized = canManageEmployee(session?.user.role, session?.user.employeeId, payslip.employeeId);
  if (!authorized) notFound();

  const currency = payslip.employee.salary?.currency ?? "ETB";
  const earnings = payslip.lines.filter((l) => l.type === "EARNING");
  const deductions = payslip.lines.filter((l) => l.type === "DEDUCTION");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Payslip</h1>
        <PrintButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {MONTH_NAMES[payslip.payrollRun.month - 1]} {payslip.payrollRun.year}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Employee</p>
              <p className="font-medium">
                {payslip.employee.firstName} {payslip.employee.lastName}
              </p>
              <p className="text-muted-foreground">{payslip.employee.employeeCode}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Department / Position</p>
              <p className="font-medium">{payslip.employee.department?.name ?? "—"}</p>
              <p className="text-muted-foreground">{payslip.employee.position?.title ?? "—"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="font-medium text-muted-foreground">Earnings</p>
            {earnings.map((l) => (
              <div key={l.id} className="flex justify-between">
                <span>{l.name}</span>
                <span>{formatCurrency(l.amount, currency)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Gross Pay</span>
              <span>{formatCurrency(payslip.grossPay, currency)}</span>
            </div>
          </div>

          {deductions.length > 0 && (
            <div className="flex flex-col gap-2 text-sm">
              <p className="font-medium text-muted-foreground">Deductions</p>
              {deductions.map((l) => (
                <div key={l.id} className="flex justify-between">
                  <span>{l.name}</span>
                  <span>- {formatCurrency(l.amount, currency)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total Deductions</span>
                <span>- {formatCurrency(payslip.totalDeductions, currency)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between rounded-lg bg-primary/10 p-4 text-lg font-semibold text-primary">
            <span>Net Pay</span>
            <span>{formatCurrency(payslip.netPay, currency)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
