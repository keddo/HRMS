import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { AssignChecklistDialog } from "@/components/onboarding/assign-checklist-dialog";
import { ChecklistCard, type ChecklistInfo } from "@/components/onboarding/checklist-card";

export default async function OnboardingPage() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/dashboard");

  const [checklists, employees] = await Promise.all([
    prisma.employeeChecklist.findMany({
      include: { employee: true, items: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const checklistInfos: ChecklistInfo[] = checklists.map((c) => ({
    id: c.id,
    employeeName: `${c.employee.firstName} ${c.employee.lastName}`,
    type: c.type,
    status: c.status,
    items: c.items.map((i) => ({ id: i.id, title: i.title, completed: i.completed })),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Onboarding &amp; Offboarding</h1>
          <p className="text-sm text-muted-foreground">
            Track checklist-driven onboarding and offboarding workflows.
          </p>
        </div>
        <AssignChecklistDialog employees={employees} />
      </div>

      {checklistInfos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No checklists assigned yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {checklistInfos.map((c) => (
            <ChecklistCard key={c.id} checklist={c} />
          ))}
        </div>
      )}
    </div>
  );
}
