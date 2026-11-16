"""End-to-end test of the Songbook against a local `next start` on :3123.

A throwaway admin makes nested folders, uploads PDFs of 1, 2 and 3 pages in one batch (one bad file mixed in),
moves and unpublishes songs, and deletes a folder. The test then checks what a visitor sees: folder browsing,
breadcrumbs, search, the page-length filter, the PDF page and its file; and that a member cannot reach the admin.
It also runs scripts/songbook-flatten-root.ts on a fixture tree and checks the demo-mode artist circles.
It deletes EVERY song and folder when it finishes, so it only runs against a throwaway database:
  createdb willkline_songbook_e2e && DATABASE_URL=postgresql://$USER@localhost:5432/willkline_songbook_e2e npx prisma migrate deploy
  (same DATABASE_URL for `npm run build`, `INSECURE_COOKIES=1 npx next start -p 3123` and this script)
Run: DATABASE_URL=... ~/JobSearch/.venv/bin/python scripts/e2e_songbook.py
"""
import json
import secrets
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright
from testdb import database_url, remove_user, sql, sql_value

# The clean-up below wipes the Song table; refuse to point it at the dev or production database.
if not database_url().rstrip("/").split("/")[-1].split("?")[0].endswith("_e2e"):
    sys.exit("Refusing to run: DATABASE_URL must name a throwaway database ending in _e2e (see the docstring).")

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


def migration_checks():
    """scripts/songbook-flatten-root.ts on a copy of production's shape: Will Standards > Covers > Hymns, > Originals."""
    sql("""INSERT INTO "SongFolder"(id, name, "parentId") VALUES ('mg-ws','Will Standards',NULL),('mg-cv','Covers','mg-ws'),
           ('mg-hy','Hymns','mg-cv'),('mg-or','Originals','mg-ws')""")
    rows = [("mg-1", "Radiohead - Airbag", "mg-cv"), ("mg-2", "Amazing Grace", "mg-hy"), ("mg-3", "Old Man", "mg-or"), ("mg-4", "Loose One", "mg-ws"), ("mg-5", "Unfiled", None)]
    for i, t, f in rows:
        fv = f"'{f}'" if f else "NULL"
        sql(f"""INSERT INTO "Song"(id, slug, title, "fileKey", "fileName", size, "folderId", "updatedAt") VALUES ('{i}','{i}','{t}','k-{i}','x.pdf',1,{fv},now())""")
    q = """SELECT count(*) FROM "Song" WHERE id LIKE 'mg-%'"""
    run = lambda *a: subprocess.run(["npx", "tsx", "scripts/songbook-flatten-root.ts", *a], cwd=ROOT, capture_output=True, text=True)
    before = sql_value(q)
    dry = run()
    check("Dry run" in dry.stdout and sql_value("""SELECT count(*) FROM "SongFolder" WHERE id='mg-ws'""") == "1", "migration: the dry run prints a plan and changes nothing")
    print("    " + "\n    ".join(dry.stdout.strip().splitlines()))
    out = run("--apply")
    print("    " + "\n    ".join(out.stdout.strip().splitlines()[-8:]))
    tree = sql_value("""SELECT string_agg(f.name || '<' || coalesce(p.name, 'ROOT'), ',' ORDER BY f.name) FROM "SongFolder" f LEFT JOIN "SongFolder" p ON p.id = f."parentId" WHERE f.id LIKE 'mg-%'""")
    check(tree == "Covers<ROOT,Hymns<Covers,Originals<ROOT", f"migration: Covers and Originals at the root, Hymns still inside Covers, Will Standards gone ({tree})")
    check(sql_value(q) == before == "5", f"migration: song count identical ({before} -> {sql_value(q)})")
    check(sql_value("""SELECT "folderId" FROM "Song" WHERE id='mg-4'""") == "mg-cv" and "Loose One" in out.stdout, "migration: a song loose in Will Standards lands in Covers and is named in the output")
    check(sql_value("""SELECT string_agg(coalesce("folderId", '-'), ',' ORDER BY id) FROM "Song" WHERE id IN ('mg-1','mg-2','mg-3','mg-5')""") == "mg-cv,mg-hy,mg-or,-", "migration: every other song stays in its own folder")
    again = run("--apply")
    check(again.returncode == 0 and "already migrated" in again.stdout and sql_value(q) == "5", "migration: running it again is a no-op")
    # songbook-split-artists.ts is scoped to ONE folder's direct songs: a song in a sub-folder (Hymns) is never touched.
    sql("""INSERT INTO "Song"(id, slug, title, "fileKey", "fileName", size, "folderId", "updatedAt") VALUES ('mg-6','mg-6','Bing Crosby - Silver Bells','k-mg-6','x.pdf',1,'mg-hy',now())""")
    split = lambda *a: subprocess.run(["npx", "tsx", "scripts/songbook-split-artists.ts", *a], cwd=ROOT, capture_output=True, text=True)
    check(split("--apply").returncode != 0 and sql_value("""SELECT title FROM "Song" WHERE id='mg-1'""") == "Radiohead - Airbag", "split: refuses to run without --folder")
    dry = split("--folder", "mg-cv")
    check("Radiohead - Airbag" in dry.stdout and "Silver Bells" not in dry.stdout and sql_value("""SELECT artist FROM "Song" WHERE id='mg-1'""") == "", "split: the dry run lists only the folder's own songs and changes nothing")
    out = split("--folder", "mg-cv", "--apply")
    print("    " + "\n    ".join(out.stdout.strip().splitlines()))
    got = sql_value("""SELECT string_agg(title || '|' || artist || '|' || slug, ',' ORDER BY id) FROM "Song" WHERE id IN ('mg-1','mg-6','mg-2')""")
    check(got == "Airbag|Radiohead|mg-1,Amazing Grace||mg-2,Bing Crosby - Silver Bells||mg-6", f"split: the Covers song is split (slug kept); songs in the Hymns sub-folder are untouched ({got})")
    check("Nothing to do" in split("--folder", "mg-cv", "--apply").stdout, "split: running it again is a no-op")
    sql("""DELETE FROM "Song" WHERE id LIKE 'mg-%'""")
    sql("""DELETE FROM "SongFolder" WHERE id LIKE 'mg-%'""")


