import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readCompanyLogoBlob } from "@/lib/blob-storage";

// Intentionally public (no auth check): the logo needs to render on the login page too.
export async function GET() {
  const settings = await prisma.companySettings.findUnique({ where: { id: "singleton" } });
  if (!settings?.logoUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const result = await readCompanyLogoBlob(settings.logoUrl);
    if (!result?.stream) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
