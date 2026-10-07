// Turns a pasted URL into something the page can render faithfully.
// Only well-known providers get an <iframe>; everything else degrades to a
// link card, so a pasted URL can never inject an arbitrary embed.

export type Embed =
  | { kind: "iframe"; provider: string; src: string; aspect: "video" | "audio-tall" | "audio-short" }
  | { kind: "video"; src: string }
  | { kind: "link"; href: string; host: string };

export function toEmbed(raw: string): Embed {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { kind: "link", href: raw, host: raw };
  }
  const host = u.hostname.replace(/^www\./, "");

  // YouTube (watch, youtu.be, shorts) → privacy-enhanced embed
  const yt =
    host === "youtu.be" ? u.pathname.slice(1)
    : host.endsWith("youtube.com") && u.pathname === "/watch" ? u.searchParams.get("v")
    : host.endsWith("youtube.com") && u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2]
    : null;
  if (yt && /^[\w-]{6,}$/.test(yt))
    return { kind: "iframe", provider: "YouTube", src: `https://www.youtube-nocookie.com/embed/${yt}`, aspect: "video" };

  // Vimeo
  const vimeo = host === "vimeo.com" ? u.pathname.match(/^\/(\d+)/)?.[1] : null;
  if (vimeo) return { kind: "iframe", provider: "Vimeo", src: `https://player.vimeo.com/video/${vimeo}`, aspect: "video" };

  // Spotify album/track/playlist
  const sp = host === "open.spotify.com" ? u.pathname.match(/^\/(album|track|playlist|episode)\/(\w+)/) : null;
  if (sp)
    return {
      kind: "iframe",
      provider: "Spotify",
      src: `https://open.spotify.com/embed/${sp[1]}/${sp[2]}`,
      aspect: sp[1] === "track" ? "audio-short" : "audio-tall",
    };

  // SoundCloud tracks/sets
  if (host === "soundcloud.com")
    return {
      kind: "iframe",
      provider: "SoundCloud",
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.origin + u.pathname)}&color=%23c2410c&visual=false`,
      aspect: u.pathname.includes("/sets/") ? "audio-tall" : "audio-short",
    };

  // Direct video files
  if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: "video", src: raw };

  return { kind: "link", href: raw, host };
}

export const fileName = (url: string) => decodeURIComponent(url.split("?")[0].split("/").pop() || url);
export const isPdf = (url: string) => /\.pdf($|\?)/i.test(url);
