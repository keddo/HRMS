import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/rbac";
import { addDays, startOfMonth, endOfMonth, startOfWeek } from "@/lib/dates";
import {
  fetchAttendancePeriodData,
  summarizeAttendance,
  buildWeeklyGrid,
} from "@/lib/attendance-report";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function renderPdf(title: string, header: string[], rows: string[][]): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 36, size: "A4", layout: "landscape" });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));

  doc.fontSize(16).text(title, { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(9);
  doc.table({
    data: [header, ...rows],
    defaultStyle: { padding: 6 },
    columnStyles: (col) => (col === 0 ? { width: 160 } : { width: "*" }),
  });

  doc.end();
  return done;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!isAdmin(session?.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") === "week" ? "week" : "month";
  const dateParam = searchParams.get("date");
  const refDate = dateParam ? new Date(dateParam) : new Date();
  if (Number.isNaN(refDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  let filename: string;
  let buffer: Buffer;

  if (period === "week") {
    const weekStart = startOfWeek(refDate);
    const weekEnd = addDays(weekStart, 6);
    const { employees, attendance, leaveRanges } = await fetchAttendancePeriodData(weekStart, weekEnd);
    const rows = buildWeeklyGrid(employees, attendance, leaveRanges, weekStart);

    const header = ["Employee", ...DAY_LABELS.map((l, i) => `${l} ${addDays(weekStart, i).toLocaleDateString()}`)];
    const dataRows = rows.map((r) => [r.employeeName, ...r.days.map((s) => s ?? "—")]);
    buffer = await renderPdf(
      `Weekly Attendance — ${weekStart.toLocaleDateString()} to ${weekEnd.toLocaleDateString()}`,
      header,
      dataRows
    );
    filename = `attendance-week-${weekStart.toISOString().slice(0, 10)}.pdf`;
  } else {
    const periodStart = startOfMonth(refDate);
    const periodEnd = endOfMonth(refDate);
    const { employees, attendance, leaveRanges } = await fetchAttendancePeriodData(
      periodStart,
      periodEnd
    );
    const summaries = summarizeAttendance(employees, attendance, leaveRanges, periodStart, periodEnd);

    const header = ["Employee", "Present", "Late", "Half Day", "On Leave", "Absent", "Total Hours"];
    const dataRows = summaries.map((s) => [
      s.employeeName,
      String(s.present),
      String(s.late),
      String(s.halfDay),
      String(s.onLeave),
      String(s.absent),
      String(s.totalHours),
    ]);
    buffer = await renderPdf(
      `Monthly Attendance — ${periodStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`,
      header,
      dataRows
    );
    filename = `attendance-${periodStart.toISOString().slice(0, 7)}.pdf`;
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
