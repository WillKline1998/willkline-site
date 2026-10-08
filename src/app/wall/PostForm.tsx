"use client";

import { useActionState } from "react";
import { createWallPost, type PostState } from "./actions";

// Share a find. Kind is guessed from the link unless the member picks one.
// React clears the form after each submit; on an error we refill it from state.
export function PostForm() {
  const [state, action, pending] = useActionState<PostState, FormData>(createWallPost, {});
  const v = state.values;
  return (
    <form action={action} className="admin-form wall-form" key={state.error ?? "form"}>
      <label>Link<input type="url" name="url" required defaultValue={v?.url} placeholder="YouTube, Spotify, SoundCloud, an image, a gallery page…" /></label>
      <label>Title<input type="text" name="title" required maxLength={120} defaultValue={v?.title} placeholder="The piece, the artist, or both" /></label>
      <label>Why it inspires you (optional)<textarea name="note" rows={2} maxLength={500} defaultValue={v?.note} /></label>
      <label>
        Kind
        <select name="kind" defaultValue={v?.kind ?? ""}>
          <option value="">Guess from the link</option>
          <option value="MUSIC">Music</option>
          <option value="VIDEO">Video</option>
          <option value="ART">Art</option>
          <option value="OTHER">Other</option>
        </select>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.ok && !pending && <p className="small" role="status">Posted ✓</p>}
      <button className="btn" disabled={pending}>{pending ? "Posting…" : "Post to the Wall"}</button>
    </form>
  );
}
