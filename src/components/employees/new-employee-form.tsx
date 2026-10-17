"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EthiopianDateInput } from "@/components/ui/ethiopian-date-input";
import { createEmployee } from "@/app/(dashboard)/employees/actions";

type Department = { id: string; name: string };
type Position = { id: string; title: string; departmentId: string };
type ManagerOption = { id: string; firstName: string; lastName: string };

const GENDERS = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"];
const MARITAL_STATUSES = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "UNSPECIFIED"];
const EMPLOYMENT_TYPES = ["PERMANENT", "CONTRACT", "INTERN", "PART_TIME"];

function maxHireDateIso() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function NewEmployeeForm({
  departments,
  positions,
  managers,
}: {
  departments: Department[];
  positions: Position[];
  managers: ManagerOption[];
}) {
  const router = useRouter();
  const [departmentId, setDepartmentId] = useState("");
  const [gender, setGender] = useState("UNSPECIFIED");
  const [maritalStatus, setMaritalStatus] = useState("UNSPECIFIED");
  const [employmentType, setEmploymentType] = useState("PERMANENT");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredPositions = positions.filter((p) => p.departmentId === departmentId);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("departmentId", departmentId);
    formData.set("gender", gender);
    formData.set("maritalStatus", maritalStatus);
    formData.set("employmentType", employmentType);
    startTransition(async () => {
      try {
        const id = await createEmployee(formData);
        router.push(`/employees/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create employee.");
      }
    });
  };

  return (
    <form action={handleSubmit} className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Personal details</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" name="firstName" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" name="lastName" required />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Marital Status</Label>
            <Select value={maritalStatus} onValueChange={setMaritalStatus}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARITAL_STATUSES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <EthiopianDateInput
            id="dateOfBirth"
            name="dateOfBirth"
            helperText="Must be at least 15 years before the hire date."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Personal Phone</Label>
            <Input id="phone" name="phone" placeholder="e.g. 0911 22 33 44" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Work Email</Label>
            <Input id="email" name="email" type="email" required />
            <p className="text-xs text-muted-foreground">Needed to give the person a login.</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" rows={2} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nationalIdDocument">National ID Document</Label>
            <input
              id="nationalIdDocument"
              name="nationalIdDocument"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">
              PDF, PNG or JPEG, up to 10MB. Optional here; can also be added afterward.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telebirrNumber">Telebirr Number (salary)</Label>
            <Input id="telebirrNumber" name="telebirrNumber" />
            <p className="text-xs text-muted-foreground">
              Where the salary is paid. Stored encrypted. Must be the employee&apos;s own number.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Documents</h2>
          <p className="text-xs text-muted-foreground">
            Optional here; education can be added afterward from the Documents tab either way.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="guarantorDocument">Guarantor Document</Label>
            <input
              id="guarantorDocument"
              name="guarantorDocument"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workExperienceDocument">Work Experience Document</Label>
            <input
              id="workExperienceDocument"
              name="workExperienceDocument"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
            />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Job</h2>
          <p className="text-xs text-muted-foreground">
            This becomes the first entry in the person&apos;s job history.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hireDate">Hire Date</Label>
          <EthiopianDateInput
            id="hireDate"
            name="hireDate"
            required
            max={maxHireDateIso()}
            helperText="The first day of work. Can be up to a year ahead."
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Position</Label>
            <Select name="positionId" disabled={!departmentId}>
              <SelectTrigger>
                <SelectValue placeholder={departmentId ? "Select a position" : "Choose department first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredPositions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workLocation">Work Location</Label>
            <Input id="workLocation" name="workLocation" placeholder="e.g. Head Office, Bole Branch" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Employment Type</Label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Manager</Label>
            <Select name="managerId">
              <SelectTrigger>
                <SelectValue placeholder="No manager" />
              </SelectTrigger>
              <SelectContent>
                {managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.firstName} {m.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="basicSalary">Basic Salary (ETB)</Label>
            <Input id="basicSalary" name="basicSalary" type="number" min="0" step="0.01" />
            <p className="text-xs text-muted-foreground">
              Optional. Allowances and deductions are applied automatically based on this.
            </p>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Emergency Contact</h2>
          <p className="text-xs text-muted-foreground">Optional. More can be added later.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emergencyContactName">Name</Label>
            <Input id="emergencyContactName" name="emergencyContactName" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emergencyContactRelationship">Relationship</Label>
            <Input id="emergencyContactRelationship" name="emergencyContactRelationship" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emergencyContactPhone">Phone</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Add Employee
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/employees")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
