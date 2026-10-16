import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { RequisitionsTable, type RequisitionRow } from "@/components/recruitment/requisitions-table";
import { CreateRequisitionDialog } from "@/components/recruitment/create-requisition-dialog";

export default async function RecruitmentPage() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/dashboard");

  const [requisitions, departments] = await Promise.all([
    prisma.jobRequisition.findMany({
      include: { department: true, _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: RequisitionRow[] = requisitions.map((r) => ({
    id: r.id,
    title: r.title,
    departmentName: r.department.name,
    openings: r.openings,
    status: r.status,
    applicationCount: r._count.applications,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recruitment</h1>
          <p className="text-sm text-muted-foreground">Manage job requisitions and candidates.</p>
        </div>
        <CreateRequisitionDialog departments={departments} />
      </div>

      <RequisitionsTable requisitions={rows} />
    </div>
  );
}
