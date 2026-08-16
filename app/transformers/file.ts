import type { File } from "../../generated/prisma/browser";

export type ClientFile = Pick<
  File,
  "id" | "bytes" | "contentType" | "createdAt" | "filename"
>;

export function transform(item: File): ClientFile {
  return {
    id: item.id,
    bytes: item.bytes,
    contentType: item.contentType,
    createdAt: item.createdAt,
    filename: item.filename,
  };
}
