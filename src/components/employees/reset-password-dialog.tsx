"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { initiatePasswordReset } from "@/app/(dashboard)/account/actions";

export function ResetPasswordDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const generate = () => {
    setError(null);
    startTransition(async () => {
      try {
        const token = await initiatePasswordReset(userId);
        setLink(`${window.location.origin}/reset-password?token=${token}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate reset link.");
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setLink(null);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <KeyRound className="size-3.5" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        {link ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Share this one-time link with the user (expires in 1 hour). It won&apos;t be shown again.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  setCopied(true);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              This generates a one-time link to set a new password. No email will be sent — share
              the link with the user yourself.
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={generate} disabled={isPending} className="w-fit">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Generate Link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
