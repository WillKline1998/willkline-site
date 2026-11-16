// Pure helpers for the Songbook: titles from file names, the folder tree, page-count buckets.
// No database or Next imports, so scripts/test_songbook.ts can run them directly.

export type FolderNode = { id: string; name: string; parentId: string | null };

/** "Amazing_Grace-v2 (piano).pdf" -> "Amazing Grace v2 (piano)" */
export function prettyTitle(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return base || "Untitled";
}

/** Ids of a folder and every folder inside it, at any depth. */
export function subtreeIds(folders: FolderNode[], rootId: string): Set<string> {
  const out = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of folders) {
      if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
        out.add(f.id);
        grew = true;
      }
    }
  }
  return out;
}

/** Folders from the top down to `id`: [Gospel, One page]. Empty for unfiled. Stops if the data loops. */
export function pathTo(folders: FolderNode[], id: string | null): FolderNode[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const out: FolderNode[] = [];
  const seen = new Set<string>();
  for (let cur = id ? byId.get(id) : undefined; cur && !seen.has(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined) {
    seen.add(cur.id);
    out.unshift(cur);
  }
  return out;
}

/** Would moving `id` under `newParentId` put a folder inside itself? */
export function wouldCycle(folders: FolderNode[], id: string, newParentId: string | null): boolean {
  return newParentId !== null && subtreeIds(folders, id).has(newParentId);
}

/** Every folder with its full label ("Gospel / One page"), in tree order, for pickers. */
export function flatten(folders: FolderNode[]): { id: string; label: string; depth: number }[] {
  const byParent = new Map<string | null, FolderNode[]>();
  for (const f of folders) byParent.set(f.parentId, [...(byParent.get(f.parentId) ?? []), f]);
  const out: { id: string; label: string; depth: number }[] = [];
  const walk = (parent: string | null, trail: string[], depth: number, seen: Set<string>) => {
    const kids = (byParent.get(parent) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
    for (const f of kids) {
      if (seen.has(f.id)) continue;
      out.push({ id: f.id, label: [...trail, f.name].join(" / "), depth });
      walk(f.id, [...trail, f.name], depth + 1, new Set([...seen, f.id]));
    }
  };
  walk(null, [], 0, new Set());
  return out;
}

/** The page filters offered on the Songbook. */
export const PAGE_FILTERS = { "1": "1 page", "2": "2 pages", "3": "3+ pages" } as const;
export type PageFilter = keyof typeof PAGE_FILTERS;
export const matchesPages = (pages: number, f: PageFilter | undefined) =>
  !f || (f === "1" ? pages === 1 : f === "2" ? pages === 2 : pages >= 3);
export const pagesLabel = (n: number) => (n === 1 ? "1 page" : `${n} pages`);

export const SONG_LIMITS = { title: 120, artist: 120, notes: 1000, name: 60, bytes: 4 * 1024 * 1024 } as const;

/** What an empty artist reads as (hymns, traditional tunes). */
export const NO_ARTIST = "No artist";
export const artistLabel = (artist: string) => artist.trim() || NO_ARTIST;

/**
 * Title and artist from a file name. "Radiohead - No Surprises.pdf" -> { artist: "Radiohead", title: "No Surprises" }.
 * A credit in brackets on the artist side moves to the title: "Nina Simone (The Beatles) - Here Comes The Sun" ->
 * { artist: "Nina Simone", title: "Here Comes The Sun (The Beatles)" }. No " - " -> no artist, the whole name is the title.
 */
export function splitArtist(name: string): { title: string; artist: string } {
  const base = prettyTitle(name);
  const at = base.indexOf(" - ");
  if (at <= 0) return { title: base, artist: "" };
  let artist = base.slice(0, at).trim();
  let title = base.slice(at + 3).trim();
  const credit = artist.match(/^(.+?)\s*\(([^)]+)\)$/);
  if (credit) {
    artist = credit[1].trim();
    title = `${title} (${credit[2].trim()})`;
  }
  return title && artist ? { title, artist } : { title: base, artist: "" };
}

export type ArtistCluster = {
  name: string;
  count: number;
  none?: boolean;
  rest?: boolean;
  folder?: boolean;
  /** Only on the "+N more" cluster: the artists folded into it, biggest first. */
  members?: { name: string; count: number }[];
};

/**
 * How many bubbles to allow before folding into "+N more". `total` = distinct artists (incl. "No artist") +
 * sub-folder bubbles. A catalogue that only just overflows the base cap (20 desktop / 12 phone) shows everything,
 * up to a hard ceiling (24 / 14); only past that does folding kick in.
 */
export function bubbleCap(total: number, phone: boolean): number {
  const [base, ceiling] = phone ? [12, 14] : [20, 24];
  return Math.max(base, Math.min(total, ceiling));
}

/**
 * One bubble per artist for demo mode, biggest first. Past `cap`, the smallest artists fold into one
 * "+N more" bubble so the screen never holds more than `cap` circles. Songs with no artist always get their
 * own bubble — that's a distinct, meaningful group (hymns, traditional tunes), not an overflow leftover — so
 * it's exempted from the count-based cap that folds small NAMED artists together.
 */
export function artistClusters(artists: string[], cap = 20): ArtistCluster[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const a of artists) {
    const name = a.trim();
    const key = name.toLowerCase();
    const c = counts.get(key) ?? { name, count: 0 };
    c.count++;
    counts.set(key, c);
  }
  const noneCount = counts.get("")?.count;
  const none: ArtistCluster | null = noneCount ? { name: NO_ARTIST, count: noneCount, none: true } : null;
  const named: ArtistCluster[] = [...counts.entries()]
    .filter(([key]) => key !== "")
    .map(([, c]) => c)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  const budget = cap - (none ? 1 : 0); // reserve a slot for "No artist" so it's never squeezed out by the cap
  if (named.length <= budget) return none ? [...named, none] : named;
  const keep = named.slice(0, budget - 1);
  const rest = named.slice(budget - 1);
  const restCluster: ArtistCluster = { name: `+${rest.length} more`, count: rest.reduce((n, c) => n + c.count, 0), rest: true, members: rest.map((c) => ({ name: c.name, count: c.count })) };
  return none ? [...keep, restCluster, none] : [...keep, restCluster];
}

/** Circle radius for a cluster: area grows with the song count, clamped so no artist is too small or too big. */
export function clusterRadius(count: number, maxCount: number, minR: number, maxR: number): number {
  if (maxCount <= 1) return minR;
  const t = Math.sqrt((count - 1) / (maxCount - 1));
  return Math.round(minR + (maxR - minR) * Math.min(1, Math.max(0, t)));
}
