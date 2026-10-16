"use client";

import { useState, useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runPayroll } from "@/app/(dashboard)/payroll/actions";

export function RunPayrollButton({
  month,
  year,
  label,
  disabled,
}: {
  month: number;
  year: number;
  label: string;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        disabled={disabled || isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await runPayroll(month, year);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to run payroll.");
            }
          })
        }
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
        {label}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
