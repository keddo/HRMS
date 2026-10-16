import { formatCurrency } from "@/lib/currency";

export type SalaryHistoryRow = {
  id: string;
  basicSalary: number;
  currency: string;
  effectiveDate: string;
};

export function SalaryHistoryList({ history }: { history: SalaryHistoryRow[] }) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No salary changes recorded yet.</p>;
  }

  return (
    <div className="flex flex-col divide-y">
      {history.map((h) => (
        <div key={h.id} className="flex items-center justify-between py-2 text-sm">
          <span>{formatCurrency(h.basicSalary, h.currency)}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(h.effectiveDate).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}
