import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AttendanceRow = {
  id: string;
  employeeName?: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PRESENT: "default",
  LATE: "secondary",
  ABSENT: "destructive",
  HALF_DAY: "outline",
  ON_LEAVE: "outline",
};

function fmtTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

export function AttendanceTable({
  rows,
  showEmployee,
}: {
  rows: AttendanceRow[];
  showEmployee?: boolean;
}) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead>Date</TableHead>
            <TableHead>Clock In</TableHead>
            <TableHead>Clock Out</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={showEmployee ? 5 : 4} className="h-24 text-center text-muted-foreground">
                No attendance records.
              </TableCell>
            </TableRow>
          )}
          {rows.map((r) => (
            <TableRow key={r.id}>
              {showEmployee && <TableCell className="font-medium">{r.employeeName}</TableCell>}
              <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
              <TableCell>{fmtTime(r.clockIn)}</TableCell>
              <TableCell>{fmtTime(r.clockOut)}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status.replace("_", " ")}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
