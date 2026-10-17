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
import { createWorkLocation, deleteWorkLocation } from "@/app/(dashboard)/settings/actions";

type WorkLocationRow = {
  id: string;
  name: string;
  employeeCount: number;
};

export function WorkLocationsPanel({ locations }: { locations: WorkLocationRow[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createWorkLocation(formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create work location.");
      }
    });
  };

  const handleDelete = (id: string) => {
    setRowError(null);
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteWorkLocation(id);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to delete work location.");
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{locations.length} work locations</p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5" />
                Add Work Location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Work Location</DialogTitle>
              </DialogHeader>
              <form action={handleCreate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="e.g. Head Office, Bole Branch" required />
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
          {locations.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No work locations yet.</p>
          )}
          {locations.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-3 text-sm">
              <p className="font-medium">{l.name}</p>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{l.employeeCount} employees</span>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={isPending && deletingId === l.id}
                  onClick={() => handleDelete(l.id)}
                >
                  {isPending && deletingId === l.id ? (
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
