"""End-to-end test of the Cleanup Map against a local `next start` on :3123.

A throwaway member signs in and draws routes in all three modes (straight, street-snapped, freehand), saves
one, and the test checks what was actually stored: the start and end are cut off on the SERVER (even if the
page is tampered with), distances add up in the totals, the public data has no email, and a bad route is
refused in words. Everything created is removed afterwards.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_cleanup.py
"""
import json
import secrets
import subprocess
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright
from testdb import remove_user, sql, sql_value

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
EMAIL, HANDLE, PW = "e2e-cleanup@test.local", "e2e_sweeper", secrets.token_urlsafe(14)
fails = 0


def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


def make_user():
    hashed = subprocess.run(
        ["npx", "tsx", "-e", f"import('./scripts/hash').then(async m => console.log(await m.hashPasswordNode({json.dumps(PW)})))"],
        cwd=ROOT, check=True, capture_output=True, text=True,
    ).stdout.strip()
    remove_user(EMAIL)
    sql(
        f"""INSERT INTO "User" (id, email, name, handle, role, "passwordHash") VALUES ('e2e-cleanup-user', '{EMAIL}', 'Sweep Test', '{HANDLE}', 'MEMBER', '{hashed}');"""
    )


def canvas_points(page, selector, points):
    box = page.locator(selector).bounding_box()
    return [(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy) for fx, fy in points]


def tap(page, x, y):
    page.mouse.click(x, y)
    page.wait_for_timeout(250)


def distance_text(page):
    return page.get_by_test_id("distance").inner_text()


