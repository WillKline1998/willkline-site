"use client";

import { useActionState, useState } from "react";
import { RECIPE_LIMITS as L, TAG_SUGGESTIONS } from "@/lib/recipes";
import { createRecipe, updateRecipe, type RecipeState, type RecipeValues } from "./actions";

type Existing = RecipeValues & { id: string; imageUrl: string | null };
type Row = { key: number; text: string };

let nextKey = 1;
const rowsFrom = (lines: string[] | undefined): Row[] => (lines?.length ? lines : [""]).map((text) => ({ key: nextKey++, text }));

/** A textarea that grows with what you type, so nobody has to scroll inside a box. */
function Grow(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fit = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  return <textarea ref={(el) => { if (el) fit(el); }} {...props} onInput={(e) => fit(e.currentTarget)} />;
}

/** A list the author adds to and removes from line by line (+ Add, × per row). */
function Lines({ label, name, noun, rows, setRows, multiline, placeholder, max }: {
  label: string; name: string; noun: string; rows: Row[]; setRows: (r: Row[]) => void; multiline?: boolean; placeholder: string; max: number;
}) {
  const edit = (key: number, text: string) => setRows(rows.map((r) => (r.key === key ? { ...r, text } : r)));
  const remove = (key: number) => setRows(rows.length > 1 ? rows.filter((r) => r.key !== key) : [{ key, text: "" }]);
  const add = () => rows.length < max && setRows([...rows, { key: nextKey++, text: "" }]);
  return (
    <fieldset className="recipe-lines">
      <legend>{label}</legend>
      <ol>
        {rows.map((r, i) => (
          <li key={r.key}>
            {multiline ? (
              <Grow name={name} rows={3} value={r.text} maxLength={L.step} placeholder={placeholder} aria-label={`${noun} ${i + 1}`} onChange={(e) => edit(r.key, e.target.value)} />
            ) : (
              <input
                type="text"
                name={name}
                value={r.text}
                maxLength={L.ingredient}
                placeholder={placeholder}
                aria-label={`${noun} ${i + 1}`}
                onChange={(e) => edit(r.key, e.target.value)}
                onKeyDown={(e) => {
                  // Enter adds the next line instead of submitting the whole form.
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const list = e.currentTarget.closest("ol"); // read now: the event is gone by the next frame
                  add();
                  requestAnimationFrame(() => (list?.querySelectorAll("input")[i + 1] as HTMLInputElement | undefined)?.focus());
                }}
              />
            )}
            <button type="button" className="btn btn-quiet recipe-minus" aria-label={`Remove ${noun.toLowerCase()} ${i + 1}`} onClick={() => remove(r.key)}>−</button>
          </li>
        ))}
      </ol>
      <button type="button" className="btn btn-quiet" onClick={add} disabled={rows.length >= max}>+ Add {noun.toLowerCase()}</button>
    </fieldset>
  );
}

// Share a recipe, or edit one (`recipe` given). React clears the form after a submit, so on an error the
// form is remounted (key) from the values the server sent back.
export function RecipeForm({ recipe, knownTags = [] }: { recipe?: Existing; knownTags?: string[] }) {
  const [state, action, pending] = useActionState<RecipeState, FormData>(recipe ? updateRecipe : createRecipe, {});
  const v = state.values ?? recipe;
  return <Inner key={state.error ?? "form"} v={v} recipe={recipe} state={state} action={action} pending={pending} knownTags={knownTags} />;
}

function Inner({ v, recipe, state, action, pending, knownTags }: {
  v: RecipeValues | undefined; recipe?: Existing; state: RecipeState; action: (f: FormData) => void; pending: boolean; knownTags: string[];
}) {
  const [ingredients, setIngredients] = useState(() => rowsFrom(v?.ingredients));
  const [steps, setSteps] = useState(() => rowsFrom(v?.steps));
  const suggestions = [...new Set([...knownTags, ...TAG_SUGGESTIONS])];
  return (
    <form action={action} className="admin-form recipe-form">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <label>Name<input type="text" name="name" required maxLength={L.name} defaultValue={v?.name} placeholder="Red lentil dal" /></label>
      <label>
        A few words about it (optional)
        <Grow name="description" rows={3} maxLength={L.description} defaultValue={v?.description} placeholder="Why you make it, what it's good with, how long it keeps." />
      </label>
      <Lines label="Ingredients" name="ingredient" noun="Ingredient" rows={ingredients} setRows={setIngredients} placeholder="1 cup red lentils, rinsed" max={L.ingredients} />
      <Lines label="Steps" name="step" noun="Step" rows={steps} setRows={setSteps} multiline placeholder="What to do. As long as you need." max={L.steps} />
      <label>
        Tags (separate with commas; make up your own)
        <input type="text" name="tags" list="recipe-tag-list" defaultValue={v?.tags} placeholder="vegan, indian, meal prep" />
        <datalist id="recipe-tag-list">{suggestions.map((t) => <option key={t} value={t} />)}</datalist>
      </label>
      <div className="recipe-source">
        <label>Where it came from (optional)<input type="text" name="sourceText" maxLength={L.sourceText} defaultValue={v?.sourceText} placeholder="Julia Child's shortbread, or my grandmother" /></label>
        <label>Link (optional)<input type="url" name="sourceUrl" defaultValue={v?.sourceUrl} placeholder="https://" /></label>
      </div>
      <label>
        Photo (optional; resized automatically, up to 4 MB)
        <input type="file" name="image" accept="image/*" />
      </label>
      {recipe?.imageUrl && (
        <div className="inline-form">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={recipe.imageUrl} alt="" className="admin-thumb" />
          <label><input type="checkbox" name="removeImage" /> Remove current photo</label>
        </div>
      )}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Saving…" : recipe ? "Save changes" : "Share the recipe"}</button>
    </form>
  );
}
