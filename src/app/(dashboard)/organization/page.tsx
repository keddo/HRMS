import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isManagerOrAbove } from "@/lib/rbac";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentsPanel } from "@/components/organization/departments-panel";
import { PositionsPanel } from "@/components/organization/positions-panel";
import { WorkLocationsPanel } from "@/components/organization/work-locations-panel";

export default async function OrganizationPage() {
  const session = await auth();
  if (!isManagerOrAbove(session?.user.role)) redirect("/dashboard");

  const [departments, positions, workLocations] = await Promise.all([
    prisma.department.findMany({
      include: { _count: { select: { employees: true, positions: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      include: { department: true, _count: { select: { employees: true } } },
      orderBy: [{ department: { name: "asc" } }, { title: "asc" }],
    }),
    prisma.workLocation.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">
          Manage the departments, positions, and work locations used across employee records.
        </p>
      </div>

      <Tabs defaultValue="departments">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="locations">Work Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="departments">
          <DepartmentsPanel
            departments={departments.map((d) => ({
              id: d.id,
              name: d.name,
              description: d.description,
              employeeCount: d._count.employees,
              positionCount: d._count.positions,
            }))}
          />
        </TabsContent>

        <TabsContent value="positions">
          <PositionsPanel
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            positions={positions.map((p) => ({
              id: p.id,
              title: p.title,
              level: p.level,
              departmentName: p.department.name,
              employeeCount: p._count.employees,
            }))}
          />
        </TabsContent>

        <TabsContent value="locations">
          <WorkLocationsPanel
            locations={workLocations.map((l) => ({
              id: l.id,
              name: l.name,
              employeeCount: l._count.employees,
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
