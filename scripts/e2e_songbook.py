"""End-to-end test of the Songbook against a local `next start` on :3123.

A throwaway admin makes nested folders, uploads PDFs of 1, 2 and 3 pages in one batch (one bad file mixed in),
moves and unpublishes songs, and deletes a folder. The test then checks what a visitor sees: folder browsing,
breadcrumbs, search, the page-length filter, the PDF page and its file; and that a member cannot reach the admin.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_songbook.py
"""
import json
import secrets
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright
from testdb import remove_user, sql, sql_value

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
ADMIN, MEMBER, PW = "e2e-songbook@test.local", "e2e-songbook-member@test.local", secrets.token_urlsafe(14)
fails = 0


def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


def make_pdf(path: Path, pages: int):
    """A small valid PDF with `pages` blank pages, built by hand."""
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", f"<< /Type /Pages /Kids [{' '.join(f'{3 + i} 0 R' for i in range(pages))}] /Count {pages} >>".encode()]
    objs += [b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>" for _ in range(pages)]
    out, offsets = b"%PDF-1.4\n", []
    for i, o in enumerate(objs, 1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + o + b"\nendobj\n"
    x = len(out)
    out += f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode() + b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
    out += f"trailer\n<< /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{x}\n%%EOF\n".encode()
    path.write_bytes(out)


def user(uid, email, handle, role):
    hashed = subprocess.run(
        ["npx", "tsx", "-e", f"import('./scripts/hash').then(async m => console.log(await m.hashPasswordNode({json.dumps(PW)})))"],
        cwd=ROOT, check=True, capture_output=True, text=True,
    ).stdout.strip()
    remove_user(email)
    sql(f"""INSERT INTO "User" (id, email, name, handle, role, "passwordHash") VALUES ('{uid}', '{email}', '{handle}', '{handle}', '{role}', '{hashed}');""")


def login(page, email, nxt):
    page.goto(f"{BASE}/login?next={nxt}")
    page.fill("input[name=email]", email)
    page.fill("input[name=password]", PW)
    page.click("button:text('Log in')")


user("e2e-sb-admin", ADMIN, "e2e_sb_admin", "ADMIN")
user("e2e-sb-member", MEMBER, "e2e_sb_member", "MEMBER")
tmp = Path(tempfile.mkdtemp())
make_pdf(tmp / "Amazing_Grace.pdf", 1)
make_pdf(tmp / "Blue Moon (piano).pdf", 2)
make_pdf(tmp / "Long_Medley.pdf", 3)
(tmp / "notes.pdf").write_text("this is not really a pdf")
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        errors = []

        # Visitors and members cannot reach the admin page.
        anon = browser.new_context().new_page()
        anon.goto(f"{BASE}/admin/songbook")
        check("/login" in anon.url, "the admin page asks a signed-out visitor to log in")
        member = browser.new_context().new_page()
        login(member, MEMBER, "/admin/songbook")
        member.wait_for_timeout(1500)
        check("/admin/songbook" not in member.url or member.locator("h1", has_text="Songbook").count() == 0, "an ordinary member can't open it either")

        page = browser.new_context(viewport={"width": 1100, "height": 1000}).new_page()
        page.on("pageerror", lambda e: errors.append(str(e)[:160]))
        login(page, ADMIN, "/admin/songbook")
        page.wait_for_url("**/admin/songbook", timeout=15000)

        # Folders: Gospel > One page, Gospel > Longer, Originals.
        def new_folder(name, inside=""):
            f = page.locator("form.song-newfolder")
            f.locator("input[name=name]").fill(name)
            f.locator("select[name=parentId]").select_option(label=inside) if inside else None
            with page.expect_navigation(url=lambda u: True, timeout=10000) if False else page.expect_response(lambda r: r.request.method == "POST", timeout=10000):
                f.get_by_role("button", name="Add folder").click()
            page.wait_for_timeout(600)
            page.goto(f"{BASE}/admin/songbook")

        new_folder("Gospel")
        new_folder("One page", "Gospel")
        new_folder("Longer", "Gospel")
        new_folder("Originals")
        check(sql_value("""SELECT count(*) FROM "SongFolder" """) == "4", "four folders made, nested two deep")
        check(sql_value("""SELECT count(*) FROM "SongFolder" WHERE name='One page' AND "parentId" IS NOT NULL""") == "1", "one page lives inside Gospel")

        # Bulk upload: three good PDFs and one that isn't a PDF.
        page.locator("input[type=file][multiple]").set_input_files([str(tmp / n) for n in ("Amazing_Grace.pdf", "Blue Moon (piano).pdf", "Long_Medley.pdf", "notes.pdf")])
        page.locator("select").first.select_option(label="Gospel")
        page.get_by_role("button", name="Upload", exact=True).click()
        page.wait_for_function("document.querySelectorAll('.song-upload-list li[data-state=done], .song-upload-list li[data-state=failed]').length === 4", timeout=60000)
        states = page.locator(".song-upload-list li").evaluate_all("els => els.map(e => e.dataset.state)")
        check(states.count("done") == 3 and states.count("failed") == 1, f"three PDFs go up and the fake one is refused ({states})")
        check("isn't a PDF" in page.locator(".song-upload-list li[data-state=failed]").inner_text(), "with a plain-words reason")
        rows = sql_value("""SELECT string_agg(title || ':' || pages, ',' ORDER BY title) FROM "Song" """)
        check(rows == "Amazing Grace:1,Blue Moon (piano):2,Long Medley:3", f"titles come from the file names and pages from the PDFs ({rows})")

        # Sort them into the sub-folders from the admin list.
        page.goto(f"{BASE}/admin/songbook")
        def move(title, folder):
            row = page.locator(".song-admin-list > li", has=page.locator(f"input[name=title][value='{title}']"))
            row.locator("select[name=folderId]").select_option(label=folder)
            row.get_by_role("button", name="Save").click()
            page.wait_for_timeout(900)
            page.goto(f"{BASE}/admin/songbook")
        move("Amazing Grace", "Gospel / One page")
        move("Long Medley", "Gospel / Longer")
        row = page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Blue Moon (piano)']"))
        row.locator("input[name=artist]").fill("Rodgers and Hart")
        row.get_by_role("button", name="Save").click()
        page.wait_for_timeout(900)
        check(sql_value("""SELECT count(*) FROM "Song" s JOIN "SongFolder" f ON f.id = s."folderId" WHERE f.name IN ('One page','Longer')""") == "2", "songs move between folders")

        # What a visitor sees.
        v = browser.new_context(viewport={"width": 1100, "height": 900}).new_page()
        v.goto(f"{BASE}/songbook")
        top = v.locator(".song-folders").inner_text()
        check("Gospel" in top and "Originals" in top and "One page" not in top, "the front page shows the top-level folders")
        check("3 songs" in v.locator(".song-folders li", has_text="Gospel").inner_text(), "with counts that include everything inside")
        check(v.locator(".song-row").count() == 0, "the front page has no loose songs (they are all in folders)")
        v.screenshot(path="/tmp/sb_front.png")
        v.locator(".song-folders a", has_text="Gospel").click()
        v.wait_for_url("**folder=*")
        check(v.locator(".song-row", has_text="Blue Moon").count() == 1, "a song with no sub-folder sits in Gospel itself")
        v.screenshot(path="/tmp/sb_gospel.png")
        check("One page" in v.locator(".song-folders").inner_text() and "Longer" in v.locator(".song-folders").inner_text(), "opening Gospel shows its sub-folders")
        check(v.locator(".song-crumbs").inner_text().replace("\n", " ").startswith("All songs / Gospel"), "with a breadcrumb")
        v.locator(".song-folders a", has_text="One page").click()
        v.wait_for_selector(".song-row")
        check(v.locator(".song-row").count() == 1 and "Amazing Grace" in v.locator(".song-row").inner_text(), "and the sub-folder lists just its songs")

        # Search and length filters work across every folder.
        v.goto(f"{BASE}/songbook?q=MOON")
        check(v.locator(".song-row").count() == 1 and "Gospel" in v.locator(".song-row").inner_text() or v.locator(".song-row", has_text="Blue Moon").count() == 1, "search finds a song in any case")
        v.goto(f"{BASE}/songbook?q=rodgers")
        check(v.locator(".song-row", has_text="Blue Moon").count() == 1, "and by artist")
        v.goto(f"{BASE}/songbook?pages=3")
        check([t.strip() for t in v.locator(".song-title").all_inner_texts()] == ["Long Medley"], "the 3+ pages filter finds the long one, wherever it is")
        v.goto(f"{BASE}/songbook?pages=1")
        check([t.strip() for t in v.locator(".song-title").all_inner_texts()] == ["Amazing Grace"], "the 1 page filter finds the short one")
        v.goto(f"{BASE}/songbook?q=zzzz")
        check("Nothing matches" in v.locator(".songbook").inner_text(), "no match says so")

        # The PDF page.
        v.goto(f"{BASE}/songbook")
        v.goto(f"{BASE}/songbook?q=grace")
        v.locator(".song-row").click()
        v.wait_for_selector(".song-viewer")
        v.screenshot(path="/tmp/sb_song.png")
        page.goto(f"{BASE}/admin/songbook"); page.screenshot(path="/tmp/sb_admin.png", full_page=True)
        check("Gospel" in v.locator(".song-crumbs").inner_text() and "One page" in v.locator(".song-crumbs").inner_text(), "a song page shows where it lives")
        href = v.locator("a:text('Open PDF')").get_attribute("href")
        body = urllib.request.urlopen(BASE + href).read()
        check(body[:5] == b"%PDF-", "Open PDF serves the real file")
        check(v.locator("a:text('Download')").get_attribute("download") == "Amazing_Grace.pdf", "Download keeps the file name")

        # Unpublish hides the page AND the file.
        page.goto(f"{BASE}/admin/songbook")
        row = page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Amazing Grace']"))
        row.locator("input[name=published]").uncheck()
        row.get_by_role("button", name="Save").click()
        page.wait_for_timeout(900)
        v.goto(f"{BASE}/songbook?q=grace")
        check(v.locator(".song-row").count() == 0, "an unpublished song disappears from the Songbook")
        resp = browser.new_context().request.get(BASE + href)
        check(resp.status == 404, "and its PDF stops being downloadable")
        check(browser.new_context().request.get(f"{BASE}/songbook/amazing-grace").status == 404, "and its page is a 404")

        # Deleting a folder moves its contents up, never deletes them.
        page.goto(f"{BASE}/admin/songbook")
        li = page.locator(".song-folder-admin > li", has=page.locator("input[name=name][value='Longer']"))
        li.get_by_role("button", name="Delete folder").click()
        page.wait_for_timeout(900)
        page.goto(f"{BASE}/admin/songbook")
        where = sql_value("""SELECT f.name FROM "Song" s JOIN "SongFolder" f ON f.id = s."folderId" WHERE s.title = 'Long Medley'""")
        check(where == "Gospel" and sql_value("""SELECT count(*) FROM "SongFolder" WHERE name='Longer'""") == "0", f"deleting a folder moves its songs up one level (now in {where})")

        # A folder can't be moved into itself.
        li = page.locator(".song-folder-admin > li", has=page.locator("input[name=name][value='Gospel']"))
        opts = li.locator("select[name=parentId] option").all_inner_texts()
        check(not any(o.strip() == "Gospel" for o in opts), "the folder picker doesn't offer a folder itself as its parent")

        # Phone layout.
        ph = browser.new_context(viewport={"width": 390, "height": 800}).new_page()
        ph.goto(f"{BASE}/songbook")
        check(ph.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "no sideways scroll on a phone")
        ph.goto(f"{BASE}/songbook?q=moon")
        ph.locator(".song-row").click()
        ph.wait_for_selector(".song-viewer")
        check(ph.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "the song page fits a phone too")
        check(not errors, f"no page errors {errors[:2]}")
        browser.close()
finally:
    sql("""DELETE FROM "Upload" WHERE key IN (SELECT "fileKey" FROM "Song")""")
    sql("""DELETE FROM "Song" """)
    sql("""DELETE FROM "SongFolder" """)
    remove_user(ADMIN)
    remove_user(MEMBER)

print(f"\n{'ALL PASS' if not fails else str(fails) + ' FAILED'}")
sys.exit(1 if fails else 0)
