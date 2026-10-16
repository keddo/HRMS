"use client";

import { useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitSelfAssessment, submitManagerAssessment } from "@/app/(dashboard)/performance/actions";

export function AssessmentForm({ reviewId, kind }: { reviewId: string; kind: "self" | "manager" }) {
  const [rating, setRating] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }
    formData.set("rating", String(rating));
    startTransition(async () => {
      try {
        if (kind === "self") {
          await submitSelfAssessment(reviewId, formData);
        } else {
          await submitManagerAssessment(reviewId, formData);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit.");
      }
    });
  };

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Rating</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className="p-1"
              aria-label={`Rate ${n}`}
            >
              <Star
                className={cn(
                  "size-6",
                  n <= rating ? "fill-warning text-warning" : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${kind}-comments`}>Comments</Label>
        <Textarea id={`${kind}-comments`} name="comments" rows={4} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending} className="w-fit">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Submit {kind === "self" ? "Self-Assessment" : "Manager Assessment"}
      </Button>
    </form>
  );
}
