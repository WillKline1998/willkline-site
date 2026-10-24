"""End-to-end test of Recipes against a local `next start` on :3123.

A throwaway member signs in and shares a recipe with the + / x line buttons, then the test checks the
details page, the wall, the tag filter (choosing tags WIDENS the results: vegan + indian = all vegan plus
all Indian; "all of them" narrows), reports hiding a recipe, edit and delete. Everything it makes is removed.
Run: ~/JobSearch/.venv/bin/python scripts/e2e_recipes.py
"""
import json
import secrets
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright
from testdb import remove_user, sql, sql_value

BASE = "http://localhost:3123"
ROOT = Path(__file__).resolve().parent.parent
EMAIL, HANDLE, PW = "e2e-recipes@test.local", "e2e_cook", secrets.token_urlsafe(14)
OTHERS = [f"e2e-recipes-r{i}@test.local" for i in (1, 2, 3)]
fails = 0


def check(cond, msg):
    global fails
    print(("PASS " if cond else "FAIL ") + msg)
    fails += 0 if cond else 1


def make_user(uid, email, handle, pw=None):
    hashed = "x"
    if pw:
        hashed = subprocess.run(
            ["npx", "tsx", "-e", f"import('./scripts/hash').then(async m => console.log(await m.hashPasswordNode({json.dumps(pw)})))"],
            cwd=ROOT, check=True, capture_output=True, text=True,
        ).stdout.strip()
    remove_user(email)
    sql(f"""INSERT INTO "User" (id, email, name, handle, role, "passwordHash") VALUES ('{uid}', '{email}', '{handle}', '{handle}', 'MEMBER', '{hashed}');""")


def seed_recipe(rid, name, tags, minutes_ago):
    arr = ",".join(f"'{t}'" for t in tags)
    sql(
        f"""INSERT INTO "Recipe" (id, "authorId", name, ingredients, steps, tags, "createdAt", "updatedAt")
        VALUES ('{rid}', 'e2e-recipes-other1', '{name}', ARRAY['x'], ARRAY['y'], ARRAY[{arr}]::text[], now() - interval '{minutes_ago} minutes', now());"""
    )


def titles(page):
    return [t.strip() for t in page.locator(".recipe-card strong").all_inner_texts()]


make_user("e2e-recipes-user", EMAIL, HANDLE, PW)
for i, e in enumerate(OTHERS, 1):
    make_user(f"e2e-recipes-other{i}", e, f"e2e_other{i}")
