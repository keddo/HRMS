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
  createLeaveType,
  updateLeaveType,
  setLeaveTypeActive,
} from "@/app/(dashboard)/settings/actions";

type LeaveTypeRow = {
  id: string;
  name: string;
  defaultDaysPerYear: number;
  isPaid: boolean;
  isActive: boolean;
  usageCount: number;
};

function LeaveTypeForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  defaultValues?: { name: string; defaultDaysPerYear: string; isPaid: boolean };
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [isPaid, setIsPaid] = useState(defaultValues?.isPaid ?? true);

  const handleSubmit = (formData: FormData) => {
    if (isPaid) formData.set("isPaid", "on");
    onSubmit(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="defaultDaysPerYear">Default days per year</Label>
        <Input
          id="defaultDaysPerYear"
          name="defaultDaysPerYear"
          type="number"
          min="0"
          defaultValue={defaultValues?.defaultDaysPerYear ?? "0"}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={isPaid} onCheckedChange={(v) => setIsPaid(!!v)} />
        Paid leave
      </label>
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

export function LeaveTypesPanel({ leaveTypes }: { leaveTypes: LeaveTypeRow[] }) {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visible = useMemo(
    () => leaveTypes.filter((lt) => showDeactivated || lt.isActive),
    [leaveTypes, showDeactivated]
  );
  const editing = leaveTypes.find((lt) => lt.id === editId) ?? null;

  const handleCreate = (formData: FormData) => {
    setAddError(null);
    startTransition(async () => {
      try {
        await createLeaveType(formData);
        setAddOpen(false);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to create leave type.");
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    if (!editId) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateLeaveType(editId, formData);
        setEditId(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update leave type.");
      }
    });
  };

  const handleToggle = (lt: LeaveTypeRow) => {
    setRowError(null);
    setTogglingId(lt.id);
    startTransition(async () => {
      try {
        await setLeaveTypeActive(lt.id, !lt.isActive);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to update leave type.");
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
                Add a leave type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a leave type</DialogTitle>
              </DialogHeader>
              <LeaveTypeForm onSubmit={handleCreate} isPending={isPending} error={addError} />
            </DialogContent>
          </Dialog>
        </div>

        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        <div className="flex flex-col divide-y">
          {visible.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No leave types yet.</p>
          )}
          {visible.map((lt) => (
            <div key={lt.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{lt.name}</p>
                <p className="text-xs text-muted-foreground">
                  {lt.defaultDaysPerYear} days/year · {lt.isPaid ? "Paid" : "Unpaid"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{lt.usageCount} records</span>
                <Badge variant={lt.isActive ? "default" : "secondary"}>
                  {lt.isActive ? "Active" : "Deactivated"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setEditId(lt.id)}>
                  <PenLine className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && togglingId === lt.id}
                  onClick={() => handleToggle(lt)}
                >
                  {isPending && togglingId === lt.id && <Loader2 className="size-3.5 animate-spin" />}
                  {lt.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit leave type</DialogTitle>
          </DialogHeader>
          {editing && (
            <LeaveTypeForm
              defaultValues={{
                name: editing.name,
                defaultDaysPerYear: String(editing.defaultDaysPerYear),
                isPaid: editing.isPaid,
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
