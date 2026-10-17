import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readAvatarBlob } from "@/lib/blob-storage";

export async function GET(_req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { employeeId } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { avatarUrl: true },
  });
  if (!employee?.avatarUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await readAvatarBlob(employee.avatarUrl);
    if (!result?.stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
