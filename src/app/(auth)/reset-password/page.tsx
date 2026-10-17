import { Suspense } from "react";
import { getCompanySettings } from "@/lib/company-settings";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage() {
  const settings = await getCompanySettings();

  return (
    <Suspense>
      <ResetPasswordForm minPasswordLength={settings.minPasswordLength} />
    </Suspense>
  );
}
