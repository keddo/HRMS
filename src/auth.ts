import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const LOGIN_RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const rateLimitKey = `login:${email.toLowerCase()}`;
        const { allowed } = checkRateLimit(rateLimitKey, LOGIN_RATE_LIMIT);
        if (!allowed) {
          throw new Error("Too many failed sign-in attempts. Please wait a few minutes and try again.");
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { employee: true },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        resetRateLimit(rateLimitKey);
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : user.email,
          image: user.employee?.avatarUrl ?? null,
          role: user.role,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as Role;
        session.user.employeeId = token.employeeId as string | null;
      }
      return session;
    },
  },
});
