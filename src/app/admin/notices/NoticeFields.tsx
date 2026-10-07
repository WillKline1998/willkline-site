import type { Notice } from "@/generated/prisma/client";

// Shared create/edit fields for a bulletin post.
const toLocal = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export function NoticeFields({ n }: { n?: Notice }) {
  return (
    <>
      <label>
        Type
        <select name="kind" defaultValue={n?.kind ?? "NOTE"}>
          <option value="NOTE">Note</option>
          <option value="NEWS">News</option>
          <option value="SHOW">Upcoming show</option>
          <option value="RELEASE">New release</option>
        </select>
      </label>
      <label>Title<input type="text" name="title" required defaultValue={n?.title} /></label>
      <label>Text<textarea name="body" rows={4} defaultValue={n?.body} /></label>
      <label>Date &amp; time (shows / release dates)<input type="datetime-local" name="eventDate" defaultValue={toLocal(n?.eventDate ?? null)} /></label>
      <label>Venue (shows)<input type="text" name="venue" defaultValue={n?.venue ?? ""} /></label>
      <label>Link to (a page like /music/becoming, or a full URL)<input type="text" name="linkHref" defaultValue={n?.linkHref ?? ""} /></label>
      <label>Link text<input type="text" name="linkLabel" placeholder="More →" defaultValue={n?.linkLabel ?? ""} /></label>
      <div className="inline-form">
        <label className="small"><input type="checkbox" name="pinned" defaultChecked={n?.pinned ?? false} /> Pin to top</label>
        <label className="small"><input type="checkbox" name="published" defaultChecked={n?.published ?? true} /> Visible on site</label>
      </div>
    </>
  );
}
