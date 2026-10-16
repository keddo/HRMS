"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEmployee } from "@/app/(dashboard)/employees/actions";

type Department = { id: string; name: string };
type Position = { id: string; title: string; departmentId: string };
type ManagerOption = { id: string; firstName: string; lastName: string };

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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredPositions = positions.filter((p) => p.departmentId === departmentId);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("departmentId", departmentId);
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
    <form action={handleSubmit} className="flex max-w-xl flex-col gap-4">
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

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="hireDate">Hire Date</Label>
        <Input id="hireDate" name="hireDate" type="date" required />
      </div>

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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="mt-2 w-fit">
        {isPending && <Loader2 className="size-4 animate-spin" />}
        Create Employee
      </Button>
    </form>
  );
}
