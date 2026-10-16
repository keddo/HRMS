"use client";

import { useTransition } from "react";
import { Clock, LogIn, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clockIn, clockOut } from "@/app/(dashboard)/attendance/actions";

export function ClockWidget({
  clockInTime,
  clockOutTime,
}: {
  clockInTime: string | null;
  clockOutTime: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="font-medium">
              In: {fmt(clockInTime)} · Out: {fmt(clockOutTime)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={isPending || !!clockInTime}
            onClick={() => startTransition(() => clockIn())}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            Clock In
          </Button>
          <Button
            disabled={isPending || !clockInTime || !!clockOutTime}
            onClick={() => startTransition(() => clockOut())}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
            Clock Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
