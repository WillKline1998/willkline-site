"""Screenshot the admin pages (temp admin, removed afterwards). Server must be on :3123."""
import os, secrets, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/mockups"
EMAIL, PW = "shots@test.local", secrets.token_urlsafe(18)
subprocess.run(["npm", "run", "-s", "admin:create"], cwd=ROOT, check=True, capture_output=True,
               env={**os.environ, "ADMIN_EMAIL": EMAIL, "ADMIN_PASSWORD": PW})
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        pg = b.new_page(viewport={"width": 1366, "height": 1000})
        pg.goto("http://localhost:3123/login")
        pg.screenshot(path=OUT / "admin_login.png")
        pg.fill("input[name=email]", EMAIL); pg.fill("input[name=password]", PW); pg.click("button:text('Log in')")
        pg.wait_for_url("**/admin")
        pg.screenshot(path=OUT / "admin_home.png")
        pg.goto("http://localhost:3123/admin/notices")
        pg.click("a:text('[Example] Solo bass recital')"); pg.wait_for_url("**/admin/notices/*")
        pg.screenshot(path=OUT / "admin_edit_post.png", full_page=True)
        b.close()
finally:
    db = str(ROOT / "prisma/dev.db")
    subprocess.run(["sqlite3", db, f"DELETE FROM Session WHERE userId IN (SELECT id FROM User WHERE email='{EMAIL}'); DELETE FROM User WHERE email='{EMAIL}';"])
