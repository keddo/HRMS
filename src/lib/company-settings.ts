import { prisma } from "@/lib/prisma";

export type CompanySettings = {
  companyName: string;
  logoUrl: string | null;
  minPasswordLength: number;
};

const DEFAULTS: CompanySettings = {
  companyName: "HRMS",
  logoUrl: null,
  minPasswordLength: 8,
};

/** Reads the single company-settings row, falling back to defaults if it hasn't been created yet. */
export async function getCompanySettings(): Promise<CompanySettings> {
  const settings = await prisma.companySettings.findUnique({ where: { id: "singleton" } });
  if (!settings) return DEFAULTS;
  return {
    companyName: settings.companyName,
    logoUrl: settings.logoUrl,
    minPasswordLength: settings.minPasswordLength,
  };
}
