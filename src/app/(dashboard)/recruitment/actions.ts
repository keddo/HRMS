"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { assertUserExists } from "@/lib/session";

function requireAdmin(role: Role | undefined | null) {
  if (!isAdmin(role)) throw new Error("You do not have permission to manage recruitment.");
}

const requisitionSchema = z.object({
  title: z.string().min(1),
  departmentId: z.string().min(1),
  description: z.string().optional(),
  openings: z.coerce.number().int().min(1).default(1),
});

export async function createRequisition(formData: FormData) {
  const session = await auth();
  requireAdmin(session?.user.role);
  await assertUserExists(session!.user.id);

  const parsed = requisitionSchema.parse({
    title: formData.get("title"),
    departmentId: formData.get("departmentId"),
    description: formData.get("description") || undefined,
    openings: formData.get("openings") || 1,
  });

  await prisma.jobRequisition.create({
    data: { ...parsed, createdById: session!.user.id },
  });

  revalidatePath("/recruitment");
}

const REQUISITION_STATUSES = ["OPEN", "ON_HOLD", "CLOSED"] as const;

export async function setRequisitionStatus(requisitionId: string, status: string) {
  const session = await auth();
  requireAdmin(session?.user.role);

  await prisma.jobRequisition.update({
    where: { id: requisitionId },
    data: { status: z.enum(REQUISITION_STATUSES).parse(status) },
  });
  revalidatePath("/recruitment");
  revalidatePath(`/recruitment/${requisitionId}`);
}

const candidateSchema = z.object({
  jobRequisitionId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
});

export async function addCandidate(formData: FormData) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const parsed = candidateSchema.parse({
    jobRequisitionId: formData.get("jobRequisitionId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
  });

  const candidate = await prisma.candidate.upsert({
    where: { email: parsed.email },
    update: { firstName: parsed.firstName, lastName: parsed.lastName, phone: parsed.phone },
    create: {
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
    },
  });

  await prisma.application.create({
    data: { jobRequisitionId: parsed.jobRequisitionId, candidateId: candidate.id },
  });

  revalidatePath(`/recruitment/${parsed.jobRequisitionId}`);
}

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;

export async function setApplicationStage(applicationId: string, stage: string) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { stage: z.enum(STAGES).parse(stage) },
  });

  revalidatePath(`/recruitment/${application.jobRequisitionId}`);
  revalidatePath(`/recruitment/applications/${applicationId}`);
}

const interviewSchema = z.object({
  applicationId: z.string().min(1),
  interviewerId: z.string().min(1),
  scheduledAt: z.string().min(1),
});

export async function scheduleInterview(formData: FormData) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const parsed = interviewSchema.parse({
    applicationId: formData.get("applicationId"),
    interviewerId: formData.get("interviewerId"),
    scheduledAt: formData.get("scheduledAt"),
  });

  await prisma.interview.create({
    data: {
      applicationId: parsed.applicationId,
      interviewerId: parsed.interviewerId,
      scheduledAt: new Date(parsed.scheduledAt),
    },
  });

  revalidatePath(`/recruitment/applications/${parsed.applicationId}`);
}

const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  feedback: z.string().optional(),
});

export async function submitInterviewFeedback(interviewId: string, applicationId: string, formData: FormData) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const parsed = feedbackSchema.parse({
    rating: formData.get("rating"),
    feedback: formData.get("feedback") || undefined,
  });

  await prisma.interview.update({
    where: { id: interviewId },
    data: { rating: parsed.rating, feedback: parsed.feedback, status: "COMPLETED" },
  });

  revalidatePath(`/recruitment/applications/${applicationId}`);
}

const offerSchema = z.object({
  applicationId: z.string().min(1),
  salaryOffered: z.coerce.number().positive(),
  startDate: z.string().min(1),
});

export async function createOffer(formData: FormData) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const parsed = offerSchema.parse({
    applicationId: formData.get("applicationId"),
    salaryOffered: formData.get("salaryOffered"),
    startDate: formData.get("startDate"),
  });

  await prisma.$transaction([
    prisma.offer.create({
      data: {
        applicationId: parsed.applicationId,
        salaryOffered: parsed.salaryOffered,
        startDate: new Date(parsed.startDate),
      },
    }),
    prisma.application.update({ where: { id: parsed.applicationId }, data: { stage: "OFFER" } }),
  ]);

  revalidatePath(`/recruitment/applications/${parsed.applicationId}`);
}

export async function updateOfferStatus(
  offerId: string,
  applicationId: string,
  status: "SENT" | "ACCEPTED" | "DECLINED"
) {
  const session = await auth();
  requireAdmin(session?.user.role);

  await prisma.$transaction([
    prisma.offer.update({
      where: { id: offerId },
      data: {
        status,
        sentAt: status === "SENT" ? new Date() : undefined,
        decidedAt: status === "ACCEPTED" || status === "DECLINED" ? new Date() : undefined,
      },
    }),
    prisma.application.update({
      where: { id: applicationId },
      data: { stage: status === "ACCEPTED" ? "HIRED" : status === "DECLINED" ? "REJECTED" : undefined },
    }),
  ]);

  revalidatePath(`/recruitment/applications/${applicationId}`);
}
