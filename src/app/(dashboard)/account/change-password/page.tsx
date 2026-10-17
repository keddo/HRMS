import { getCompanySettings } from "@/lib/company-settings";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const settings = await getCompanySettings();
  return <ChangePasswordForm minPasswordLength={settings.minPasswordLength} />;
}
