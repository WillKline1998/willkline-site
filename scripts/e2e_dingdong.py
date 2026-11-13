"""End-to-end test of /dingdong against a local `next start` on :3123 (throwaway DB with the days imported).

Checks: every stored day renders newest first with its diary text and stage badge; Play on each day makes
Tone.js fire exactly the notes in that day's pattern, at the right times, with non-silent audio; a day with a
broken pattern still shows its diary (no Play button, no crash); no 500s or page errors; screenshots at
desktop and phone widths go to docs/mockups/dingdong-*.png. The broken test day is removed afterwards.
Studio (top of the page): renders awake with the mood face (newest day), sound is off by default (no notes fire),
"Listen in" swaps the face to 'singing' and loops the pattern (a second pass of notes observed, timed one bar
later), stopping returns the mood face; Ding Dong actually moves; reduced motion gives a static pose; a newest day
with a broken tune shows him asleep (neutral face, no Listen button).
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


rows = json.loads(sql_value("""SELECT coalesce(json_agg(json_build_object('day', day, 'diary', diary, 'stage', stage, 'pattern', pattern, 'likedIt', "likedIt") ORDER BY day DESC), '[]') FROM "DingDongDay" """))
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
        # --- Studio, while the broken day is newest: he must be asleep, not crashed.
        st = pg.locator(".dd-studio")
        check(st.get_attribute("data-asleep") == "1" and st.get_attribute("data-face") == "neutral" and pg.locator(".dd-listen").count() == 0,
              "studio: broken newest day -> asleep, neutral face, no Listen button")
        check(pg.locator(".dd-face:not([hidden])").get_attribute("src") == "/dingdong/dingdong-neutral.svg", "studio: neutral face image shown")
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
        # --- Studio, awake (broken day gone, newest real day on top).
        pg.goto(BASE + "/dingdong")
        pg.wait_for_function("() => !!window.Tone")
        top = rows[0]
        mood = {True: "happy", False: "confused"}.get(top.get("likedIt"), "neutral")
        st = pg.locator(".dd-studio")
        check(st.get_attribute("data-asleep") == "0" and st.get_attribute("data-face") == mood, f"studio: awake, mood face '{st.get_attribute('data-face')}' (want {mood})")
        imgs = pg.evaluate("() => Promise.all([...document.querySelectorAll('.dd-face')].map(i => fetch(i.src).then(r => r.status + ' ' + r.headers.get('content-type'))))")
        check(all(x.startswith("200 image/svg") for x in imgs), f"studio: face SVGs load {imgs}")
        pg.evaluate("() => { window.__dingdong = { events: [], playing: null }; }")
        a = pg.eval_on_selector(".dd-guy", "e => e.style.transform")
        pg.wait_for_timeout(1500)
        b2 = pg.eval_on_selector(".dd-guy", "e => e.style.transform")
        check(pg.locator(".dd-room").get_attribute("data-anim") == "on" and a != b2 and a, f"studio: he moves (rAF) {a!r} -> {b2!r}")
        check(st.get_attribute("data-sound") == "off" and pg.evaluate("window.__dingdong.events.length") == 0, "studio: muted by default (no notes before tap)")
        pg.evaluate("""() => Tone.start().then(() => {
            const an = new Tone.Analyser('waveform', 1024); Tone.getDestination().connect(an); window.__peak = 0;
            setInterval(() => { for (const v of an.getValue()) window.__peak = Math.max(window.__peak || 0, Math.abs(v)); }, 10);
        })""")
        pg.locator(".dd-listen").click()
        pg.wait_for_function("() => document.querySelector('.dd-studio').dataset.sound === 'on'")
        check(st.get_attribute("data-face") == "singing" and pg.locator(".dd-face:not([hidden])").get_attribute("src").endswith("singing.svg"), "studio: face swaps to singing while listening")
        p = top["pattern"]
        spb = 60 / p["tempo"]
        bar = p.get("beats", 8) * spb
        n = len(p["notes"])
        pg.wait_for_function(f"() => window.__dingdong.events.filter(e => e.pass === 1).length >= {n}", timeout=int((2 * bar + 5) * 1000))
        ev = pg.evaluate("window.__dingdong.events")
        p0 = [(e["beat"], e["pitch"]) for e in ev if e["pass"] == 0]
        p1 = [e for e in ev if e["pass"] == 1]
        want = [(x["beat"], x.get("pitch", "C5")) for x in p["notes"]]
        e0 = [e for e in ev if e["pass"] == 0]
        gap = all(abs(b["time"] - a["time"] - bar) < 0.02 for a, b in zip(e0, p1))
        check(p0 == want and [(e["beat"], e["pitch"]) for e in p1] == want and gap, f"studio: loops: pass0 {len(p0)}/{n}, pass1 {len(p1)}/{n}, one bar ({bar:.2f}s) apart={gap}")
        check(pg.evaluate("window.__peak || 0") > 0.01, "studio: loop audio is non-silent")
        pg.locator(".dd-listen").click()
        pg.wait_for_function("() => document.querySelector('.dd-studio').dataset.sound === 'off'")
        check(st.get_attribute("data-face") == mood, "studio: stop -> back to mood face")
        pg.locator(".dd-listen").click()
        pg.wait_for_timeout(700)
        pg.screenshot(path=str(out / "dingdong-desktop.png"), full_page=True)
        pg.locator(".dd-studio").screenshot(path=str(out / "dingdong-studio-desktop.png"))
        pg.locator(".dd-listen").click()
        rm = b.new_page(viewport={"width": 1366, "height": 900}, reduced_motion="reduce")
        rm.on("pageerror", lambda e: errors.append(str(e)))
        rm.goto(BASE + "/dingdong")
        t1 = rm.eval_on_selector(".dd-guy", "e => e.style.transform")
        rm.wait_for_timeout(1200)
        t2 = rm.eval_on_selector(".dd-guy", "e => e.style.transform")
        check(t1 == t2 == "" and rm.locator(".dd-room").get_attribute("data-anim") is None, "reduced motion: static pose, no rAF loop")
        rm.close()
        phone = b.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        phone.on("pageerror", lambda e: errors.append(str(e)))
        phone.goto(BASE + "/dingdong")
        wide = phone.evaluate("document.documentElement.scrollWidth")
        check(wide <= 390, f"phone: no sideways scroll (scrollWidth {wide})")
        tap = phone.locator(".dd-play").first.bounding_box()
        check(tap["height"] >= 44, f"phone: Play tap target {tap['height']:.0f}px tall")
        sb = phone.locator(".dd-studio").bounding_box()
        lb = phone.locator(".dd-listen").bounding_box()
        check(sb["width"] <= 390 and lb["height"] >= 44, f"phone: studio {sb['width']:.0f}x{sb['height']:.0f}, Listen tap target {lb['height']:.0f}px")
        h1 = phone.eval_on_selector(".dd-feed", "e => e.getBoundingClientRect().top")
        phone.wait_for_timeout(1500)
        h2 = phone.eval_on_selector(".dd-feed", "e => e.getBoundingClientRect().top")
        check(h1 == h2, f"phone: no layout shift while he wanders (feed top {h1} -> {h2})")
        phone.screenshot(path=str(out / "dingdong-phone.png"), full_page=True)
        phone.locator(".dd-studio").screenshot(path=str(out / "dingdong-studio-phone.png"))
        check(not errors, f"page errors: {errors or 'none'}")
        check(not bad, f"5xx responses: {bad or 'none'}")
        b.close()
finally:
    sql(f"""DELETE FROM "DingDongDay" WHERE day = {BROKEN};""")

print("ALL PASS" if not fails else f"{fails} FAILURE(S)")
sys.exit(1 if fails else 0)
