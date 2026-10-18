"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, PenLine, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createTaxBracket,
  updateTaxBracket,
  deleteTaxBracket,
} from "@/app/(dashboard)/settings/actions";

type TaxBracketRow = {
  id: string;
  minAmount: number;
  maxAmount: number | null;
  rate: number;
};

function TaxBracketForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  defaultValues?: { minAmount: string; maxAmount: string; rate: string };
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="minAmount">From (inclusive)</Label>
          <Input
            id="minAmount"
            name="minAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.minAmount ?? "0"}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maxAmount">Up to (optional)</Label>
          <Input
            id="maxAmount"
            name="maxAmount"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaultValues?.maxAmount}
            placeholder="No upper bound"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rate">Rate (%)</Label>
        <Input
          id="rate"
          name="rate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          defaultValue={defaultValues?.rate ?? "0"}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TaxBracketsPanel({ brackets }: { brackets: TaxBracketRow[] }) {
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...brackets].sort((a, b) => a.minAmount - b.minAmount);
  const editing = brackets.find((b) => b.id === editId) ?? null;

  const handleCreate = (formData: FormData) => {
    setAddError(null);
    startTransition(async () => {
      try {
        await createTaxBracket(formData);
        setAddOpen(false);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to add tax bracket.");
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    if (!editId) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateTaxBracket(editId, formData);
        setEditId(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update tax bracket.");
      }
    });
  };

  const handleDelete = (id: string) => {
    setRowError(null);
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteTaxBracket(id);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to remove tax bracket.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{sorted.length} brackets</p>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5" />
                Add a bracket
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a tax bracket</DialogTitle>
              </DialogHeader>
              <TaxBracketForm onSubmit={handleCreate} isPending={isPending} error={addError} />
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-xs text-muted-foreground">
          Used by any pay component set to &quot;Progressive tax brackets,&quot; computed on basic
          salary. These figures aren&apos;t pre-loaded from any official source — verify them
          against your country&apos;s current tax authority publication before relying on them for
          real payroll.
        </p>

        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        <div className="flex flex-col divide-y">
          {sorted.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No tax brackets configured yet.</p>
          )}
          {sorted.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3 text-sm">
              <p className="font-medium">
                {b.minAmount.toLocaleString()} – {b.maxAmount ? b.maxAmount.toLocaleString() : "∞"}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{b.rate}%</span>
                <Button size="sm" variant="outline" onClick={() => setEditId(b.id)}>
                  <PenLine className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending && deletingId === b.id}
                  onClick={() => handleDelete(b.id)}
                >
                  {isPending && deletingId === b.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit tax bracket</DialogTitle>
          </DialogHeader>
          {editing && (
            <TaxBracketForm
              defaultValues={{
                minAmount: String(editing.minAmount),
                maxAmount: editing.maxAmount ? String(editing.maxAmount) : "",
                rate: String(editing.rate),
              }}
              onSubmit={handleUpdate}
              isPending={isPending}
              error={editError}
            />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
