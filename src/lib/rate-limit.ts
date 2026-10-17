import { prisma } from "@/lib/prisma";

/**
 * DB-backed fixed-window rate limiter, keyed by an arbitrary string (e.g. an email).
 * Backed by Postgres rather than in-memory state so it works correctly across the
 * independent, ephemeral serverless instances a platform like Vercel runs.
 */
export async function checkRateLimit(
  identifier: string,
  { max, windowMs }: { max: number; windowMs: number }
): Promise<{ allowed: boolean }> {
  const windowStart = new Date(Date.now() - windowMs);

  // Opportunistically sweep this identifier's stale attempts so the table doesn't grow unbounded.
  await prisma.loginAttempt.deleteMany({
    where: { identifier, createdAt: { lt: windowStart } },
  });

  const count = await prisma.loginAttempt.count({
    where: { identifier, createdAt: { gte: windowStart } },
  });

  if (count >= max) {
    return { allowed: false };
  }

  await prisma.loginAttempt.create({ data: { identifier } });
  return { allowed: true };
}

export async function resetRateLimit(identifier: string) {
  await prisma.loginAttempt.deleteMany({ where: { identifier } });
}
