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

export type ReviewRow = {
  id: string;
  cycleName: string;
  employeeName?: string;
  status: string;
  selfSubmitted: boolean;
  managerSubmitted: boolean;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  PENDING: "outline",
  SELF_SUBMITTED: "secondary",
  COMPLETED: "default",
};

export function ReviewsTable({ reviews, showEmployee }: { reviews: ReviewRow[]; showEmployee?: boolean }) {
  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {showEmployee && <TableHead>Employee</TableHead>}
            <TableHead>Cycle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.length === 0 && (
            <TableRow>
              <TableCell colSpan={showEmployee ? 4 : 3} className="h-24 text-center text-muted-foreground">
                No reviews yet.
              </TableCell>
            </TableRow>
          )}
          {reviews.map((r) => (
            <TableRow key={r.id}>
              {showEmployee && <TableCell className="font-medium">{r.employeeName}</TableCell>}
              <TableCell>{r.cycleName}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status.replace("_", " ")}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/performance/reviews/${r.id}`} className="text-sm text-primary hover:underline">
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
