"use client";

import { useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toggleChecklistItem } from "@/app/(dashboard)/onboarding/actions";

export type ChecklistItemRow = {
  id: string;
  title: string;
  completed: boolean;
};

export type ChecklistInfo = {
  id: string;
  employeeName: string;
  type: string;
  status: string;
  items: ChecklistItemRow[];
};

export function ChecklistCard({ checklist }: { checklist: ChecklistInfo }) {
  const [isPending, startTransition] = useTransition();
  const doneCount = checklist.items.filter((i) => i.completed).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{checklist.employeeName}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {doneCount} / {checklist.items.length} complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{checklist.type}</Badge>
          <Badge variant={checklist.status === "COMPLETED" ? "default" : "secondary"}>
            {checklist.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {checklist.items.map((item) => (
          <label
            key={item.id}
            className={cn(
              "flex items-center gap-2 text-sm",
              item.completed && "text-muted-foreground line-through"
            )}
          >
            <Checkbox
              checked={item.completed}
              disabled={isPending}
              onCheckedChange={(checked) =>
                startTransition(() => toggleChecklistItem(item.id, checked === true))
              }
            />
            {item.title}
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
