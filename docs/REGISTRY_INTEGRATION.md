# Anatomy-tree registry integration

The Anatomy panel's structure list is the OrganUI registry component `anatomy-tree`, installed with the shadcn CLI. The installed source is tracked in Git; runtime and ordinary setup (`bun install`, `bun run dev`, `bun run build`) never contact a registry. `kidneys-3d` is the reference integration this follows.

## Exact installation

First installed on 2026-10-16 from the registry artifact built from OrganUI `master` at commit `5e20c41`. Reinstalled (overwriting) the same day from the artifact built from OrganUI PR #12 at branch commit `d6b36d0`, which adds the `color` and `selectable` node options and built-in reveal of an outside selection:

```sh
REGISTRY_URL=http://127.0.0.1:4411 bunx shadcn@4.21.0 add http://127.0.0.1:4411/anatomy-tree.json -y -o
```

The URL is a local static server (`python3 -m http.server 4411 --bind 127.0.0.1`) serving that build output plus shadcn's `colors/neutral.json`, fetched from the shadcn GitHub repository. PR #12 was not merged at install time, so the published registry did not yet carry this version. **After #12 merges, re-verify against `https://organui.com/r/anatomy-tree.json`**: its embedded source should match the checksum below, and a reinstall with the command below should leave `src/components/ui/anatomy-tree.tsx` unchanged. `organui.com` and `ui.shadcn.com` were blocked by the network policy of the sandbox the install ran in, so the published URL (`https://organui.com/r/anatomy-tree.json`) could not be used directly. `REGISTRY_URL` points the CLI's own registry lookups (base colors) at the same server. With network access, the equivalent command is:

```sh
bunx shadcn@4.21.0 add https://organui.com/r/anatomy-tree.json -y -o
```