try:
    seed_recipe("e2e-r-vegan", "E2E Vegan only", ["vegan"], 30)
    seed_recipe("e2e-r-indian", "E2E Indian only", ["indian"], 20)
    seed_recipe("e2e-r-both", "E2E Vegan Indian", ["vegan", "indian"], 10)
    seed_recipe("e2e-r-plain", "E2E No tags", [], 5)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)
        page = browser.new_context(viewport={"width": 1100, "height": 1300}).new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:160]))

        # Public wall and the tag filter (no login needed to look).
        page.goto(f"{BASE}/recipes")
        check(page.locator("h1").inner_text() == "Recipes", "the wall loads for a visitor")
        check({"E2E Vegan only", "E2E Indian only", "E2E Vegan Indian", "E2E No tags"} <= set(titles(page)), "and shows every recipe")
        check(titles(page).index("E2E No tags") < titles(page).index("E2E Vegan only"), "newest first by default")
        page.goto(f"{BASE}/recipes?sort=old")
        t = titles(page)
        check(t.index("E2E Vegan only") < t.index("E2E No tags"), "oldest first on request")
        page.goto(f"{BASE}/recipes?tag=vegan")
        t = titles(page)
        check("E2E Vegan only" in t and "E2E Vegan Indian" in t and "E2E Indian only" not in t, "one tag shows just that tag")
        page.goto(f"{BASE}/recipes?tag=vegan&tag=indian")
        t = titles(page)
        check({"E2E Vegan only", "E2E Indian only", "E2E Vegan Indian"} <= set(t) and "E2E No tags" not in t, "two tags show everything with EITHER (the union)")
        page.goto(f"{BASE}/recipes?tag=vegan&tag=indian&match=all")
        t = titles(page)
        check("E2E Vegan Indian" in t and "E2E Vegan only" not in t and "E2E Indian only" not in t, "'every tag' narrows to recipes with both")
        page.goto(f"{BASE}/recipes?sort=random")
        check(len(titles(page)) >= 4, "random order still lists them")
        page.goto(f"{BASE}/recipes?tag=vegan")
        page.locator("nav[aria-label='Filter by tag'] a", has_text="indian").first.click()
        page.wait_for_url("**tag=vegan&tag=indian**")
        check("E2E Indian only" in titles(page) and "E2E Vegan only" in titles(page), "clicking a second tag in the picker adds it")

        # Sharing needs an account.
        page.goto(f"{BASE}/recipes/new")
        check("/login" in page.url, "sharing sends a signed-out visitor to log in")
        page.fill("input[name=email]", EMAIL)
        page.fill("input[name=password]", PW)
        page.click("button:text('Log in')")
        page.wait_for_url("**/recipes/new", timeout=15000)

        # Build a recipe with the + and - buttons.
        page.fill("input[name=name]", "E2E Red lentil dal")
        ing = page.locator("input[name=ingredient]")
        ing.first.fill("1 cup red lentils")
        ing.first.press("Enter")  # Enter adds the next line instead of submitting
        check(page.locator("input[name=ingredient]").count() == 2, "Enter in an ingredient adds another line")
        page.locator("input[name=ingredient]").nth(1).fill("2 cups water")
        page.get_by_role("button", name="+ Add ingredient").click()
        page.locator("input[name=ingredient]").nth(2).fill("a lot of salt")
        page.get_by_role("button", name="Remove ingredient 3").click()
        check(page.locator("input[name=ingredient]").count() == 2, "the minus button removes a line")

        step1 = page.locator("textarea[name=step]").first
        h0 = step1.evaluate("e => e.getBoundingClientRect().height")
        step1.fill("Rinse the lentils.\nSimmer with the water until soft.\nStir now and then.\nAdd more water if it catches.\nTaste.\nSalt.")
        h1 = step1.evaluate("e => e.getBoundingClientRect().height")
        check(h1 > h0, f"a step box grows as you type ({h0:.0f}px -> {h1:.0f}px)")
        page.get_by_role("button", name="+ Add step").click()
        page.locator("textarea[name=step]").nth(1).fill("Eat with rice.")
        page.fill("textarea[name=description]", "Weeknight staple. " + "I make this every week and it never gets old. " * 25)
        page.fill("input[name=tags]", "Vegan, Indian,  Meal Prep, vegan")
        page.fill("input[name=sourceText]", "My grandmother")
        page.fill("input[name=sourceUrl]", "not a link")
        page.evaluate("document.querySelector('.recipe-form').noValidate = true")  # skip the browser's own check to test ours
        page.get_by_role("button", name="Share the recipe").click()
        page.wait_for_selector(".form-error")
        check("https://" in page.locator(".form-error").inner_text(), "a bad source link is refused in words")
        check(page.locator("input[name=name]").input_value() == "E2E Red lentil dal" and page.locator("input[name=ingredient]").count() == 2 and page.locator("textarea[name=step]").count() == 2, "and nothing you typed is lost")
        page.fill("input[name=sourceUrl]", "https://example.com/dal")
        page.get_by_role("button", name="Share the recipe").click()
        page.wait_for_url("**/recipes/*", timeout=15000)
        page.wait_for_selector("h1:text('E2E Red lentil dal')")
        rid = page.url.rstrip("/").split("/")[-1]
        body = page.locator("article").inner_text()
        check("1 cup red lentils" in body and "2 cups water" in body and "a lot of salt" not in body, "the recipe page shows the ingredients")
        check("Simmer with the water until soft." in body and "Eat with rice." in body, "and the steps")
        check(f"@{HANDLE}" in body, "and who shared it")
        check("My grandmother" in body and page.locator("a[href='https://example.com/dal']").count() == 1, "and the source, as a link")
        row = sql_value(f"""SELECT array_to_string(tags, '|') || '#' || to_char("createdAt", 'YYYY-MM-DD') FROM "Recipe" WHERE id='{rid}'""")
        check(row.split("#")[0] == "vegan|indian|meal prep", f"tags are cleaned: lower-case, de-duplicated ({row})")
        check(any(m in body for m in ("October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August", "September")) and "2026" in body, "and the date is shown")

        # The recipe comes first; the story is underneath, and a jump button appears only once you are past it.
        page.set_viewport_size({"width": 390, "height": 700})
        page.goto(f"{BASE}/recipes/{rid}")
        y = lambda sel: page.locator(sel).first.evaluate("e => e.getBoundingClientRect().top + scrollY")
        check(y("#ing") < y(".recipe-about") and y("#steps") < y(".recipe-about"), "ingredients and steps come before the description")
        check(y("h1") < y("#ing") and y("#ing") - y("h1") < 300, "and sit right under the title")
        check(page.locator(".jump-to-recipe").count() == 0, "no jump button while the recipe is on screen")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_selector(".jump-to-recipe", timeout=5000)
        check(True, "the jump button appears once you have scrolled past the recipe")
        page.locator(".jump-to-recipe").click()
        page.locator(".jump-to-recipe").wait_for(state="detached", timeout=5000)  # the smooth scroll takes a moment
        check(page.evaluate("window.scrollY") < 400 and page.locator(".jump-to-recipe").count() == 0, "tapping it returns to the recipe and the button goes away")
        page.set_viewport_size({"width": 1100, "height": 1300})

        # Edit.
        page.get_by_role("link", name="Edit").click()
        page.wait_for_selector("input[name=name]")
        check(page.locator("input[name=ingredient]").count() == 2 and page.locator("textarea[name=step]").count() == 2, "edit starts with the saved lines")
        page.fill("input[name=name]", "E2E Red lentil dal v2")
        page.get_by_role("button", name="Save changes").click()
        page.wait_for_selector("h1:text('E2E Red lentil dal v2')")
        check(True, "edit saves")

        # Reports: three people hide it from everyone else.
        for i in (1, 2, 3):
            sql(f"""INSERT INTO "RecipeReport" ("userId", "recipeId") VALUES ('e2e-recipes-other{i}', '{rid}');""")
        sql(f"""UPDATE "Recipe" SET reports=3, hidden=true WHERE id='{rid}'""")
        anon = browser.new_context().new_page()
        resp = anon.goto(f"{BASE}/recipes/{rid}")
        check(resp.status == 404, "a hidden recipe is a 404 to everyone else")
        anon.goto(f"{BASE}/recipes")
        check("E2E Red lentil dal v2" not in titles(anon), "and absent from the wall")
        page.goto(f"{BASE}/recipes/{rid}")
        check("hidden" in page.locator(".admin-note").inner_text().lower(), "but its author still sees it, with a note")
        sql(f"""UPDATE "Recipe" SET hidden=false, reports=0 WHERE id='{rid}'""")

        # Someone else's recipe: no edit or delete, but a report button.
        page.goto(f"{BASE}/recipes/e2e-r-vegan")
        check(page.get_by_role("link", name="Edit").count() == 0 and page.get_by_role("button", name="Delete").count() == 0, "you can't edit or delete someone else's recipe")
        check(page.get_by_role("button", name="Report").count() == 1, "you can report it")
        page.goto(f"{BASE}/recipes/e2e-r-vegan/edit")
        check(page.locator("input[name=name]").count() == 0, "and its edit page refuses you")

        # Empty ingredients are refused.
        page.goto(f"{BASE}/recipes/new")
        page.fill("input[name=name]", "E2E empty")
        page.get_by_role("button", name="Share the recipe").click()
        page.wait_for_selector(".form-error")
        check("ingredient" in page.locator(".form-error").inner_text().lower(), "a recipe with no ingredients is refused in words")

        # Delete.
        page.goto(f"{BASE}/recipes/{rid}")
        page.get_by_role("button", name="Delete").click()
        page.wait_for_url("**/recipes?deleted=1", timeout=15000)
        check(sql_value(f"""SELECT count(*) FROM "Recipe" WHERE id='{rid}'""") == "0", "delete removes it")
        check(not [e for e in errors], f"no page errors {errors[:2]}")
        browser.close()
finally:
    sql("""DELETE FROM "Recipe" WHERE id LIKE 'e2e-r-%' OR name LIKE 'E2E %'""")
    for e in [EMAIL, *OTHERS]:
        remove_user(e)

print(f"\n{'ALL PASS' if not fails else str(fails) + ' FAILED'}")
sys.exit(1 if fails else 0)
