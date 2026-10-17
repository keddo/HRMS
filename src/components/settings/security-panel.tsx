"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateSecuritySettings } from "@/app/(dashboard)/settings/actions";

export function SecurityPanel({ minPasswordLength }: { minPasswordLength: number }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await updateSecuritySettings(formData);
        setSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update security settings.");
      }
    });
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form action={handleSubmit} className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="minPasswordLength">Minimum password length</Label>
            <Input
              id="minPasswordLength"
              name="minPasswordLength"
              type="number"
              min="6"
              max="64"
              defaultValue={minPasswordLength}
              required
            />
            <p className="text-xs text-muted-foreground">
              Applies to password resets and changes going forward. Does not affect existing
              passwords.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-success">Security settings updated.</p>}
          <Button type="submit" disabled={isPending} className="w-fit">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
