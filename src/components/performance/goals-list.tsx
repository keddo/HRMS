"use client";

import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateGoal, deleteGoal } from "@/app/(dashboard)/performance/actions";

export type GoalRow = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  progress: number;
};

const STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "secondary",
  COMPLETED: "default",
  CANCELLED: "destructive",
};

export function GoalsList({ goals, canEdit }: { goals: GoalRow[]; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (goals.length === 0) {
    return <p className="py-4 text-sm text-muted-foreground">No goals yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y">
      {goals.map((g) => (
        <div key={g.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium">{g.title}</p>
            {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={STATUS_VARIANT[g.status] ?? "secondary"}>{g.status.replace("_", " ")}</Badge>
              {g.targetDate && (
                <span className="text-xs text-muted-foreground">
                  Due {new Date(g.targetDate).toLocaleDateString()}
                </span>
              )}
              <span className="text-xs text-muted-foreground">{g.progress}% complete</span>
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              <Select
                value={g.status}
                disabled={isPending}
                onValueChange={(status) => startTransition(() => updateGoal(g.id, { status }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={() => startTransition(() => deleteGoal(g.id))}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
