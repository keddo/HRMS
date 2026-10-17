"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Plus, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createDepartment, updateDepartment, setDepartmentActive } from "@/app/(dashboard)/organization/actions";

type DepartmentRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  employeeCount: number;
  positionCount: number;
};

function DepartmentForm({
  departments,
  excludeId,
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  departments: DepartmentRow[];
  excludeId?: string;
  defaultValues?: { name: string; code: string; description: string; parentId: string };
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [parentId, setParentId] = useState(defaultValues?.parentId ?? "none");

  const handleSubmit = (formData: FormData) => {
    formData.set("parentId", parentId === "none" ? "" : parentId);
    onSubmit(formData);
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" defaultValue={defaultValues?.code} placeholder="SALES" />
        <p className="text-xs text-muted-foreground">Capital letters, digits and dashes. For example SALES.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Part of</Label>
        <Select value={parentId} onValueChange={setParentId}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None (top level)</SelectItem>
            {departments
              .filter((d) => d.id !== excludeId)
              .map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Leave empty for a top-level department.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={defaultValues?.description} />
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

export function DepartmentsPanel({ departments }: { departments: DepartmentRow[] }) {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visible = useMemo(
    () => departments.filter((d) => showDeactivated || d.isActive),
    [departments, showDeactivated]
  );
  const editing = departments.find((d) => d.id === editId) ?? null;

  const handleCreate = (formData: FormData) => {
    setAddError(null);
    startTransition(async () => {
      try {
        await createDepartment(formData);
        setAddOpen(false);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to create department.");
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    if (!editId) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateDepartment(editId, formData);
        setEditId(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update department.");
      }
    });
  };

  const handleToggle = (dept: DepartmentRow) => {
    setRowError(null);
    setTogglingId(dept.id);
    startTransition(async () => {
      try {
        await setDepartmentActive(dept.id, !dept.isActive);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to update department.");
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
                Add a department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a department</DialogTitle>
              </DialogHeader>
              <DepartmentForm
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
            <p className="py-4 text-sm text-muted-foreground">No departments yet.</p>
          )}
          {visible.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">
                  {d.name}
                  {d.code && <span className="ml-2 text-xs text-muted-foreground">{d.code}</span>}
                </p>
                {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {d.employeeCount} employees · {d.positionCount} positions
                </span>
                <Badge variant={d.isActive ? "default" : "secondary"}>
                  {d.isActive ? "Active" : "Deactivated"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setEditId(d.id)}>
                  <PenLine className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && togglingId === d.id}
                  onClick={() => handleToggle(d)}
                >
                  {isPending && togglingId === d.id && <Loader2 className="size-3.5 animate-spin" />}
                  {d.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit department</DialogTitle>
          </DialogHeader>
          {editing && (
            <DepartmentForm
              departments={departments}
              excludeId={editing.id}
              defaultValues={{
                name: editing.name,
                code: editing.code ?? "",
                description: editing.description ?? "",
                parentId: editing.parentId ?? "none",
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
