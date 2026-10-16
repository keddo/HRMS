"use client";

import { useState, useTransition } from "react";
import { Loader2, Rocket, Lock } from "lucide-react";
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
import { launchReviewCycle, closeReviewCycle } from "@/app/(dashboard)/performance/actions";

export type CycleRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  reviewCount: number;
  completedCount: number;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  ACTIVE: "default",
  CLOSED: "secondary",
};

export function ReviewCyclesTable({ cycles }: { cycles: CycleRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = (id: string, fn: (id: string) => Promise<void>) => {
    setError(null);
    setActingId(id);
    startTransition(async () => {
      try {
        await fn(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
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
              <TableHead>Cycle</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cycles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No review cycles yet.
                </TableCell>
              </TableRow>
            )}
            {cycles.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[c.status] ?? "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.status === "DRAFT" ? "—" : `${c.completedCount} / ${c.reviewCount} completed`}
                </TableCell>
                <TableCell className="text-right">
                  {c.status === "DRAFT" && (
                    <Button
                      size="sm"
                      disabled={isPending && actingId === c.id}
                      onClick={() => act(c.id, launchReviewCycle)}
                    >
                      {isPending && actingId === c.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Rocket className="size-3.5" />
                      )}
                      Launch
                    </Button>
                  )}
                  {c.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending && actingId === c.id}
                      onClick={() => act(c.id, closeReviewCycle)}
                    >
                      {isPending && actingId === c.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Lock className="size-3.5" />
                      )}
                      Close
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
