"""e2e: coming-soon album (REVELATION) on /music and /music/revelation.

Needs a throwaway DB with `npm run db:seed` + `npx tsx scripts/add-revelation-album.ts`, and `npx next start -p 3123`.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_music_coming_soon.py   (screenshots -> docs/mockups/revelation-*.png)
"""

import os
import sys

from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:3123")
TRACKS = [
    "Finally Something", "Viscera", "Maintenance", "New Car", "How am I not myself?",
    "Leave Me Alone", "7 Trumpets", "America", "Good Thing Goin' On", "Revelation",
]
fails = 0


def check(ok, msg):
    global fails
    print(("PASS " if ok else "FAIL ") + msg)
    fails += 0 if ok else 1


with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1366, "height": 1000})
    pg.goto(f"{BASE}/music")
    card = pg.locator(".album-card", has=pg.locator(".album-title", has_text="REVELATION"))
    check(card.count() == 1, "/music lists REVELATION")
    check(card.locator(".album-title").text_content() == "REVELATION", "title stored uppercase")
    check(card.locator(".album-soon").count() == 1 and card.locator(".album-soon").text_content() == "Coming soon", "card has coming-soon marker")
    src = card.locator("img.album-cover").get_attribute("src") or ""
    check("placeholder" in src, f"card uses the placeholder cover ({src[:60]})")
    check(pg.locator(".album-card").first.locator(".album-title").text_content() == "REVELATION", "REVELATION sorts first")
    others = pg.locator(".album-soon").count()
    check(others == 1, f"no other album is marked coming soon ({others})")
    pg.screenshot(path="docs/mockups/revelation-music.png")

    card.click(); pg.wait_for_url("**/music/revelation")
    titles = pg.locator(".tracklist-title").all_text_contents()
    check(titles == TRACKS, f"ten tracks in exact order ({titles})")
    check(pg.locator(".tracklist-dur").count() == 0, "titles only, no durations")
    check(pg.locator(".album-kind .album-soon").count() == 1, "detail page has coming-soon marker")
    check(pg.locator(".listen-links").count() == 0 and pg.get_by_text("Not out yet").count() == 1, "no listen links, says not out yet")
    playable = pg.locator("main audio, main video, main iframe, main button").count()
    check(playable == 0, f"nothing playable on the page ({playable} audio/video/iframe/buttons in main)")
    pg.screenshot(path="docs/mockups/revelation-detail.png", full_page=True)

    # An existing album is unchanged: real cover, no marker, still has listen links.
    pg.goto(f"{BASE}/music/x25")
    check("placeholder" not in (pg.locator("img.album-cover").get_attribute("src") or ""), "existing album keeps its real cover")
    check(pg.locator(".album-soon").count() == 0 and pg.locator(".listen-links li").count() > 0, "existing album: no marker, listen links intact")
    b.close()

print(f"\n{'ALL PASS' if not fails else f'{fails} FAIL(S)'}")
sys.exit(1 if fails else 0)
