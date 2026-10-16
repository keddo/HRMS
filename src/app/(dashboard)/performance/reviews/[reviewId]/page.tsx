import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEmployee, canApproveFor } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentForm } from "@/components/performance/assessment-form";

function RatingDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= rating ? "fill-warning text-warning" : "text-muted-foreground")} />
      ))}
    </div>
  );
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const session = await auth();

  const review = await prisma.performanceReview.findUnique({
    where: { id: reviewId },
    include: { cycle: true, employee: { include: { department: true, position: true } } },
  });

  if (!review) notFound();

  const isSelf = canManageEmployee(session?.user.role, session?.user.employeeId, review.employeeId);
  const isApprover = canApproveFor(session?.user.role, session?.user.employeeId, review.employee.managerId);
  if (!isSelf && !isApprover) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {review.employee.firstName} {review.employee.lastName} — {review.cycle.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {review.employee.position?.title ?? "—"} · {review.employee.department?.name ?? "—"}
        </p>
        <Badge className="mt-2" variant={review.status === "COMPLETED" ? "default" : "secondary"}>
          {review.status.replace("_", " ")}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Self-Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          {review.selfSubmittedAt ? (
            <div className="flex flex-col gap-2">
              <RatingDisplay rating={review.selfRating ?? 0} />
              {review.selfComments && <p className="text-sm">{review.selfComments}</p>}
              <p className="text-xs text-muted-foreground">
                Submitted {review.selfSubmittedAt.toLocaleDateString()}
              </p>
            </div>
          ) : isSelf ? (
            <AssessmentForm reviewId={review.id} kind="self" />
          ) : (
            <p className="text-sm text-muted-foreground">Waiting on employee to self-assess.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manager Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          {review.managerSubmittedAt ? (
            <div className="flex flex-col gap-2">
              <RatingDisplay rating={review.managerRating ?? 0} />
              {review.managerComments && <p className="text-sm">{review.managerComments}</p>}
              <p className="text-xs text-muted-foreground">
                Submitted {review.managerSubmittedAt.toLocaleDateString()}
              </p>
            </div>
          ) : isApprover ? (
            <AssessmentForm reviewId={review.id} kind="manager" />
          ) : (
            <p className="text-sm text-muted-foreground">Waiting on manager assessment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
