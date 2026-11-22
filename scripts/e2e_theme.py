"""End-to-end test for the theme service (pop art / demo mode / Original Design) against `next start` on :3123.

Checks: a fresh visitor gets the admin default (pop art until changed); the sidebar button cycles
pop art -> demo mode -> Original Design -> pop art, labels the current theme, and stores the choice in
localStorage; the choice survives a reload and is applied BEFORE first paint (no flash of the default);
the old demo-toggle key still means demo mode; the bio sticky column (and pop art's sticky band) works in
every theme; no hydration errors. Then a throwaway admin sets the default to Original Design in /admin/theme:
fresh logged-out visitors get it, a visitor who chose a theme keeps theirs. Cleans up after itself.
Screenshots of home/bio/lab/songbook per theme (desktop + phone) go to docs/mockups/themes/.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_theme.py   (SHOTS=0 skips the screenshots)
"""
import os, secrets, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from testdb import remove_user, sql, sql_value

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "docs/mockups/themes"
EMAIL = "e2e-theme-admin@test.local"
PW = secrets.token_urlsafe(18)
CYCLE = [("pop-art", "pop art"), ("demo", "demo mode"), ("original", "Original Design")]
fails = 0

# Records the theme on <html> at the moment <body> starts parsing, i.e. before first paint and before React.
FIRST_PAINT = """
new MutationObserver((_, o) => { if (document.body) { window.__themeAtBody = document.documentElement.dataset.theme; o.disconnect(); } })
  .observe(document, { childList: true, subtree: true });
"""


def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


def load(pg, path):
    """goto + settle. "/" carries Spotify/SoundCloud embeds that can keep the network busy forever."""
    pg.goto(f"{BASE}{path}")
    try:
        pg.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        pass
    hydrated(pg)


def hydrated(pg):
    """The cycler only works once React has hydrated it."""
    pg.wait_for_function("(() => { const b = document.querySelector('button.theme-cycler'); return b && Object.keys(b).some(k => k.startsWith('__reactProps')); })()")


def theme(pg):
    return pg.evaluate("document.documentElement.dataset.theme")


def cycler(pg):
    # Desktop sidebar or phone menu: the same single button.
    return pg.locator("button.theme-cycler")


had_setting = sql_value("""SELECT value FROM "SiteSetting" WHERE key = 'default_theme'""")
had_bio_photo = sql_value("""SELECT count(*) FROM "SiteSetting" WHERE key = 'bio_photo'""") != "0"
sql("""DELETE FROM "SiteSetting" WHERE key = 'default_theme'""")
if not had_bio_photo:  # the sticky column only exists with a photo
    sql("""INSERT INTO "SiteSetting" (key, value) VALUES ('bio_photo', '/images/example-flyer.png'), ('bio_photo_alt', 'e2e')""")
subprocess.run(["npm", "run", "-s", "admin:create"], cwd=ROOT, check=True,
               env={**os.environ, "ADMIN_EMAIL": EMAIL, "ADMIN_PASSWORD": PW}, capture_output=True)

