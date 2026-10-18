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

export type TaxBracketInput = {
  minAmount: number;
  maxAmount: number | null;
  rate: number;
};

/** Marginal/progressive tax on `taxableIncome`, given ascending brackets (maxAmount null = top bracket). */
export function computeProgressiveTax(taxableIncome: number, brackets: TaxBracketInput[]): number {
  let tax = 0;
  for (const b of brackets) {
    if (taxableIncome <= b.minAmount) continue;
    const upper = b.maxAmount ?? Infinity;
    const taxableInBracket = Math.min(taxableIncome, upper) - b.minAmount;
    if (taxableInBracket > 0) tax += (taxableInBracket * b.rate) / 100;
  }
  return Math.round(tax * 100) / 100;
}

/** Resolves a pay component's amount from the company default, given a basic salary. A
 * progressive-tax component is computed on basic salary via `taxBrackets` instead of defaultValue. */
export function resolveComponentAmount(
  basicSalary: number,
  component: { isPercentage: boolean; defaultValue: number; isProgressiveTax?: boolean },
  taxBrackets: TaxBracketInput[] = []
): number {
  if (component.isProgressiveTax) {
    return computeProgressiveTax(basicSalary, taxBrackets);
  }
  return component.isPercentage ? (basicSalary * component.defaultValue) / 100 : component.defaultValue;
}