make_user()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        page = browser.new_context(viewport={"width": 1100, "height": 1500}).new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:160]))

        # Signed out: the public page works, the drawing page asks you to log in.
        page.goto(f"{BASE}/cleanup")
        check("Cleanup Map" in page.locator("h1").inner_text(), "the public page loads")
        check(page.locator(".cleanup-map canvas").count() == 1, "with a globe on it")
        page.goto(f"{BASE}/cleanup/new")
        check("/login" in page.url, "adding one sends a signed-out visitor to log in")

        # Log in.
        page.goto(f"{BASE}/login?next=/cleanup/new")
        page.fill("input[name=email]", EMAIL)
        page.fill("input[name=password]", PW)
        page.click("button:text('Log in')")
        page.wait_for_url("**/cleanup/new", timeout=15000)
        page.wait_for_selector(".drawer-map canvas")
        page.wait_for_timeout(3500)  # let the map style load

        # Straight lines: four taps about 2 km apart make a route of several km.
        page.get_by_role("radio", name="Straight lines").click()
        pts = canvas_points(page, ".drawer-map", [(0.2, 0.3), (0.45, 0.6), (0.7, 0.3), (0.9, 0.55)])
        for x, y in pts:
            tap(page, x, y)
        text = distance_text(page)
        check("mi" in text and "Tap the map" not in text, f"straight lines measure a distance ({text})")
        check(page.get_by_role("button", name="Add to the map").is_enabled(), "and the save button wakes up")
        page.get_by_role("button", name="Undo").click()
        page.wait_for_timeout(200)
        shorter = distance_text(page)
        check(shorter != text, f"undo takes the last piece back ({text} -> {shorter})")
        tap(page, *pts[3])
        page.get_by_role("button", name="Clear").click()
        page.wait_for_timeout(200)
        check("Tap the map" in distance_text(page), "clear empties it")

        # Follow streets: tap two nearby spots; the line snaps if the router answers, else it says so.
        page.get_by_role("radio", name="Follow streets").click()
        a, b = canvas_points(page, ".drawer-map", [(0.4, 0.5), (0.55, 0.5)])
        tap(page, *a)
        tap(page, *b)
        page.wait_for_function("!document.querySelector('.drawer-bar [role=status]')", timeout=20000)
        snapped = distance_text(page)
        note = page.locator(".form-note").all_inner_texts()
        check("mi" in snapped and "Tap the map" not in snapped, f"follow-streets still gives a distance ({snapped}; note: {note[:1]})")
        page.get_by_role("button", name="Clear").click()

        # Freehand: press, drag, release.
        page.get_by_role("radio", name="Freehand").click()
        start, *rest = canvas_points(page, ".drawer-map", [(0.2, 0.7), (0.3, 0.6), (0.45, 0.65), (0.6, 0.55), (0.75, 0.6), (0.85, 0.5)])
        page.mouse.move(*start)
        page.mouse.down()
        for x, y in rest:
            page.mouse.move(x, y, steps=12)
        page.mouse.up()
        page.wait_for_timeout(300)
        free = distance_text(page)
        check("mi" in free and "Tap the map" not in free, f"freehand drawing measures a distance ({free})")

        # Save this one with the privacy box ticked (the default).
        page.fill("input[name=title]", "E2E freehand route")
        page.fill("input[name=bags]", "3")
        check(page.locator("input[name=hideEnds]").is_checked(), "start and end are hidden by default")
        drawn_json = page.locator("input[name=route]").input_value()
        drawn = json.loads(drawn_json)
        page.get_by_role("button", name="Add to the map").click()
        page.wait_for_url("**/cleanup?added=1", timeout=15000)
        check("Added." in page.locator("[role=status]").first.inner_text(), "saving goes to the map with a thank-you")

        row = sql_value(
            """SELECT "distanceM" || '|' || "trimmedM" || '|' || bags || '|' || jsonb_array_length(route) FROM "Cleanup" WHERE title='E2E freehand route'"""
        )
        stored_m, trimmed, bags, npts = (int(x) for x in row.split("|"))
        import math

        def hav(a, b):
            r = 6371008.8
            d1, d2 = math.radians(b[1] - a[1]), math.radians(b[0] - a[0])
            h = math.sin(d1 / 2) ** 2 + math.cos(math.radians(a[1])) * math.cos(math.radians(b[1])) * math.sin(d2 / 2) ** 2
            return 2 * r * math.asin(math.sqrt(h))

        drawn_m = sum(hav(drawn[i - 1], drawn[i]) for i in range(1, len(drawn)))
        check(trimmed == 150 and bags == 3, f"stored with 150 m hidden at each end and 3 bags (trimmed={trimmed}, bags={bags})")
        check(abs((drawn_m - stored_m) - 300) < 40, f"about 300 m shorter than drawn: drawn {drawn_m:.0f} m, stored {stored_m} m")
        first = json.loads(sql_value("""SELECT route->0 FROM "Cleanup" WHERE title='E2E freehand route'"""))
        check(hav(first, drawn[0]) > 140, f"the stored line does not start where the drawing did ({hav(first, drawn[0]):.0f} m away)")

        # The public data carries the name people chose and nothing private.
        data = urllib.request.urlopen(f"{BASE}/cleanup/routes").read().decode()
        check("E2E freehand route" in data and EMAIL not in data and "passwordHash" not in data, "public data has the route and no email or hash")
        page.reload()
        stat = page.locator(".cleanup-stats").inner_text()
        check("bags filled" in stat.lower(), "the totals band shows bags")

        # A tampered page cannot skip the privacy rule or smuggle in a bad route.
        page.goto(f"{BASE}/cleanup/new")
        page.wait_for_selector(".drawer-map canvas")
        page.fill("input[name=title]", "E2E tampered")
        def tamper(route):
            """Put a route straight into the hidden field and submit the form, as a modified page could."""
            page.evaluate(
                "(route) => { const f = document.querySelector('.cleanup-form'); f.querySelector('input[name=route]').value = route; f.requestSubmit(); }",
                json.dumps(route),
            )

        tamper([[0, 0], [200, 1]])
        page.wait_for_selector(".form-error")
        check("not on Earth" in page.locator(".form-error").inner_text(), "a route with an impossible point is refused in words")
        tamper([[-81.69, 41.5], [-81.6895, 41.5004]])
        page.wait_for_function("document.querySelector('.form-error')?.innerText.includes('too short')")
        check(sql_value("""SELECT count(*) FROM "Cleanup" WHERE title='E2E tampered'""") == "0", "a walk too short to hide its ends is refused and nothing is saved")

        check(not [e for e in errors if "Worker" in e or "WebGL" in e], f"no page errors {errors[:2]}")
        browser.close()
finally:
    remove_user(EMAIL)  # the user's clean-ups go with it (cascade)

print(f"\n{'ALL PASS' if not fails else str(fails) + ' FAILED'}")
sys.exit(1 if fails else 0)
