"""End-to-end admin test against a local `next start` on :3123.

Creates a throwaway admin, exercises login, every admin tool, and the public
pages, then removes everything it created (including the test admin).
Run: ~/JobSearch/.venv/bin/python scripts/e2e_admin.py
"""
import os, secrets, subprocess, sys, tempfile, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from testdb import remove_user, sql, sql_value
import json

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
EMAIL = "e2e-admin@test.local"
PW = secrets.token_urlsafe(18)
tmp = Path(tempfile.mkdtemp())
img = ROOT / "public/images/example-flyer.png"
v1 = tmp / "E2E_Doc_v1.txt"; v1.write_text("version one")
v2 = tmp / "E2E_Doc_v2.txt"; v2.write_text("version two, updated")
fails = 0



def save_post(pg, expect="saved=1"):
    """Click Save and wait for the redirect it causes (the URL may already contain `saved=1`)."""
    with pg.expect_navigation(url=lambda u: expect in u):
        pg.click("button:text('Save')")

def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


def status(path):
    try:
        return urllib.request.urlopen(BASE + path).status
    except urllib.error.HTTPError as e:
        return e.code


subprocess.run(["npm", "run", "-s", "admin:create"], cwd=ROOT, check=True,
               env={**os.environ, "ADMIN_EMAIL": EMAIL, "ADMIN_PASSWORD": PW}, capture_output=True)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        pg = b.new_page()

        # --- gate + login ---
        pg.goto(f"{BASE}/admin/notices")
        check("/login" in pg.url, "logged-out admin redirects to /login")
        pg.fill("input[name=email]", EMAIL); pg.fill("input[name=password]", "wrong-password")
        pg.click("button:text('Log in')")
        pg.wait_for_selector(".form-error")
        check(pg.locator(".form-error").count() == 1, "wrong password is rejected")
        pg.fill("input[name=password]", PW); pg.click("button:text('Log in')")
        pg.wait_for_url("**/admin/notices")
        check(pg.url.endswith("/admin/notices"), "login returns to the requested page")

        # --- bulletin: create post, attach upload + YouTube, verify on home ---
        f = pg.locator("form.admin-form")
        f.locator("select[name=kind]").select_option("SHOW")
        f.locator("input[name=title]").fill("E2E Test Show")
        f.locator("textarea[name=body]").fill("temporary")
        f.locator("input[name=venue]").fill("E2E Hall")
        f.locator("input[name=eventDate]").fill("2026-12-01T19:30")
        f.locator("button").click()
        pg.wait_for_url("**/admin/notices/*")
        add = pg.locator("form.admin-form").nth(1)
        add.locator("input[name=file]").set_input_files(str(img))
        add.locator("input[name=caption]").fill("e2e flyer")
        add.locator("button").click(); pg.wait_for_selector(".admin-table tr >> nth=0")
        pg.reload()
        add = pg.locator("form.admin-form").nth(1)
        add.locator("input[name=url]").fill("https://www.youtube.com/watch?v=P4uPK809WlM")
        add.locator("button").click(); pg.wait_for_selector(".admin-table tr >> nth=1")
        pg.reload()
        check(pg.locator(".admin-table tr").count() == 2, "two attachments listed in the editor")
        pg.goto(BASE + "/")
        card = pg.locator("article", has_text="E2E Test Show")
        check(card.count() == 1, "new post on the home page")
        check(card.locator("img[alt='e2e flyer']").count() == 1, "uploaded image renders")
        check(card.locator("iframe[src*='youtube-nocookie.com/embed/P4uPK809WlM']").count() == 1, "YouTube link becomes a player")
        src = card.locator("img").get_attribute("src")
        check(status(src) == 200, "uploaded image is served")

        # --- documents: upload, replace, delete ---
        pg.goto(f"{BASE}/admin/documents")
        f = pg.locator("form.admin-form")
        f.locator("input[name=title]").fill("E2E Doc"); f.locator("input[name=file]").set_input_files(str(v1))
        f.locator("button").click(); pg.wait_for_load_state("networkidle")
        pg.goto(f"{BASE}/cv")
        h1 = pg.locator("a.file-card", has_text="E2E Doc").get_attribute("href")
        check(urllib.request.urlopen(BASE + h1).read() == b"version one", "document upload served on /cv")
        pg.goto(f"{BASE}/admin/documents")
        row = pg.locator("tr", has=pg.locator("input[value='E2E Doc']"))
        row.locator("form:has(button:text('Replace file')) input[type=file]").set_input_files(str(v2))
        row.locator("button:text('Replace file')").click(); pg.wait_for_load_state("networkidle")
        pg.goto(f"{BASE}/cv")
        h2 = pg.locator("a.file-card", has_text="E2E Doc").get_attribute("href")
        check(urllib.request.urlopen(BASE + h2).read() == b"version two, updated" and status(h1) == 404, "replace swaps file; old one 404s")
        pg.goto(f"{BASE}/admin/documents")
        pg.locator("tr", has=pg.locator("input[value='E2E Doc']")).locator("button:text('Delete')").click()
        pg.wait_for_load_state("networkidle")

        # --- bio + cv editors ---
        pg.goto(f"{BASE}/admin/bio")
        original_bio = pg.locator("textarea[name=bio]").input_value()
        pg.fill("textarea[name=bio]", original_bio + "\n\nE2E marker paragraph.")
        pg.click("button:text('Save')"); pg.wait_for_selector("text=Saved ✓")
        pg.goto(f"{BASE}/bio")
        check(pg.get_by_text("E2E marker paragraph.").count() == 1, "bio edit shows on /bio")
        pg.goto(f"{BASE}/admin/bio"); pg.fill("textarea[name=bio]", original_bio)
        pg.click("button:text('Save')"); pg.wait_for_selector("text=Saved ✓")

        pg.goto(f"{BASE}/admin/cv/raw")
        pg.fill("textarea[name=cv]", "{ not json")
        pg.click("button:text('Save')"); pg.wait_for_selector(".form-error")
        check(pg.locator(".form-error").count() == 1, "invalid CV JSON is rejected")
        check(status("/cv") == 200, "/cv still fine after rejected edit")

        # --- music editor ---
        pg.goto(f"{BASE}/admin/music")
        first = pg.locator("form.admin-album").first
        first.locator("textarea[name=description]").fill("E2E liner notes")
        first.locator("button").click(); pg.wait_for_load_state("networkidle")
        slug = first.locator("input[name=slug]").get_attribute("value")
        pg.goto(f"{BASE}/music/{slug}")
        check(pg.get_by_text("E2E liner notes").count() == 1, "liner notes show on release page")

        # --- delete the test post through the UI (also removes its uploaded file) ---
        pg.goto(f"{BASE}/admin/notices")
        pg.click("a:text('E2E Test Show')"); pg.wait_for_url("**/admin/notices/*")
        pg.click("button:text('Delete this post')"); pg.wait_for_url("**/admin/notices")
        check(status(src) == 404, "deleting a post deletes its uploaded file")

        # --- account corner (site-wide) ---
        check(pg.locator(".nav-foot a:text('Admin')").count() == 1 and pg.locator(".nav-foot button:text('Log out')").count() == 1, "nav corner shows Admin + Log out when signed in")
        anon = b.new_page()
        anon.goto(f"{BASE}/music")
        check(anon.locator(".nav-foot a:text('Log in')").count() == 1, "nav corner shows Log in when signed out")

        # --- media: photo upload (resized) + video link ---
        big = Path(tempfile.mkdtemp()) / "e2e-photo.jpg"
        subprocess.run(["node", "-e", f"require('sharp')({{create:{{width:4000,height:3000,channels:3,background:'#336699'}}}}).jpeg().toFile('{big}')"], cwd=ROOT, check=True)
        pg.goto(f"{BASE}/admin/media")
        photo = pg.locator("form.admin-form", has=pg.locator("input[name=image]"))
        photo.locator("input[name=image]").set_input_files(str(big))
        photo.locator("input[name=title]").fill("E2E Photo")
        photo.locator("button").click(); pg.wait_for_url("**added=photo**")
        video = pg.locator("form.admin-form", has=pg.locator("input[name=video]"))
        video.locator("input[name=video]").fill("https://youtu.be/P4uPK809WlM")
        video.locator("input[name=title]").fill("E2E Video")
        video.locator("button").click(); pg.wait_for_url("**added=video**")
        anon.goto(f"{BASE}/media")
        check(anon.locator("iframe[src*='youtube-nocookie.com/embed/P4uPK809WlM']").count() == 1 and anon.get_by_text("E2E Video").count() == 1, "media video link renders as player with title")
        img = anon.locator(".photo-thumb img").first
        img.wait_for(); anon.wait_for_function("() => [...document.querySelectorAll('.photo-thumb img')].every(i => i.complete)")
        nat = img.evaluate("i => [i.naturalWidth, i.naturalHeight]")
        check(nat[0] <= 2000 and anon.get_by_text("E2E Photo").count() >= 1, f"media photo resized ({nat[0]}x{nat[1]}) with title")
        photo_src = img.get_attribute("src")
        pg.goto(f"{BASE}/admin/media")
        for title in ("E2E Photo", "E2E Video"):
            pg.locator("tr", has=pg.locator(f"input[value='{title}']")).locator("button:text('Delete')").click()
            pg.wait_for_selector(f"input[value='{title}']", state="detached")
        check(status(photo_src) == 404, "deleting a photo deletes the file")

        # --- writing: title required, draft private, publish + time, one picture OR video ---
        pg.goto(f"{BASE}/admin/writing")
        pg.fill("input[name=title]", "E2E Post"); pg.click("button:text('Start a draft')")
        pg.wait_for_url("**/admin/writing/*")
        edit_url = pg.url.split("?")[0]
        pg.fill("textarea[name=body]", "Hello **world**.\n\n- one\n- two\n\n## Section")
        save_post(pg)
        check(status("/writing/e2e-post") == 404 and anon.goto(f"{BASE}/writing").ok and anon.get_by_text("E2E Post").count() == 0, "draft is private")
        pg.check("input[name=published]"); save_post(pg)
        anon.goto(f"{BASE}/writing/e2e-post")
        check(anon.locator("strong:text('world')").count() == 1 and anon.locator("h2:text('Section')").count() == 1, "markdown renders")
        check(anon.locator(".markdown li").first.evaluate("li => getComputedStyle(li).listStyleType") == "disc", "lists show bullets")
        check(":" in anon.locator("p.post-date time").inner_text(), "posting date + time shown")
        pg.goto(edit_url); pg.fill("input[name=title]", "")
        pg.evaluate("document.querySelector('input[name=title]').removeAttribute('required')")
        save_post(pg, "error=")
        check(pg.locator(".form-error").count() == 1, "title is required")
        pg.goto(edit_url)
        pg.check("input[name=media][value=image]"); save_post(pg, "error=")
        check("Choose a picture" in pg.locator(".form-error").inner_text(), "picking Picture without a file asks for one")
        pg.goto(edit_url)
        pg.check("input[name=media][value=video]"); pg.fill("input[name=video]", "https://www.youtube.com/watch?v=P4uPK809WlM")
        save_post(pg)
        anon.goto(f"{BASE}/writing/e2e-post")
        check(anon.locator(".lead-media iframe[src*='youtube-nocookie.com/embed/P4uPK809WlM']").count() == 1, "video lead renders as player")
        pg.goto(edit_url)
        pg.check("input[name=media][value=image]"); pg.set_input_files("input[name=image]", str(big))
        save_post(pg)
        anon.goto(f"{BASE}/writing/e2e-post")
        lead = anon.locator(".lead-image img")
        check(lead.count() == 1 and anon.locator(".lead-media iframe").count() == 0, "switching to a picture replaces the video (one or the other)")
        lead_src = lead.get_attribute("src")
        anon.goto(f"{BASE}/writing")
        check(anon.get_by_text("E2E Post").count() == 1 and anon.locator("li.has-thumb img.post-thumb").count() >= 1, "published post listed with thumbnail")
        pg.goto(edit_url); pg.check("input[name=media][value=none]"); save_post(pg)
        check(status(lead_src) == 404, "choosing None deletes the uploaded picture")

        # --- lab: hidden until made visible ---
        pg.goto(f"{BASE}/admin/lab")
        pg.fill("input[name=title]", "E2E Gadget"); pg.click("button:text('Add project')")
        pg.wait_for_url("**/admin/lab/*")
        anon.goto(f"{BASE}/lab")
        check(anon.get_by_text("E2E Gadget").count() == 0, "new lab project starts hidden")
        pg.select_option("select[name=status]", "BUILDING")
        pg.fill("input[name=description]", "A test gadget")
        pg.fill("input[name=tech]", "Max/MSP, Web Audio")
        pg.check("input[name=published]"); pg.click("button:text('Save')"); pg.wait_for_load_state("networkidle")
        anon.goto(f"{BASE}/lab")
        card = anon.locator(".lab-card", has_text="E2E Gadget")
        check(card.count() == 1 and card.get_by_text("In progress").count() == 1 and card.locator(".chips li").count() == 2, "lab card shows status + tech")

        # --- cv form: round-trip is lossless, add job works ---
        before = sql_value("""SELECT value FROM "SiteSetting" WHERE key = 'cv';""")
        pg.goto(f"{BASE}/admin/cv"); pg.click("button:text('Save CV')"); pg.wait_for_url("**/admin/cv?saved=1")
        after = sql_value("""SELECT value FROM "SiteSetting" WHERE key = 'cv';""")
        check(json.loads(before) == json.loads(after), "CV form save without edits changes nothing")
        pg.click("button:text('+ Add a job')"); pg.wait_for_load_state("networkidle")
        n = len(json.loads(before)["experience"])
        pg.fill(f"input[name='exp.{n}.title']", "E2E Job"); pg.fill(f"input[name='exp.{n}.org']", "E2E Org")
        pg.fill(f"textarea[name='exp.{n}.bullets']", "did a thing\ndid another")
        pg.click("button:text('Save CV')"); pg.wait_for_url("**/admin/cv?saved=1")
        anon.goto(f"{BASE}/cv")
        check(anon.get_by_text("E2E Org").count() == 1 and anon.get_by_text("did another").count() == 1, "added job appears on /cv")
        sql(f"""UPDATE "SiteSetting" SET value = $cv${before}$cv$ WHERE key = 'cv';""")
        anon.close()

        # --- logout ---
        pg.goto(f"{BASE}/admin"); pg.click("button:text('Log out')"); pg.wait_for_url(BASE + "/")
        pg.goto(f"{BASE}/admin")
        check("/login" in pg.url, "logout ends the session")
        b.close()
finally:
    # Clean up everything this test created.
    sql("""DELETE FROM "Notice" WHERE title = 'E2E Test Show';""")  # media cascade
    sql("""DELETE FROM "MediaItem" WHERE title IN ('E2E Video', 'E2E Photo');""")
    sql("""DELETE FROM "Post" WHERE title = 'E2E Post';""")
    sql("""DELETE FROM "LabProject" WHERE title = 'E2E Gadget';""")
    sql("""UPDATE "Album" SET description = '' WHERE description = 'E2E liner notes';""")
    remove_user(EMAIL)

print("ALL PASS" if fails == 0 else f"{fails} FAILED")
sys.exit(1 if fails else 0)