try:
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        errors = []

        def fresh(vw=1366, vh=900, init=None):
            ctx = b.new_context(viewport={"width": vw, "height": vh})
            ctx.add_init_script(FIRST_PAINT)
            if init:
                ctx.add_init_script(init)
            pg = ctx.new_page()
            pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
            pg.on("pageerror", lambda e: errors.append(str(e)))
            return ctx, pg

        # --- fresh visitor: the default (pop art) ---
        ctx, pg = fresh()
        load(pg, "/")
        check(theme(pg) == "pop-art", f"a fresh visitor gets pop art by default ({theme(pg)})")
        check(pg.evaluate("localStorage.getItem('wk-theme')") is None, "nothing is stored until the visitor picks a theme")
        btn = cycler(pg)
        check(btn.count() == 1 and "pop art" in btn.inner_text(), f"the sidebar button names the current theme ({btn.inner_text()!r})")
        check("demo mode" in (btn.get_attribute("aria-label") or ""), "its label tells you what pressing it switches to")

        # --- cycle order + storage + visible change ---
        pg.wait_for_timeout(900)
        bgs = {"pop-art": pg.evaluate("getComputedStyle(document.body).backgroundColor")}
        for i in range(1, 4):
            want, name = CYCLE[i % 3]
            cycler(pg).click()
            pg.wait_for_function(f"document.documentElement.dataset.theme === '{want}'", timeout=3000)
            stored = pg.evaluate("localStorage.getItem('wk-theme')")
            label = cycler(pg).inner_text()
            check(theme(pg) == want and stored == want and name in label,
                  f"press {i}: -> {name} (html {theme(pg)}, stored {stored}, button {label!r})")
            pg.wait_for_timeout(900)  # body's background has a 0.6s transition
            bgs.setdefault(want, pg.evaluate("getComputedStyle(document.body).backgroundColor"))
        check(len(set(bgs.values())) == 3, f"each theme really changes the page ({bgs})")

        # --- persistence: reload + a new page in the same browser, applied before first paint ---
        cycler(pg).click(); cycler(pg).click()  # pop art -> demo -> Original Design
        pg.wait_for_function("document.documentElement.dataset.theme === 'original'")
        pg.reload(); hydrated(pg)
        check(theme(pg) == "original" and "Original Design" in cycler(pg).inner_text(), "a reload keeps Original Design")
        check(pg.evaluate("window.__themeAtBody") == "original", f"the stored theme is on <html> before first paint (no flash) ({pg.evaluate('window.__themeAtBody')})")
        pg2 = ctx.new_page(); load(pg2, "/lab")
        check(theme(pg2) == "original", "another page in the same browser opens in the chosen theme")
        ctx.close()

        # --- the old demo toggle's key still means demo mode ---
        ctx, pg = fresh(init="localStorage.setItem('wk-demo-mode','on')")
        load(pg, "/")
        check(theme(pg) == "demo" and "demo mode" in cycler(pg).inner_text(), "a visitor who had demo mode on (old toggle) still gets demo mode")
        cycler(pg).click(); pg.wait_for_function("document.documentElement.dataset.theme === 'original'")
        check(pg.evaluate("localStorage.getItem('wk-demo-mode')") is None, "cycling retires the old key")
        ctx.close()

        # --- bio sticky column in every theme ---
        for tid, name in CYCLE:
            ctx, pg = fresh(init=f"localStorage.setItem('wk-theme','{tid}')")
            load(pg, "/bio")
            fit = pg.evaluate("(() => { const b = document.querySelector('button.theme-cycler').getBoundingClientRect(), n = document.querySelector('.site-nav').getBoundingClientRect(); return [b.right, n.right]; })()")
            check(fit[0] <= fit[1] - 8, f"{name}: the theme button fits inside the sidebar (button right {fit[0]:.0f}, sidebar right {fit[1]:.0f})")
            pg.evaluate("document.querySelector('.bio-prose').insertAdjacentHTML('beforeend', '<p>filler</p>'.repeat(120))")
            h0 = pg.locator(".bio-keep h1").evaluate("e => e.getBoundingClientRect().top")
            t0 = pg.locator(".bio-prose p").first.evaluate("e => e.getBoundingClientRect().top")
            band = pg.locator(".bio-band")
            shown = band.evaluate("e => getComputedStyle(e).display") != "none"
            b0 = band.evaluate("e => e.getBoundingClientRect().bottom")
            pg.mouse.wheel(0, 900); pg.wait_for_timeout(400)
            h1 = pg.locator(".bio-keep h1").evaluate("e => e.getBoundingClientRect().top")
            t1 = pg.locator(".bio-prose p").first.evaluate("e => e.getBoundingClientRect().top")
            b1 = band.evaluate("e => e.getBoundingClientRect().bottom")
            check(abs(h1 - h0) < 1 and t1 < t0 - 500, f"{name}: bio heading + photo stay frozen while the text scrolls (heading {h0:.0f}->{h1:.0f}, text {t0:.0f}->{t1:.0f})")
            if tid == "pop-art":
                check(shown and abs(b1 - b0) < 1, f"{name}: the sticky colour band stays put with the heading ({b0:.0f}->{b1:.0f})")
            else:
                check(not shown, f"{name}: no pop-art band (the page has its own plain header)")
            ctx.close()

        # --- admin default ---
        ctx, pg = fresh()
        pg.goto(f"{BASE}/admin/theme")
        check("/login" in pg.url, "the theme admin page needs a login")
        pg.fill("input[name=email]", EMAIL); pg.fill("input[name=password]", PW)
        pg.click("button:text('Log in')")
        pg.wait_for_selector("form.theme-default-form")
        check(pg.locator("input[name=theme][value=pop-art]").is_checked(), "the admin picker starts on pop art (default)")
        check(pg.locator("input[name=theme]").count() == 3, "the picker lists all three themes")
        pg.check("input[name=theme][value=original]")
        with pg.expect_navigation(url=lambda u: "saved=1" in u):
            pg.click("button:text('Save default')")
        check(pg.locator("input[name=theme][value=original]").is_checked(), "the admin default saves (Original Design)")
        check(sql_value("""SELECT value FROM "SiteSetting" WHERE key = 'default_theme'""") == "original", "stored in SiteSetting default_theme")
        ctx.close()

        ctx, pg = fresh()  # brand-new, no storage, logged out
        for path in ("/", "/bio", "/lab"):
            load(pg, f"{path}")
            check(theme(pg) == "original" and "Original Design" in cycler(pg).inner_text(), f"fresh logged-out visitor on {path} gets the admin default (Original Design)")
        cycler(pg).click(); pg.wait_for_function("document.documentElement.dataset.theme === 'pop-art'")
        check(True, "cycling from the admin default goes on to the next theme (pop art)")
        ctx.close()
        ctx, pg = fresh(init="localStorage.setItem('wk-theme','demo')")
        load(pg, "/")
        check(theme(pg) == "demo" and pg.evaluate("window.__themeAtBody") == "demo", "a visitor who chose demo mode keeps it over the admin default (and pre-paint)")
        ctx.close()

        # Forged value is refused.
        ctx, pg = fresh()
        pg.goto(f"{BASE}/admin/theme")
        pg.fill("input[name=email]", EMAIL); pg.fill("input[name=password]", PW); pg.click("button:text('Log in')")
        pg.wait_for_selector("form.theme-default-form")
        pg.evaluate("""document.querySelectorAll('input[name=theme]').forEach(r => { r.checked = false; r.disabled = true; });
            document.querySelector('form.theme-default-form').insertAdjacentHTML('beforeend', '<input type=hidden name=theme value=neon>')""")
        with pg.expect_navigation(url=lambda u: "error=1" in u):
            pg.click("button:text('Save default')")
        check(sql_value("""SELECT value FROM "SiteSetting" WHERE key = 'default_theme'""") == "original", "a forged theme name is refused")
        pg.check("input[name=theme][value=pop-art]")
        with pg.expect_navigation(url=lambda u: "saved=1" in u):
            pg.click("button:text('Save default')")
        ctx.close()
        ctx, pg = fresh(); load(pg, "/")
        check(theme(pg) == "pop-art", "setting the default back to pop art takes effect for new visitors")
        ctx.close()

        hyd = [e for e in errors if "ydrat" in e or "did not match" in e]
        check(not hyd, f"no hydration errors in any theme ({hyd[:2]})")

        # --- screenshots ---
        if os.environ.get("SHOTS", "1") != "0":
            SHOTS.mkdir(parents=True, exist_ok=True)
            for tid, _ in CYCLE:
                for label, (vw, vh) in (("desktop", (1366, 900)), ("phone", (390, 844))):
                    ctx, pg = fresh(vw, vh, init=f"localStorage.setItem('wk-theme','{tid}')")
                    for path, slug in (("/", "home"), ("/bio", "bio"), ("/lab", "lab"), ("/songbook", "songbook")):
                        try:
                            pg.goto(f"{BASE}{path}"); pg.wait_for_load_state("networkidle", timeout=8000)
                        except Exception:
                            pass  # embeds on / can keep the network busy
                        pg.wait_for_timeout(600)
                        pg.screenshot(path=str(SHOTS / f"{tid}-{slug}-{label}.png"))
                        if slug == "bio" and label == "desktop":
                            pg.mouse.wheel(0, 700); pg.wait_for_timeout(400)
                            pg.screenshot(path=str(SHOTS / f"{tid}-bio-scrolled-desktop.png"))
                    if label == "phone":  # the cycler in the phone menu
                        pg.click("button.menu-button"); pg.wait_for_timeout(300)
                        pg.screenshot(path=str(SHOTS / f"{tid}-menu-phone.png"))
                    ctx.close()
            print(f"screenshots: {SHOTS}")
        b.close()
finally:
    remove_user(EMAIL)
    sql("""DELETE FROM "SiteSetting" WHERE key = 'default_theme'""")
    if had_setting:
        sql(f"""INSERT INTO "SiteSetting" (key, value) VALUES ('default_theme', '{had_setting}')""")
    if not had_bio_photo:
        sql("""DELETE FROM "SiteSetting" WHERE key IN ('bio_photo', 'bio_photo_alt')""")

print(f"\n{'ALL PASS' if fails == 0 else f'{fails} FAILURE(S)'}")
sys.exit(1 if fails else 0)
