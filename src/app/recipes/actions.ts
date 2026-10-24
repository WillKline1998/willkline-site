"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { currentUser, requireAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fileFrom, str } from "@/lib/forms";
import { ImageError, saveResizedImage } from "@/lib/images";
import { notifyAdmins } from "@/lib/notify";
import { RECIPE_LIMITS as L, cleanLines, parseTags } from "@/lib/recipes";
import { deleteFile, keyFromUrl } from "@/lib/storage";
import { parse } from "@/lib/validation";

export type RecipeValues = {
  name: string;
  description: string;
  tags: string;
  ingredients: string[];
  steps: string[];
  sourceText: string;
  sourceUrl: string;
};
export type RecipeState = { error?: string; values?: RecipeValues };

const refresh = () => revalidatePath("/recipes", "layout");

async function removeImage(url: string | null) {
  const key = url && keyFromUrl(url);
  if (key) await deleteFile(key);
}

const Fields = z.object({
  name: z.string().min(1, "Give the recipe a name."),
  sourceUrl: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "A source link needs to start with https://" })]),
});

function read(form: FormData): { values: RecipeValues; tags: string[]; error?: string } {
  const values: RecipeValues = {
    name: str(form, "name").slice(0, L.name),
    description: str(form, "description").slice(0, L.description),
    tags: str(form, "tags"),
    ingredients: form.getAll("ingredient").map(String).slice(0, L.ingredients * 2),
    steps: form.getAll("step").map(String).slice(0, L.steps * 2),
    sourceText: str(form, "sourceText").slice(0, L.sourceText),
    sourceUrl: str(form, "sourceUrl"),
  };
  const tags = parseTags(values.tags);
  const bad = parse(Fields, values);
  if (bad.error !== undefined) return { values, tags, error: bad.error };
  if (cleanLines(values.ingredients, L.ingredient).length === 0) return { values, tags, error: "Add at least one ingredient." };
  if (cleanLines(values.steps, L.step).length === 0) return { values, tags, error: "Add at least one step." };
  if (cleanLines(values.ingredients, L.ingredient).length > L.ingredients) return { values, tags, error: `That's more than ${L.ingredients} ingredients.` };
  if (cleanLines(values.steps, L.step).length > L.steps) return { values, tags, error: `That's more than ${L.steps} steps.` };
  return { values, tags };
}

const dataFrom = (v: RecipeValues, tags: string[]) => ({
  name: v.name,
  description: v.description,
  tags,
  ingredients: cleanLines(v.ingredients, L.ingredient),
  steps: cleanLines(v.steps, L.step),
  sourceText: v.sourceText,
  sourceUrl: v.sourceUrl || null,
});

export async function createRecipe(_prev: RecipeState, form: FormData): Promise<RecipeState> {
  const user = await requireUser("/recipes/new");
  const { values, tags, error } = read(form);
  if (error) return { error, values };
  const lately = await db.recipe.count({ where: { authorId: user.id, createdAt: { gt: new Date(Date.now() - 864e5) } } });
  if (lately >= L.perDay) return { error: `That's ${L.perDay} recipes in a day. Come back tomorrow!`, values };

  let imageUrl: string | null = null;
  const image = fileFrom(form, "image");
  try {
    if (image) imageUrl = await saveResizedImage(image);
  } catch (e) {
    return { error: e instanceof ImageError ? e.message : "Couldn't save that image.", values };
  }
  const recipe = await db.recipe.create({ data: { ...dataFrom(values, tags), authorId: user.id, imageUrl } });
  refresh();
  redirect(`/recipes/${recipe.id}`);
}

// Authors edit their own recipes; the admin can edit anything.
export async function updateRecipe(_prev: RecipeState, form: FormData): Promise<RecipeState> {
  const user = await requireUser();
  const recipe = await db.recipe.findUnique({ where: { id: str(form, "id") } });
  if (!recipe || (recipe.authorId !== user.id && user.role !== "ADMIN")) return { error: "You can only edit your own recipes." };
  const { values, tags, error } = read(form);
  if (error) return { error, values };

  let imageUrl = recipe.imageUrl;
  const image = fileFrom(form, "image");
  try {
    if (image) imageUrl = await saveResizedImage(image);
  } catch (e) {
    return { error: e instanceof ImageError ? e.message : "Couldn't save that image.", values };
  }
  if (image || form.get("removeImage") === "on") {
    await removeImage(recipe.imageUrl);
    if (!image) imageUrl = null;
  }
  await db.recipe.update({ where: { id: recipe.id }, data: { ...dataFrom(values, tags), imageUrl } });
  refresh();
  redirect(`/recipes/${recipe.id}`);
}

export async function deleteRecipe(form: FormData) {
  const user = await requireUser();
  const recipe = await db.recipe.findUnique({ where: { id: str(form, "id") } });
  if (!recipe || (recipe.authorId !== user.id && user.role !== "ADMIN")) return;
  await db.recipe.delete({ where: { id: recipe.id } });
  await removeImage(recipe.imageUrl);
  refresh();
  redirect("/recipes?deleted=1");
}

// Reports from three different people hide a recipe until the admin reviews it.
export async function reportRecipe(form: FormData) {
  const user = await currentUser();
  if (!user) return;
  const recipeId = str(form, "id");
  await db.recipeReport.upsert({ where: { userId_recipeId: { userId: user.id, recipeId } }, update: {}, create: { userId: user.id, recipeId } });
  const reports = await db.recipeReport.count({ where: { recipeId } });
  const recipe = await db.recipe.update({
    where: { id: recipeId },
    data: { reports, ...(reports >= 3 ? { hidden: true } : {}) },
    include: { author: { select: { handle: true } } },
  });
  await notifyAdmins(reports >= 3 ? `Recipe hidden after ${reports} reports` : "A recipe was reported", [
    `“${recipe.name}” by @${recipe.author.handle} has ${reports} report${reports === 1 ? "" : "s"}${reports >= 3 ? " and is now hidden" : ""}.`,
    `Reported by @${user.handle ?? user.email}.`,
    `Link: /recipes/${recipe.id}`,
  ]);
  refresh();
  redirect(`/recipes/${recipeId}?reported=1`);
}

export async function setRecipeHidden(form: FormData) {
  await requireAdmin("/recipes");
  const id = str(form, "id");
  const hidden = form.get("hidden") === "1";
  // Unhiding = the admin reviewed it: clear the reports so it isn't hidden again straight away.
  if (!hidden) await db.recipeReport.deleteMany({ where: { recipeId: id } });
  await db.recipe.update({ where: { id }, data: { hidden, ...(hidden ? {} : { reports: 0 }) } });
  refresh();
  redirect(`/recipes/${id}`);
}
