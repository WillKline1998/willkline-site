import { db } from "@/lib/db";
import { openStoredFile } from "@/lib/storage";

// Serves uploaded files (documents, bulletin images/PDFs).
// Files belonging to a hidden Document stay private.
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[key]">) {
  const { key } = await ctx.params;
  const [upload, hiddenDoc] = await Promise.all([
    db.upload.findUnique({ where: { key } }),
    db.document.findFirst({ where: { fileKey: key, published: false } }),
  ]);
  if (!upload || hiddenDoc) return new Response("Not found", { status: 404 });
  const body = await openStoredFile(key);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": upload.mimeType,
      "Content-Length": String(upload.size),
      // inline: PDFs/images open in the browser; filename is used if saved.
      "Content-Disposition": `inline; filename="${upload.fileName.replace(/[^\w.\- ]/g, "")}"`,
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
