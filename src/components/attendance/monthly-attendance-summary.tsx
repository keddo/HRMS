import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmployeeAttendanceSummary } from "@/lib/attendance-report";

export function MonthlyAttendanceSummary({ summaries }: { summaries: EmployeeAttendanceSummary[] }) {
  return (
    <div className="overflow-x-auto rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Present</TableHead>
            <TableHead>Late</TableHead>
            <TableHead>Half Day</TableHead>
            <TableHead>On Leave</TableHead>
            <TableHead>Absent</TableHead>
            <TableHead>Total Hours</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {summaries.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No employees in scope.
              </TableCell>
            </TableRow>
          )}
          {summaries.map((s) => (
            <TableRow key={s.employeeId}>
              <TableCell className="font-medium">{s.employeeName}</TableCell>
              <TableCell>{s.present}</TableCell>
              <TableCell>{s.late}</TableCell>
              <TableCell>{s.halfDay}</TableCell>
              <TableCell>{s.onLeave}</TableCell>
              <TableCell className={s.absent > 0 ? "text-destructive" : undefined}>{s.absent}</TableCell>
              <TableCell>{s.totalHours}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
