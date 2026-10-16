"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { createOffer, updateOfferStatus } from "@/app/(dashboard)/recruitment/actions";

export type OfferInfo = {
  id: string;
  salaryOffered: number;
  startDate: string;
  status: string;
} | null;

export function OfferSection({ applicationId, offer }: { applicationId: string; offer: OfferInfo }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!offer) {
    const handleCreate = (formData: FormData) => {
      setError(null);
      formData.set("applicationId", applicationId);
      startTransition(async () => {
        try {
          await createOffer(formData);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to create offer.");
        }
      });
    };

    return (
      <form action={handleCreate} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="salaryOffered">Salary Offered</Label>
            <Input id="salaryOffered" name="salaryOffered" type="number" min="0" step="0.01" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" name="startDate" type="date" required />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Create Offer
        </Button>
      </form>
    );
  }

  const act = (status: "SENT" | "ACCEPTED" | "DECLINED") => {
    setError(null);
    startTransition(async () => {
      try {
        await updateOfferStatus(offer.id, applicationId, status);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update offer.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Badge variant={offer.status === "ACCEPTED" ? "default" : "secondary"}>{offer.status}</Badge>
        <span className="text-sm">
          {formatCurrency(offer.salaryOffered)} · starts {new Date(offer.startDate).toLocaleDateString()}
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        {offer.status === "DRAFT" && (
          <Button size="sm" disabled={isPending} onClick={() => act("SENT")}>
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Mark Sent
          </Button>
        )}
        {offer.status === "SENT" && (
          <>
            <Button size="sm" disabled={isPending} onClick={() => act("ACCEPTED")}>
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              Mark Accepted
            </Button>
            <Button size="sm" variant="outline" disabled={isPending} onClick={() => act("DECLINED")}>
              Mark Declined
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
