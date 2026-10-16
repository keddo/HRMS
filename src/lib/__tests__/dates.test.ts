import { describe, expect, it } from "vitest";
import { countWeekdays, startOfDay } from "@/lib/dates";

describe("countWeekdays", () => {
  it("counts a single weekday as 1", () => {
    // Monday 2026-01-05
    expect(countWeekdays(new Date("2026-01-05"), new Date("2026-01-05"))).toBe(1);
  });

  it("counts a full Mon-Fri work week as 5", () => {
    expect(countWeekdays(new Date("2026-01-05"), new Date("2026-01-09"))).toBe(5);
  });

  it("excludes weekends from a range spanning a weekend", () => {
    // Fri 2026-01-09 through Mon 2026-01-12 -> Fri, Mon = 2 weekdays
    expect(countWeekdays(new Date("2026-01-09"), new Date("2026-01-12"))).toBe(2);
  });

  it("counts a single Saturday as 0", () => {
    expect(countWeekdays(new Date("2026-01-10"), new Date("2026-01-10"))).toBe(0);
  });

  it("counts a two-week range correctly (10 weekdays)", () => {
    expect(countWeekdays(new Date("2026-01-05"), new Date("2026-01-16"))).toBe(10);
  });
});

describe("startOfDay", () => {
  it("zeroes out the time component", () => {
    const d = startOfDay(new Date("2026-03-14T15:42:11.123Z"));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });
});
