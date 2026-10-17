"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
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
import { updateSensitiveInfo } from "@/app/(dashboard)/employees/actions";

export function EditSensitiveInfoDialog({
  employeeId,
  bankName,
  hasBankAccount,
  hasNationalId,
  hasTelebirr,
}: {
  employeeId: string;
  bankName: string | null;
  hasBankAccount: boolean;
  hasNationalId: boolean;
  hasTelebirr: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateSensitiveInfo(employeeId, formData);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update information.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ShieldCheck className="size-3.5" />
          Edit Bank / ID Info
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bank &amp; National ID</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" name="bankName" defaultValue={bankName ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
            <Input
              id="bankAccountNumber"
              name="bankAccountNumber"
              placeholder={hasBankAccount ? "•••• already on file — leave blank to keep" : ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nationalId">National ID</Label>
            <Input
              id="nationalId"
              name="nationalId"
              placeholder={hasNationalId ? "•••• already on file — leave blank to keep" : ""}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telebirrNumber">Telebirr Number</Label>
            <Input
              id="telebirrNumber"
              name="telebirrNumber"
              placeholder={hasTelebirr ? "•••• already on file — leave blank to keep" : "Where salary is paid"}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Bank account, national ID, and Telebirr number are encrypted at rest. Leave a field
            blank to keep its current value unchanged.
          </p>
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
