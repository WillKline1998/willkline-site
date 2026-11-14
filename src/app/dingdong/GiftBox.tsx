"use client";

import { useActionState, useState } from "react";
import { GIFT_LIMITS, VOCAB, VOCAB_GROUPS, type VocabGroup } from "@/lib/dingdong-vocab";
import { giveWords, type GiftState } from "./actions";

// "Leave DingDong a word": tap up to 3 words from a fixed list. All chips stay in the form (only the chosen
// group is visible), so picks survive switching groups. No free text anywhere.
export function GiftBox({ waiting }: { waiting: number }) {
  const [state, action, pending] = useActionState<GiftState, FormData>(giveWords, {});
  return (
    <section className="dd-gift" aria-labelledby="dd-gift-title">
      <h2 id="dd-gift-title" className="dd-gift-title">
        Leave DingDong a word
      </h2>
      <p className="small muted dd-gift-note">
        Pick up to {GIFT_LIMITS.wordsPerGift}. He reads a few gifts each morning and might ignore yours. He&apos;s picky.
        {waiting > 0 && <> {waiting === 1 ? "One gift is" : `${waiting} gifts are`} waiting by his door.</>}
      </p>
      <form action={action}>
        <label className="hp" aria-hidden>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
        {/* A successful gift remounts the picker (cleared); an error keeps the visitor's picks. */}
        <Picker key={state.sent ?? 0} pending={pending} />
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="small dd-gift-ok" role="status">
            {state.ok}
          </p>
        )}
      </form>
    </section>
  );
}

function Picker({ pending }: { pending: boolean }) {
  const [group, setGroup] = useState<VocabGroup>("instruments");
  const [picked, setPicked] = useState<string[]>([]);
  const full = picked.length >= GIFT_LIMITS.wordsPerGift;
  const toggle = (w: string) => setPicked((p) => (p.includes(w) ? p.filter((x) => x !== w) : full ? p : [...p, w]));
  return (
    <>
      <div className="dd-gift-tabs" role="tablist" aria-label="Kinds of words">
        {VOCAB_GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={group === g.key}
            className="dd-gift-tab"
            data-group={g.key}
            onClick={() => setGroup(g.key)}
          >
            {g.label}
          </button>
        ))}
      </div>
      {VOCAB_GROUPS.map((g) => (
        <div key={g.key} className="dd-words" role="tabpanel" hidden={group !== g.key} data-group={g.key}>
          {VOCAB[g.key].map((w) => {
            const on = picked.includes(w);
            return (
              <label key={w} className="dd-word" data-on={on ? "1" : undefined} data-off={!on && full ? "1" : undefined}>
                <input type="checkbox" name="word" value={w} checked={on} disabled={!on && full} onChange={() => toggle(w)} />
                {w}
              </label>
            );
          })}
        </div>
      ))}
      <div className="dd-gift-bar">
        <span className="small dd-gift-picked" aria-live="polite">
          {picked.length ? picked.join(" · ") : <span className="muted">Nothing picked yet</span>}
        </span>
        <button className="btn dd-gift-send" disabled={pending || !picked.length}>
          {pending ? "Leaving it…" : "Leave it by his door"}
        </button>
      </div>
    </>
  );
}
