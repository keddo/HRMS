import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PeriodNav({
  label,
  prevHref,
  nextHref,
  todayHref,
}: {
  label: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="outline" size="icon">
        <Link href={prevHref} aria-label="Previous">
          <ChevronLeft className="size-4" />
        </Link>
      </Button>
      <span className="min-w-40 text-center text-sm font-medium">{label}</span>
      <Button asChild variant="outline" size="icon">
        <Link href={nextHref} aria-label="Next">
          <ChevronRight className="size-4" />
        </Link>
      </Button>
      <Button asChild variant="ghost" size="sm">
        <Link href={todayHref}>Today</Link>
      </Button>
    </div>
  );
}
