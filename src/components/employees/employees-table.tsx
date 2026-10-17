"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type EmployeeRow = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentName: string | null;
  positionTitle: string | null;
  employmentStatus: string;
  hireDate: string;
  avatarUrl: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  SUSPENDED: "outline",
  TERMINATED: "destructive",
};

const STATUS_OPTIONS = ["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED"];

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function EmployeesTable({
  data,
  departments,
}: {
  data: EmployeeRow[];
  departments: string[];
}) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>("all");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [sorting, setSorting] = useState<SortingState>([{ id: "firstName", desc: false }]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((emp) => {
      const matchesDept = department === "all" || emp.departmentName === department;
      if (!matchesDept) return false;
      const matchesStatus = status === "all" || emp.employmentStatus === status;
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q)
      );
    });
  }, [data, search, department, status]);

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        accessorKey: "firstName",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <Link href={`/employees/${emp.id}`} className="flex items-center gap-3">
              <Avatar className="size-8">
                {emp.avatarUrl && <AvatarImage src={`/api/avatars/${emp.id}`} alt="" />}
                <AvatarFallback>{initials(emp.firstName, emp.lastName)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
              </div>
            </Link>
          );
        },
      },
      {
        accessorKey: "departmentName",
        header: "Department",
        cell: ({ row }) => row.original.departmentName ?? "—",
      },
      {
        accessorKey: "positionTitle",
        header: "Position",
        cell: ({ row }) => row.original.positionTitle ?? "—",
      },
      {
        accessorKey: "email",
        header: "Email",
      },
      {
        accessorKey: "hireDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Hire Date
            <ArrowUpDown className="size-3.5" />
          </Button>
        ),
        cell: ({ row }) => new Date(row.original.hireDate).toLocaleDateString(),
      },
      {
        accessorKey: "employmentStatus",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.employmentStatus] ?? "secondary"}>
            {row.original.employmentStatus.replace("_", " ")}
          </Badge>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No employees found.
                </TableCell>
              </TableRow>
            )}
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {data.length} employees
      </p>
    </div>
  );
}
