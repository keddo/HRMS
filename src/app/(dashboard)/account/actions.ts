"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { recordAudit } from "@/lib/audit";
import { getCompanySettings } from "@/lib/company-settings";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Admin-initiated password reset: generates a one-time link to share with the user out-of-band. */
export async function initiatePasswordReset(userId: string): Promise<string> {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to reset passwords.");

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error("User not found.");

  const rawToken = crypto.randomBytes(32).toString("base64url");

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "CREATE",
    entityType: "PasswordResetToken",
    entityId: userId,
    summary: `Issued a password reset link for ${targetUser.email}`,
  });

  return rawToken;
}

const completeResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

export async function completePasswordReset(formData: FormData) {
  const parsed = completeResetSchema.parse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  const { minPasswordLength } = await getCompanySettings();
  if (parsed.password.length < minPasswordLength) {
    throw new Error(`Password must be at least ${minPasswordLength} characters.`);
  }

  const tokenHash = hashToken(parsed.token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new Error("This reset link is invalid or has expired. Ask an admin for a new one.");
  }

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export async function changeOwnPassword(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const parsed = changePasswordSchema.parse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });

  const { minPasswordLength } = await getCompanySettings();
  if (parsed.newPassword.length < minPasswordLength) {
    throw new Error(`Password must be at least ${minPasswordLength} characters.`);
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const valid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(parsed.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  revalidatePath("/account/change-password");
}
