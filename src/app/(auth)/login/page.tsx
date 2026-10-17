import { Suspense } from "react";
import { getCompanySettings } from "@/lib/company-settings";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const settings = await getCompanySettings();
  const logoSrc = settings.logoUrl ? "/api/company-logo" : "/logo.png";

  return (
    <Suspense>
      <LoginForm companyName={settings.companyName} logoSrc={logoSrc} />
    </Suspense>
  );
}
