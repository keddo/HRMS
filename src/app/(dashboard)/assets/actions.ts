"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/rbac";

function requireAdmin(role: Role | null | undefined) {
  if (!isAdmin(role)) throw new Error("You do not have permission to manage assets.");
}

const createAssetSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
});

export async function createAsset(formData: FormData) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const parsed = createAssetSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    serialNumber: formData.get("serialNumber") || undefined,
    purchaseDate: formData.get("purchaseDate") || undefined,
  });

  await prisma.asset.create({
    data: {
      name: parsed.name,
      category: parsed.category,
      serialNumber: parsed.serialNumber || null,
      purchaseDate: parsed.purchaseDate ? new Date(parsed.purchaseDate) : null,
    },
  });

  revalidatePath("/assets");
}

export async function assignAsset(assetId: string, employeeId: string) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error("Asset not found.");
  if (asset.status === "ASSIGNED") throw new Error("This asset is already assigned.");

  await prisma.asset.update({
    where: { id: assetId },
    data: { assignedToId: employeeId, assignedAt: new Date(), status: "ASSIGNED" },
  });

  revalidatePath("/assets");
  revalidatePath(`/employees/${employeeId}`);
}

export async function unassignAsset(assetId: string) {
  const session = await auth();
  requireAdmin(session?.user.role);

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: { assignedToId: null, assignedAt: null, status: "AVAILABLE" },
  });

  revalidatePath("/assets");
  if (asset.assignedToId) revalidatePath(`/employees/${asset.assignedToId}`);
}

const ASSET_STATUSES = ["AVAILABLE", "ASSIGNED", "MAINTENANCE", "RETIRED"] as const;

export async function setAssetStatus(assetId: string, status: string) {
  const session = await auth();
  requireAdmin(session?.user.role);

  await prisma.asset.update({
    where: { id: assetId },
    data: { status: z.enum(ASSET_STATUSES).parse(status) },
  });

  revalidatePath("/assets");
}
