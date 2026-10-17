"use client";

import { useState, useTransition } from "react";
import { Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { updatePersonalInfo } from "@/app/(dashboard)/employees/actions";

const GENDERS = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"];

export function EditPersonalInfoDialog({
  employeeId,
  current,
}: {
  employeeId: string;
  current: {
    phone: string | null;
    address: string | null;
    dateOfBirth: string | null;
    gender: string;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [gender, setGender] = useState(current.gender);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("gender", gender);
    startTransition(async () => {
      try {
        await updatePersonalInfo(employeeId, formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update personal information.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PenLine className="size-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Personal Information</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={current.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={current.dateOfBirth ?? ""}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" name="address" rows={2} defaultValue={current.address ?? ""} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emergencyContactName">Emergency Contact</Label>
              <Input
                id="emergencyContactName"
                name="emergencyContactName"
                defaultValue={current.emergencyContactName ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="emergencyContactPhone">Emergency Phone</Label>
              <Input
                id="emergencyContactPhone"
                name="emergencyContactPhone"
                defaultValue={current.emergencyContactPhone ?? ""}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
