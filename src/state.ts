import { structures, type StructureId } from "./anatomy";
export const allIds = structures.map((s) => s.id);
export function toggleHidden(hidden: StructureId[], id: StructureId) {
  return hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
}
export function isolate(id: StructureId) {
  return allIds.filter((x) => x !== id);
}
export function selectVisible(hidden: StructureId[], id: StructureId) {
  return hidden.filter((x) => x !== id);
}
