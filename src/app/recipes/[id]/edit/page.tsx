import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RecipeForm } from "../../RecipeForm";

export const metadata: Metadata = { title: "Edit recipe", robots: { index: false } };

export default async function EditRecipePage(props: PageProps<"/recipes/[id]/edit">) {
  const { id } = await props.params;
  const user = await requireUser(`/recipes/${id}/edit`);
  const r = await db.recipe.findUnique({ where: { id } });
  if (!r || (r.authorId !== user.id && user.role !== "ADMIN")) notFound();
  const tags = [...new Set((await db.recipe.findMany({ where: { hidden: false }, select: { tags: true } })).flatMap((x) => x.tags))];
  return (
    <section className="page page-wide recipes">
      <p className="small"><Link href={`/recipes/${r.id}`}>← Back to the recipe</Link></p>
      <h1 className="page-title">Edit recipe</h1>
      <RecipeForm
        knownTags={tags}
        recipe={{ id: r.id, name: r.name, description: r.description, tags: r.tags.join(", "), ingredients: r.ingredients, steps: r.steps, sourceText: r.sourceText, sourceUrl: r.sourceUrl ?? "", imageUrl: r.imageUrl }}
      />
    </section>
  );
}
