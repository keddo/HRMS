import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { formatCurrency } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/payroll");

  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: {
      payslips: {
        include: { employee: { include: { department: true, salary: true } } },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });

  if (!run) notFound();

  const totalNet = run.payslips.reduce((sum, p) => sum + p.netPay, 0);
  const currency = run.payslips[0]?.employee.salary?.currency ?? "USD";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payroll — {MONTH_NAMES[run.month - 1]} {run.year}
        </h1>
        <p className="text-sm text-muted-foreground">
          {run.payslips.length} employees · Total net pay {formatCurrency(totalNet, currency)}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Gross Pay</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Pay</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.payslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.employee.firstName} {p.employee.lastName}
                  </TableCell>
                  <TableCell>{p.employee.department?.name ?? "—"}</TableCell>
                  <TableCell>{formatCurrency(p.grossPay, currency)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    - {formatCurrency(p.totalDeductions, currency)}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(p.netPay, currency)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/payroll/${p.id}`} className="text-sm text-primary hover:underline">
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
