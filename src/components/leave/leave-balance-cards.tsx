import { Card, CardContent } from "@/components/ui/card";

export type BalanceRow = {
  leaveTypeId: string;
  leaveTypeName: string;
  allocatedDays: number;
  usedDays: number;
};

export function LeaveBalanceCards({ balances }: { balances: BalanceRow[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {balances.map((b) => {
        const remaining = b.allocatedDays - b.usedDays;
        return (
          <Card key={b.leaveTypeId}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{b.leaveTypeName}</p>
              <p className="text-2xl font-semibold tracking-tight">
                {remaining}
                <span className="text-sm font-normal text-muted-foreground"> / {b.allocatedDays} days</span>
              </p>
              <p className="text-xs text-muted-foreground">{b.usedDays} used</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
