import { expect, test } from "bun:test";
import { allIds, isolate, selectVisible, toggleHidden } from "../src/state";
test("A hidden structure can be selected after isolation without losing it from the scene", () => {
  let hidden = isolate("portal");
  hidden = toggleHidden(hidden, "portal");
  expect(new Set(hidden)).toEqual(new Set(allIds));
  hidden = selectVisible(hidden, "gallbladder");
  expect(hidden.includes("gallbladder")).toBe(false);
  expect(hidden.length).toBe(6);
  expect(new Set(hidden).size).toBe(hidden.length);
});
test("Repeated hide/show and list selections cannot create duplicate visibility entries", () => {
  let hidden: typeof allIds = [];
  for (const id of allIds) {
    hidden = toggleHidden(hidden, id);
    hidden = selectVisible(hidden, id);
    hidden = selectVisible(hidden, id);
  }
  expect(hidden).toEqual([]);
  expect(isolate("liver")).not.toContain("liver");
});
