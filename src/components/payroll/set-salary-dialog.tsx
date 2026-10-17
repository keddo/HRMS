"use client";

import { useState, useTransition } from "react";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setEmployeeSalary } from "@/app/(dashboard)/payroll/actions";

export function SetSalaryDialog({
  employeeId,
  currentBasicSalary,
  currentCurrency,
}: {
  employeeId: string;
  currentBasicSalary: number | null;
  currentCurrency?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("employeeId", employeeId);
    startTransition(async () => {
      try {
        await setEmployeeSalary(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save salary.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PenLine className="size-3.5" />
          {currentBasicSalary ? "Edit Salary" : "Set Salary"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{currentBasicSalary ? "Edit" : "Set"} Basic Salary</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="basicSalary">Basic Salary (monthly)</Label>
            <Input
              id="basicSalary"
              name="basicSalary"
              type="number"
              min="0"
              step="0.01"
              defaultValue={currentBasicSalary ?? undefined}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" name="currency" defaultValue={currentCurrency || "ETB"} required />
          </div>
          <p className="text-xs text-muted-foreground">
            Allowances and deductions configured for the company will be applied automatically
            based on this basic salary.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
