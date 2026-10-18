"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { approvePayrollRun, cancelPayrollRun } from "@/app/(dashboard)/payroll/actions";

export function RunStatusActions({ runId, employeeCount }: { runId: string; employeeCount: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const approve = () => {
    setError(null);
    startTransition(async () => {
      try {
        await approvePayrollRun(runId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to approve payroll.");
      }
    });
  };

  const cancel = () => {
    setError(null);
    startTransition(async () => {
      try {
        await cancelPayrollRun(runId);
        router.push("/payroll");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to cancel payroll.");
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={isPending}>
              <XCircle className="size-4" />
              Cancel Draft
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel this draft payroll?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes the draft and all {employeeCount} draft payslips. You can run payroll
                for this month again from scratch afterward.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Draft</AlertDialogCancel>
              <AlertDialogAction onClick={cancel}>Cancel Draft</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Approve Payroll
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve payroll for {employeeCount} employees?</AlertDialogTitle>
              <AlertDialogDescription>
                This locks the run so it can no longer be adjusted, and notifies every employee that
                their payslip is ready. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not Yet</AlertDialogCancel>
              <AlertDialogAction onClick={approve}>Approve</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
