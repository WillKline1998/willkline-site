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
