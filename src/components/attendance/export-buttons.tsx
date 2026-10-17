import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportButtons({ period, date }: { period: "week" | "month"; date: string }) {
  const params = new URLSearchParams({ period, date });
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={`/api/reports/attendance.xlsx?${params}`} download>
          <FileSpreadsheet className="size-3.5" />
          Export Excel
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/reports/attendance.pdf?${params}`} download>
          <FileText className="size-3.5" />
          Export PDF
        </a>
      </Button>
    </div>
  );
}
