import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Calendar, Building2, Briefcase, Users as UsersIcon } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageEmployee, isAdmin } from "@/lib/rbac";
import { decryptField } from "@/lib/crypto";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsTab } from "@/components/employees/documents-tab";
import { SalarySummary } from "@/components/payroll/salary-summary";
import { SalaryHistoryList } from "@/components/payroll/salary-history-list";
import { EditEmploymentDialog } from "@/components/employees/edit-employment-dialog";
import { EditSensitiveInfoDialog } from "@/components/employees/edit-sensitive-info-dialog";
import { ResetPasswordDialog } from "@/components/employees/reset-password-dialog";

function maskSecret(decrypted: string | null): string {
  if (!decrypted) return "—";
  return decrypted.length <= 4 ? "••••" : `•••• ${decrypted.slice(-4)}`;
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      position: true,
      manager: true,
      reports: { include: { position: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
      salary: { include: { components: { include: { payComponent: true } } } },
      assets: { orderBy: { assignedAt: "desc" } },
      salaryHistory: { orderBy: { effectiveDate: "desc" } },
      employmentHistory: { orderBy: { effectiveDate: "desc" } },
      user: true,
    },
  });

  if (!employee) notFound();

  const canSeeSensitive = canManageEmployee(session?.user.role, session?.user.employeeId, employee.id);
  const admin = isAdmin(session?.user.role);

  const [departments, positions, managers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.position.findMany({ orderBy: { title: "asc" } }),
    admin
      ? prisma.employee.findMany({
          where: { employmentStatus: "ACTIVE" },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { firstName: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));
  const positionTitleById = new Map(positions.map((p) => [p.id, p.title]));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarFallback className="text-lg">
                {initials(employee.firstName, employee.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-semibold">
                {employee.firstName} {employee.lastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {employee.position?.title ?? "—"} · {employee.department?.name ?? "—"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={employee.employmentStatus === "ACTIVE" ? "default" : "secondary"}>
                  {employee.employmentStatus.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">{employee.employeeCode}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Mail className="size-4" /> {employee.email}
            </span>
            {employee.phone && (
              <span className="flex items-center gap-2">
                <Phone className="size-4" /> {employee.phone}
              </span>
            )}
            <span className="flex items-center gap-2">
              <Calendar className="size-4" /> Hired {employee.hireDate.toLocaleDateString()}
            </span>
            {admin && employee.user && (
              <div className="mt-2">
                <ResetPasswordDialog userId={employee.user.id} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Org</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {canSeeSensitive && <TabsTrigger value="assets">Assets</TabsTrigger>}
          {canSeeSensitive && <TabsTrigger value="payroll">Payroll</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Gender" value={employee.gender.replace("_", " ")} />
              <Row
                label="Date of Birth"
                value={employee.dateOfBirth ? employee.dateOfBirth.toLocaleDateString() : "—"}
              />
              <Row label="Address" value={employee.address ?? "—"} />
              <Row label="Emergency Contact" value={employee.emergencyContactName ?? "—"} />
              <Row label="Emergency Phone" value={employee.emergencyContactPhone ?? "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Employment Information</CardTitle>
              {admin && (
                <EditEmploymentDialog
                  employeeId={employee.id}
                  departments={departments}
                  positions={positions}
                  managers={managers}
                  current={{
                    departmentId: employee.departmentId,
                    positionId: employee.positionId,
                    managerId: employee.managerId,
                    employmentStatus: employee.employmentStatus,
                  }}
                />
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Department" value={employee.department?.name ?? "—"} icon={Building2} />
              <Row label="Position" value={employee.position?.title ?? "—"} icon={Briefcase} />
              <Row
                label="Manager"
                value={
                  employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : "—"
                }
                icon={UsersIcon}
              />
              <Row label="Hire Date" value={employee.hireDate.toLocaleDateString()} />
            </CardContent>
          </Card>

          {canSeeSensitive && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Bank &amp; National ID</CardTitle>
                {admin && (
                  <EditSensitiveInfoDialog
                    employeeId={employee.id}
                    bankName={employee.bankName}
                    hasBankAccount={!!employee.bankAccountNumber}
                    hasNationalId={!!employee.nationalId}
                  />
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <Row label="Bank" value={employee.bankName ?? "—"} />
                <Row label="Account Number" value={maskSecret(decryptField(employee.bankAccountNumber))} />
                <Row label="National ID" value={maskSecret(decryptField(employee.nationalId))} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manager</CardTitle>
            </CardHeader>
            <CardContent>
              {employee.manager ? (
                <Link
                  href={`/employees/${employee.manager.id}`}
                  className="flex items-center gap-3 rounded-md p-2 text-sm hover:bg-muted"
                >
                  <Avatar className="size-8">
                    <AvatarFallback>
                      {initials(employee.manager.firstName, employee.manager.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  {employee.manager.firstName} {employee.manager.lastName}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No manager (top of org chart)</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Direct Reports ({employee.reports.length})</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              {employee.reports.length === 0 && (
                <p className="text-sm text-muted-foreground">No direct reports.</p>
              )}
              {employee.reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/employees/${report.id}`}
                  className="flex items-center justify-between rounded-md p-2 text-sm hover:bg-muted"
                >
                  <span className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback>{initials(report.firstName, report.lastName)}</AvatarFallback>
                    </Avatar>
                    {report.firstName} {report.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">{report.position?.title}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          {canSeeSensitive && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Employment History</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y">
                {employee.employmentHistory.length === 0 && (
                  <p className="py-4 text-sm text-muted-foreground">No history recorded yet.</p>
                )}
                {employee.employmentHistory.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p>
                        {h.departmentId ? departmentNameById.get(h.departmentId) ?? "—" : "—"} ·{" "}
                        {h.positionId ? positionTitleById.get(h.positionId) ?? "—" : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {h.employmentStatus.replace("_", " ")}
                        {h.changeReason ? ` · ${h.changeReason}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {h.effectiveDate.toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab
            employeeId={employee.id}
            documents={employee.documents.map((d) => ({
              id: d.id,
              fileName: d.fileName,
              type: d.type,
              uploadedAt: d.uploadedAt.toISOString(),
            }))}
            canUpload={canSeeSensitive}
          />
        </TabsContent>

        {canSeeSensitive && (
          <TabsContent value="assets">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned Assets</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y">
                {employee.assets.length === 0 && (
                  <p className="py-4 text-sm text-muted-foreground">No assets assigned.</p>
                )}
                {employee.assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <p className="font-medium">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.category}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {asset.assignedAt ? asset.assignedAt.toLocaleDateString() : "—"}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {canSeeSensitive && (
          <TabsContent value="payroll" className="flex flex-col gap-4">
            <SalarySummary
              employeeId={employee.id}
              basicSalary={employee.salary?.basicSalary ?? null}
              currency={employee.salary?.currency ?? "USD"}
              components={
                employee.salary?.components.map((c) => ({
                  name: c.payComponent.name,
                  type: c.payComponent.type,
                  amount: c.amount,
                })) ?? []
              }
              canEdit={admin}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Compensation History</CardTitle>
              </CardHeader>
              <CardContent>
                <SalaryHistoryList
                  history={employee.salaryHistory.map((h) => ({
                    id: h.id,
                    basicSalary: h.basicSalary,
                    currency: h.currency,
                    effectiveDate: h.effectiveDate.toISOString(),
                  }))}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="size-4" />}
        {label}
      </span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
