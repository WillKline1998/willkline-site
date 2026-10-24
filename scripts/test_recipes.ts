// Run: npx tsx --test scripts/test_recipes.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { RECIPE_LIMITS, cleanLines, parseTags } from "../src/lib/recipes";

test("tags are lower-cased, trimmed, de-duplicated and split on commas", () => {
  assert.deepEqual(parseTags("Indian, Vegan; weeknight  \n #Meal   Prep, vegan"), ["indian", "vegan", "weeknight", "meal prep"]);
  assert.deepEqual(parseTags(" , ,, "), []);
});

test("tags are capped in number and length", () => {
  assert.equal(parseTags("a,b,c,d,e,f,g,h").length, RECIPE_LIMITS.tags);
  assert.equal(parseTags("x".repeat(100))[0].length, RECIPE_LIMITS.tag);
});

test("blank ingredient and step lines are dropped, long ones cut", () => {
  assert.deepEqual(cleanLines(["  1 cup lentils ", "", "   ", "salt"], 50), ["1 cup lentils", "salt"]);
  assert.equal(cleanLines(["y".repeat(500)], 200)[0].length, 200);
});
