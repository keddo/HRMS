"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadDocument } from "@/app/(dashboard)/employees/actions";

type Document = {
  id: string;
  fileName: string;
  type: string;
  uploadedAt: string;
};

const DOC_TYPES = [
  "CONTRACT",
  "ID_COPY",
  "CERTIFICATE",
  "RESUME",
  "GUARANTOR",
  "WORK_EXPERIENCE",
  "OTHER",
];

export function DocumentsTab({
  employeeId,
  documents,
  canUpload,
}: {
  employeeId: string;
  documents: Document[];
  canUpload: boolean;
}) {
  const [docType, setDocType] = useState("OTHER");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    formData.set("type", docType);
    startTransition(async () => {
      try {
        await uploadDocument(employeeId, formData);
        formRef.current?.reset();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed.");
      }
    });
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        {canUpload && (
          <form
            ref={formRef}
            action={handleSubmit}
            className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label className="text-sm font-medium">File</label>
              <input
                type="file"
                name="file"
                required
                className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
            </div>
            <div className="sm:w-48">
              <label className="text-sm font-medium">Type</label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              Upload
            </Button>
          </form>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col divide-y">
          {documents.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
          {documents.map((doc) => (
            <a
              key={doc.id}
              href={`/api/documents/${doc.id}`}
              className="flex items-center justify-between py-3 text-sm hover:text-primary"
            >
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                {doc.fileName}
                <span className="text-xs text-muted-foreground">({doc.type.replace("_", " ")})</span>
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(doc.uploadedAt).toLocaleDateString()}
              </span>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
