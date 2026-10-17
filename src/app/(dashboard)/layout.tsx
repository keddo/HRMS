import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/company-settings";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [notifications, companySettings] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    getCompanySettings(),
  ]);
  const logoSrc = companySettings.logoUrl ? "/api/company-logo" : "/logo.png";

  return (
    <div className="flex h-screen w-full overflow-hidden print:block print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar role={session.user.role} companyName={companySettings.companyName} logoSrc={logoSrc} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col print:block">
        <div className="print:hidden">
          <Topbar
            name={session.user.name ?? session.user.email ?? "User"}
            email={session.user.email ?? ""}
            role={session.user.role}
            companyName={companySettings.companyName}
            logoSrc={logoSrc}
            notifications={notifications.map((n) => ({
              id: n.id,
              title: n.title,
              body: n.body,
              link: n.link,
              read: n.read,
              createdAt: n.createdAt.toISOString(),
            }))}
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6 print:overflow-visible print:bg-white print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
