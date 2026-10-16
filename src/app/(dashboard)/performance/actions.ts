"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, canApproveFor } from "@/lib/rbac";
import { assertEmployeeExists } from "@/lib/session";

// ---------- Goals ----------

const goalSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetDate: z.string().optional(),
});

export async function createGoal(formData: FormData) {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");
  await assertEmployeeExists(session.user.employeeId);

  const parsed = goalSchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    targetDate: formData.get("targetDate") || undefined,
  });

  await prisma.goal.create({
    data: {
      employeeId: session.user.employeeId,
      title: parsed.title,
      description: parsed.description,
      targetDate: parsed.targetDate ? new Date(parsed.targetDate) : null,
    },
  });

  revalidatePath("/performance");
}

const GOAL_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const updateGoalSchema = z.object({
  status: z.enum(GOAL_STATUSES).optional(),
  progress: z.number().int().min(0).max(100).optional(),
});

export async function updateGoal(goalId: string, data: { status?: string; progress?: number }) {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found.");
  if (goal.employeeId !== session.user.employeeId && !isAdmin(session.user.role)) {
    throw new Error("You can only update your own goals.");
  }

  const parsed = updateGoalSchema.parse(data);

  await prisma.goal.update({
    where: { id: goalId },
    data: parsed,
  });

  revalidatePath("/performance");
}

export async function deleteGoal(goalId: string) {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");

  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal) throw new Error("Goal not found.");
  if (goal.employeeId !== session.user.employeeId && !isAdmin(session.user.role)) {
    throw new Error("You can only delete your own goals.");
  }

  await prisma.goal.delete({ where: { id: goalId } });
  revalidatePath("/performance");
}

// ---------- Review Cycles ----------

const cycleSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function createReviewCycle(formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to create cycles.");

  const parsed = cycleSchema.parse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });

  if (new Date(parsed.endDate) <= new Date(parsed.startDate)) {
    throw new Error("End date must be after start date.");
  }

  await prisma.reviewCycle.create({
    data: { name: parsed.name, startDate: new Date(parsed.startDate), endDate: new Date(parsed.endDate) },
  });

  revalidatePath("/performance");
}

export async function launchReviewCycle(cycleId: string) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to launch cycles.");

  const cycle = await prisma.reviewCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new Error("Cycle not found.");
  if (cycle.status !== "DRAFT") throw new Error("This cycle has already been launched.");

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE" },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.performanceReview.createMany({
      data: employees.map((e) => ({ cycleId, employeeId: e.id })),
      skipDuplicates: true,
    }),
    prisma.reviewCycle.update({ where: { id: cycleId }, data: { status: "ACTIVE" } }),
  ]);

  revalidatePath("/performance");
}

export async function closeReviewCycle(cycleId: string) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to close cycles.");

  await prisma.reviewCycle.update({ where: { id: cycleId }, data: { status: "CLOSED" } });
  revalidatePath("/performance");
}

// ---------- Reviews ----------

const assessmentSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comments: z.string().optional(),
});

export async function submitSelfAssessment(reviewId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user.employeeId) throw new Error("Not authenticated");

  const review = await prisma.performanceReview.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Review not found.");
  if (review.employeeId !== session.user.employeeId) {
    throw new Error("You can only complete your own self-assessment.");
  }
  if (review.selfSubmittedAt) throw new Error("Self-assessment already submitted.");

  const parsed = assessmentSchema.parse({
    rating: formData.get("rating"),
    comments: formData.get("comments") || undefined,
  });

  await prisma.performanceReview.update({
    where: { id: reviewId },
    data: {
      selfRating: parsed.rating,
      selfComments: parsed.comments,
      selfSubmittedAt: new Date(),
      status: review.managerSubmittedAt ? "COMPLETED" : "SELF_SUBMITTED",
    },
  });

  revalidatePath("/performance");
  revalidatePath(`/performance/reviews/${reviewId}`);
}

export async function submitManagerAssessment(reviewId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const review = await prisma.performanceReview.findUnique({
    where: { id: reviewId },
    include: { employee: true },
  });
  if (!review) throw new Error("Review not found.");

  const authorized = canApproveFor(
    session.user.role,
    session.user.employeeId,
    review.employee.managerId
  );
  if (!authorized) throw new Error("You are not authorized to review this employee.");
  if (review.managerSubmittedAt) throw new Error("Manager assessment already submitted.");

  const parsed = assessmentSchema.parse({
    rating: formData.get("rating"),
    comments: formData.get("comments") || undefined,
  });

  await prisma.performanceReview.update({
    where: { id: reviewId },
    data: {
      managerRating: parsed.rating,
      managerComments: parsed.comments,
      managerSubmittedAt: new Date(),
      status: review.selfSubmittedAt ? "COMPLETED" : review.status,
    },
  });

  revalidatePath("/performance");
  revalidatePath(`/performance/reviews/${reviewId}`);
}
