export type BarDatum = {
  label: string;
  value: number;
};

export function BarChart({
  data,
  valueFormatter = (v) => String(v),
  color = "var(--chart-1)",
}: {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-muted-foreground">{d.label}</span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="h-5 min-w-0 flex-1 rounded-sm bg-muted">
              <div
                className="h-5 rounded-r-sm"
                style={{
                  width: `${Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-sm font-medium tabular-nums">
              {valueFormatter(d.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
