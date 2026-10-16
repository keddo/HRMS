"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setRequisitionStatus } from "@/app/(dashboard)/recruitment/actions";

const STATUSES = ["OPEN", "ON_HOLD", "CLOSED"] as const;

export function RequisitionStatusSelect({
  requisitionId,
  status,
}: {
  requisitionId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Select
        value={status}
        disabled={isPending}
        onValueChange={(next) => startTransition(() => setRequisitionStatus(requisitionId, next))}
      >
        <SelectTrigger className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="size-4 animate-spin" />}
    </div>
  );
}
