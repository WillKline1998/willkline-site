"""End-to-end test of the Inspiration Wall against a local `next start` on :3123.

Two throwaway members + a throwaway admin exercise sign-up (incl. bot traps),
posting, filters, saving/collections, permissions, reporting/moderation, and the
sign-up switch. Everything created is removed afterwards.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_wall.py
"""
import os, secrets, subprocess, sys, tempfile, time, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from testdb import remove_user, sql, sql_value

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
ADMIN, APW = "e2e-wall-admin@test.local", secrets.token_urlsafe(18)
A = {"name": "Ada Test", "handle": "e2e_ada", "email": "e2e-ada@test.local", "pw": secrets.token_urlsafe(12)}
B = {"name": "Bo Test", "handle": "e2e_bo", "email": "e2e-bo@test.local", "pw": secrets.token_urlsafe(12)}
YT = "https://www.youtube.com/watch?v=P4uPK809WlM"
fails = 0


def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


def signup(pg, m, wait=3.3, honeypot=False):
    pg.goto(f"{BASE}/signup")
    pg.fill("input[name=name]", m["name"]); pg.fill("input[name=handle]", m["handle"])
    pg.fill("input[name=email]", m["email"]); pg.fill("input[name=password]", m["pw"])
    if honeypot:
        pg.evaluate("document.querySelector('input[name=website]').value = 'spam.example'")
    time.sleep(wait)
    pg.click("button:text('Create account')")