user("e2e-sb-admin", ADMIN, "e2e_sb_admin", "ADMIN")
user("e2e-sb-member", MEMBER, "e2e_sb_member", "MEMBER")
tmp = Path(tempfile.mkdtemp())
make_pdf(tmp / "Amazing_Grace.pdf", 1)
make_pdf(tmp / "Blue Moon (piano).pdf", 2)
make_pdf(tmp / "Long_Medley.pdf", 3)
make_pdf(tmp / "Radiohead - Airbag.pdf", 2)
(tmp / "notes.pdf").write_text("this is not really a pdf")
try:
    migration_checks()
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
        check(sql_value("""SELECT count(*) FROM "Song" WHERE artist = '' """) == "3", "file names without ' - ' get no artist")
        page.goto(f"{BASE}/admin/songbook")
        page.locator("input[type=file][multiple]").set_input_files([str(tmp / "Radiohead - Airbag.pdf")])
        page.locator("select").first.select_option(label="Originals")
        page.get_by_role("button", name="Upload", exact=True).click()
        page.wait_for_function("document.querySelectorAll('.song-upload-list li[data-state=done]').length === 1", timeout=30000)
        got = sql_value("""SELECT title || '|' || artist FROM "Song" WHERE "fileName" = 'Radiohead - Airbag.pdf'""")
        check(got == "Airbag|Radiohead", f"'Artist - Title.pdf' fills in both the title and the artist ({got})")

        # Sort them into the sub-folders from the admin list.
        page.goto(f"{BASE}/admin/songbook")
        def move(title, folder):
            row = page.locator(".song-admin-list > li", has=page.locator(f"input[name=title][value='{title}']"))
            row.locator("select[name=folderId]").select_option(label=folder)
            row.get_by_role("button", name="Save").click()
            row.locator("button:text('Saved ✓')").wait_for(timeout=10000)
            page.goto(f"{BASE}/admin/songbook")
        move("Amazing Grace", "Gospel / One page")
        move("Long Medley", "Gospel / Longer")
        row = page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Blue Moon (piano)']"))
        check(row.locator("input[name=artist]").is_disabled(), "an upload with no artist starts as 'No artist' (artist box locked)")
        row.locator("input[name=noArtist]").uncheck()
        row.locator("input[name=artist]").fill("Rodgers and Hart")
        row.get_by_role("button", name="Save").click()
        row.locator("button:text('Saved ✓')").wait_for(timeout=10000)
        check("Changes saved" in row.locator(".song-editor-status").inner_text(), "saving an artist flips the button to Saved ✓ with a note")
        check(sql_value("""SELECT artist FROM "Song" WHERE title = 'Blue Moon (piano)'""") == "Rodgers and Hart", "and the artist is stored")
        # Rename a title; "No artist" for a hymn.
        row = page.locator(".song-admin-list > li", has=page.locator("a", has_text="Long_Medley.pdf"))
        row.locator("input[name=title]").fill("Long Medley (Hymns)")
        row.locator("input[name=noArtist]").uncheck()
        row.locator("input[name=artist]").fill("Somebody")
        row.locator("input[name=noArtist]").check()
        check(row.locator("input[name=artist]").is_disabled(), "ticking No artist clears and locks the artist box")
        row.get_by_role("button", name="Save").click()
        row.locator("button:text('Saved ✓')").wait_for(timeout=10000)
        check(sql_value("""SELECT title || '|' || artist FROM "Song" WHERE "fileName" = 'Long_Medley.pdf'""") == "Long Medley (Hymns)|", "a title edit saves and No artist stores an empty artist")
        page.goto(f"{BASE}/admin/songbook")
        check("No artist" in page.locator(".song-admin-list > li", has_text="Long Medley (Hymns)").locator(".song-admin-head").inner_text(), "the admin list says 'No artist' for it")
        check("Radiohead" in page.locator(".song-admin-list > li", has_text="Airbag").locator(".song-admin-head").inner_text(), "and shows the artist for the others")
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
        v.wait_for_function("document.querySelector('.song-crumbs').innerText.includes('One page')")
        v.wait_for_selector(".song-row")
        check(v.locator(".song-row").count() == 1 and "Amazing Grace" in v.locator(".song-row").inner_text(), "and the sub-folder lists just its songs")

        # Search and length filters work across every folder.
        v.goto(f"{BASE}/songbook?q=MOON")
        check(v.locator(".song-row").count() == 1 and "Gospel" in v.locator(".song-row").inner_text() or v.locator(".song-row", has_text="Blue Moon").count() == 1, "search finds a song in any case")
        v.goto(f"{BASE}/songbook?q=rodgers")
        check(v.locator(".song-row", has_text="Blue Moon").count() == 1, "and by artist")
        v.goto(f"{BASE}/songbook?q=radiohead")
        check([t.strip() for t in v.locator(".song-title").all_inner_texts()] == ["Airbag"], "the 'Search a title or artist' box finds a song by its artist alone")
        check("Rodgers and Hart" in browser.new_context().new_page().goto(f"{BASE}/songbook/blue-moon-piano").text(), "the song page shows the artist")
        v.goto(f"{BASE}/songbook?q=moon")
        check("Rodgers and Hart" in v.locator(".song-row").inner_text(), "and so does the song list")
        v.goto(f"{BASE}/songbook/long-medley")
        check(v.locator(".song-by").count() == 0 and v.locator("h1").inner_text() == "Long Medley (Hymns)", "a song with no artist shows no artist line, and the new title shows publicly")
        v.goto(f"{BASE}/songbook?pages=3")
        check([t.strip() for t in v.locator(".song-title").all_inner_texts()] == ["Long Medley (Hymns)"], "the 3+ pages filter finds the long one, wherever it is")
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

        # The owner's bug: open a folder, move a song out of it, Save. It must say so, and really move.
        gospel = sql_value("""SELECT id FROM "SongFolder" WHERE name='Gospel'""")
        originals = sql_value("""SELECT id FROM "SongFolder" WHERE name='Originals'""")
        page.goto(f"{BASE}/admin/songbook?folder={gospel}")
        row = page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Blue Moon (piano)']"))
        check(row.get_by_role("button", name="Save").is_disabled(), "Save is greyed out until something changes")
        row.locator("select[name=folderId]").select_option(label="Originals")
        check("Unsaved changes" in row.locator(".song-editor-status").inner_text(), "a change shows 'Unsaved changes'")
        row.get_by_role("button", name="Save").click()
        page.wait_for_url(lambda u: f"folder={originals}" in u and "moved=" in u, timeout=10000)
        check(page.locator(".song-just-moved").count() == 1, "moving a song out of the open folder lands you where it went, with a flash")
        row = page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Blue Moon (piano)']"))
        check(row.locator("select[name=folderId]").input_value() == originals, "and the folder picker shows the NEW folder (it used to snap back)")
        page.screenshot(path=str(ROOT / "docs/mockups/songbook-admin-saved.png"))
        page.goto(f"{BASE}/admin/songbook?folder={gospel}")
        check(page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Blue Moon (piano)']")).count() == 0, "and it's gone from Gospel")
        page.goto(f"{BASE}/admin/songbook?folder={originals}")
        check(page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Blue Moon (piano)']")).count() == 1, "and it's in Originals")
        check(sql_value("""SELECT "folderId" FROM "Song" WHERE title='Blue Moon (piano)'""") == originals, "the database agrees")
        # A failure is shown, not swallowed: delete the chosen folder behind the editor's back, then save.
        sql("""INSERT INTO "SongFolder"(id, name) VALUES ('e2e-doomed', 'Doomed')""")
        page.goto(f"{BASE}/admin/songbook?folder={originals}")
        row = page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Blue Moon (piano)']"))
        row.locator("select[name=folderId]").select_option(label="Doomed")
        sql("""DELETE FROM "SongFolder" WHERE id='e2e-doomed'""")
        row.get_by_role("button", name="Save").click()
        row.locator(".song-editor-status .form-error").wait_for(timeout=10000)
        check("folder was deleted" in row.locator(".song-editor-status").inner_text() and sql_value("""SELECT "folderId" FROM "Song" WHERE title='Blue Moon (piano)'""") == originals, "a failed save says why in red, and nothing changes")
        # Phone: the editor stacks and fits.
        php = browser.new_context(viewport={"width": 390, "height": 844}, storage_state=page.context.storage_state()).new_page()
        php.goto(f"{BASE}/admin/songbook?folder={originals}")
        prow = php.locator(".song-admin-list > li").first
        prow.locator("input[name=notes]").fill("Phone note")
        prow.get_by_role("button", name="Save").click()
        prow.locator("button:text('Saved ✓')").wait_for(timeout=10000)
        check(php.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "the song editor fits a phone, and saves there")
        prow.scroll_into_view_if_needed()
        php.screenshot(path=str(ROOT / "docs/mockups/songbook-admin-phone.png"))
        php.context.close()

        # Unpublish hides the page AND the file.
        page.goto(f"{BASE}/admin/songbook")
        row = page.locator(".song-admin-list > li", has=page.locator("input[name=title][value='Amazing Grace']"))
        row.locator("input[name=published]").uncheck()
        row.get_by_role("button", name="Save").click()
        row.locator("button:text('Saved ✓')").wait_for(timeout=10000)
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
        where = sql_value("""SELECT f.name FROM "Song" s JOIN "SongFolder" f ON f.id = s."folderId" WHERE s."fileName" = 'Long_Medley.pdf'""")
        check(where == "Gospel" and sql_value("""SELECT count(*) FROM "SongFolder" WHERE name='Longer'""") == "0", f"deleting a folder moves its songs up one level (now in {where})")

        # A folder can't be moved into itself.
        li = page.locator(".song-folder-admin > li", has=page.locator("input[name=name][value='Gospel']"))
        opts = li.locator("select[name=parentId] option").all_inner_texts()
        check(not any(o.strip() == "Gospel" for o in opts), "the folder picker doesn't offer a folder itself as its parent")

        # Demo mode, per folder. A "Covers" folder (on the bubbled list) holds 24 artists + one no-artist song directly,
        # plus two sub-folders (Hymns 2 songs, Christmas 1). Fixture rows, removed in finally.
        sql("""INSERT INTO "SongFolder"(id, name, "parentId") VALUES ('e2e-cv','Covers',NULL),('e2e-hy','Hymns','e2e-cv'),('e2e-xm','Christmas','e2e-cv')""")
        for i in range(24):
            n = 1 + (i % 3) + (30 if i == 0 else 0)
            for k in range(n):
                sql(f"""INSERT INTO "Song"(id, slug, title, artist, "fileKey", "fileName", size, "folderId", "updatedAt") VALUES ('e2e-bb-{i}-{k}','e2e-bb-{i}-{k}','Song {k}','Artist {i:02d}','k','x.pdf',1,'e2e-cv',now())""")
        for sid, title, artist, fid in [("e2e-bb-none", "Plain Tune", "", "e2e-cv"), ("e2e-bb-h1", "Hymn One", "Zed Hymnist", "e2e-hy"), ("e2e-bb-h2", "Hymn Two", "", "e2e-hy"), ("e2e-bb-x1", "Carol", "Yule Band", "e2e-xm")]:
            sql(f"""INSERT INTO "Song"(id, slug, title, artist, "fileKey", "fileName", size, "folderId", "updatedAt") VALUES ('{sid}','{sid}','{title}','{artist}','k','x.pdf',1,'{fid}',now())""")
        def demo_page(vw, vh, path="/songbook?folder=e2e-cv", **kw):
            ctx = browser.new_context(viewport={"width": vw, "height": vh}, **kw)
            ctx.add_init_script("localStorage.setItem('wk-demo-mode','on')")
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errors.append(str(e)[:160]))
            pg.goto(f"{BASE}{path}")
            return pg
        d = demo_page(1100, 800)
        d.wait_for_selector(".wk-artist-bubble")
        n = d.locator(".wk-artist-bubble").count()
        names = d.locator(".wk-artist-name").all_inner_texts()
        check(n == 20 and any(t.startswith("+") and "more" in t for t in names), f"demo Covers: one circle per artist, capped at 20 with a '+N more' circle ({n})")
        check("No artist" in names, "demo Covers: songs with no artist get their own 'No artist' circle")
        folder_bubbles = d.locator(".wk-folder-bubble").all_inner_texts()
        check(len(folder_bubbles) == 2 and any("Hymns" in t and "📁 2 songs" in t for t in folder_bubbles) and any("Christmas" in t and "📁 1 song" in t for t in folder_bubbles), f"demo Covers: one circle per sub-folder, with its song count ({folder_bubbles})")
        check(not any(x in " ".join(names) for x in ("Zed Hymnist", "Yule Band")), "demo Covers: artists of sub-folder songs are NOT circles (only Covers' own songs)")
        check(d.locator(".wk-bounce-shape").count() == 0, "demo Covers: no ghost shapes there (bubbles instead)")
        sizes = d.locator(".wk-artist-bubble").evaluate_all("els => els.map(e => e.getBoundingClientRect().width)")
        check(min(sizes) >= 60 and max(sizes) <= 240 and max(sizes) > min(sizes), f"demo: sizes follow song counts, clamped ({min(sizes):.0f}–{max(sizes):.0f}px)")
        big = d.locator(".wk-artist-bubble", has_text="Artist 00")
        check(big.evaluate("e => e.getBoundingClientRect().width") == max(sizes), "demo: the artist with the most songs is the biggest circle")
        p1 = d.locator(".wk-artist-bubble").first.evaluate("e => e.style.transform")
        d.wait_for_timeout(4000)
        p2 = d.locator(".wk-artist-bubble").first.evaluate("e => e.style.transform")
        hits = int(d.locator(".wk-artist-bubbles").get_attribute("data-hits") or "0")
        check(p1 != p2 and hits > 0, f"demo: circles move and bounce off each other ({hits} collisions in 4s)")
        inside = d.evaluate("""() => [...document.querySelectorAll('.wk-artist-bubble')].every(e => { const r = e.getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })""")
        check(inside, "demo: every circle stays inside the window (wall bounce)")
        worst = d.evaluate("""() => { const c = [...document.querySelectorAll('.wk-artist-bubble')].map(e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; });
            let w = 0; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) w = Math.max(w, (c[i].r + c[j].r - Math.hypot(c[i].x - c[j].x, c[i].y - c[j].y)) / Math.min(c[i].r, c[j].r)); return w; }""")
        check(worst < 0.35, f"demo: circles push apart instead of sitting on top of each other (worst overlap {worst:.2f} of a radius)")
        layer = d.locator(".wk-artist-bubbles")
        check(layer.evaluate("e => getComputedStyle(e).pointerEvents") == "none" and layer.get_attribute("aria-hidden") == "true", "demo: the circle layer is click-through and hidden from screen readers")
        under = d.evaluate("""() => { const a = document.querySelector('.song-folders a'); const r = a.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && a.contains(el); }""")
        check(under, "demo: a folder card is still what you hit at its centre")
        d.screenshot(path=str(ROOT / "docs/mockups/songbook-demo-covers.png"))
        d.locator(".song-folders a", has_text="Hymns").click()
        d.wait_for_url("**folder=e2e-hy", timeout=10000)
        d.wait_for_function("document.querySelector('.song-crumbs').innerText.includes('Hymns')")
        check(True, "demo: clicking a sub-folder through the circles still opens it")
        d.wait_for_selector(".wk-bounce-shape", timeout=5000)
        d.wait_for_timeout(600)
        check(d.locator(".wk-artist-bubble, .wk-artist-bubbles").count() == 0, "demo Hymns (client nav): the circles are gone")
        d.context.close()
        # Hymns, Christmas, Originals, the front page: the normal treatment (ghost shapes behind the real controls).
        for label, path in [("Hymns", "/songbook?folder=e2e-hy"), ("Christmas", "/songbook?folder=e2e-xm"), ("Originals", f"/songbook?folder={originals}"), ("front page", "/songbook"), ("search", "/songbook?q=song")]:
            d = demo_page(1100, 800, path)
            d.wait_for_selector(".wk-bounce-shape", timeout=5000)
            d.wait_for_timeout(1500)
            ghosts = d.locator(".wk-bounce-shape").count()
            lay = d.locator(".wk-bounce").first
            check(ghosts > 0 and d.locator(".wk-artist-bubble, .wk-artist-bubbles").count() == 0 and lay.evaluate("e => getComputedStyle(e).pointerEvents") == "none",
                  f"demo {label}: normal ghost shapes ({ghosts}), no artist circles, click-through layer")
            if label == "Hymns":
                d.screenshot(path=str(ROOT / "docs/mockups/songbook-demo-hymns.png"))
                under = d.evaluate("""() => { const a = document.querySelector('.song-row'); const r = a.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && a.contains(el); }""")
                check(under, "demo Hymns: a song row is still what you hit at its centre")
                d.locator(".song-row", has_text="Hymn One").click()
                d.wait_for_url("**/songbook/e2e-bb-h1", timeout=10000)
                check(True, "demo Hymns: clicking a song through the ghosts opens it")
            d.context.close()
        d = demo_page(390, 844)
        d.wait_for_selector(".wk-artist-bubble")
        n = d.locator(".wk-artist-bubble").count()
        sizes = d.locator(".wk-artist-bubble").evaluate_all("els => els.map(e => e.getBoundingClientRect().width)")
        check(n == 12 and d.locator(".wk-folder-bubble").count() == 2 and max(sizes) <= 144 and d.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, f"demo phone Covers: fewer, smaller circles incl. both sub-folders ({n}, max {max(sizes):.0f}px), no sideways scroll")
        d.wait_for_timeout(1500)
        d.screenshot(path=str(ROOT / "docs/mockups/songbook-demo-covers-phone.png"))
        d.context.close()
        d = demo_page(390, 844, "/songbook?folder=e2e-hy")
        d.wait_for_selector(".wk-bounce-shape", timeout=5000)
        d.wait_for_timeout(1200)
        check(d.locator(".wk-artist-bubble").count() == 0 and d.evaluate("document.documentElement.scrollWidth - innerWidth") == 0, "demo phone Hymns: ghost shapes, no circles, no sideways scroll")
        d.screenshot(path=str(ROOT / "docs/mockups/songbook-demo-hymns-phone.png"))
        d.context.close()
        d = demo_page(1100, 800, reduced_motion="reduce")
        d.wait_for_selector(".artist-legend")
        check(d.locator(".wk-artist-bubble").count() == 0 and d.locator(".artist-legend li").count() == 20 and d.locator(".artist-legend-folder").count() == 2, "demo + reduced motion: nothing moves; a static legend (artists + sub-folders) instead")
        d.context.close()
        d = demo_page(1100, 800, "/songbook?folder=e2e-hy", reduced_motion="reduce")
        d.wait_for_timeout(1200)
        check(d.locator(".wk-bounce-shape, .artist-legend").count() == 0, "demo + reduced motion on Hymns: no ghost shapes, no legend")
        d.context.close()
        plain = browser.new_context(viewport={"width": 1100, "height": 800}).new_page()
        plain.goto(f"{BASE}/songbook?folder=e2e-cv")
        plain.wait_for_timeout(800)
        check(plain.locator(".wk-artist-bubble, .artist-legend, .wk-bounce-shape").count() == 0, "normal mode: no circles, no legend, no ghosts")
        plain.context.close()
        sql("""DELETE FROM "Song" WHERE id LIKE 'e2e-bb-%'""")
        sql("""DELETE FROM "SongFolder" WHERE id IN ('e2e-hy','e2e-xm')""")
        sql("""DELETE FROM "SongFolder" WHERE id = 'e2e-cv'""")

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
