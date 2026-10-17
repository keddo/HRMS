"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createDepartment, deleteDepartment } from "@/app/(dashboard)/organization/actions";

type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  employeeCount: number;
  positionCount: number;
};

export function DepartmentsPanel({ departments }: { departments: DepartmentRow[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createDepartment(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create department.");
      }
    });
  };

  const handleDelete = (id: string) => {
    setRowError(null);
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteDepartment(id);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to delete department.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{departments.length} departments</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Department</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea id="description" name="description" rows={2} />
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

        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        <div className="flex flex-col divide-y">
          {departments.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No departments yet.</p>
          )}
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{d.name}</p>
                {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {d.employeeCount} employees · {d.positionCount} positions
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending && deletingId === d.id}
                  onClick={() => handleDelete(d.id)}
                >
                  {isPending && deletingId === d.id ? (
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
    </Card>
  );
}
