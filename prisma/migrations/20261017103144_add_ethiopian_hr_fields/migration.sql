-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('PERMANENT', 'CONTRACT', 'INTERN', 'PART_TIME');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocumentType" ADD VALUE 'GUARANTOR';
ALTER TYPE "DocumentType" ADD VALUE 'WORK_EXPERIENCE';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "emergencyContactRelationship" TEXT,
ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'PERMANENT',
ADD COLUMN     "maritalStatus" "MaritalStatus" NOT NULL DEFAULT 'UNSPECIFIED',
ADD COLUMN     "telebirrNumber" TEXT,
ADD COLUMN     "workLocation" TEXT;

