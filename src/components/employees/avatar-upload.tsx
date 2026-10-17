"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadAvatar } from "@/app/(dashboard)/employees/actions";

export function AvatarUpload({
  employeeId,
  avatarSrc,
  initials,
  canEdit,
}: {
  employeeId: string;
  avatarSrc: string | null;
  initials: string;
  canEdit: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      try {
        await uploadAvatar(employeeId, formData);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to upload photo.");
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="group relative">
        <Avatar className="size-16">
          {avatarSrc && <AvatarImage src={avatarSrc} alt="" />}
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        {canEdit && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
            aria-label="Change photo"
          >
            {isPending ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5" />}
          </button>
        )}
      </div>
      {canEdit && (
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
        />
      )}
      {error && <p className="max-w-32 text-center text-xs text-destructive">{error}</p>}
    </div>
  );
}
