import { describe, expect, it } from "vitest";
import { computePayslip, resolveComponentAmount } from "@/lib/payroll-calc";

describe("resolveComponentAmount", () => {
  it("computes a percentage component relative to basic salary", () => {
    expect(resolveComponentAmount(5000, { isPercentage: true, defaultValue: 20 })).toBe(1000);
  });

  it("returns the flat value for a non-percentage component", () => {
    expect(resolveComponentAmount(5000, { isPercentage: false, defaultValue: 150 })).toBe(150);
  });

  it("handles a zero basic salary for percentage components", () => {
    expect(resolveComponentAmount(0, { isPercentage: true, defaultValue: 20 })).toBe(0);
  });
});

describe("computePayslip", () => {
  it("computes gross pay as basic salary plus earnings", () => {
    const result = computePayslip(5000, [
      { name: "House Allowance", type: "EARNING", amount: 1000 },
      { name: "Transport Allowance", type: "EARNING", amount: 150 },
    ]);
    expect(result.grossPay).toBe(6150);
  });

  it("computes total deductions independently of earnings", () => {
    const result = computePayslip(5000, [
      { name: "House Allowance", type: "EARNING", amount: 1000 },
      { name: "Income Tax", type: "DEDUCTION", amount: 750 },
      { name: "Pension", type: "DEDUCTION", amount: 350 },
    ]);
    expect(result.totalDeductions).toBe(1100);
  });

  it("computes net pay as gross minus deductions", () => {
    const result = computePayslip(5000, [
      { name: "House Allowance", type: "EARNING", amount: 1000 },
      { name: "Income Tax", type: "DEDUCTION", amount: 750 },
    ]);
    expect(result.netPay).toBe(5250);
  });

  it("always includes a Basic Salary earning line", () => {
    const result = computePayslip(5000, []);
    expect(result.lines).toContainEqual({ name: "Basic Salary", type: "EARNING", amount: 5000 });
    expect(result.grossPay).toBe(5000);
    expect(result.totalDeductions).toBe(0);
    expect(result.netPay).toBe(5000);
  });

  it("preserves all component lines in the output alongside Basic Salary", () => {
    const result = computePayslip(5000, [
      { name: "House Allowance", type: "EARNING", amount: 1000 },
      { name: "Income Tax", type: "DEDUCTION", amount: 750 },
    ]);
    expect(result.lines).toHaveLength(3);
  });
});
