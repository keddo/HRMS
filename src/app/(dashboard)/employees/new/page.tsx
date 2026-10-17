import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewEmployeeForm } from "@/components/employees/new-employee-form";

export default async function NewEmployeePage() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/employees");

  const [departments, positions, managers, workLocations] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.position.findMany({ orderBy: { title: "asc" } }),
    prisma.employee.findMany({
      where: { employmentStatus: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.workLocation.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Employee</h1>
        <p className="text-sm text-muted-foreground">Create a new employee record.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <NewEmployeeForm
            departments={departments}
            positions={positions}
            managers={managers}
            workLocations={workLocations}
          />
        </CardContent>
      </Card>
    </div>
  );
}
