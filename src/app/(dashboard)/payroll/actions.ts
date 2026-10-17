"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { assertUserExists } from "@/lib/session";
import { notifyUsers } from "@/lib/notify";
import { recordAudit } from "@/lib/audit";
import { computePayslip, resolveComponentAmount } from "@/lib/payroll-calc";

const setSalarySchema = z.object({
  employeeId: z.string().min(1),
  basicSalary: z.coerce.number().positive(),
  currency: z.string().min(1).default("ETB"),
});

export async function setEmployeeSalary(formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to set salaries.");

  const parsed = setSalarySchema.parse({
    employeeId: formData.get("employeeId"),
    basicSalary: formData.get("basicSalary"),
    currency: formData.get("currency") || "ETB",
  });

  const payComponents = await prisma.payComponent.findMany();

  await prisma.$transaction(async (tx) => {
    const salary = await tx.employeeSalary.upsert({
      where: { employeeId: parsed.employeeId },
      update: { basicSalary: parsed.basicSalary, currency: parsed.currency },
      create: {
        employeeId: parsed.employeeId,
        basicSalary: parsed.basicSalary,
        currency: parsed.currency,
      },
    });

    for (const pc of payComponents) {
      const amount = resolveComponentAmount(parsed.basicSalary, pc);
      await tx.employeeSalaryComponent.upsert({
        where: {
          employeeSalaryId_payComponentId: {
            employeeSalaryId: salary.id,
            payComponentId: pc.id,
          },
        },
        update: { amount },
        create: {
          employeeSalaryId: salary.id,
          payComponentId: pc.id,
          amount,
        },
      });
    }

    await tx.salaryHistory.create({
      data: {
        employeeId: parsed.employeeId,
        basicSalary: parsed.basicSalary,
        currency: parsed.currency,
        changedById: session!.user.id,
      },
    });
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "UPDATE",
    entityType: "EmployeeSalary",
    entityId: parsed.employeeId,
    summary: `Set basic salary to ${parsed.basicSalary} ${parsed.currency}`,
  });

  revalidatePath(`/employees/${parsed.employeeId}`);
  revalidatePath("/payroll");
}

export async function runPayroll(month: number, year: number) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to run payroll.");
  await assertUserExists(session!.user.id);

  const existing = await prisma.payrollRun.findUnique({ where: { month_year: { month, year } } });
  if (existing) throw new Error(`Payroll for ${month}/${year} has already been run.`);

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE", salary: { isNot: null } },
    include: {
      salary: { include: { components: { include: { payComponent: true } } } },
      user: true,
    },
  });

  if (employees.length === 0) {
    throw new Error("No active employees have a salary configured yet.");
  }

  await prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.create({
      data: {
        month,
        year,
        status: "PROCESSED",
        processedAt: new Date(),
        processedById: session!.user.id,
      },
    });

    for (const emp of employees) {
      const salary = emp.salary!;
      const { lines, grossPay, totalDeductions, netPay } = computePayslip(
        salary.basicSalary,
        salary.components.map((c) => ({
          name: c.payComponent.name,
          type: c.payComponent.type,
          amount: c.amount,
        }))
      );

      await tx.payslip.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.id,
          grossPay,
          totalDeductions,
          netPay,
          lines: { createMany: { data: lines } },
        },
      });
    }
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "CREATE",
    entityType: "PayrollRun",
    entityId: `${month}-${year}`,
    summary: `Ran payroll for ${month}/${year} covering ${employees.length} employees`,
  });

  await notifyUsers(
    employees.filter((e) => e.user).map((e) => e.user!.id),
    { title: `Payslip available for ${month}/${year}`, link: "/payroll" }
  );

  revalidatePath("/payroll");
}
