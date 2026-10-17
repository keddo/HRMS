import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { getCompanySettings } from "@/lib/company-settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyProfilePanel } from "@/components/settings/company-profile-panel";
import { SecurityPanel } from "@/components/settings/security-panel";
import { HolidaysPanel } from "@/components/settings/holidays-panel";
import { PayComponentsPanel } from "@/components/settings/pay-components-panel";

export default async function SettingsPage() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/dashboard");

  const [companySettings, holidays, payComponents] = await Promise.all([
    getCompanySettings(),
    prisma.holiday.findMany({ orderBy: { date: "asc" } }),
    prisma.payComponent.findMany({
      include: { _count: { select: { salaryComponents: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Company profile, security, the holiday calendar, and payroll components used across the
          system.
        </p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="pay-components">Pay Components</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <CompanyProfilePanel
            companyName={companySettings.companyName}
            logoSrc={companySettings.logoUrl ? "/api/company-logo" : null}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecurityPanel minPasswordLength={companySettings.minPasswordLength} />
        </TabsContent>

        <TabsContent value="holidays">
          <HolidaysPanel
            holidays={holidays.map((h) => ({
              id: h.id,
              name: h.name,
              date: h.date.toISOString().slice(0, 10),
            }))}
          />
        </TabsContent>

        <TabsContent value="pay-components">
          <PayComponentsPanel
            components={payComponents.map((pc) => ({
              id: pc.id,
              name: pc.name,
              type: pc.type,
              isPercentage: pc.isPercentage,
              defaultValue: pc.defaultValue,
              isActive: pc.isActive,
              usageCount: pc._count.salaryComponents,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
