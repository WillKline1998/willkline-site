"use client";

import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useActionState, useRef, useState } from "react";
import { RECIPE_LIMITS as L, TAG_SUGGESTIONS } from "@/lib/recipes";
import { createRecipe, updateRecipe, type RecipeState, type RecipeValues } from "./actions";

type Existing = RecipeValues & { id: string; imageUrl: string | null };
type Row = { key: number; text: string };

let nextKey = 1;
/** Keep a dragged row in its column: it only moves up and down. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });
const rowsFrom = (lines: string[] | undefined): Row[] => (lines?.length ? lines : [""]).map((text) => ({ key: nextKey++, text }));

/** A textarea that grows with what you type, so nobody has to scroll inside a box. */
function Grow(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fit = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  return <textarea ref={(el) => { if (el) fit(el); }} {...props} onInput={(e) => fit(e.currentTarget)} />;
}

/** One row in a list: a drag handle, the text, and a minus. Dragging only starts from the handle, so typing and selecting text still work. */
function SortableRow({ row, index, noun, name, multiline, placeholder, onEdit, onRemove, onEnter }: {
  row: Row; index: number; noun: string; name: string; multiline?: boolean; placeholder: string;
  onEdit: (text: string) => void; onRemove: () => void; onEnter: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: row.key });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 5 : undefined };
  const keys = (e: React.KeyboardEvent) => {
    // Enter starts the next line (or step); in a step, Shift+Enter still gives a line break.
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    onEnter();
  };
  return (
    <li ref={setNodeRef} style={style} className={isDragging ? "recipe-row dragging" : "recipe-row"}>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="recipe-handle"
        aria-label={`Drag to move ${noun.toLowerCase()} ${index + 1}. With the keyboard: press space, use the arrow keys, press space again.`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden>⋮⋮</span>
      </button>
      {multiline ? (
        <Grow name={name} rows={3} value={row.text} maxLength={L.step} placeholder={placeholder} aria-label={`${noun} ${index + 1}`} onChange={(e) => onEdit(e.target.value)} onKeyDown={keys} />
      ) : (
        <input type="text" name={name} value={row.text} maxLength={L.ingredient} placeholder={placeholder} aria-label={`${noun} ${index + 1}`} onChange={(e) => onEdit(e.target.value)} onKeyDown={keys} />
      )}
      <button type="button" className="btn btn-quiet recipe-minus" aria-label={`Remove ${noun.toLowerCase()} ${index + 1}`} onClick={onRemove}>−</button>
    </li>
  );
}

/** A list the author builds line by line: Enter adds the next one right below, the handle reorders, − removes. */
function Lines({ label, name, noun, rows, setRows, multiline, placeholder, max }: {
  label: string; name: string; noun: string; rows: Row[]; setRows: (r: Row[]) => void; multiline?: boolean; placeholder: string; max: number;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const listRef = useRef<HTMLOListElement>(null);
  const edit = (key: number, text: string) => setRows(rows.map((r) => (r.key === key ? { ...r, text } : r)));
  const remove = (key: number) => setRows(rows.length > 1 ? rows.filter((r) => r.key !== key) : [{ key, text: "" }]);
  const focusRow = (i: number) =>
    requestAnimationFrame(() => (listRef.current?.querySelectorAll<HTMLElement>(multiline ? "textarea" : "input[type=text]")[i])?.focus());
  const insertAfter = (i: number) => {
    if (rows.length >= max) return;
    const next = [...rows];
    next.splice(i + 1, 0, { key: nextKey++, text: "" });
    setRows(next);
    focusRow(i + 1);
  };
  const add = () => insertAfter(rows.length - 1);
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) setRows(arrayMove(rows, rows.findIndex((r) => r.key === active.id), rows.findIndex((r) => r.key === over.id)));
  };
  return (
    <fieldset className="recipe-lines">
      <legend>{label}</legend>
      <DndContext id={`dnd-${name}`} sensors={sensors} collisionDetection={closestCenter} modifiers={[verticalOnly]} onDragEnd={onDragEnd}>
        <SortableContext items={rows.map((r) => r.key)} strategy={verticalListSortingStrategy}>
          <ol ref={listRef}>
            {rows.map((r, i) => (
              <SortableRow
                key={r.key}
                row={r}
                index={i}
                noun={noun}
                name={name}
                multiline={multiline}
                placeholder={placeholder}
                onEdit={(t) => edit(r.key, t)}
                onRemove={() => remove(r.key)}
                onEnter={() => insertAfter(i)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
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
