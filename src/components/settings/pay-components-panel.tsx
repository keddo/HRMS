"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPayComponent,
  updatePayComponent,
  setPayComponentActive,
} from "@/app/(dashboard)/settings/actions";

type PayComponentRow = {
  id: string;
  name: string;
  type: string;
  isPercentage: boolean;
  defaultValue: number;
  isActive: boolean;
  usageCount: number;
};

function PayComponentForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  defaultValues?: { name: string; type: string; isPercentage: boolean; defaultValue: string };
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [type, setType] = useState(defaultValues?.type ?? "EARNING");
  const [isPercentage, setIsPercentage] = useState(defaultValues?.isPercentage ?? false);

  const handleSubmit = (formData: FormData) => {
    formData.set("type", type);
    if (isPercentage) formData.set("isPercentage", "on");
    onSubmit(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EARNING">Earning</SelectItem>
            <SelectItem value="DEDUCTION">Deduction</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={isPercentage} onCheckedChange={(v) => setIsPercentage(!!v)} />
        Percentage of basic salary
      </label>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultValue">{isPercentage ? "Default percentage" : "Default amount"}</Label>
        <Input
          id="defaultValue"
          name="defaultValue"
          type="number"
          min="0"
          step="0.01"
          defaultValue={defaultValues?.defaultValue ?? "0"}
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

export function PayComponentsPanel({ components }: { components: PayComponentRow[] }) {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visible = useMemo(
    () => components.filter((c) => showDeactivated || c.isActive),
    [components, showDeactivated]
  );
  const editing = components.find((c) => c.id === editId) ?? null;

  const handleCreate = (formData: FormData) => {
    setAddError(null);
    startTransition(async () => {
      try {
        await createPayComponent(formData);
        setAddOpen(false);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to create pay component.");
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    if (!editId) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updatePayComponent(editId, formData);
        setEditId(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update pay component.");
      }
    });
  };

  const handleToggle = (component: PayComponentRow) => {
    setRowError(null);
    setTogglingId(component.id);
    startTransition(async () => {
      try {
        await setPayComponentActive(component.id, !component.isActive);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to update pay component.");
      } finally {
        setTogglingId(null);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={showDeactivated} onCheckedChange={(v) => setShowDeactivated(!!v)} />
            Show deactivated
          </label>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5" />
                Add a pay component
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a pay component</DialogTitle>
              </DialogHeader>
              <PayComponentForm onSubmit={handleCreate} isPending={isPending} error={addError} />
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-xs text-muted-foreground">
          Applied automatically to every employee&apos;s salary structure based on their basic
          salary. Deactivating a component stops it from being applied to new or updated salaries;
          it does not change salaries it was already applied to.
        </p>

        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        <div className="flex flex-col divide-y">
          {visible.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No pay components yet.</p>
          )}
          {visible.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.type === "EARNING" ? "Earning" : "Deduction"} ·{" "}
                  {c.isPercentage ? `${c.defaultValue}% of basic salary` : c.defaultValue}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{c.usageCount} employees</span>
                <Badge variant={c.isActive ? "default" : "secondary"}>
                  {c.isActive ? "Active" : "Deactivated"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setEditId(c.id)}>
                  <PenLine className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && togglingId === c.id}
                  onClick={() => handleToggle(c)}
                >
                  {isPending && togglingId === c.id && <Loader2 className="size-3.5 animate-spin" />}
                  {c.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit pay component</DialogTitle>
          </DialogHeader>
          {editing && (
            <PayComponentForm
              defaultValues={{
                name: editing.name,
                type: editing.type,
                isPercentage: editing.isPercentage,
                defaultValue: String(editing.defaultValue),
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
