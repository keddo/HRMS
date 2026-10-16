import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { CreateAssetDialog } from "@/components/assets/create-asset-dialog";
import { AssetsTable, type AssetRow } from "@/components/assets/assets-table";

export default async function AssetsPage() {
  const session = await auth();
  if (!isAdmin(session?.user.role)) redirect("/dashboard");

  const [assets, employees] = await Promise.all([
    prisma.asset.findMany({
      include: { assignedTo: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.findMany({
      where: { employmentStatus: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const rows: AssetRow[] = assets.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    serialNumber: a.serialNumber,
    status: a.status,
    assignedToName: a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}` : null,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-muted-foreground">Track company equipment and assignments.</p>
        </div>
        <CreateAssetDialog />
      </div>

      <AssetsTable assets={rows} employees={employees} />
    </div>
  );
}
