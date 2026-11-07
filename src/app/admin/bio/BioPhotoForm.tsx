"use client";

import { useActionState } from "react";
import { saveBioPhoto, saveHomePhoto } from "../content-actions";

// The photo shown at the top of the Bio page. Choose a new one to replace it, or tick Remove.
// `slot="home"` reuses it for the homepage picture above the first bulletin post.
export function BioPhotoForm({
  url,
  alt,
  slot = "bio",
}: {
  url: string;
  alt: string;
  slot?: "bio" | "home";
}) {
  const [state, action, pending] = useActionState(
    slot === "home" ? saveHomePhoto : saveBioPhoto,
    {},
  );
  const home = slot === "home";
  return (
    <form action={action} className="admin-form" style={{ maxWidth: "none" }}>
      <h2 className="section-label">
        {home
          ? "Picture above the first bulletin post"
          : "Photo at the top of the page"}
      </h2>
      {url ? (
        <div className="inline-form">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={
              alt || (home ? "Current homepage picture" : "Current bio photo")
            }
            className="admin-thumb"
          />
          <label>
            <input type="checkbox" name="remove" /> Remove this photo
          </label>
        </div>
      ) : (
        <p className="small muted">
          {home
            ? "No picture yet. The homepage goes straight to the bulletin."
            : "No photo yet. The page shows just the text."}
        </p>
      )}
      <label>
        {url ? "Replace it with" : "Choose a photo"} (resized automatically, up
        to 4 MB)
        <input type="file" name="image" accept="image/*" />
      </label>
      <label>
        Describe it for people who can&apos;t see it (optional, e.g. “Will
        playing bass on stage”)
        <input type="text" name="alt" maxLength={200} defaultValue={alt} />
      </label>
      {state.error && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p className="small" role="status">
          Saved ✓
        </p>
      )}
      <button className="btn" disabled={pending}>
        {pending ? "Saving…" : "Save photo"}
      </button>
    </form>
  );
}
