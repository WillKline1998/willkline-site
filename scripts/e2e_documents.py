"""End-to-end check of the Documents admin flow against a local `next start`.

Uploads a third document, verifies it appears on /cv, replaces its file,
verifies the new file is served, then deletes it. Leaves the site as it was.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_documents.py  (server on :3123 with ADMIN_LOCAL=1)
"""
import sys, tempfile, urllib.error, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3123"
tmp = Path(tempfile.mkdtemp())
v1 = tmp / "Teaching_Philosophy_v1.txt"; v1.write_text("version one")
v2 = tmp / "Teaching_Philosophy_v2.txt"; v2.write_text("version two, updated")

def check(cond, msg):
    print(("PASS " if cond else "FAIL ") + msg)
    if not cond:
        sys.exit(1)

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    pg = b.new_page()

    pg.goto(f"{BASE}/admin/documents")
    form = pg.locator("form.admin-form")
    form.locator("input[name=title]").fill("E2E Teaching Philosophy")
    form.locator("input[name=description]").fill("temporary test doc")
    form.locator("input[name=file]").set_input_files(str(v1))
    form.locator("button").click()
    pg.wait_for_load_state("networkidle")

    pg.goto(f"{BASE}/cv")
    check(pg.get_by_text("E2E Teaching Philosophy").count() == 1, "new document appears on /cv")
    href = pg.locator("a.file-card", has_text="E2E Teaching Philosophy").get_attribute("href")
    check(urllib.request.urlopen(BASE + href).read() == b"version one", "v1 file is served")

    pg.goto(f"{BASE}/admin/documents")
    row = pg.locator("tr", has=pg.locator("input[value='E2E Teaching Philosophy']"))
    row.locator("form:has(button:text('Replace file')) input[type=file]").set_input_files(str(v2))
    row.locator("button:text('Replace file')").click()
    pg.wait_for_load_state("networkidle")

    pg.goto(f"{BASE}/cv")
    href2 = pg.locator("a.file-card", has_text="E2E Teaching Philosophy").get_attribute("href")
    check(href2 != href, "replace swaps the file behind the same entry")
    check(urllib.request.urlopen(BASE + href2).read() == b"version two, updated", "v2 file is served")
    try:
        urllib.request.urlopen(BASE + href)
        check(False, "old file removed")
    except urllib.error.HTTPError as e:
        check(e.code == 404, "old file no longer served")

    pg.goto(f"{BASE}/admin/documents")
    row = pg.locator("tr", has=pg.locator("input[value='E2E Teaching Philosophy']"))
    row.locator("button:text('Delete')").click()
    pg.wait_for_load_state("networkidle")
    pg.goto(f"{BASE}/cv")
    check(pg.get_by_text("E2E Teaching Philosophy").count() == 0, "delete removes it from /cv")
    b.close()
print("ALL PASS")
