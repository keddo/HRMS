"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, canManageEmployee } from "@/lib/rbac";
import { uploadDocumentBlob, uploadAvatarBlob } from "@/lib/blob-storage";
import { encryptField } from "@/lib/crypto";
import { recordAudit } from "@/lib/audit";
import { resolveComponentAmount } from "@/lib/payroll-calc";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const documentTypeEnum = z.enum([
  "CONTRACT",
  "ID_COPY",
  "CERTIFICATE",
  "RESUME",
  "GUARANTOR",
  "WORK_EXPERIENCE",
  "OTHER",
]);

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

const createEmployeeSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    dateOfBirth: z.string().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).optional(),
    maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "UNSPECIFIED"]).optional(),
    telebirrNumber: z.string().optional(),
    hireDate: z.string().min(1),
    departmentId: z.string().min(1),
    positionId: z.string().optional(),
    managerId: z.string().optional(),
    workLocationId: z.string().optional(),
    employmentType: z.enum(["PERMANENT", "CONTRACT", "INTERN", "PART_TIME"]).optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelationship: z.string().optional(),
    basicSalary: z.coerce.number().positive().optional(),
  })
  .refine(
    (data) => {
      const hireDate = new Date(data.hireDate);
      const maxHireDate = new Date();
      maxHireDate.setFullYear(maxHireDate.getFullYear() + 1);
      return hireDate <= maxHireDate;
    },
    { message: "Hire date can be up to a year ahead, not further.", path: ["hireDate"] }
  )
  .refine(
    (data) => {
      if (!data.dateOfBirth) return true;
      const dob = new Date(data.dateOfBirth);
      const hireDate = new Date(data.hireDate);
      const minHireDate = new Date(dob);
      minHireDate.setFullYear(minHireDate.getFullYear() + 15);
      return hireDate >= minHireDate;
    },
    { message: "Date of birth must be at least 15 years before the hire date.", path: ["dateOfBirth"] }
  );

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function uploadOptionalDocument(
  employeeId: string,
  formData: FormData,
  fieldName: string,
  type: "ID_COPY" | "GUARANTOR" | "WORK_EXPERIENCE"
) {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(`${file.name} is too large (max 10MB).`);
  }
  if (!ALLOWED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error(`${file.name}: unsupported file type.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pathname = await uploadDocumentBlob(employeeId, file.name, buffer, file.type);
  await prisma.document.create({
    data: { employeeId, type, fileName: file.name, filePath: pathname },
  });
}

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
    address: formData.get("address") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    gender: formData.get("gender") || undefined,
    maritalStatus: formData.get("maritalStatus") || undefined,
    telebirrNumber: formData.get("telebirrNumber") || undefined,
    hireDate: formData.get("hireDate"),
    departmentId: formData.get("departmentId"),
    positionId: formData.get("positionId") || undefined,
    managerId: formData.get("managerId") || undefined,
    workLocationId: formData.get("workLocationId") || undefined,
    employmentType: formData.get("employmentType") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    emergencyContactRelationship: formData.get("emergencyContactRelationship") || undefined,
    basicSalary: formData.get("basicSalary") || undefined,
  });

  const existingEmail = await prisma.employee.findUnique({ where: { email: parsed.email } });
  if (existingEmail) {
    throw new Error("An employee with this email already exists.");
  }

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
      address: parsed.address,
      dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null,
      gender: parsed.gender,
      maritalStatus: parsed.maritalStatus,
      telebirrNumber: parsed.telebirrNumber ? encryptField(parsed.telebirrNumber) : null,
      hireDate: new Date(parsed.hireDate),
      departmentId: parsed.departmentId,
      positionId: parsed.positionId || null,
      managerId: parsed.managerId || null,
      workLocationId: parsed.workLocationId || null,
      employmentType: parsed.employmentType,
      emergencyContactName: parsed.emergencyContactName || null,
      emergencyContactPhone: parsed.emergencyContactPhone || null,
      emergencyContactRelationship: parsed.emergencyContactRelationship || null,
    },
  });

  // Give the employee a login immediately: an admin can issue a reset link
  // from their profile (Reset Password) right after they're created.
  await prisma.user.create({
    data: {
      email: employee.email,
      passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
      role: "EMPLOYEE",
      employeeId: employee.id,
    },
  });

  if (parsed.basicSalary) {
    const payComponents = await prisma.payComponent.findMany();
    await prisma.$transaction(async (tx) => {
      const salary = await tx.employeeSalary.create({
        data: { employeeId: employee.id, basicSalary: parsed.basicSalary!, currency: "ETB" },
      });
      for (const pc of payComponents) {
        const amount = resolveComponentAmount(parsed.basicSalary!, pc);
        await tx.employeeSalaryComponent.create({
          data: { employeeSalaryId: salary.id, payComponentId: pc.id, amount },
        });
      }
      await tx.salaryHistory.create({
        data: {
          employeeId: employee.id,
          basicSalary: parsed.basicSalary!,
          currency: "ETB",
          changedById: session!.user.id,
        },
      });
    });
  }

  await uploadOptionalDocument(employee.id, formData, "nationalIdDocument", "ID_COPY");
  await uploadOptionalDocument(employee.id, formData, "guarantorDocument", "GUARANTOR");
  await uploadOptionalDocument(employee.id, formData, "workExperienceDocument", "WORK_EXPERIENCE");

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
  employmentType: z.enum(["PERMANENT", "CONTRACT", "INTERN", "PART_TIME"]).optional(),
  workLocationId: z.string().optional(),
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
    employmentType: formData.get("employmentType") || undefined,
    workLocationId: formData.get("workLocationId") || undefined,
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
      employmentType: parsed.employmentType,
      workLocationId: parsed.workLocationId || null,
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
  telebirrNumber: z.string().optional(),
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
    telebirrNumber: formData.get("telebirrNumber") || undefined,
  });

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      bankName: parsed.bankName || null,
      // Blank means "leave unchanged" for these encrypted fields, since the form never
      // pre-fills decrypted PII — only a non-empty value overwrites what's on file.
      bankAccountNumber: parsed.bankAccountNumber ? encryptField(parsed.bankAccountNumber) : undefined,
      nationalId: parsed.nationalId ? encryptField(parsed.nationalId) : undefined,
      telebirrNumber: parsed.telebirrNumber ? encryptField(parsed.telebirrNumber) : undefined,
    },
  });

  await recordAudit({
    actorId: session!.user.id,
    action: "UPDATE",
    entityType: "Employee",
    entityId: employeeId,
    summary: "Updated bank/national ID/Telebirr information",
  });

  revalidatePath(`/employees/${employeeId}`);
}

const personalInfoSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "UNSPECIFIED"]).optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
});

export async function updatePersonalInfo(employeeId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (!canManageEmployee(session.user.role, session.user.employeeId, employeeId)) {
    throw new Error("You do not have permission to update this profile.");
  }

  const parsed = personalInfoSchema.parse({
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    dateOfBirth: formData.get("dateOfBirth") || undefined,
    gender: formData.get("gender") || undefined,
    maritalStatus: formData.get("maritalStatus") || undefined,
    emergencyContactName: formData.get("emergencyContactName") || undefined,
    emergencyContactPhone: formData.get("emergencyContactPhone") || undefined,
    emergencyContactRelationship: formData.get("emergencyContactRelationship") || undefined,
  });

  await prisma.employee.update({
    where: { id: employeeId },
    data: {
      phone: parsed.phone || null,
      address: parsed.address || null,
      dateOfBirth: parsed.dateOfBirth ? new Date(parsed.dateOfBirth) : null,
      gender: parsed.gender,
      maritalStatus: parsed.maritalStatus,
      emergencyContactName: parsed.emergencyContactName || null,
      emergencyContactPhone: parsed.emergencyContactPhone || null,
      emergencyContactRelationship: parsed.emergencyContactRelationship || null,
    },
  });

  await recordAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "Employee",
    entityId: employeeId,
    summary: "Updated personal information",
  });

  revalidatePath(`/employees/${employeeId}`);
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function uploadAvatar(employeeId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (!canManageEmployee(session.user.role, session.user.employeeId, employeeId)) {
    throw new Error("You do not have permission to update this profile photo.");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Please choose an image to upload.");
  }
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Image is too large (max 5MB).");
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("Please upload a PNG, JPEG, or WEBP image.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const pathname = await uploadAvatarBlob(employeeId, buffer, file.type);

  await prisma.employee.update({ where: { id: employeeId }, data: { avatarUrl: pathname } });

  revalidatePath(`/employees/${employeeId}`);
  revalidatePath("/employees");
}
