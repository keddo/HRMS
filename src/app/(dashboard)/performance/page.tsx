import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, isManagerOrAbove } from "@/lib/rbac";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoalsList, type GoalRow } from "@/components/performance/goals-list";
import { AddGoalDialog } from "@/components/performance/add-goal-dialog";
import { ReviewsTable, type ReviewRow } from "@/components/performance/reviews-table";
import { ReviewCyclesTable, type CycleRow } from "@/components/performance/review-cycles-table";
import { CreateCycleDialog } from "@/components/performance/create-cycle-dialog";

export default async function PerformancePage() {
  const session = await auth();
  const employeeId = session?.user.employeeId;
  const admin = isAdmin(session?.user.role);
  const canSeeTeam = isManagerOrAbove(session?.user.role);

  const [goals, myReviews, teamReviews, cycles] = await Promise.all([
    employeeId
      ? prisma.goal.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    employeeId
      ? prisma.performanceReview.findMany({
          where: { employeeId },
          include: { cycle: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    canSeeTeam
      ? prisma.performanceReview.findMany({
          where: {
            status: { not: "COMPLETED" },
            employee: admin ? undefined : { managerId: employeeId },
          },
          include: { cycle: true, employee: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    admin
      ? prisma.reviewCycle.findMany({
          include: { reviews: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const goalRows: GoalRow[] = goals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    targetDate: g.targetDate?.toISOString() ?? null,
    status: g.status,
    progress: g.progress,
  }));

  const myReviewRows: ReviewRow[] = myReviews.map((r) => ({
    id: r.id,
    cycleName: r.cycle.name,
    status: r.status,
    selfSubmitted: !!r.selfSubmittedAt,
    managerSubmitted: !!r.managerSubmittedAt,
  }));

  const teamReviewRows: ReviewRow[] = teamReviews.map((r) => ({
    id: r.id,
    cycleName: r.cycle.name,
    employeeName: `${r.employee.firstName} ${r.employee.lastName}`,
    status: r.status,
    selfSubmitted: !!r.selfSubmittedAt,
    managerSubmitted: !!r.managerSubmittedAt,
  }));

  const cycleRows: CycleRow[] = cycles.map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate.toISOString(),
    status: c.status,
    reviewCount: c.reviews.length,
    completedCount: c.reviews.filter((r) => r.status === "COMPLETED").length,
  }));

  const defaultTab = admin ? "cycles" : "goals";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Track goals and manage performance review cycles.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="goals">My Goals</TabsTrigger>
          <TabsTrigger value="reviews">My Reviews</TabsTrigger>
          {canSeeTeam && (
            <TabsTrigger value="team">
              Team Reviews
              {teamReviewRows.length > 0 && (
                <span className="ml-1.5 rounded-full bg-warning px-1.5 text-xs text-warning-foreground">
                  {teamReviewRows.length}
                </span>
              )}
            </TabsTrigger>
          )}
          {admin && <TabsTrigger value="cycles">Cycles</TabsTrigger>}
        </TabsList>

        <TabsContent value="goals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">My Goals</CardTitle>
              {employeeId && <AddGoalDialog />}
            </CardHeader>
            <CardContent>
              <GoalsList goals={goalRows} canEdit={!!employeeId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <ReviewsTable reviews={myReviewRows} />
        </TabsContent>

        {canSeeTeam && (
          <TabsContent value="team">
            <ReviewsTable reviews={teamReviewRows} showEmployee />
          </TabsContent>
        )}

        {admin && (
          <TabsContent value="cycles">
            <div className="flex flex-col gap-3">
              <div className="flex justify-end">
                <CreateCycleDialog />
              </div>
              <ReviewCyclesTable cycles={cycleRows} />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
