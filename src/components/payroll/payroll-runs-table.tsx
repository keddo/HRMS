import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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

export type PayrollRunRow = {
  id: string;
  month: number;
  year: number;
  status: string;
  employeeCount: number;
  totalNetPay: number;
  currency: string;
};

export function PayrollRunsTable({ runs }: { runs: PayrollRunRow[] }) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Employees</TableHead>
            <TableHead>Total Net Pay</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No payroll runs yet.
              </TableCell>
            </TableRow>
          )}
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                {MONTH_NAMES[r.month - 1]} {r.year}
              </TableCell>
              <TableCell>
                <Badge variant={r.status === "PROCESSED" ? "default" : "secondary"}>{r.status}</Badge>
              </TableCell>
              <TableCell>{r.employeeCount}</TableCell>
              <TableCell>{formatCurrency(r.totalNetPay, r.currency)}</TableCell>
              <TableCell className="text-right">
                <Link href={`/payroll/runs/${r.id}`} className="text-sm text-primary hover:underline">
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
