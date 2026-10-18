"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
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

  const [payComponents, taxBrackets] = await Promise.all([
    prisma.payComponent.findMany({ where: { isActive: true } }),
    prisma.taxBracket.findMany({ orderBy: { minAmount: "asc" } }),
  ]);

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
      const amount = resolveComponentAmount(parsed.basicSalary, pc, taxBrackets);
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

/** Generates a draft payroll run for review. Payslips aren't visible to employees, and nothing
 * is final, until an admin calls `approvePayrollRun`. */
export async function runPayroll(month: number, year: number): Promise<string> {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to run payroll.");
  await assertUserExists(session!.user.id);

  const existing = await prisma.payrollRun.findUnique({ where: { month_year: { month, year } } });
  if (existing) throw new Error(`Payroll for ${month}/${year} has already been run.`);

  const employees = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE", salary: { isNot: null } },
    include: {
      salary: { include: { components: { include: { payComponent: true } } } },
    },
  });

  if (employees.length === 0) {
    throw new Error("No active employees have a salary configured yet.");
  }

  const runId = await prisma.$transaction(async (tx) => {
    const run = await tx.payrollRun.create({
      data: { month, year, status: "DRAFT" },
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

    return run.id;
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "CREATE",
    entityType: "PayrollRun",
    entityId: `${month}-${year}`,
    summary: `Generated draft payroll for ${month}/${year} covering ${employees.length} employees`,
  });

  revalidatePath("/payroll");
  return runId;
}

/** Finalizes a draft payroll run: locks it, timestamps/attributes it, and notifies employees. */
export async function approvePayrollRun(runId: string) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to approve payroll.");

  const run = await prisma.payrollRun.findUnique({
    where: { id: runId },
    include: { payslips: { include: { employee: { include: { user: true } } } } },
  });
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "DRAFT") throw new Error("This payroll run has already been processed.");

  await prisma.payrollRun.update({
    where: { id: runId },
    data: { status: "PROCESSED", processedAt: new Date(), processedById: session!.user.id },
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "UPDATE",
    entityType: "PayrollRun",
    entityId: runId,
    summary: `Approved payroll for ${run.month}/${run.year}`,
  });

  await notifyUsers(
    run.payslips.filter((p) => p.employee.user).map((p) => p.employee.user!.id),
    { title: `Payslip available for ${run.month}/${run.year}`, link: "/payroll" }
  );

  revalidatePath("/payroll");
  revalidatePath(`/payroll/runs/${runId}`);
}

/** Deletes a draft payroll run so it can be re-run from scratch. Processed runs are permanent. */
export async function cancelPayrollRun(runId: string) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to cancel payroll.");

  const run = await prisma.payrollRun.findUnique({ where: { id: runId } });
  if (!run) throw new Error("Payroll run not found.");
  if (run.status !== "DRAFT") throw new Error("Only a draft payroll run can be cancelled.");

  await prisma.payrollRun.delete({ where: { id: runId } });

  await recordAudit({
    actorId: session!.user.id,
    action: "DELETE",
    entityType: "PayrollRun",
    entityId: runId,
    summary: `Cancelled draft payroll for ${run.month}/${run.year}`,
  });

  revalidatePath("/payroll");
}

const adjustmentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["EARNING", "DEDUCTION"]),
  amount: z.coerce.number().positive(),
});

async function recomputePayslipTotals(tx: Prisma.TransactionClient, payslipId: string) {
  const lines = await tx.payslipLine.findMany({ where: { payslipId } });
  const grossPay = lines.filter((l) => l.type === "EARNING").reduce((s, l) => s + l.amount, 0);
  const totalDeductions = lines.filter((l) => l.type === "DEDUCTION").reduce((s, l) => s + l.amount, 0);
  await tx.payslip.update({
    where: { id: payslipId },
    data: { grossPay, totalDeductions, netPay: grossPay - totalDeductions },
  });
}

/** Adds a one-time bonus or deduction to a payslip. Only allowed while its run is still a draft. */
export async function addPayslipAdjustment(payslipId: string, formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to adjust payslips.");

  const parsed = adjustmentSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    amount: formData.get("amount"),
  });

  const payslip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: { payrollRun: true, employee: true },
  });
  if (!payslip) throw new Error("Payslip not found.");
  if (payslip.payrollRun.status !== "DRAFT") {
    throw new Error("Can only adjust payslips in a draft payroll run.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payslipLine.create({
      data: { payslipId, name: parsed.name, type: parsed.type, amount: parsed.amount, isAdjustment: true },
    });
    await recomputePayslipTotals(tx, payslipId);
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "UPDATE",
    entityType: "Payslip",
    entityId: payslipId,
    summary: `Added ${parsed.type.toLowerCase()} "${parsed.name}" (${parsed.amount}) for ${payslip.employee.firstName} ${payslip.employee.lastName}`,
  });

  revalidatePath(`/payroll/runs/${payslip.payrollRunId}`);
}

/** Removes a one-time adjustment. Only allowed while its run is still a draft. */
export async function removePayslipAdjustment(lineId: string) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) throw new Error("You do not have permission to adjust payslips.");

  const line = await prisma.payslipLine.findUnique({
    where: { id: lineId },
    include: { payslip: { include: { payrollRun: true } } },
  });
  if (!line) throw new Error("Adjustment not found.");
  if (!line.isAdjustment) throw new Error("Only one-time adjustments can be removed this way.");
  if (line.payslip.payrollRun.status !== "DRAFT") {
    throw new Error("Can only adjust payslips in a draft payroll run.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payslipLine.delete({ where: { id: lineId } });
    await recomputePayslipTotals(tx, line.payslipId);
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "UPDATE",
    entityType: "Payslip",
    entityId: line.payslipId,
    summary: `Removed adjustment "${line.name}"`,
  });

  revalidatePath(`/payroll/runs/${line.payslip.payrollRunId}`);
}
