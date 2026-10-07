"""Responsive audit: every page at phone / tablet / desktop widths.

For each page + viewport: flags horizontal overflow (the #1 mobile bug),
tap targets under 32px, and text under 12px, then saves a screenshot to
docs/mockups/responsive/. Logs in with a throwaway admin to cover admin pages.
Run with the server on :3123:  ~/JobSearch/.venv/bin/python scripts/responsive_audit.py
"""
import os, secrets, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs/mockups/responsive"; OUT.mkdir(parents=True, exist_ok=True)
BASE = "http://localhost:3123"
VIEWPORTS = {"phone": (390, 844), "small-phone": (320, 640), "tablet": (768, 1024), "desktop": (1366, 1000)}
PUBLIC = ["/", "/music", "/music/becoming", "/bio", "/cv", "/media", "/writing", "/lab", "/wall", "/login"]
ADMIN = ["/admin", "/admin/notices", "/admin/documents", "/admin/bio", "/admin/music"]
EMAIL, PW = "audit@test.local", secrets.token_urlsafe(18)

PROBE = """() => {
  const vw = document.documentElement.clientWidth;
  const wide = [...document.querySelectorAll('body *')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1 && getComputedStyle(e).position !== 'fixed'; })
    .filter(e => !e.closest('iframe'))
    .slice(0, 4).map(e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' ' + Math.round(e.getBoundingClientRect().right) + 'px');
  const small = [...document.querySelectorAll('a, button, input, select, textarea')]
    .filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && r.height < 32 && getComputedStyle(e).display !== 'inline' && e.type !== 'hidden' && e.type !== 'checkbox'; })
    .slice(0, 4).map(e => e.tagName.toLowerCase() + ' "' + (e.textContent || e.name || '').trim().slice(0, 20) + '" ' + Math.round(e.getBoundingClientRect().height) + 'px');
  const tiny = [...document.querySelectorAll('p, li, span, a, dd, dt, label')]
    .filter(e => e.childElementCount === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12)
    .slice(0, 3).map(e => '"' + e.textContent.trim().slice(0, 20) + '" ' + getComputedStyle(e).fontSize);
  return { overflow: document.documentElement.scrollWidth - vw, wide, small, tiny };
}"""

subprocess.run(["npm", "run", "-s", "admin:create"], cwd=ROOT, check=True, capture_output=True,
               env={**os.environ, "ADMIN_EMAIL": EMAIL, "ADMIN_PASSWORD": PW})
problems = 0
try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        for name, (w, h) in VIEWPORTS.items():
            mobile = w < 768
            ctx = b.new_context(viewport={"width": w, "height": h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
            pg = ctx.new_page()
            pg.goto(BASE + "/login"); pg.fill("input[name=email]", EMAIL); pg.fill("input[name=password]", PW)
            pg.click("button:text('Log in')"); pg.wait_for_url("**/admin")
            for path in PUBLIC + ADMIN:
                pg.goto(BASE + path); pg.wait_for_load_state("networkidle")
                r = pg.evaluate(PROBE)
                issues = []
                if r["overflow"] > 0: issues.append(f"OVERFLOW +{r['overflow']}px {r['wide']}")
                if r["small"] and mobile: issues.append(f"small taps {r['small']}")
                if r["tiny"]: issues.append(f"tiny text {r['tiny']}")
                problems += bool(issues)
                print(f"{'!!' if issues else 'ok'} {name:11} {path:16} {' | '.join(issues)}")
                if name in ("phone", "tablet") or issues:
                    slug = path.strip("/").replace("/", "_") or "home"
                    pg.screenshot(path=OUT / f"{name}_{slug}.png", full_page=False)
            if mobile:  # phone menu: hidden → opens → link navigates and closes it
                pg.goto(BASE + "/")
                menu = pg.locator("#site-menu")
                ok = not menu.is_visible()
                pg.click(".menu-button"); ok = ok and menu.is_visible()
                menu.locator("a:text('Music')").click(); pg.wait_for_url("**/music")
                ok = ok and not menu.is_visible()
                problems += not ok
                print(f"{'ok' if ok else '!!'} {name:11} phone menu open/navigate/close")
                pg.click(".menu-button"); pg.screenshot(path=OUT / f"{name}_menu_open.png")
            else:
                vis = pg.locator("#site-menu").is_visible() and not pg.locator(".menu-button").is_visible()
                problems += not vis
                print(f"{'ok' if vis else '!!'} {name:11} sidebar always visible, no Menu button")
            ctx.close()
        b.close()
finally:
    subprocess.run(["sqlite3", str(ROOT / "prisma/dev.db"),
                    f"DELETE FROM Session WHERE userId IN (SELECT id FROM User WHERE email='{EMAIL}'); DELETE FROM User WHERE email='{EMAIL}';"])
print(f"\n{problems} page/viewport combos with issues")
sys.exit(1 if problems else 0)
