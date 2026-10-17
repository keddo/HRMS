-- AlterTable
ALTER TABLE "EmployeeSalary" ALTER COLUMN "currency" SET DEFAULT 'ETB';

-- Backfill existing USD-denominated records to the org's actual currency, ETB.
UPDATE "EmployeeSalary" SET "currency" = 'ETB' WHERE "currency" = 'USD';
UPDATE "SalaryHistory" SET "currency" = 'ETB' WHERE "currency" = 'USD';
