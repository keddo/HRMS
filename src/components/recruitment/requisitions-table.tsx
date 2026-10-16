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

export type RequisitionRow = {
  id: string;
  title: string;
  departmentName: string;
  openings: number;
  status: string;
  applicationCount: number;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  OPEN: "default",
  ON_HOLD: "secondary",
  CLOSED: "outline",
};

export function RequisitionsTable({ requisitions }: { requisitions: RequisitionRow[] }) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Openings</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applicants</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requisitions.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No job requisitions yet.
              </TableCell>
            </TableRow>
          )}
          {requisitions.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                <Link href={`/recruitment/${r.id}`} className="hover:underline">
                  {r.title}
                </Link>
              </TableCell>
              <TableCell>{r.departmentName}</TableCell>
              <TableCell>{r.openings}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell>{r.applicationCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
