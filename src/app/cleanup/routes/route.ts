import { routeFeatures } from "@/lib/cleanup";

// The map's data, public like the page itself. A minute of CDN caching is plenty for a map.
export async function GET() {
  return Response.json(await routeFeatures(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
