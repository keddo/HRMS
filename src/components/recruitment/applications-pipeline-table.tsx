"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
import { setApplicationStage } from "@/app/(dashboard)/recruitment/actions";

const STAGES = ["APPLIED", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"];

export type PipelineRow = {
  applicationId: string;
  candidateName: string;
  email: string;
  stage: string;
  appliedAt: string;
};

export function ApplicationsPipelineTable({ applications }: { applications: PipelineRow[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Candidate</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>Stage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No candidates yet.
              </TableCell>
            </TableRow>
          )}
          {applications.map((a) => (
            <TableRow key={a.applicationId}>
              <TableCell className="font-medium">
                <Link href={`/recruitment/applications/${a.applicationId}`} className="hover:underline">
                  {a.candidateName}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">{a.email}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(a.appliedAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Select
                    value={a.stage}
                    disabled={isPending}
                    onValueChange={(stage) =>
                      startTransition(() => setApplicationStage(a.applicationId, stage))
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
