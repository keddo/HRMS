import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employees = await prisma.employee.findMany({
    include: { department: true, position: true },
    orderBy: { employeeCode: "asc" },
  });

  const header = [
    "Employee Code",
    "First Name",
    "Last Name",
    "Email",
    "Department",
    "Position",
    "Employment Status",
    "Hire Date",
  ];

  const rows = employees.map((e) =>
    [
      e.employeeCode,
      e.firstName,
      e.lastName,
      e.email,
      e.department?.name ?? "",
      e.position?.title ?? "",
      e.employmentStatus,
      e.hireDate.toISOString().slice(0, 10),
    ]
      .map((v) => csvEscape(String(v)))
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="employees-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
