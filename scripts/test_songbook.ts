// Run: npx tsx --test scripts/test_songbook.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { flatten, matchesPages, pagesLabel, pathTo, prettyTitle, subtreeIds, wouldCycle, type FolderNode } from "../src/lib/songbook";

const tree: FolderNode[] = [
  { id: "g", name: "Gospel", parentId: null },
  { id: "g1", name: "One page", parentId: "g" },
  { id: "g2", name: "Two pages", parentId: "g" },
  { id: "o", name: "Originals", parentId: null },
  { id: "o3", name: "Long", parentId: "o" },
  { id: "g1x", name: "Deep", parentId: "g1" },
];

test("titles come from file names", () => {
  assert.equal(prettyTitle("Amazing_Grace-v2 (piano).pdf"), "Amazing Grace-v2 (piano)");
  assert.equal(prettyTitle("  Blue   Moon.PDF "), "Blue Moon");
  assert.equal(prettyTitle(".pdf"), "Untitled");
});

test("a folder's subtree is everything inside it at any depth", () => {
  assert.deepEqual([...subtreeIds(tree, "g")].sort(), ["g", "g1", "g1x", "g2"]);
  assert.deepEqual([...subtreeIds(tree, "o3")], ["o3"]);
});

test("breadcrumbs run top-down and survive a loop in bad data", () => {
  assert.deepEqual(pathTo(tree, "g1x").map((f) => f.name), ["Gospel", "One page", "Deep"]);
  assert.deepEqual(pathTo(tree, null), []);
  const loop: FolderNode[] = [{ id: "a", name: "A", parentId: "b" }, { id: "b", name: "B", parentId: "a" }];
  assert.equal(pathTo(loop, "a").length, 2);
});

test("a folder can't be moved into itself or its own child", () => {
  assert.equal(wouldCycle(tree, "g", "g1x"), true);
  assert.equal(wouldCycle(tree, "g", "g"), true);
  assert.equal(wouldCycle(tree, "g1", "o"), false);
  assert.equal(wouldCycle(tree, "g1", null), false);
});

test("pickers list folders in tree order with full labels", () => {
  const f = flatten(tree);
  assert.deepEqual(f.map((x) => x.label), ["Gospel", "Gospel / One page", "Gospel / One page / Deep", "Gospel / Two pages", "Originals", "Originals / Long"]);
  assert.deepEqual(f.map((x) => x.depth), [0, 1, 2, 1, 0, 1]);
});

test("page filters", () => {
  assert.equal(matchesPages(1, "1"), true);
  assert.equal(matchesPages(2, "1"), false);
  assert.equal(matchesPages(2, "2"), true);
  assert.equal(matchesPages(5, "3"), true);
  assert.equal(matchesPages(2, "3"), false);
  assert.equal(matchesPages(9, undefined), true);
  assert.equal(pagesLabel(1), "1 page");
  assert.equal(pagesLabel(3), "3 pages");
});
