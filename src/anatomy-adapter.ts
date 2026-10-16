import {
  anatomyIndex,
  leafIds,
  type AnatomyNode,
} from "@/components/ui/anatomy-tree";
import { structures, type StructureId } from "./anatomy";

type Category = (typeof structures)[number]["category"];

// Interface groupings only. They collect list rows by kind; they do not claim
// that the vessels or ducts are contained in, or branches of, one another.
const groups = [
  { id: "group-blood-vessels", label: "Blood vessels", category: "Vessel" },
  { id: "group-biliary-system", label: "Biliary system", category: "Biliary" },
] as const satisfies readonly {
  id: `group-${string}`;
  label: string;
  category: Category;
}[];

// Each leaf's swatch is the structure's colour, the same one its 3D mesh uses.
const leaf = ({
  id,
  name,
  color,
}: (typeof structures)[number]): AnatomyNode => ({
  id,
  label: name,
  color,
});

// The single liver surface stays a top-level leaf, so no group row implies
// that the vessels or bile ducts sit inside it. Group rows are not selectable:
// clicking one (or pressing Enter on it) expands or collapses it.
export const anatomyTree: readonly AnatomyNode[] = [
  ...structures.filter((s) => s.category === "Organ").map(leaf),
  ...groups.map(({ id, label, category }) => ({
    id,
    label,
    selectable: false,
    children: structures.filter((s) => s.category === category).map(leaf),
  })),
];

export const groupIds = groups.map(({ id }) => id);
export const allStructureIds: StructureId[] = structures.map(({ id }) => id);

const structureIds = new Set<string>(allStructureIds);
const { nodes } = anatomyIndex(anatomyTree);

export function isStructureId(id: string | null): id is StructureId {
  return id !== null && structureIds.has(id);
}

/** Scene structures (GLB groups) drawn for a tree row: itself or its leaves. */
export function sceneIdsForNode(id: string | null): StructureId[] {
  const node = id === null ? undefined : nodes.get(id);
  return node ? leafIds(node).filter(isStructureId) : [];
}

/** The tree's contract: a leaf-ID map in which a missing entry means visible. */
export function normalizeVisibility(
  visibility: Readonly<Record<string, boolean>>,
): Record<StructureId, boolean> {
  return Object.fromEntries(
    allStructureIds.map((id) => [id, visibility[id] !== false]),
  ) as Record<StructureId, boolean>;
}

/** App hidden list -> controlled tree visibility. */
export function visibilityFromHidden(
  hidden: readonly StructureId[],
): Record<string, boolean> {
  return Object.fromEntries(hidden.map((id) => [id, false]));
}

/** Tree visibility -> app hidden list, in stable structure order. */
export function hiddenFromVisibility(
  visibility: Readonly<Record<string, boolean>>,
): StructureId[] {
  const normalized = normalizeVisibility(visibility);
  return allStructureIds.filter((id) => !normalized[id]);
}

export function assertAnatomyMapping(
  data: readonly AnatomyNode[] = anatomyTree,
) {
  const leaves = data.flatMap(leafIds);
  const duplicates = leaves.filter((id, index) => leaves.indexOf(id) !== index);
  const missing = allStructureIds.filter((id) => !leaves.includes(id));
  const unknown = leaves.filter((id) => !structureIds.has(id));
  if (duplicates.length || missing.length || unknown.length)
    throw new Error(
      `Invalid anatomy mapping: duplicates=${duplicates.join(",")} missing=${missing.join(",")} unknown=${unknown.join(",")}`,
    );
}

assertAnatomyMapping();
