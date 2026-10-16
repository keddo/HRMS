"use client";

import { useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { assignAsset, unassignAsset } from "@/app/(dashboard)/assets/actions";

export type AssetRow = {
  id: string;
  name: string;
  category: string;
  serialNumber: string | null;
  status: string;
  assignedToName: string | null;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  AVAILABLE: "secondary",
  ASSIGNED: "default",
  MAINTENANCE: "outline",
  RETIRED: "destructive",
};

export function AssetsTable({
  assets,
  employees,
}: {
  assets: AssetRow[];
  employees: { id: string; firstName: string; lastName: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Serial #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No assets yet.
              </TableCell>
            </TableRow>
          )}
          {assets.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>{a.category}</TableCell>
              <TableCell className="text-muted-foreground">{a.serialNumber ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[a.status] ?? "secondary"}>{a.status}</Badge>
              </TableCell>
              <TableCell>{a.assignedToName ?? "—"}</TableCell>
              <TableCell className="text-right">
                {a.status === "ASSIGNED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => startTransition(() => unassignAsset(a.id))}
                  >
                    {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
                    Unassign
                  </Button>
                ) : pickerFor === a.id ? (
                  <Select
                    disabled={isPending}
                    onValueChange={(employeeId) =>
                      startTransition(async () => {
                        await assignAsset(a.id, employeeId);
                        setPickerFor(null);
                      })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setPickerFor(a.id)}>
                    Assign
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
