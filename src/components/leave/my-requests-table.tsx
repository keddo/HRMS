"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cancelLeaveRequest } from "@/app/(dashboard)/leave/actions";

export type MyLeaveRequest = {
  id: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  APPROVED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export function MyRequestsTable({ requests }: { requests: MyLeaveRequest[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No leave requests yet.
              </TableCell>
            </TableRow>
          )}
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.leaveTypeName}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
              </TableCell>
              <TableCell>{r.days}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {r.status === "PENDING" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => startTransition(() => cancelLeaveRequest(r.id))}
                  >
                    {isPending && <Loader2 className="size-3.5 animate-spin" />}
                    Cancel
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
