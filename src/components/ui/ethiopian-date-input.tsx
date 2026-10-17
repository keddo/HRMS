"use client";

import { useId, useState } from "react";
import { toEC, toGC } from "kenat";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ETHIOPIAN_MONTHS = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehase", "Pagume",
];

function daysInEthiopianMonth(month: number, year: number) {
  if (month < 13) return 30;
  return (year + 1) % 4 === 0 ? 6 : 5;
}

function toIso(year: number, month: number, day: number) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Date input with a Gregorian/Ethiopian calendar toggle. The value entered in either
 * calendar is converted to a Gregorian ISO date and submitted via a hidden input, since
 * every date is stored as Gregorian throughout the rest of the system.
 */
export function EthiopianDateInput({
  id,
  name,
  defaultValue,
  required,
  max,
  min,
  helperText,
}: {
  id?: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  max?: string;
  min?: string;
  helperText?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [calendar, setCalendar] = useState<"gregorian" | "ethiopian">("gregorian");
  const [isoValue, setIsoValue] = useState(defaultValue ?? "");

  let ethiopian: { year: number; month: number; day: number } | null = null;
  if (isoValue) {
    const [y, m, d] = isoValue.split("-").map(Number);
    if (y && m && d) {
      try {
        ethiopian = toEC(y, m, d);
      } catch {
        ethiopian = null;
      }
    }
  }

  const now = new Date();
  const ethYear = ethiopian?.year ?? now.getFullYear() - 8;
  const ethMonth = ethiopian?.month ?? 1;
  const ethDay = ethiopian?.day ?? 1;

  const setFromEthiopian = (year: number, month: number, day: number) => {
    const clampedDay = Math.min(Math.max(day, 1), daysInEthiopianMonth(month, year));
    try {
      const g = toGC(year, month, clampedDay);
      setIsoValue(toIso(g.year, g.month, g.day));
    } catch {
      // Ignore invalid intermediate input while the user is still typing.
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={calendar === "gregorian"}
            onChange={() => setCalendar("gregorian")}
          />
          Gregorian
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={calendar === "ethiopian"}
            onChange={() => setCalendar("ethiopian")}
          />
          Ethiopian
        </label>
      </div>

      {calendar === "gregorian" ? (
        <Input
          id={inputId}
          type="date"
          value={isoValue}
          max={max}
          min={min}
          onChange={(e) => setIsoValue(e.target.value)}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={String(ethMonth)}
            onValueChange={(v) => setFromEthiopian(ethYear, Number(v), ethDay)}
          >
            <SelectTrigger id={inputId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ETHIOPIAN_MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={daysInEthiopianMonth(ethMonth, ethYear)}
            value={ethDay}
            onChange={(e) => setFromEthiopian(ethYear, ethMonth, Number(e.target.value))}
            placeholder="Day"
          />
          <Input
            type="number"
            value={ethYear}
            onChange={(e) => setFromEthiopian(Number(e.target.value), ethMonth, ethDay)}
            placeholder="Year"
          />
        </div>
      )}

      {ethiopian && calendar === "gregorian" && (
        <p className="text-xs text-muted-foreground">
          {ETHIOPIAN_MONTHS[ethiopian.month - 1]} {ethiopian.day}, {ethiopian.year} E.C.
        </p>
      )}
      {isoValue && calendar === "ethiopian" && (
        <p className="text-xs text-muted-foreground">{isoValue} (Gregorian)</p>
      )}
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      <input type="hidden" name={name} value={isoValue} required={required} />
    </div>
  );
}
