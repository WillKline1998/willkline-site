import type { Metadata } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { type TagMatch } from "@/lib/recipes";
import { openGraph } from "@/lib/seo";
import { signupsOpen } from "@/lib/wall";

const DESCRIPTION = "A wall of recipes shared by people who cook them. Add yours, filter by tag.";
export const metadata: Metadata = { title: "Recipes", description: DESCRIPTION, openGraph: openGraph({ title: "Recipes", description: DESCRIPTION }) };
export const dynamic = "force-dynamic";

const PAGE = 24;
const SORTS = { new: "Newest", old: "Oldest", random: "Random" } as const;
type Sort = keyof typeof SORTS;

const select = {
  id: true, name: true, description: true, tags: true, imageUrl: true, createdAt: true,
  ingredients: true, author: { select: { handle: true, name: true } },
} as const;

// A fresh sample each visit. Shuffled in memory: the wall is small.
async function randomRecipes(where: object) {
  const ids = (await db.recipe.findMany({ where, select: { id: true } })).map((r) => r.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const pick = ids.slice(0, PAGE);
  const rows = await db.recipe.findMany({ where: { id: { in: pick } }, select });
  return pick.map((id) => rows.find((r) => r.id === id)!).filter(Boolean);
}


export default async function RecipesPage(props: PageProps<"/recipes">) {
  const sp = await props.searchParams;
  const sort: Sort = typeof sp.sort === "string" && sp.sort in SORTS ? (sp.sort as Sort) : "new";
  const chosen = (typeof sp.tag === "string" ? [sp.tag] : Array.isArray(sp.tag) ? sp.tag : []).map((t) => t.toLowerCase()).slice(0, 8);
  const match: TagMatch = sp.match === "all" ? "all" : "any";
  const cursor = typeof sp.cursor === "string" && !isNaN(Date.parse(sp.cursor)) ? new Date(sp.cursor) : undefined;
  const viewer = await currentUser();

  // Choosing tags WIDENS what you see ("any"): vegan + indian = everything vegan plus everything Indian.
  // "all" is there for the other question: only recipes that are both.
  const tagWhere = chosen.length ? { tags: match === "all" ? { hasEvery: chosen } : { hasSome: chosen } } : {};
  const where = { hidden: false, ...tagWhere };

  let recipes;
  let more = false;
  if (sort === "random") {
    recipes = await randomRecipes(where);
  } else {
    const rows = await db.recipe.findMany({
      where: { ...where, createdAt: cursor ? (sort === "old" ? { gt: cursor } : { lt: cursor }) : undefined },
      orderBy: { createdAt: sort === "old" ? "asc" : "desc" },
      take: PAGE + 1,
      select,
    });
    recipes = rows.slice(0, PAGE);
    more = rows.length > PAGE;
  }

  // Every tag in use, most used first, so the picker shows what exists.
  const tagRows = await db.recipe.findMany({ where: { hidden: false }, select: { tags: true } });
  const counts = new Map<string, number>();
  for (const r of tagRows) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  const allTags = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const href = (o: { tags?: string[]; sort?: Sort; match?: TagMatch; cursor?: string }) => {
    const q = new URLSearchParams();
    for (const t of o.tags ?? chosen) q.append("tag", t);
    const s = o.sort ?? sort;
    if (s !== "new") q.set("sort", s);
    if ((o.match ?? match) === "all" && (o.tags ?? chosen).length > 1) q.set("match", "all");
    if (o.cursor) q.set("cursor", o.cursor);
    return q.size ? `/recipes?${q}` : "/recipes";
  };
  const toggle = (t: string) => (chosen.includes(t) ? chosen.filter((c) => c !== t) : [...chosen, t]);
  const open = await signupsOpen();

  return (
    <section className="page page-wide recipes">
      <h1 className="page-title">Recipes</h1>
      <p className="lede">Things people actually cook. Share yours, steal someone else&apos;s.</p>
      {sp.deleted === "1" && <p className="admin-note" role="status">Recipe deleted.</p>}

      <p className="wall-cta">
        {viewer ? (
          <Link href="/recipes/new" className="btn">+ Share a recipe</Link>
        ) : (
          <>
            <Link href="/login?next=/recipes/new" className="btn">Log in to share one</Link>
            {open && <Link href="/signup" className="btn btn-quiet">Join</Link>}
          </>
        )}
      </p>

      <div className="wall-controls">
        <nav className="wall-filters" aria-label="Filter by tag">
          <Link href={href({ tags: [] })} aria-current={chosen.length === 0 ? "page" : undefined}>All</Link>
          {allTags.map(([t, n]) => (
            <Link key={t} href={href({ tags: toggle(t) })} aria-current={chosen.includes(t) ? "page" : undefined} aria-label={`${t} (${n}) ${chosen.includes(t) ? "selected" : ""}`}>
              {t} <span className="muted">{n}</span>
            </Link>
          ))}
        </nav>
        <nav className="wall-sort" aria-label="Sort">
          <span className="wall-sort-label">Sort</span>
          {(Object.keys(SORTS) as Sort[]).map((s) => (
            <Link key={s} href={href({ sort: s })} aria-current={sort === s ? "page" : undefined}>{SORTS[s]}</Link>
          ))}
        </nav>
      </div>
      {chosen.length > 1 && (
        <p className="small muted">
          Showing recipes with <strong>{match === "all" ? "all" : "any"}</strong> of: {chosen.join(", ")}.{" "}
          <Link href={href({ match: match === "all" ? "any" : "all" })}>{match === "all" ? "Show any of them instead" : "Only show ones with every tag"}</Link>
        </p>
      )}

      {recipes.length === 0 ? (
        <p className="muted">No recipes {chosen.length ? "with those tags " : ""}yet. {viewer ? "Be the first!" : ""}</p>
      ) : (
        <ul className="recipe-grid">
          {recipes.map((r) => (
            <li key={r.id} className="recipe-card">
              <Link href={`/recipes/${r.id}`} className="recipe-card-link">
                {r.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.imageUrl} alt="" className="recipe-card-img" loading="lazy" />
                )}
                <strong>{r.name}</strong>
                {r.description && <span className="recipe-card-desc">{r.description}</span>}
                <span className="small muted">
                  {r.author.handle ? `@${r.author.handle}` : r.author.name || "A member"} · {longDate(r.createdAt)} · {r.ingredients.length} ingredient{r.ingredients.length === 1 ? "" : "s"}
                </span>
              </Link>
              {r.tags.length > 0 && (
                <p className="recipe-tags">
                  {r.tags.map((t) => <Link key={t} href={href({ tags: [t], match: "any" })}>{t}</Link>)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {sort === "random" && recipes.length > 1 && <p><a className="btn btn-quiet" href={href({})}>⟳ Shuffle again</a></p>}
      {more && (
        <p>
          <Link className="btn btn-quiet" href={href({ cursor: recipes[recipes.length - 1].createdAt.toISOString() })}>
            {sort === "old" ? "Newer →" : "Older →"}
          </Link>
        </p>
      )}
    </section>
  );
}
