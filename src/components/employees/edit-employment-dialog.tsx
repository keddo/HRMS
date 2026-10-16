"use client";

import { useState, useTransition } from "react";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { updateEmployment } from "@/app/(dashboard)/employees/actions";

const STATUSES = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"];

export function EditEmploymentDialog({
  employeeId,
  departments,
  positions,
  managers,
  current,
}: {
  employeeId: string;
  departments: { id: string; name: string }[];
  positions: { id: string; title: string; departmentId: string }[];
  managers: { id: string; firstName: string; lastName: string }[];
  current: {
    departmentId: string | null;
    positionId: string | null;
    managerId: string | null;
    employmentStatus: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState(current.departmentId ?? "");
  const [positionId, setPositionId] = useState(current.positionId ?? "");
  const [managerId, setManagerId] = useState(current.managerId ?? "");
  const [status, setStatus] = useState(current.employmentStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredPositions = positions.filter((p) => p.departmentId === departmentId);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("departmentId", departmentId);
    formData.set("positionId", positionId);
    formData.set("managerId", managerId === "none" ? "" : managerId);
    formData.set("employmentStatus", status);
    startTransition(async () => {
      try {
        await updateEmployment(employeeId, formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update employment details.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PenLine className="size-3.5" />
          Edit Employment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Employment</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
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
            <Label>Position</Label>
            <Select value={positionId} onValueChange={setPositionId} disabled={!departmentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a position" />
              </SelectTrigger>
              <SelectContent>
                {filteredPositions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Manager</Label>
            <Select value={managerId || "none"} onValueChange={setManagerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {managers
                  .filter((m) => m.id !== employeeId)
                  .map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Employment Status</Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="changeReason">Reason (optional)</Label>
            <Input id="changeReason" name="changeReason" placeholder="e.g. Promotion, Transfer" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !departmentId}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
