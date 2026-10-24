"""Screenshots of the Cleanup Map into docs/mockups/cleanup_*.png (needs the sample routes: scripts/seed-cleanup-demo.ts).
Run against `next start` on :3123: ~/JobSearch/.venv/bin/python scripts/screenshot_cleanup.py
"""
import json, secrets, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
from testdb import remove_user, sql

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "mockups"
EMAIL, PW = "shots-cleanup@test.local", secrets.token_urlsafe(14)
hashed = subprocess.run(["npx", "tsx", "-e", f"import('./scripts/hash').then(async m => console.log(await m.hashPasswordNode({json.dumps(PW)})))"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.strip()
remove_user(EMAIL)
sql(f"""INSERT INTO "User" (id, email, name, handle, role, "passwordHash") VALUES ('shots-cleanup-user', '{EMAIL}', 'Shots', 'shots', 'MEMBER', '{hashed}');""")
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True, args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"])
        for name, w, h in (("desktop", 1366, 900), ("phone", 390, 844)):
            pg = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2 if name == "phone" else 1).new_page()
            pg.goto(f"{BASE}/cleanup"); pg.wait_for_timeout(7000)
            pg.locator(".cleanup-stats").scroll_into_view_if_needed()
            pg.screenshot(path=str(OUT / f"cleanup_{name}_globe.png"))
            pg.locator(".cleanup-fly", has_text="Edgewater").click(); pg.wait_for_timeout(6000)
            pg.screenshot(path=str(OUT / f"cleanup_{name}_route.png"))
            pg.goto(f"{BASE}/login?next=/cleanup/new")
            pg.fill("input[name=email]", EMAIL); pg.fill("input[name=password]", PW); pg.click("button:text('Log in')")
            pg.wait_for_url("**/cleanup/new"); pg.wait_for_selector(".drawer-map canvas"); pg.wait_for_timeout(3500)
            pg.get_by_role("radio", name="Freehand").click()
            box = pg.locator(".drawer-map").bounding_box()
            pts = [(0.12, 0.7), (0.25, 0.55), (0.4, 0.6), (0.52, 0.4), (0.66, 0.45), (0.78, 0.3), (0.9, 0.35)]
            xy = [(box["x"] + box["width"] * fx, box["y"] + box["height"] * fy) for fx, fy in pts]
            pg.mouse.move(*xy[0]); pg.mouse.down()
            for x, y in xy[1:]: pg.mouse.move(x, y, steps=14)
            pg.mouse.up(); pg.wait_for_timeout(600)
            pg.locator(".drawer").scroll_into_view_if_needed()
            pg.screenshot(path=str(OUT / f"cleanup_{name}_draw.png"))
        b.close()
finally:
    remove_user(EMAIL)
