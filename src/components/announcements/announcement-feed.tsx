"use client";

import { useTransition } from "react";
import { Loader2, Pin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteAnnouncement } from "@/app/(dashboard)/announcements/actions";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  pinned: boolean;
  publishedAt: string;
};

export function AnnouncementFeed({
  announcements,
  canManage,
}: {
  announcements: AnnouncementRow[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (announcements.length === 0) {
    return <p className="text-sm text-muted-foreground">No announcements yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {announcements.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {a.pinned && <Pin className="size-3.5 fill-primary text-primary" />}
                <p className="font-medium">{a.title}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {a.authorName} · {new Date(a.publishedAt).toLocaleDateString()}
              </p>
            </div>
            {canManage && (
              <Button
                size="icon"
                variant="ghost"
                disabled={isPending}
                onClick={() => startTransition(() => deleteAnnouncement(a.id))}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
