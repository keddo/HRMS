"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { addPayslipAdjustment, removePayslipAdjustment } from "@/app/(dashboard)/payroll/actions";

export type AdjustmentLine = { id: string; name: string; type: string; amount: number };

export function PayslipAdjustments({
  payslipId,
  adjustments,
  currency,
}: {
  payslipId: string;
  adjustments: AdjustmentLine[];
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("EARNING");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleAdd = (formData: FormData) => {
    setError(null);
    formData.set("type", type);
    startTransition(async () => {
      try {
        await addPayslipAdjustment(payslipId, formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add adjustment.");
      }
    });
  };

  const handleRemove = (lineId: string) => {
    setError(null);
    setRemovingId(lineId);
    startTransition(async () => {
      try {
        await removePayslipAdjustment(lineId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to remove adjustment.");
      } finally {
        setRemovingId(null);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {adjustments.map((a) => (
          <Badge key={a.id} variant={a.type === "EARNING" ? "default" : "destructive"} className="gap-1 pr-1">
            {a.name} {a.type === "EARNING" ? "+" : "-"}
            {formatCurrency(a.amount, currency)}
            <button
              type="button"
              aria-label={`Remove ${a.name}`}
              disabled={isPending && removingId === a.id}
              onClick={() => handleRemove(a.id)}
              className="ml-0.5 rounded-full hover:bg-black/10"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="size-3.5" />
              Adjustment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add One-Time Adjustment</DialogTitle>
            </DialogHeader>
            <form action={handleAdd} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">Description</Label>
                <Input id="name" name="name" placeholder="e.g. Performance bonus" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EARNING">Bonus (earning)</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  Add
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && !open && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
