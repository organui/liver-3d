import { expect, test } from "bun:test";
import {
  allStructureIds,
  anatomyTree,
  assertAnatomyMapping,
  groupIds,
  hiddenFromVisibility,
  isStructureId,
  normalizeVisibility,
  sceneIdsForNode,
  visibilityFromHidden,
} from "./anatomy-adapter";
import { structures } from "./anatomy";

test("every scene structure appears exactly once as a tree leaf", () => {
  expect(() => assertAnatomyMapping()).not.toThrow();
  expect(anatomyTree.map(({ id }) => id)).toEqual([
    "liver",
    "group-blood-vessels",
    "group-biliary-system",
  ]);
});

test("mapping validation rejects missing, unknown, and duplicate leaves", () => {
  const [liver, vessels, biliary] = anatomyTree;
  expect(() => assertAnatomyMapping([vessels!, biliary!])).toThrow(
    /missing=liver/,
  );
  expect(() =>
    assertAnatomyMapping([...anatomyTree, { id: "lobe", label: "Lobe" }]),
  ).toThrow(/unknown=lobe/);
  expect(() => assertAnatomyMapping([...anatomyTree, liver!])).toThrow(
    /duplicates=liver/,
  );
});

test("interface groups map to their descendant scene structures", () => {
  expect(sceneIdsForNode("group-blood-vessels")).toEqual([
    "portal",
    "hepatic-veins",
    "artery",
  ]);
  expect(sceneIdsForNode("group-biliary-system")).toEqual([
    "gallbladder",
    "biliary",
    "cystic",
  ]);
  expect(sceneIdsForNode("cystic")).toEqual(["cystic"]);
  expect(sceneIdsForNode("nope")).toEqual([]);
  expect(sceneIdsForNode(null)).toEqual([]);
  expect(isStructureId("group-blood-vessels")).toBe(false);
  expect(isStructureId("portal")).toBe(true);
});

test("tree visibility treats missing leaves as visible and round-trips the hidden list", () => {
  expect(normalizeVisibility({ portal: false })).toMatchObject({
    portal: false,
    liver: true,
    cystic: true,
  });
  expect(visibilityFromHidden(["artery", "liver"])).toEqual({
    artery: false,
    liver: false,
  });
  expect(
    hiddenFromVisibility({ artery: false, liver: false, portal: true }),
  ).toEqual(["liver", "artery"]);
  expect(hiddenFromVisibility({})).toEqual([]);
  expect(hiddenFromVisibility(visibilityFromHidden(allStructureIds))).toEqual(
    allStructureIds,
  );
});

test("leaves carry their mesh colour and group rows are not selectable", () => {
  const rows = anatomyTree.flatMap((node) => [node, ...(node.children ?? [])]);
  for (const row of rows) {
    const structure = structures.find(({ id }) => id === row.id);
    if (structure) {
      expect(row.color).toBe(structure.color);
      expect(row.selectable).toBeUndefined();
    } else {
      expect(groupIds).toContain(row.id as (typeof groupIds)[number]);
      expect(row.selectable).toBe(false);
      expect(row.color).toBeUndefined();
    }
  }
  expect(rows.filter((row) => row.color)).toHaveLength(structures.length);
});
