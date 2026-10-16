import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScheduleInterviewDialog } from "@/components/recruitment/schedule-interview-dialog";
import { InterviewsList, type InterviewRow } from "@/components/recruitment/interviews-list";
import { OfferSection } from "@/components/recruitment/offer-section";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/dashboard");

  const [application, interviewers] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        jobRequisition: { include: { department: true } },
        interviews: { include: { interviewer: true }, orderBy: { scheduledAt: "asc" } },
        offer: true,
      },
    }),
    prisma.employee.findMany({
      where: { employmentStatus: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  if (!application) notFound();

  const interviewRows: InterviewRow[] = application.interviews.map((i) => ({
    id: i.id,
    interviewerName: `${i.interviewer.firstName} ${i.interviewer.lastName}`,
    scheduledAt: i.scheduledAt.toISOString(),
    status: i.status,
    rating: i.rating,
    feedback: i.feedback,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {application.candidate.firstName} {application.candidate.lastName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Applying for {application.jobRequisition.title} · {application.jobRequisition.department.name}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <Badge>{application.stage}</Badge>
          <span className="text-sm text-muted-foreground">{application.candidate.email}</span>
          {application.candidate.phone && (
            <span className="text-sm text-muted-foreground">· {application.candidate.phone}</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Interviews</CardTitle>
          <ScheduleInterviewDialog applicationId={application.id} interviewers={interviewers} />
        </CardHeader>
        <CardContent>
          <InterviewsList applicationId={application.id} interviews={interviewRows} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Offer</CardTitle>
        </CardHeader>
        <CardContent>
          <OfferSection
            applicationId={application.id}
            offer={
              application.offer
                ? {
                    id: application.offer.id,
                    salaryOffered: application.offer.salaryOffered,
                    startDate: application.offer.startDate.toISOString(),
                    status: application.offer.status,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
