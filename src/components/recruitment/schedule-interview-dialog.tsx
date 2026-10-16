"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
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
import { scheduleInterview } from "@/app/(dashboard)/recruitment/actions";

export function ScheduleInterviewDialog({
  applicationId,
  interviewers,
}: {
  applicationId: string;
  interviewers: { id: string; firstName: string; lastName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [interviewerId, setInterviewerId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("applicationId", applicationId);
    formData.set("interviewerId", interviewerId);
    startTransition(async () => {
      try {
        await scheduleInterview(formData);
        setOpen(false);
        setInterviewerId("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to schedule interview.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CalendarPlus className="size-3.5" />
          Schedule Interview
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Interviewer</Label>
            <Select value={interviewerId} onValueChange={setInterviewerId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an interviewer" />
              </SelectTrigger>
              <SelectContent>
                {interviewers.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.firstName} {i.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scheduledAt">Date &amp; Time</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !interviewerId}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
