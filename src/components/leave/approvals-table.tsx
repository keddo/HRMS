"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { decideLeaveRequest } from "@/app/(dashboard)/leave/actions";

export type PendingLeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ApprovalsTable({ requests }: { requests: PendingLeaveRequest[] }) {
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = (id: string, decision: "APPROVED" | "REJECTED") => {
    setError(null);
    setActingId(id);
    startTransition(async () => {
      try {
        await decideLeaveRequest(id, decision);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update request.");
      }
      setActingId(null);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No pending requests to review.
                </TableCell>
              </TableRow>
            )}
            {requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/employees/${r.employeeId}`} className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-xs">{initials(r.employeeName)}</AvatarFallback>
                    </Avatar>
                    {r.employeeName}
                  </Link>
                </TableCell>
                <TableCell>{r.leaveTypeName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(r.startDate).toLocaleDateString()} – {new Date(r.endDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{r.days}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending && actingId === r.id}
                    onClick={() => decide(r.id, "REJECTED")}
                  >
                    {isPending && actingId === r.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <X className="size-3.5" />
                    )}
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={isPending && actingId === r.id}
                    onClick={() => decide(r.id, "APPROVED")}
                  >
                    {isPending && actingId === r.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Approve
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
