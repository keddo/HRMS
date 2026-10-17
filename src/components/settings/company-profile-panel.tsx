"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateCompanyProfile } from "@/app/(dashboard)/settings/actions";

export function CompanyProfilePanel({
  companyName,
  logoSrc,
}: {
  companyName: string;
  logoSrc: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateCompanyProfile(formData);
        setSuccess(true);
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update company profile.");
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form action={handleSubmit} className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" name="companyName" defaultValue={companyName} required />
            <p className="text-xs text-muted-foreground">
              Shown in the sidebar, login page, and browser tab title.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logo">Logo</Label>
            <div className="flex items-center gap-3">
              <div className="flex size-14 items-center justify-center overflow-hidden rounded-full border bg-muted">
                {preview || logoSrc ? (
                  <Image
                    src={preview ?? logoSrc ?? ""}
                    alt=""
                    width={56}
                    height={56}
                    className="size-14 object-cover"
                    unoptimized={!!preview}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="block text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setPreview(file ? URL.createObjectURL(file) : null);
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPEG, or WEBP, up to 5MB.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-success">Company profile updated.</p>}
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
