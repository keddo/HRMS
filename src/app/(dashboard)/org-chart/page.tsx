import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { OrgTree, type OrgNode } from "@/components/org-chart/org-tree";

export default async function OrgChartPage() {
  const employees = await prisma.employee.findMany({
    where: { employmentStatus: { not: "TERMINATED" } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      managerId: true,
      position: { select: { title: true } },
      department: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });

  const nodeMap = new Map<string, OrgNode>();
  for (const emp of employees) {
    nodeMap.set(emp.id, {
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      positionTitle: emp.position?.title ?? null,
      departmentName: emp.department?.name ?? null,
      children: [],
    });
  }

  const roots: OrgNode[] = [];
  for (const emp of employees) {
    const node = nodeMap.get(emp.id)!;
    if (emp.managerId && nodeMap.has(emp.managerId)) {
      nodeMap.get(emp.managerId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Org Chart</h1>
        <p className="text-sm text-muted-foreground">{employees.length} active employees.</p>
      </div>
      <Card>
        <CardContent className="p-4">
          <OrgTree roots={roots} />
        </CardContent>
      </Card>
    </div>
  );
}
