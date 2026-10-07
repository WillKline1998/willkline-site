"""Enrich prisma/seed-data/music.json with local cover art + per-platform links.

DistroKid release pages (hyperfollow/willkline/<slug>) carry a signed 800px cover
and the store links; SoundCloud sets use the oEmbed thumbnail. Covers are saved
to public/covers/<slug>.jpg so the site never depends on someone else's CDN.

Run: python3 scripts/fetch_catalog.py   (stdlib only; safe to re-run)
"""
import html, json, re, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "prisma/seed-data/music.json"
COVERS = ROOT / "public/covers"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh) willkline.net catalog sync"}

PLATFORMS = {
    "spotify": r"https://open\.spotify\.com/(?:album|track)/[A-Za-z0-9]+",
    "apple": r"https://music\.apple\.com/[^\s\"'<>]+",
    "youtube": r"https://music\.youtube\.com/[^\s\"'<>]+",
    "amazon": r"https://music\.amazon\.com/[^\s\"'<>]+",
    "deezer": r"https://www\.deezer\.com/[^\s\"'<>]+",
    "tidal": r"https://(?:listen\.)?tidal\.com/[^\s\"'<>]+",
    "bandcamp": r"https://[a-z0-9-]+\.bandcamp\.com/(?:album|track)/[^\s\"'<>]+",
}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
        return r.read()


def slugify(s: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", s.lower()))


def main() -> None:
    data = json.loads(DATA.read_text())
    COVERS.mkdir(parents=True, exist_ok=True)
    for r in data["releases"]:
        slug = slugify(r["title"])
        cover_url = None
        try:
            if "hyperfollow" in r["links"]:
                page = html.unescape(get(r["links"]["hyperfollow"]).decode("utf-8", "ignore"))
                covers = re.findall(r"https://distrokid\.imgix\.net/[^\s\"'<>]+", page)
                clean = [c for c in covers if "w=800" in c and "mark=" not in c and "hyperfollowicons" not in c]
                cover_url = clean[0] if clean else None
                for name, pat in PLATFORMS.items():
                    m = re.search(pat, page)
                    if m and name not in r["links"]:
                        r["links"][name] = m.group(0)
            elif "soundcloud" in r["links"]:
                o = json.loads(get("https://soundcloud.com/oembed?format=json&url=" + urllib.parse.quote(r["links"]["soundcloud"], safe="")))
                cover_url = (o.get("thumbnail_url") or "").replace("-t500x500", "-t500x500")
            if cover_url:
                (COVERS / f"{slug}.jpg").write_bytes(get(cover_url))
                r["cover"] = f"/covers/{slug}.jpg"
            print(f"ok   {r['title']}: cover={'yes' if cover_url else 'no'} links={sorted(r['links'])}")
        except Exception as e:  # keep going; one bad page shouldn't sink the batch
            print(f"FAIL {r['title']}: {e}")
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
