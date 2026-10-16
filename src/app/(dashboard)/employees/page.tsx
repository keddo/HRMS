import Link from "next/link";
import { UserPlus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { EmployeesTable, type EmployeeRow } from "@/components/employees/employees-table";

export default async function EmployeesPage() {
  const session = await auth();

  const [employees, departments] = await Promise.all([
    prisma.employee.findMany({
      include: { department: true, position: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    employeeCode: e.employeeCode,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    departmentName: e.department?.name ?? null,
    positionTitle: e.position?.title ?? null,
    employmentStatus: e.employmentStatus,
    hireDate: e.hireDate.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">
            {employees.length} people across {departments.length} departments.
          </p>
        </div>
        {isAdmin(session?.user.role) && (
          <Button asChild>
            <Link href="/employees/new">
              <UserPlus className="size-4" />
              Add Employee
            </Link>
          </Button>
        )}
      </div>

      <EmployeesTable data={rows} departments={departments.map((d) => d.name)} />
    </div>
  );
}
