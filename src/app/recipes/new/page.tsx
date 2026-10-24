import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { RecipeForm } from "../RecipeForm";

export const metadata: Metadata = { title: "Share a recipe", robots: { index: false } };

export default async function NewRecipePage() {
  await requireUser("/recipes/new");
  const tags = [...new Set((await db.recipe.findMany({ where: { hidden: false }, select: { tags: true } })).flatMap((r) => r.tags))];
  return (
    <section className="page page-wide recipes">
      <p className="small"><Link href="/recipes">← Recipes</Link></p>
      <h1 className="page-title">Share a recipe</h1>
      <p className="lede">Write it the way you&apos;d tell a friend. Add as many lines as you need.</p>
      <RecipeForm knownTags={tags} />
    </section>
  );
}
