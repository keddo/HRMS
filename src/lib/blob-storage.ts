import { put, del, get } from "@vercel/blob";

/** Uploads a document to the private Blob store. Returns the pathname to store in the DB. */
export async function uploadDocumentBlob(
  employeeId: string,
  fileName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const pathname = `documents/${employeeId}/${crypto.randomUUID()}-${fileName}`;
  const blob = await put(pathname, buffer, { access: "private", contentType });
  return blob.pathname;
}

/** Streams a document back from the private Blob store, or null if it's missing. */
export async function readDocumentBlob(pathname: string) {
  return get(pathname, { access: "private" });
}

export async function deleteDocumentBlob(pathname: string) {
  await del(pathname);
}

/** Uploads a profile photo to the private Blob store. Returns the pathname to store in the DB. */
export async function uploadAvatarBlob(
  employeeId: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  // A fixed pathname per employee means re-uploading overwrites the old photo
  // instead of accumulating orphaned blobs.
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const pathname = `avatars/${employeeId}.${ext}`;
  const blob = await put(pathname, buffer, { access: "private", contentType, allowOverwrite: true });
  return blob.pathname;
}

/** Streams a profile photo back from the private Blob store, or null if it's missing. */
export async function readAvatarBlob(pathname: string) {
  return get(pathname, { access: "private" });
}
