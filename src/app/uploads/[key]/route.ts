import { db } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";

// Serves uploaded files. Only files attached to a published Document are public.
export async function GET(_req: Request, ctx: RouteContext<"/uploads/[key]">) {
  const { key } = await ctx.params;
  const doc = await db.document.findFirst({ where: { fileKey: key, published: true } });
  if (!doc) return new Response("Not found", { status: 404 });
  const data = await readStoredFile(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(data.length),
      // inline: PDFs open in the browser; the filename is used if saved.
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