Provenance of the current install (PR #12, `d6b36d0`):

| Artifact                                     | SHA-256                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| Served `anatomy-tree.json`                   | `32fbc477ece5f02ac135dbf0a5b4c059c37fc2ca9abc8982641b55c080cc9b30` |
| Embedded source (`files[0].content`, UTF-8)  | `cb0ebd637b64a9813ba1139560315024b315580ad04e5df6eca3b3d1bb4844c0` |
| Tracked `src/components/ui/anatomy-tree.tsx` | `dc14798adfbdcaef505cbe05e2ca92a6a3aae6164465d06e8d4d99cd415efab2` |

The item declares `@base-ui/react@^1.8.0`; this repository pins `@base-ui/react` 1.8.0 (on both installs the CLI wrote `^1.8.0`, which was changed back to the exact pin and re-locked with `bun install`; the lockfile did not change). Tailwind CSS and `@tailwindcss/vite` are 4.1.18, matching kidneys. `bun.lock` stays in Bun's text format.

## Installed-source differences

The only difference from the embedded source is that the shadcn CLI removed the leading `"use client"` directive and its blank line for this non-RSC Vite target (`components.json` sets `"rsc": false`). Unlike kidneys, the file was not run through the project formatter: it is listed in `.prettierignore` before installation, so it keeps the registry's own formatting and its tracked checksum is stable. Do not hand-edit it; reinstall to update it.

The `@/* -> src/*` alias was added to `tsconfig.json` and `vite.config.ts` before installing, so the CLI wrote the file to `src/components/ui/` directly.

## API used

- `data`: the hierarchy from the adapter (unique IDs), with:
  - `color` on every leaf: the structure's colour from `src/anatomy.ts`, the same value the 3D mesh uses, drawn by the component as a swatch before the label;
  - `selectable: false` on the two `group-*` rows, so clicking a group's name or pressing Enter on it expands or collapses it instead of selecting, and the row carries no `aria-selected`;
- `selectedId` / `onSelectionChange`: the app's single controlled selection;
- `visibility` / `onVisibilityChange`: a controlled map keyed by leaf IDs, where a missing entry means visible;
- `defaultExpandedIds`: both groups start expanded;
- `label` (`"Liver anatomy"`) and `className` (`registry-tree`).

Search and disclosure stay internal to the component. Its search matches row labels only. When `selectedId` changes to a row that is not shown (a 3D pick or tour step inside a collapsed group), the component expands its ancestors and scrolls the row into view; the app has no code for this.

## Application adapter

Scene-specific mapping lives in `src/anatomy-adapter.ts`; the registry component is unchanged.

| Tree ID                | Leaves (structure IDs = GLB `extras.structureId`) | Meaning                                       |
| ---------------------- | ------------------------------------------------- | --------------------------------------------- |
| `liver` (top level)    | `liver`                                           | The combined liver surface                    |
| `group-blood-vessels`  | `portal`, `hepatic-veins`, `artery`               | Interface grouping of the represented vessels |
| `group-biliary-system` | `gallbladder`, `biliary`, `cystic`                | Interface grouping of the biliary structures  |

The groups are built from each structure's existing `category` and reuse the previous list's headings. They are interface groupings only. The liver surface stays a top-level leaf rather than a "Liver" group, so the tree does not suggest that the vessels or ducts are contained in it, and the groups make no claim about branching or containment between their members.

The adapter provides:

- `anatomyTree` and `groupIds` (tree data with leaf colours and non-selectable groups, and default expansion);
- `sceneIdsForNode`: the scene structures a row stands for (itself, or a group's leaves);
- `normalizeVisibility`: applies the "missing means visible" contract to every structure;
- `visibilityFromHidden` / `hiddenFromVisibility`: converts between the app's existing hidden list and the tree's visibility map;
- `isStructureId`: distinguishes leaves from group rows;
- `assertAnatomyMapping`: runs at import and throws if any structure is missing from the tree, a leaf is unknown, or a leaf repeats.

`src/anatomy-adapter.test.ts` (run by `bun test`) covers the mapping, the validation failures, group-to-leaf mapping, the visibility round trip, leaf colours matching the structure colours, and groups being non-selectable.

## Decisions

- **State stays in the app.** `App.tsx` keeps its existing `hidden` list and single `selected` structure. The tree receives `visibilityFromHidden(hidden)` and writes back through `hiddenFromVisibility`. Isolate, Hide/Show, Restore all, the reveal switch, the tour, and reset keep writing the same `hidden` list, so the tree always reflects them.
- **Selection stays on leaves.** The scene highlights one structure (its colour at 0.35 emissive, others ghosted) and the details card describes one structure. Group selection would need multi-structure highlighting and group copy the app does not have, so group rows are `selectable: false`: their name (click or Enter) expands or collapses them, and their pill toggles visibility for all their leaves; a partly hidden group shows "Mixed", and its toggle shows all of its leaves. `onSelectionChange` keeps a one-line `isStructureId` guard only to keep the app's selection typed to leaves.
- **Existing selection semantics are kept.** Selecting a leaf from the tree or the model unhides it and, for internal structures, turns on Reveal interior, as before. Selecting never changes the view label to "Custom view".
- **Reset remounts the tree** (a `key` that reset increments), clearing its internal search and expansion along with selection, visibility, tour and camera. This is the only remount; revealing a selection is built in.
- **`/` shortcut** opens the panel and focuses the tree's search input.
- **Hidden structures are not pickable in 3D.** Hidden meshes have `visible = false`, and `pickVisibleMesh` (`src/picking.ts`) ignores intersections with hidden objects or hidden ancestors, so a hidden surface cannot select itself or block a visible one behind it. This was already true and was rechecked in the browser.
- **Colour keys.** Each leaf passes its structure colour as `color`, and the component draws the swatch. The earlier workaround (CSS rules emitted from `App.tsx` matching rows by `aria-label`, plus a `::before` dot in `style.css`) was removed. `style.css` only sizes the swatch to 6 px to match the selection chip's dot and fades it on hidden rows.

## Theme and preflight

`src/style.css` imports Tailwind CSS 4 and defines shadcn-compatible tokens (`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--ring`, and so on) mapped through `@theme inline`, tuned to the existing warm neutral palette. The app's own muted text colour was renamed from `--muted` to `--muted-ink`, because shadcn's `--muted` is a background colour.

As in kidneys, the app's element resets moved into `@layer base`, so the registry's utility classes win over them. Tailwind's preflight is in the same layer. The one preflight rule that changed the existing layout was `html { line-height: 1.5 }`, which is reset to `normal` in the base layer. Before and after builds were compared by recording the bounding box of every element outside the list at 1440 × 900 and 390 × 844, with the panel closed and open: with the panel closed nothing moved, and with it open the only changes are vertical offsets below the list, which is taller. Tree styling (`.registry-tree` rules) is unlayered and scoped to the component.

## Behaviour changes and limits

- The old list's search also matched FMA identifiers, source names and categories. The tree matches row labels only (and shows a group with its matching children). FMA identifiers remain in the details card and model notes.
- Visibility controls are now text pills ("Visible", "Hidden", "Mixed") instead of eye icons.
- Group rows are new: their name expands/collapses them and their pill shows or hides the whole group. The keyboard hint reads "Enter selects, or expands a group".
- Screen-reader testing was not done. The tree's ARIA roles and keyboard model come from the registry component and were only exercised with keyboard input in headless Chromium.

## Friction and registry observations

No registry defect blocked the integration, and the component was not forked.

1. The CLI replaces an exact dependency pin with the registry's range (`1.8.0` became `^1.8.0`); the pin was restored by hand.
2. Search covers labels only. Consumers whose old search matched synonyms or identifiers lose that unless the component gains keywords.
3. Rows still expose no per-node class or data attribute; with `color` built in, this app no longer needs one.

Resolved by PR #12 and removed from this list: the dead click on group labels (now `selectable: false`) and colour keys matched by `aria-label` (now `color`).
