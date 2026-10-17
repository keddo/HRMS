"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPosition, deletePosition } from "@/app/(dashboard)/settings/actions";

type PositionRow = {
  id: string;
  title: string;
  level: number;
  departmentName: string;
  employeeCount: number;
};

export function PositionsPanel({
  departments,
  positions,
}: {
  departments: { id: string; name: string }[];
  positions: PositionRow[];
}) {
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = (formData: FormData) => {
    setError(null);
    formData.set("departmentId", departmentId);
    startTransition(async () => {
      try {
        await createPosition(formData);
        setOpen(false);
        setDepartmentId("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create position.");
      }
    });
  };

  const handleDelete = (id: string) => {
    setRowError(null);
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deletePosition(id);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to delete position.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{positions.length} positions</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={departments.length === 0}>
                <Plus className="size-3.5" />
                Add Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Position</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Department</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="level">Level (optional)</Label>
                  <Input id="level" name="level" type="number" min="1" defaultValue="1" />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isPending || !departmentId}>
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    Add
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {departments.length === 0 && (
          <p className="text-sm text-muted-foreground">Add a department first before adding positions.</p>
        )}
        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        <div className="flex flex-col divide-y">
          {positions.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No positions yet.</p>
          )}
          {positions.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.departmentName} · Level {p.level}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{p.employeeCount} employees</span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending && deletingId === p.id}
                  onClick={() => handleDelete(p.id)}
                >
                  {isPending && deletingId === p.id ? (
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
