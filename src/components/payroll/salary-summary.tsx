import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SetSalaryDialog } from "@/components/payroll/set-salary-dialog";
import { formatCurrency } from "@/lib/currency";

export type SalaryComponentRow = {
  name: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
};

export function SalarySummary({
  employeeId,
  basicSalary,
  currency,
  components,
  canEdit,
}: {
  employeeId: string;
  basicSalary: number | null;
  currency: string;
  components: SalaryComponentRow[];
  canEdit: boolean;
}) {
  const earnings = components.filter((c) => c.type === "EARNING");
  const deductions = components.filter((c) => c.type === "DEDUCTION");
  const gross = (basicSalary ?? 0) + earnings.reduce((s, c) => s + c.amount, 0);
  const totalDeductions = deductions.reduce((s, c) => s + c.amount, 0);
  const net = gross - totalDeductions;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Salary Structure</CardTitle>
        {canEdit && <SetSalaryDialog employeeId={employeeId} currentBasicSalary={basicSalary} />}
      </CardHeader>
      <CardContent>
        {basicSalary === null ? (
          <p className="text-sm text-muted-foreground">No salary configured yet.</p>
        ) : (
          <div className="flex flex-col gap-2 text-sm">
            <Row label="Basic Salary" value={formatCurrency(basicSalary, currency)} />
            {earnings.map((c) => (
              <Row key={c.name} label={c.name} value={formatCurrency(c.amount, currency)} />
            ))}
            <div className="my-1 border-t" />
            <Row label="Gross Pay" value={formatCurrency(gross, currency)} bold />
            {deductions.map((c) => (
              <Row
                key={c.name}
                label={c.name}
                value={`- ${formatCurrency(c.amount, currency)}`}
                muted
              />
            ))}
            <div className="my-1 border-t" />
            <Row label="Net Pay" value={formatCurrency(net, currency)} bold />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={bold ? "font-semibold" : muted ? "text-muted-foreground" : ""}>{value}</span>
    </div>
  );
}
