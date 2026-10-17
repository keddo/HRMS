import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmployeeWeekRow, DayStatus } from "@/lib/attendance-report";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PRESENT: "default",
  LATE: "secondary",
  ABSENT: "destructive",
  HALF_DAY: "outline",
  ON_LEAVE: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  HALF_DAY: "Half Day",
  ON_LEAVE: "On Leave",
};

function DayCell({ status }: { status: DayStatus }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function WeeklyAttendanceGrid({
  rows,
  dayLabels,
}: {
  rows: EmployeeWeekRow[];
  dayLabels: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            {dayLabels.map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No employees in scope.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => (
            <TableRow key={row.employeeId}>
              <TableCell className="font-medium">{row.employeeName}</TableCell>
              {row.days.map((status, i) => (
                <TableCell key={i}>
                  <DayCell status={status} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
