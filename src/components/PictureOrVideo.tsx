// Admin form field: a post gets ONE optional lead item, a picture (uploaded)
// or a video (link to YouTube/Vimeo/etc.), never both. The radio decides
// which input counts; the server action enforces it.
export function PictureOrVideo({ kind, url }: { kind?: string | null; url?: string | null }) {
  const current = kind === "IMAGE" ? "image" : kind === "VIDEO" ? "video" : "none";
  return (
    <fieldset className="pov">
      <legend>Picture or video (optional, one or the other)</legend>
      <label className="pov-choice"><input type="radio" name="media" value="none" defaultChecked={current === "none"} /> None</label>

      <label className="pov-choice"><input type="radio" name="media" value="image" defaultChecked={current === "image"} /> Picture</label>
      <div className="pov-detail">
        {kind === "IMAGE" && url && (
          <span className="pov-current">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="admin-thumb" /> Current picture (choose a file to replace it)
          </span>
        )}
        <input type="file" name="image" accept="image/*" aria-label="Picture file" />
      </div>

      <label className="pov-choice"><input type="radio" name="media" value="video" defaultChecked={current === "video"} /> Video link</label>
      <div className="pov-detail">
        <input type="url" name="video" defaultValue={kind === "VIDEO" ? url ?? "" : ""} placeholder="https://www.youtube.com/watch?v=…" aria-label="Video link" />
      </div>
    </fieldset>
  );
}
