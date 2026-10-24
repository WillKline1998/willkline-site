import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { longDate } from "@/lib/dates";
import { openGraph } from "@/lib/seo";
import { JumpToRecipe } from "@/components/JumpToRecipe";
import { deleteRecipe, reportRecipe, setRecipeHidden } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: PageProps<"/recipes/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const r = await db.recipe.findFirst({ where: { id, hidden: false }, select: { name: true, description: true } });
  if (!r) return { title: "Recipe" };
  const description = r.description.slice(0, 160) || "A recipe on willkline.net.";
  return { title: r.name, description, openGraph: openGraph({ title: r.name, description }) };
}

export default async function RecipePage(props: PageProps<"/recipes/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const viewer = await currentUser();
  const recipe = await db.recipe.findUnique({ where: { id }, include: { author: { select: { handle: true, name: true } } } });
  if (!recipe) notFound();
  const isOwner = !!viewer && viewer.id === recipe.authorId;
  const isAdmin = viewer?.role === "ADMIN";
  // A hidden recipe is visible only to its author and the admin.
  if (recipe.hidden && !isOwner && !isAdmin) notFound();
  const by = recipe.author.handle ? `@${recipe.author.handle}` : recipe.author.name || "A member";

  return (
    <article className="page page-wide recipes recipe-page">
      <p className="small"><Link href="/recipes">← Recipes</Link></p>
      {recipe.hidden && <p className="admin-note" role="status">This recipe is hidden from everyone but you{isAdmin ? " and the admin" : ""} while it is reviewed.</p>}
      {sp.reported === "1" && <p className="admin-note" role="status">Thanks, that has been reported.</p>}
      <h1 className="page-title">{recipe.name}</h1>
      <p className="small muted">
        {by} · {longDate(recipe.createdAt)}
      </p>
      {recipe.tags.length > 0 && (
        <p className="recipe-tags">{recipe.tags.map((t) => <Link key={t} href={`/recipes?tag=${encodeURIComponent(t)}`}>{t}</Link>)}</p>
      )}
      {/* The recipe comes first. Everything else (the story, the photo, where it came from) is underneath. */}
      <div id="the-recipe" tabIndex={-1} className="recipe-body">
        <section aria-labelledby="ing">
          <h2 id="ing" className="section-label">Ingredients</h2>
          <ul className="recipe-ingredients">{recipe.ingredients.map((line, i) => <li key={i}>{line}</li>)}</ul>
        </section>
        <section aria-labelledby="steps">
          <h2 id="steps" className="section-label">Steps</h2>
          <ol className="recipe-steps">{recipe.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </section>
      </div>

      {(recipe.description || recipe.imageUrl || recipe.sourceText || recipe.sourceUrl) && (
        <section className="recipe-about" aria-label="About this recipe">
          {recipe.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recipe.imageUrl} alt="" className="recipe-hero" />
          )}
          {recipe.description && <p className="recipe-desc">{recipe.description}</p>}
          {(recipe.sourceText || recipe.sourceUrl) && (
            <p className="small recipe-source-line">
              <strong>From:</strong>{" "}
              {recipe.sourceUrl ? (
                <a href={recipe.sourceUrl} rel="noopener noreferrer nofollow ugc" target="_blank">{recipe.sourceText || recipe.sourceUrl}</a>
              ) : (
                recipe.sourceText
              )}
            </p>
          )}
        </section>
      )}

      <div className="recipe-actions">
        {(isOwner || isAdmin) && <Link href={`/recipes/${recipe.id}/edit`} className="btn btn-quiet">Edit</Link>}
        {(isOwner || isAdmin) && (
          <form action={deleteRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <button className="btn btn-quiet">Delete</button>
          </form>
        )}
        {viewer && !isOwner && (
          <form action={reportRecipe}>
            <input type="hidden" name="id" value={recipe.id} />
            <button className="btn btn-quiet">Report</button>
          </form>
        )}
        {isAdmin && (
          <form action={setRecipeHidden}>
            <input type="hidden" name="id" value={recipe.id} />
            <input type="hidden" name="hidden" value={recipe.hidden ? "0" : "1"} />
            <button className="btn btn-quiet">{recipe.hidden ? "Unhide" : "Hide"}</button>
          </form>
        )}
      </div>
      <JumpToRecipe targetId="the-recipe" />
    </article>
  );
}
