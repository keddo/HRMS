"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { uploadDocumentBlob } from "@/lib/blob-storage";
import { encryptField } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const documentTypeEnum = z.enum(["CONTRACT", "ID_COPY", "CERTIFICATE", "RESUME", "OTHER"]);

export async function uploadDocument(employeeId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");

  const isSelf = session.user.employeeId === employeeId;
  if (!isAdmin(session.user.role) && !isSelf) {
    throw new Error("You do not have permission to upload documents for this employee.");
  }

  const file = formData.get("file");
  const type = documentTypeEnum.parse(formData.get("type") ?? "OTHER");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose a file to upload.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File is too large (max 10MB).");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type.");
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Employee not found.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const pathname = await uploadDocumentBlob(employeeId, file.name, buffer, file.type);

  await prisma.document.create({
    data: {
      employeeId,
      type,
      fileName: file.name,
      filePath: pathname,
    },
  });

  revalidatePath(`/employees/${employeeId}`);
}

const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  hireDate: z.string().min(1),
  departmentId: z.string().min(1),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
});

export async function createEmployee(formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) {
    throw new Error("You do not have permission to add employees.");
  }

  const parsed = createEmployeeSchema.parse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    hireDate: formData.get("hireDate"),
    departmentId: formData.get("departmentId"),
    positionId: formData.get("positionId") || undefined,
    managerId: formData.get("managerId") || undefined,
  });

  const lastEmployee = await prisma.employee.findFirst({
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });
  const nextNumber = lastEmployee
    ? parseInt(lastEmployee.employeeCode.replace(/\D/g, ""), 10) + 1
    : 1;
  const employeeCode = `EMP${String(nextNumber).padStart(4, "0")}`;

  const employee = await prisma.employee.create({
    data: {
      employeeCode,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      phone: parsed.phone,
      hireDate: new Date(parsed.hireDate),
      departmentId: parsed.departmentId,
      positionId: parsed.positionId || null,
      managerId: parsed.managerId || null,
    },
  });

  await prisma.employmentHistory.create({
    data: {
      employeeId: employee.id,
      effectiveDate: employee.hireDate,
      departmentId: employee.departmentId,
      positionId: employee.positionId,
      managerId: employee.managerId,
      employmentStatus: "ACTIVE",
      changeReason: "Hired",
      recordedById: session!.user.id,
    },
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "CREATE",
    entityType: "Employee",
    entityId: employee.id,
    summary: `Created employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
  });

  revalidatePath("/employees");
  return employee.id;
}

const updateEmploymentSchema = z.object({
  departmentId: z.string().min(1),
  positionId: z.string().optional(),
  managerId: z.string().optional(),
  employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"]),
  changeReason: z.string().optional(),
});

export async function updateEmployment(employeeId: string, formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) {
    throw new Error("You do not have permission to update employment details.");
  }

  const parsed = updateEmploymentSchema.parse({
    departmentId: formData.get("departmentId"),
    positionId: formData.get("positionId") || undefined,
    managerId: formData.get("managerId") || undefined,
    employmentStatus: formData.get("employmentStatus"),
    changeReason: formData.get("changeReason") || undefined,
  });

  if (parsed.managerId === employeeId) {
    throw new Error("An employee cannot be their own manager.");
  }

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      departmentId: parsed.departmentId,
      positionId: parsed.positionId || null,
      managerId: parsed.managerId || null,
      employmentStatus: parsed.employmentStatus,
      terminationDate: parsed.employmentStatus === "TERMINATED" ? new Date() : null,
    },
  });

  await prisma.employmentHistory.create({
    data: {
      employeeId,
      departmentId: parsed.departmentId,
      positionId: parsed.positionId || null,
      managerId: parsed.managerId || null,
      employmentStatus: parsed.employmentStatus,
      changeReason: parsed.changeReason || "Updated",
      recordedById: session!.user.id,
    },
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "UPDATE",
    entityType: "Employee",
    entityId: employeeId,
    summary: `Updated employment details (${parsed.changeReason || "no reason given"})`,
  });

  revalidatePath(`/employees/${employeeId}`);
}

const sensitiveInfoSchema = z.object({
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  nationalId: z.string().optional(),
});

export async function updateSensitiveInfo(employeeId: string, formData: FormData) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) {
    throw new Error("You do not have permission to update this information.");
  }

  const parsed = sensitiveInfoSchema.parse({
    bankName: formData.get("bankName") || undefined,
    bankAccountNumber: formData.get("bankAccountNumber") || undefined,
    nationalId: formData.get("nationalId") || undefined,
  });

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      bankName: parsed.bankName || null,
      // Blank means "leave unchanged" for these encrypted fields, since the form never
      // pre-fills decrypted PII — only a non-empty value overwrites what's on file.
      bankAccountNumber: parsed.bankAccountNumber ? encryptField(parsed.bankAccountNumber) : undefined,
      nationalId: parsed.nationalId ? encryptField(parsed.nationalId) : undefined,
    },
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "UPDATE",
    entityType: "Employee",
    entityId: employeeId,
    summary: "Updated bank/national ID information",
  });

  revalidatePath(`/employees/${employeeId}`);
}
