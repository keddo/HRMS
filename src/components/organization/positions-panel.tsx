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
import { createPosition, updatePosition, setPositionActive } from "@/app/(dashboard)/organization/actions";

type PositionRow = {
  id: string;
  title: string;
  level: number;
  departmentId: string | null;
  departmentName: string | null;
  isActive: boolean;
  employeeCount: number;
};

function PositionForm({
  departments,
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  departments: { id: string; name: string }[];
  defaultValues?: { title: string; departmentId: string; level: string };
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [departmentId, setDepartmentId] = useState(defaultValues?.departmentId ?? "any");

  const handleSubmit = (formData: FormData) => {
    formData.set("departmentId", departmentId === "any" ? "" : departmentId);
    onSubmit(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Position title</Label>
        <Input id="title" name="title" defaultValue={defaultValues?.title} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Used in</Label>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any department</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Pick a department only if this position exists nowhere else. A driver, for example, can
          work in any department.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="level">Level (optional)</Label>
        <Input id="level" name="level" type="number" min="1" defaultValue={defaultValues?.level ?? "1"} />
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

export function PositionsPanel({
  departments,
  positions,
}: {
  departments: { id: string; name: string }[];
  positions: PositionRow[];
}) {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visible = useMemo(
    () => positions.filter((p) => showDeactivated || p.isActive),
    [positions, showDeactivated]
  );
  const editing = positions.find((p) => p.id === editId) ?? null;

  const handleCreate = (formData: FormData) => {
    setAddError(null);
    startTransition(async () => {
      try {
        await createPosition(formData);
        setAddOpen(false);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to create position.");
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    if (!editId) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updatePosition(editId, formData);
        setEditId(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update position.");
      }
    });
  };

  const handleToggle = (position: PositionRow) => {
    setRowError(null);
    setTogglingId(position.id);
    startTransition(async () => {
      try {
        await setPositionActive(position.id, !position.isActive);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to update position.");
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
                Add a position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a position</DialogTitle>
              </DialogHeader>
              <PositionForm
                departments={departments}
                onSubmit={handleCreate}
                isPending={isPending}
                error={addError}
              />
            </DialogContent>
          </Dialog>
        </div>

        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        <div className="flex flex-col divide-y">
          {visible.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No positions yet.</p>
          )}
          {visible.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.departmentName ?? "Any department"} · Level {p.level}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{p.employeeCount} employees</span>
                <Badge variant={p.isActive ? "default" : "secondary"}>
                  {p.isActive ? "Active" : "Deactivated"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setEditId(p.id)}>
                  <PenLine className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && togglingId === p.id}
                  onClick={() => handleToggle(p)}
                >
                  {isPending && togglingId === p.id && <Loader2 className="size-3.5 animate-spin" />}
                  {p.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit position</DialogTitle>
          </DialogHeader>
          {editing && (
            <PositionForm
              departments={departments}
              defaultValues={{
                title: editing.title,
                departmentId: editing.departmentId ?? "any",
                level: String(editing.level),
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
