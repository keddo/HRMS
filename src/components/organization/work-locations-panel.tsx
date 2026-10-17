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
  createWorkLocation,
  updateWorkLocation,
  setWorkLocationActive,
} from "@/app/(dashboard)/organization/actions";

type WorkLocationRow = {
  id: string;
  name: string;
  code: string | null;
  kind: string;
  address: string | null;
  isActive: boolean;
  employeeCount: number;
};

const KINDS = ["HEAD_OFFICE", "BRANCH", "REGION", "OTHER"];
const KIND_LABELS: Record<string, string> = {
  HEAD_OFFICE: "Head Office",
  BRANCH: "Branch",
  REGION: "Region",
  OTHER: "Other",
};

function WorkLocationForm({
  defaultValues,
  onSubmit,
  isPending,
  error,
}: {
  defaultValues?: { name: string; code: string; kind: string; address: string };
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [kind, setKind] = useState(defaultValues?.kind ?? "OTHER");

  const handleSubmit = (formData: FormData) => {
    formData.set("kind", kind);
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
        <Input id="code" name="code" defaultValue={defaultValues?.code} placeholder="NAAZ" />
        <p className="text-xs text-muted-foreground">The short code used on the payroll sheet, for example NAAZ.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Kind</Label>
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Address</Label>
        <Input id="address" name="address" defaultValue={defaultValues?.address} />
        <p className="text-xs text-muted-foreground">Optional.</p>
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

export function WorkLocationsPanel({ locations }: { locations: WorkLocationRow[] }) {
  const [showDeactivated, setShowDeactivated] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const visible = useMemo(
    () => locations.filter((l) => showDeactivated || l.isActive),
    [locations, showDeactivated]
  );
  const editing = locations.find((l) => l.id === editId) ?? null;

  const handleCreate = (formData: FormData) => {
    setAddError(null);
    startTransition(async () => {
      try {
        await createWorkLocation(formData);
        setAddOpen(false);
      } catch (e) {
        setAddError(e instanceof Error ? e.message : "Failed to create work location.");
      }
    });
  };

  const handleUpdate = (formData: FormData) => {
    if (!editId) return;
    setEditError(null);
    startTransition(async () => {
      try {
        await updateWorkLocation(editId, formData);
        setEditId(null);
      } catch (e) {
        setEditError(e instanceof Error ? e.message : "Failed to update work location.");
      }
    });
  };

  const handleToggle = (location: WorkLocationRow) => {
    setRowError(null);
    setTogglingId(location.id);
    startTransition(async () => {
      try {
        await setWorkLocationActive(location.id, !location.isActive);
      } catch (e) {
        setRowError(e instanceof Error ? e.message : "Failed to update work location.");
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
                Add a work location
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a work location</DialogTitle>
              </DialogHeader>
              <WorkLocationForm onSubmit={handleCreate} isPending={isPending} error={addError} />
            </DialogContent>
          </Dialog>
        </div>

        {rowError && <p className="text-sm text-destructive">{rowError}</p>}

        <div className="flex flex-col divide-y">
          {visible.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No work locations yet.</p>
          )}
          {visible.map((l) => (
            <div key={l.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium">
                  {l.name}
                  {l.code && <span className="ml-2 text-xs text-muted-foreground">{l.code}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {KIND_LABELS[l.kind] ?? l.kind}
                  {l.address ? ` · ${l.address}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{l.employeeCount} employees</span>
                <Badge variant={l.isActive ? "default" : "secondary"}>
                  {l.isActive ? "Active" : "Deactivated"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => setEditId(l.id)}>
                  <PenLine className="size-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending && togglingId === l.id}
                  onClick={() => handleToggle(l)}
                >
                  {isPending && togglingId === l.id && <Loader2 className="size-3.5 animate-spin" />}
                  {l.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit work location</DialogTitle>
          </DialogHeader>
          {editing && (
            <WorkLocationForm
              defaultValues={{
                name: editing.name,
                code: editing.code ?? "",
                kind: editing.kind,
                address: editing.address ?? "",
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