previous_mode = sql_value("""SELECT value FROM "SiteSetting" WHERE key = 'wall_signups';""")
subprocess.run(["npm", "run", "-s", "admin:create"], cwd=ROOT, check=True, capture_output=True,
               env={**os.environ, "ADMIN_EMAIL": ADMIN, "ADMIN_PASSWORD": APW})
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        admin, a, bo, anon = (b.new_context().new_page() for _ in range(4))

        # --- admin opens sign-ups ---
        admin.goto(f"{BASE}/login"); admin.fill("input[name=email]", ADMIN); admin.fill("input[name=password]", APW)
        admin.click("button:text('Log in')"); admin.wait_for_url("**/admin")
        admin.goto(f"{BASE}/admin/wall")
        if admin.get_by_role("button", name="Open sign-ups").count():
            admin.click("button:text('Open sign-ups')"); admin.wait_for_selector("button:text('Close sign-ups')")
        check(admin.get_by_text("Open", exact=True).count() >= 1, "admin can open sign-ups")

        # --- sign-up + bot traps ---
        signup(a, A, wait=0)
        a.wait_for_selector(".form-error")
        check("fast" in a.locator(".form-error").inner_text(), "instant submit is rejected (bot timing trap)")
        signup(a, A, honeypot=True)
        a.wait_for_selector(".form-error")
        check(sql_value(f"""SELECT count(*) FROM "User" WHERE email = '{A['email']}';""") == "0", "honeypot blocks sign-up")
        signup(a, A); a.wait_for_url("**/wall?welcome=1")
        check(a.get_by_text("Welcome, Ada Test").count() == 1, "member A signs up and lands on the Wall")
        signup(bo, {**B, "handle": A["handle"]}); bo.wait_for_selector(".form-error")
        check("taken" in bo.locator(".form-error").inner_text(), "duplicate handle rejected")
        signup(bo, B); bo.wait_for_url("**/wall?welcome=1")
        check(True, "member B signs up")

        # --- posting ---
        a.click("summary:text('+ Share something')") if not a.locator("form.wall-form").is_visible() else None
        a.fill("form.wall-form input[name=url]", YT)
        a.fill("form.wall-form input[name=title]", "E2E Edgar Meyer Bach")
        a.fill("form.wall-form textarea[name=note]", "Bass playing at its most singing.")
        a.click("button:text('Post to the Wall')"); a.wait_for_selector("text=Posted ✓")
        anon.goto(f"{BASE}/wall")
        card = anon.locator(".wall-card", has_text="E2E Edgar Meyer Bach")
        check(card.count() == 1 and card.locator("iframe[src*='youtube-nocookie.com']").count() == 1, "post appears publicly with a player")
        check(card.get_by_text("Video", exact=True).count() == 1, "kind guessed from link (Video)")
        anon.goto(f"{BASE}/wall?kind=MUSIC")
        check(anon.get_by_text("E2E Edgar Meyer Bach").count() == 0, "Music filter excludes it")
        anon.goto(f"{BASE}/wall?kind=VIDEO")
        check(anon.get_by_text("E2E Edgar Meyer Bach").count() == 1, "Video filter includes it")
        anon.goto(f"{BASE}/wall")
        check(anon.locator(".wall-card", has_text="E2E Edgar").locator("a:text('☆ Save')").count() == 1, "logged-out Save asks to log in")

        # --- saving / collections / permissions ---
        bo.goto(f"{BASE}/wall")
        bcard = bo.locator(".wall-card", has_text="E2E Edgar Meyer Bach")
        check(bcard.locator("button:text('Delete')").count() == 0, "others can't delete A's post")
        bcard.locator("button:text('☆ Save')").click(); bo.wait_for_selector(".wall-card:has-text('E2E Edgar') button:text('★ Saved')")
        check(bo.locator(".wall-card", has_text="E2E Edgar").locator(".save-count").inner_text() == "1", "save count = 1")
        anon.goto(f"{BASE}/wall/u/{B['handle']}")
        check(anon.locator("h2:text('Collection (1)')").count() == 1 and anon.get_by_text("E2E Edgar Meyer Bach").count() == 1, "B's public collection shows the save")
        anon.goto(f"{BASE}/wall/u/{A['handle']}")
        check(anon.locator("h2:text('Shared (1)')").count() == 1, "A's page lists what A shared")

        # --- optional image upload: resized + capped; editing ---
        big = Path(tempfile.mkdtemp()) / "huge-art.jpg"
        subprocess.run(["node", "-e", f"require('sharp')({{create:{{width:4000,height:3000,channels:3,background:'#c2410c'}}}}).jpeg().toFile('{big}')"], cwd=ROOT, check=True)
        notimg = big.with_name("notes.jpg"); notimg.write_text("not really an image")
        a.goto(f"{BASE}/wall"); a.click("summary:text('+ Share something')")
        a.fill("form.wall-form input[name=url]", "https://www.clevelandart.org/art/1958.31")
        a.fill("form.wall-form input[name=title]", "E2E Museum Piece")
        a.set_input_files("form.wall-form input[name=image]", str(notimg))
        a.click("button:text('Post to the Wall')"); a.wait_for_selector(".form-error")
        check("isn't an image" in a.locator(".form-error").inner_text(), "non-image upload is rejected")
        check(a.locator("form.wall-form input[name=title]").input_value() == "E2E Museum Piece", "form keeps typed text after an error")
        a.set_input_files("form.wall-form input[name=image]", str(big))
        a.click("button:text('Post to the Wall')"); a.wait_for_selector("text=Posted ✓")
        anon.goto(f"{BASE}/wall")
        mcard = anon.locator(".wall-card", has_text="E2E Museum Piece")
        img = mcard.locator(".wall-image img")
        img.wait_for(); anon.wait_for_function("() => [...document.querySelectorAll('.wall-image img')].every(i => i.complete)")
        nat = img.evaluate("i => [i.naturalWidth, i.naturalHeight]")
        box = img.bounding_box()
        check(nat[0] <= 1200 and nat[1] <= 1200, f"uploaded image resized on server ({nat[0]}x{nat[1]})")
        check(box["height"] <= 421, f"image display capped ({round(box['height'])}px tall)")
        src = img.get_attribute("src")
        r = urllib.request.urlopen(BASE + src)
        check(r.headers["Content-Type"] == "image/webp" and len(r.read()) < 300_000, "stored as small WebP")
        check(mcard.locator(".wall-source a:text('clevelandart.org ↗')").count() == 1, "card links to the source site")

        bo.goto(f"{BASE}/wall")
        check(bo.locator(".wall-card", has_text="E2E Museum Piece").locator("a:text('Edit')").count() == 0, "others see no Edit button")
        pid = sql_value("""SELECT id FROM "WallPost" WHERE title = 'E2E Museum Piece';""")
        bo.goto(f"{BASE}/wall/edit/{pid}")
        check(bo.locator("form.wall-form").count() == 0, "others can't open the edit page")
        a.goto(f"{BASE}/wall")
        a.locator(".wall-card", has_text="E2E Museum Piece").locator("a:text('Edit')").click(); a.wait_for_url("**/wall/edit/*")
        a.fill("input[name=title]", "E2E Museum Piece (edited)")
        a.check("input[name=removeImage]")
        a.click("button:text('Save changes')"); a.wait_for_url(f"{BASE}/wall")
        anon.goto(f"{BASE}/wall")
        check(anon.locator("h2.wall-title", has_text="E2E Museum Piece (edited)").count() == 1, "author edits title")
        try:
            urllib.request.urlopen(BASE + src); gone = False
        except urllib.error.HTTPError as e:
            gone = e.code == 404
        check(gone, "removing the image deletes the file")

        # --- reporting + moderation ---
        for _ in range(3):  # one person reporting repeatedly counts once
            bo.goto(f"{BASE}/wall")
            bo.locator(".wall-card", has_text="E2E Edgar").locator("button:text('Report')").click()
            bo.wait_for_load_state("networkidle")
        anon.goto(f"{BASE}/wall")
        check(anon.get_by_text("E2E Edgar Meyer Bach").count() == 1, "one person can't hide a post by reporting repeatedly")
        admin.goto(f"{BASE}/admin/wall")
        row = admin.locator("tr", has_text="E2E Edgar Meyer Bach")
        check("1 report(s)" in row.inner_text(), "admin sees 1 report")
        row.locator("button:text('Hide')").click(); admin.wait_for_selector("tr:has-text('E2E Edgar') button:text('Unhide')")
        anon.goto(f"{BASE}/wall")
        check(anon.get_by_text("E2E Edgar Meyer Bach").count() == 0, "admin hide removes it from the Wall")
        row = admin.locator("tr", has_text="E2E Edgar Meyer Bach")
        check("HIDDEN" in row.inner_text(), "admin sees it flagged HIDDEN")
        row.locator("button:text('Unhide')").click(); admin.wait_for_selector("tr:has-text('E2E Edgar') button:text('Hide')")
        anon.goto(f"{BASE}/wall")
        check(anon.get_by_text("E2E Edgar Meyer Bach").count() == 1, "admin unhide restores it")

        # --- owner delete ---
        a.goto(f"{BASE}/wall")
        a.locator(".wall-card", has_text="E2E Edgar").locator("button:text('Delete')").click()
        a.wait_for_load_state("networkidle"); anon.goto(f"{BASE}/wall")
        check(anon.get_by_text("E2E Edgar Meyer Bach").count() == 0, "author can delete own post")

        # --- closing sign-ups ---
        admin.goto(f"{BASE}/admin/wall"); admin.click("button:text('Close sign-ups')"); admin.wait_for_selector("button:text('Open sign-ups')")
        anon.goto(f"{BASE}/signup")
        check(anon.get_by_text("Sign-ups are closed").count() == 1 and anon.locator("input[name=handle]").count() == 0, "closed sign-ups hide the form")
        b.close()
finally:
    for m in (A, B):
        remove_user(m["email"])
    remove_user(ADMIN)
    mode = previous_mode or "closed"
    sql(f"""INSERT INTO "SiteSetting"(key, value) VALUES ('wall_signups', '{mode}') ON CONFLICT (key) DO UPDATE SET value = '{mode}';""")

print("ALL PASS" if fails == 0 else f"{fails} FAILED")
sys.exit(1 if fails else 0)
