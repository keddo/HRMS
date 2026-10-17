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
