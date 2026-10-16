import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { AddCandidateDialog } from "@/components/recruitment/add-candidate-dialog";
import { RequisitionStatusSelect } from "@/components/recruitment/requisition-status-select";
import {
  ApplicationsPipelineTable,
  type PipelineRow,
} from "@/components/recruitment/applications-pipeline-table";

export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/dashboard");

  const requisition = await prisma.jobRequisition.findUnique({
    where: { id: jobId },
    include: {
      department: true,
      applications: { include: { candidate: true }, orderBy: { appliedAt: "desc" } },
    },
  });

  if (!requisition) notFound();

  const rows: PipelineRow[] = requisition.applications.map((a) => ({
    applicationId: a.id,
    candidateName: `${a.candidate.firstName} ${a.candidate.lastName}`,
    email: a.candidate.email,
    stage: a.stage,
    appliedAt: a.appliedAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{requisition.title}</h1>
          <p className="text-sm text-muted-foreground">
            {requisition.department.name} · {requisition.openings} opening
            {requisition.openings === 1 ? "" : "s"}
          </p>
          <Badge className="mt-2">{requisition.status.replace("_", " ")}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <RequisitionStatusSelect requisitionId={requisition.id} status={requisition.status} />
          <AddCandidateDialog jobRequisitionId={requisition.id} />
        </div>
      </div>

      {requisition.description && <p className="text-sm text-muted-foreground">{requisition.description}</p>}

      <ApplicationsPipelineTable applications={rows} />
    </div>
  );
}
