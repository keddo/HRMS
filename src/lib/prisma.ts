import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Prisma's 2s/5s transaction defaults are too tight for a remote serverless
    // Postgres (e.g. Neon) with real network latency between hops.
    transactionOptions: { maxWait: 10000, timeout: 30000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
