import path from "node:path";
import fs from "node:fs/promises";

export const UPLOADS_DIR = path.resolve(
  /* turbopackIgnore: true */ process.env.UPLOADS_DIR ?? "./uploads"
);

export async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export function safeUploadFileName(originalName: string) {
  const ext = path.extname(originalName).slice(0, 10);
  const base = crypto.randomUUID();
  return `${base}${ext}`;
}
