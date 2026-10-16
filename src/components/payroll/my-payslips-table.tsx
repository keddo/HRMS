import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type MyPayslipRow = {
  id: string;
  month: number;
  year: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
};

export function MyPayslipsTable({ payslips }: { payslips: MyPayslipRow[] }) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Gross Pay</TableHead>
            <TableHead>Deductions</TableHead>
            <TableHead>Net Pay</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {payslips.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No payslips yet.
              </TableCell>
            </TableRow>
          )}
          {payslips.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                {MONTH_NAMES[p.month - 1]} {p.year}
              </TableCell>
              <TableCell>{formatCurrency(p.grossPay, p.currency)}</TableCell>
              <TableCell className="text-muted-foreground">
                - {formatCurrency(p.totalDeductions, p.currency)}
              </TableCell>
              <TableCell className="font-medium">{formatCurrency(p.netPay, p.currency)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/payroll/${p.id}`} className="text-sm text-primary hover:underline">
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
