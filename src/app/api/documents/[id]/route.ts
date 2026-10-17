import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";
import { readDocumentBlob } from "@/lib/blob-storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isSelf = session.user.employeeId === document.employeeId;
  if (!isAdmin(session.user.role) && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const blob = await readDocumentBlob(document.filePath);
    if (!blob) {
      return NextResponse.json({ error: "File missing in storage" }, { status: 404 });
    }
    return new NextResponse(blob.stream, {
      headers: {
        "Content-Disposition": `attachment; filename="${document.fileName}"`,
        "Content-Type": "application/octet-stream",
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing in storage" }, { status: 404 });
  }
}
