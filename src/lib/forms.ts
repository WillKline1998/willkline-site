// Small helpers shared by admin Server Actions.

export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const optional = (f: FormData, k: string) => str(f, k) || null;
export const checked = (f: FormData, k: string) => f.get(k) === "on";
export const int = (f: FormData, k: string, fallback = 0) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : fallback;
};

/** A non-empty uploaded file, or null (an empty <input type=file> still submits a File). */
export function fileFrom(f: FormData, k = "file"): File | null {
  const v = f.get(k);
  return v instanceof File && v.size > 0 ? v : null;
}

/** "Hello, World!" → "hello-world" */
export const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "untitled";

/** First free slug: base, base-2, base-3, … */
export async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>) {
  const root = slugify(base);
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    if (!(await taken(slug))) return slug;
  }
}
