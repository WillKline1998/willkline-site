"""End-to-end test of /dingdong against a local `next start` on :3123 (throwaway DB with the days imported).

Checks: every stored day renders newest first with its diary text and stage badge; Play on each day makes
Tone.js fire exactly the notes in that day's pattern, at the right times, with non-silent audio; a day with a
broken pattern still shows its diary (no Play button, no crash); no 500s or page errors; screenshots at
desktop and phone widths go to docs/mockups/dingdong-*.png. The broken test day is removed afterwards.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_dingdong.py
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
from testdb import sql, sql_value

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
BROKEN = 9999
fails = 0


def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


rows = json.loads(sql_value("""SELECT coalesce(json_agg(json_build_object('day', day, 'diary', diary, 'stage', stage, 'pattern', pattern) ORDER BY day DESC), '[]') FROM "DingDongDay" """))
check(len(rows) > 0, f"{len(rows)} days in the database")
sql(f"""DELETE FROM "DingDongDay" WHERE day = {BROKEN};
INSERT INTO "DingDongDay" (id, day, stage, diary, pattern) VALUES ('e2e-broken', {BROKEN}, 'intervals', 'E2E broken day: the diary must still show.', '{{"tempo": "fast", "notes": "oops"}}');""")

try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(channel="chrome", headless=True, args=["--autoplay-policy=no-user-gesture-required"])
        pg = b.new_page(viewport={"width": 1366, "height": 1000})
        pg.set_default_timeout(15000)
        errors, bad = [], []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        pg.on("response", lambda r: bad.append(f"{r.status} {r.url}") if r.status >= 500 else None)
        resp = pg.goto(BASE + "/dingdong")
        check(resp.status == 200, f"/dingdong status {resp.status}")
        pg.wait_for_function("() => !!window.Tone")
        shown = [int(x) for x in pg.eval_on_selector_all(".dd-day", "els => els.map(e => e.dataset.day)")]
        check(shown == [BROKEN] + [r["day"] for r in rows], f"days newest first: {shown}")
        check(pg.locator(".dd-now .dd-badge").inner_text() == "ear stage: intervals", "current stage badge (broken test day is 'intervals')")
        broken = pg.locator(f"#day-{BROKEN}")
        check("diary must still show" in broken.inner_text() and broken.locator(".dd-play").count() == 0, "malformed pattern: diary shown, no Play button")
        pg.evaluate("""() => Tone.start().then(() => {
            const an = new Tone.Analyser('waveform', 1024); Tone.getDestination().connect(an);
            setInterval(() => { for (const v of an.getValue()) window.__peak = Math.max(window.__peak || 0, Math.abs(v)); }, 10);
        })""")
        for r in rows:
            card = pg.locator(f"#day-{r['day']}")
            diary_ok = card.locator(".dd-diary").inner_text().strip() == r["diary"].strip()
            badge_ok = card.locator(".dd-badge").inner_text() == f"ear stage: {r['stage']}"
            pg.evaluate("() => { window.__peak = 0; }")
            card.locator(".dd-play").click()
            pg.wait_for_function(f"() => document.querySelector('#day-{r['day']} .dd-play').textContent.includes('Stop')", timeout=5000)
            p = r["pattern"]
            bar = p.get("beats", 8) * 60 / p["tempo"]
            pg.wait_for_function(f"() => document.querySelector('#day-{r['day']} .dd-play').textContent.includes('Play')", timeout=int((bar + 6) * 1000))
            ev = pg.evaluate("window.__dingdong.events")
            want = [(n["beat"], n.get("pitch", "C5")) for n in p["notes"]]
            got = [(e["beat"], e["pitch"]) for e in ev if e["day"] == r["day"]]
            spb = 60 / p["tempo"]
            t0 = ev[0]["time"] if ev else 0
            timing = all(abs((e["time"] - t0) - (e["beat"] - ev[0]["beat"]) * spb) < 0.02 for e in ev)
            peak = pg.evaluate("window.__peak || 0")
            check(diary_ok and badge_ok and got == want and timing and peak > 0.01,
                  f"day {r['day']}: diary={diary_ok} badge={badge_ok} notes {len(got)}/{len(want)} match={got == want} timing={timing} peak={peak:.3f}")
        out = ROOT / "docs" / "mockups"
        out.mkdir(parents=True, exist_ok=True)
        sql(f"""DELETE FROM "DingDongDay" WHERE day = {BROKEN};""")
        pg.goto(BASE + "/dingdong")
        pg.screenshot(path=str(out / "dingdong-desktop.png"), full_page=True)
        phone = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        phone.on("pageerror", lambda e: errors.append(str(e)))
        phone.goto(BASE + "/dingdong")
        wide = phone.evaluate("document.documentElement.scrollWidth")
        check(wide <= 390, f"phone: no sideways scroll (scrollWidth {wide})")
        tap = phone.locator(".dd-play").first.bounding_box()
        check(tap["height"] >= 44, f"phone: Play tap target {tap['height']:.0f}px tall")
        phone.screenshot(path=str(out / "dingdong-phone.png"), full_page=True)
        check(not errors, f"page errors: {errors or 'none'}")
        check(not bad, f"5xx responses: {bad or 'none'}")
        b.close()
finally:
    sql(f"""DELETE FROM "DingDongDay" WHERE day = {BROKEN};""")

print("ALL PASS" if not fails else f"{fails} FAILURE(S)")
sys.exit(1 if fails else 0)
