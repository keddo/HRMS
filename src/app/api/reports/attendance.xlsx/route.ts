import ExcelJS from "exceljs";
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

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "HRMS";
  workbook.created = new Date();

  let filename: string;

  if (period === "week") {
    const weekStart = startOfWeek(refDate);
    const weekEnd = addDays(weekStart, 6);
    const { employees, attendance, leaveRanges } = await fetchAttendancePeriodData(weekStart, weekEnd);
    const rows = buildWeeklyGrid(employees, attendance, leaveRanges, weekStart);

    const sheet = workbook.addWorksheet("Weekly Attendance");
    sheet.columns = [
      { header: "Employee", key: "employee", width: 28 },
      ...DAY_LABELS.map((label, i) => ({
        header: `${label} ${addDays(weekStart, i).toLocaleDateString()}`,
        key: `d${i}`,
        width: 14,
      })),
    ];
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow({
        employee: row.employeeName,
        ...Object.fromEntries(row.days.map((s, i) => [`d${i}`, s ?? ""])),
      });
    }
    filename = `attendance-week-${weekStart.toISOString().slice(0, 10)}.xlsx`;
  } else {
    const periodStart = startOfMonth(refDate);
    const periodEnd = endOfMonth(refDate);
    const { employees, attendance, leaveRanges } = await fetchAttendancePeriodData(
      periodStart,
      periodEnd
    );
    const summaries = summarizeAttendance(employees, attendance, leaveRanges, periodStart, periodEnd);

    const sheet = workbook.addWorksheet("Monthly Attendance");
    sheet.columns = [
      { header: "Employee", key: "employee", width: 28 },
      { header: "Present", key: "present", width: 10 },
      { header: "Late", key: "late", width: 10 },
      { header: "Half Day", key: "halfDay", width: 10 },
      { header: "On Leave", key: "onLeave", width: 10 },
      { header: "Absent", key: "absent", width: 10 },
      { header: "Total Hours", key: "totalHours", width: 12 },
    ];
    sheet.getRow(1).font = { bold: true };
    for (const s of summaries) {
      sheet.addRow(s);
    }
    filename = `attendance-${periodStart.toISOString().slice(0, 7)}.xlsx`;
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
