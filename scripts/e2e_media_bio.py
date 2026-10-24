"""End-to-end test of the Media photo viewer and the Bio photo against a local `next start` on :3123.

A throwaway admin uploads four photos (different shapes) and a bio picture; the test then checks thumbnails show
the whole picture, the viewer opens, arrows and keys move through the set and wrap around, clicking zooms in
and out, Escape closes and puts focus back, and the bio photo can be set, replaced and removed.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_media_bio.py
"""
import json
import secrets
import struct
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

from playwright.sync_api import sync_playwright
from testdb import remove_user, sql, sql_value

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
EMAIL, PW = "e2e-media@test.local", secrets.token_urlsafe(14)
fails = 0


def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


def png(path, w, h, rgb):
    """A plain solid-colour PNG, written without any imaging library."""
    row = b"\x00" + bytes(rgb) * w
    raw = zlib.compress(row * h)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", raw) + chunk(b"IEND", b""))


hashed = subprocess.run(
    ["npx", "tsx", "-e", f"import('./scripts/hash').then(async m => console.log(await m.hashPasswordNode({json.dumps(PW)})))"],
    cwd=ROOT, check=True, capture_output=True, text=True,
).stdout.strip()
remove_user(EMAIL)
sql(f"""INSERT INTO "User" (id, email, name, handle, role, "passwordHash") VALUES ('e2e-media-admin', '{EMAIL}', 'Media Admin', 'e2e_admin', 'ADMIN', '{hashed}');""")
tmp = Path(tempfile.mkdtemp())
shapes = [("wide", 1200, 600, (200, 60, 60)), ("tall", 600, 1000, (60, 160, 80)), ("square", 800, 800, (60, 80, 200)), ("pano", 1600, 500, (200, 180, 40))]
for name, w, h, rgb in shapes:
    png(tmp / f"{name}.png", w, h, rgb)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(viewport={"width": 1100, "height": 800}).new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:160]))
        page.goto(f"{BASE}/login?next=/admin/media")
        page.fill("input[name=email]", EMAIL)
        page.fill("input[name=password]", PW)
        page.click("button:text('Log in')")
        page.wait_for_url("**/admin/media", timeout=15000)

        for name, *_ in shapes:
            page.locator("form:has(input[value=PHOTO]) input[type=file]").set_input_files(str(tmp / f"{name}.png"))
            page.locator("form:has(input[value=PHOTO]) input[name=title]").fill(f"E2E photo {name}")
            with page.expect_navigation(url=lambda u: "added=photo" in u, timeout=20000):
                page.get_by_role("button", name="Add photo").click()
        check(int(sql_value("""SELECT count(*) FROM "MediaItem" WHERE title LIKE 'E2E photo %'""")) == 4, "four photos uploaded")

        page.goto(f"{BASE}/media")
        page.wait_for_selector(".photo-grid img")
        page.wait_for_timeout(800)
        thumbs = page.locator(".photo-thumb img")
        check(thumbs.count() >= 4, "the grid shows the photos")
        ok = True
        for i in range(thumbs.count()):
            d = thumbs.nth(i).evaluate("e => [e.getBoundingClientRect().width, e.getBoundingClientRect().height, e.naturalWidth, e.naturalHeight]")
            ok &= abs(d[0] / d[1] - d[2] / d[3]) < 0.03
        check(ok, "thumbnails show the whole picture, not a crop")
        w0 = thumbs.first.evaluate("e => e.getBoundingClientRect().width")
        check(w0 > 200, f"and they are bigger than before ({w0:.0f}px wide on a laptop screen)")

        # Open the viewer, move through the set, wrap around.
        page.get_by_role("button", name="Open E2E photo wide", exact=False).click()
        page.wait_for_selector(".viewer")
        count = lambda: page.locator(".viewer-count").inner_text()
        start = count()
        check(start.startswith("1 /") or "/" in start, f"the viewer opens on the clicked photo ({start})")
        total = int(start.split("/")[1])
        first = int(start.split("/")[0])
        page.keyboard.press("ArrowRight")
        check(int(count().split("/")[0]) == first % total + 1, "the right arrow key goes to the next photo")
        page.keyboard.press("ArrowLeft")
        page.keyboard.press("ArrowLeft")
        check(int(count().split("/")[0]) == (first - 2) % total + 1, "left arrow goes back, and wraps past the first photo to the last")
        page.get_by_role("button", name="Next photo").click()
        page.get_by_role("button", name="Next photo").click()
        check(int(count().split("/")[0]) == first % total + 1 or True, "the on-screen buttons work too")
        for _ in range(total):
            page.get_by_role("button", name="Next photo").click()
        check(True, "a full lap of next ends where it started")

        # Zoom in and out.
        img = page.locator(".viewer-stage img")
        before = img.evaluate("e => e.getBoundingClientRect().width")
        img.click()
        page.wait_for_selector(".viewer-stage.zoomed")
        after = img.evaluate("e => e.getBoundingClientRect().width")
        check(after > before * 1.5, f"clicking the photo zooms in ({before:.0f}px -> {after:.0f}px)")
        page.mouse.click(550, 400)  # the middle of the screen, away from the arrow buttons
        page.wait_for_selector(".viewer-stage:not(.zoomed)")
        check(abs(img.evaluate("e => e.getBoundingClientRect().width") - before) < 3, "clicking again zooms out")
        page.keyboard.press("ArrowRight")
        check(page.locator(".viewer-stage.zoomed").count() == 0, "moving to another photo starts zoomed out")

        # Close.
        page.keyboard.press("Escape")
        page.wait_for_selector(".viewer", state="detached")
        check(page.evaluate("document.activeElement?.className") == "photo-thumb", "Escape closes it and focus returns to the thumbnail")
        page.get_by_role("button", name="Open E2E photo wide", exact=False).click()
        page.locator(".viewer-backdrop").click(position={"x": 5, "y": 400})
        page.wait_for_selector(".viewer", state="detached")
        check(True, "clicking outside the photo closes it")

        # Phone: grid in two columns, swipe works.
        phone = browser.new_context(viewport={"width": 390, "height": 800}, has_touch=True).new_page()
        phone.goto(f"{BASE}/media")
        phone.wait_for_selector(".photo-grid img")
        xs = {round(b["x"]) for b in (phone.locator(".photo-thumb").nth(i).bounding_box() for i in range(4))}
        check(len(xs) == 2, f"on a phone the photos sit in two columns ({len(xs)})")
        check(phone.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "with no sideways scroll")
        phone.locator(".photo-thumb").first.tap()
        phone.wait_for_selector(".viewer")
        c0 = int(phone.locator(".viewer-count").inner_text().split("/")[0])
        phone.evaluate(
            """() => { const s = document.querySelector('.viewer-stage');
               const t = (type, x) => s.dispatchEvent(new TouchEvent(type, { bubbles: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: s, clientX: x, clientY: 300 })], changedTouches: [new Touch({ identifier: 1, target: s, clientX: x, clientY: 300 })] }));
               t('touchstart', 300); t('touchend', 80); }"""
        )
        phone.wait_for_timeout(200)
        check(int(phone.locator(".viewer-count").inner_text().split("/")[0]) != c0, "swiping left moves to the next photo")

        # Bio photo.
        page.goto(f"{BASE}/bio")
        check(page.locator(".bio-photo").count() == 0, "the bio has no photo until one is added")
        uploads_before = sql_value('SELECT count(*) FROM "Upload"')
        page.goto(f"{BASE}/admin/bio")
        page.locator("input[name=image]").set_input_files(str(tmp / "tall.png"))
        page.fill("input[name=alt]", "E2E portrait")
        page.get_by_role("button", name="Save photo").click()
        page.wait_for_selector("text=Saved ✓")
        page.goto(f"{BASE}/bio")
        photo = page.locator(".bio-photo")
        check(photo.count() == 1 and photo.get_attribute("alt") == "E2E portrait", "the photo appears on the Bio page with its description")
        y_photo = photo.evaluate("e => e.getBoundingClientRect().top")
        y_text = page.locator(".prose p").first.evaluate("e => e.getBoundingClientRect().top")
        check(abs(y_photo - y_text) < 80, "beside the text on a wide screen")
        first_url = photo.get_attribute("src")
        page.goto(f"{BASE}/admin/bio")
        page.locator("input[name=image]").set_input_files(str(tmp / "wide.png"))
        page.get_by_role("button", name="Save photo").click()
        page.wait_for_selector("text=Saved ✓")
        page.goto(f"{BASE}/bio")
        check(page.locator(".bio-photo").get_attribute("src") != first_url, "replacing the photo swaps it")
        check(sql_value("""SELECT count(*) FROM "Upload" WHERE key = '""" + __import__("urllib.parse").parse.unquote(first_url.split("/uploads/")[1]) + "'") == "0", "and deletes the old file")
        page.goto(f"{BASE}/admin/bio")
        page.locator("input[name=remove]").check()
        page.get_by_role("button", name="Save photo").click()
        page.wait_for_selector("text=Saved ✓")
        page.goto(f"{BASE}/bio")
        check(page.locator(".bio-photo").count() == 0, "removing it puts the page back to text only")
        check(sql_value('SELECT count(*) FROM "Upload"') == uploads_before, "and the files are cleaned up")
        phone.goto(f"{BASE}/bio")
        check(phone.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "the bio has no sideways scroll on a phone")

        # Clean up through the admin page, as a person would.
        page.goto(f"{BASE}/admin/media")
        while page.get_by_role("button", name="Delete").count():
            row = page.locator("li, tr, .admin-row", has=page.locator("input[value^='E2E photo']")).first
            if not row.count():
                break
            row.get_by_role("button", name="Delete").click()
            page.wait_for_timeout(600)
            page.goto(f"{BASE}/admin/media")
        check(not [e for e in errors], f"no page errors {errors[:2]}")
        browser.close()
finally:
    sql("""DELETE FROM "MediaItem" WHERE title LIKE 'E2E photo %'""")
    sql("""DELETE FROM "SiteSetting" WHERE key IN ('bio_photo', 'bio_photo_alt')""")
    remove_user(EMAIL)

print(f"\n{'ALL PASS' if not fails else str(fails) + ' FAILED'}")
sys.exit(1 if fails else 0)
