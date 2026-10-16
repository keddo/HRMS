"use client";

import { useState, useTransition } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitInterviewFeedback } from "@/app/(dashboard)/recruitment/actions";

export type InterviewRow = {
  id: string;
  interviewerName: string;
  scheduledAt: string;
  status: string;
  rating: number | null;
  feedback: string | null;
};

export function InterviewsList({
  applicationId,
  interviews,
}: {
  applicationId: string;
  interviews: InterviewRow[];
}) {
  if (interviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y">
      {interviews.map((i) => (
        <InterviewRowItem key={i.id} applicationId={applicationId} interview={i} />
      ))}
    </div>
  );
}

function InterviewRowItem({
  applicationId,
  interview,
}: {
  applicationId: string;
  interview: InterviewRow;
}) {
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
        await submitInterviewFeedback(interview.id, applicationId, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to submit feedback.");
      }
    });
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{interview.interviewerName}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(interview.scheduledAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={interview.status === "COMPLETED" ? "default" : "secondary"}>
          {interview.status}
        </Badge>
      </div>

      {interview.status === "COMPLETED" ? (
        <div className="mt-2 flex flex-col gap-1">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={cn(
                  "size-4",
                  n <= (interview.rating ?? 0) ? "fill-warning text-warning" : "text-muted-foreground"
                )}
              />
            ))}
          </div>
          {interview.feedback && <p className="text-sm">{interview.feedback}</p>}
        </div>
      ) : (
        <form action={handleSubmit} className="mt-3 flex flex-col gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} className="p-0.5">
                <Star
                  className={cn("size-5", n <= rating ? "fill-warning text-warning" : "text-muted-foreground")}
                />
              </button>
            ))}
          </div>
          <Textarea name="feedback" placeholder="Feedback" rows={2} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={isPending} className="w-fit">
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Submit Feedback
          </Button>
        </form>
      )}
    </div>
  );
}
