export type PayLine = {
  name: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
};

export type PayComponentInput = {
  name: string;
  type: "EARNING" | "DEDUCTION";
  amount: number;
};

export type PayslipComputation = {
  lines: PayLine[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
};

/** Computes gross pay, total deductions, and net pay for one employee's payslip. */
export function computePayslip(basicSalary: number, components: PayComponentInput[]): PayslipComputation {
  const earningLines: PayLine[] = [
    { name: "Basic Salary", type: "EARNING", amount: basicSalary },
    ...components.filter((c) => c.type === "EARNING"),
  ];
  const deductionLines: PayLine[] = components.filter((c) => c.type === "DEDUCTION");

  const grossPay = earningLines.reduce((sum, l) => sum + l.amount, 0);
  const totalDeductions = deductionLines.reduce((sum, l) => sum + l.amount, 0);
  const netPay = grossPay - totalDeductions;

  return { lines: [...earningLines, ...deductionLines], grossPay, totalDeductions, netPay };
}

/** Resolves a pay component's amount from the company default, given a basic salary. */
export function resolveComponentAmount(
  basicSalary: number,
  component: { isPercentage: boolean; defaultValue: number }
): number {
  return component.isPercentage ? (basicSalary * component.defaultValue) / 100 : component.defaultValue;
}
