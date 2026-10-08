"use client";

import { useActionState } from "react";
import { createWallPost, updateWallPost, type PostState } from "./actions";

type Existing = { id: string; url: string; title: string; note: string; kind: string; imageUrl: string | null };

// Share a find, or edit one (`post` given). Kind is guessed from the link unless
// picked. React clears the form after each submit; on an error we refill it.
export function PostForm({ post }: { post?: Existing }) {
  const [state, action, pending] = useActionState<PostState, FormData>(post ? updateWallPost : createWallPost, {});
  const v = state.values ?? post;
  return (
    <form action={action} className="admin-form wall-form" key={state.error ?? "form"}>
      {post && <input type="hidden" name="id" value={post.id} />}
      <label>Link<input type="url" name="url" required defaultValue={v?.url} placeholder="YouTube, Spotify, SoundCloud, a museum page, an image…" /></label>
      <label>Title<input type="text" name="title" required maxLength={120} defaultValue={v?.title} placeholder="The piece, the artist, or both" /></label>
      <label>Why it inspires you (optional)<textarea name="note" rows={4} maxLength={500} defaultValue={v?.note} /></label>
      <label>
        Image (optional; shown when the link has no player, resized automatically, up to 4 MB)
        <input type="file" name="image" accept="image/*" />
      </label>
      {post?.imageUrl && (
        <div className="inline-form">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="" className="admin-thumb" />
          <label><input type="checkbox" name="removeImage" /> Remove current image</label>
        </div>
      )}
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
      <button className="btn" disabled={pending}>{pending ? "Saving…" : post ? "Save changes" : "Post to the Wall"}</button>
    </form>
  );
}
