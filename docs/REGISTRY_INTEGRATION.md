# Anatomy-tree registry integration

The Anatomy panel's structure list is the OrganUI registry component `anatomy-tree`, installed with the shadcn CLI. The installed source is tracked in Git; runtime and ordinary setup (`bun install`, `bun run dev`, `bun run build`) never contact a registry. `kidneys-3d` is the reference integration this follows.

## Exact installation

Installed on 2026-10-16 from the registry artifact built from OrganUI `master` at commit `5e20c41`:

```sh
REGISTRY_URL=http://127.0.0.1:4410 bunx shadcn@4.21.0 add http://127.0.0.1:4410/anatomy-tree.json -y
```

The URL is a local static server (`python3 -m http.server 4410 --bind 127.0.0.1`) serving that build output plus shadcn's `colors/neutral.json`, fetched from the shadcn GitHub repository. `organui.com` and `ui.shadcn.com` were blocked by the network policy of the sandbox the install ran in, so the published URL (`https://organui.com/r/anatomy-tree.json`) could not be used directly. `REGISTRY_URL` points the CLI's own registry lookups (base colors) at the same server. With network access, the equivalent command is:

```sh
bunx shadcn@4.21.0 add https://organui.com/r/anatomy-tree.json -y
```

Provenance at install time:

| Artifact                                     | SHA-256                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| Served `anatomy-tree.json`                   | `f519cf85a68142cb7a054f6b2472649d0dec188c5f2381d4315f12f631874a8e` |
| Embedded source (`files[0].content`, UTF-8)  | `65a226acc9c873559913611b4fadee51935e955ac63dcc64a8dc5bee2d12e821` |
| Tracked `src/components/ui/anatomy-tree.tsx` | `39b294468f2fd06bb81b8c56f485828f941ddfc9065ea5c7c07fdf19582d1842` |

The item declares `@base-ui/react@^1.8.0`; this repository pins `@base-ui/react` 1.8.0 (the CLI wrote `^1.8.0`, which was changed back to the exact pin and re-locked with `bun install`). Tailwind CSS and `@tailwindcss/vite` are 4.1.18, matching kidneys. `bun.lock` stays in Bun's text format.

## Installed-source differences

The only difference from the embedded source is that the shadcn CLI removed the leading `"use client"` directive and its blank line for this non-RSC Vite target (`components.json` sets `"rsc": false`). Unlike kidneys, the file was not run through the project formatter: it is listed in `.prettierignore` before installation, so it keeps the registry's own formatting and its tracked checksum is stable. Do not hand-edit it; reinstall to update it.

The `@/* -> src/*` alias was added to `tsconfig.json` and `vite.config.ts` before installing, so the CLI wrote the file to `src/components/ui/` directly.

## API used

- `data`: the hierarchy from the adapter (unique IDs);
- `selectedId` / `onSelectionChange`: the app's single controlled selection;
- `visibility` / `onVisibilityChange`: a controlled map keyed by leaf IDs, where a missing entry means visible;
- `defaultExpandedIds`: both groups start expanded;
- `label` (`"Liver anatomy"`) and `className` (`registry-tree`).

Search and disclosure stay internal to the component. Its search matches row labels only.

## Application adapter

Scene-specific mapping lives in `src/anatomy-adapter.ts`; the registry component is unchanged.

| Tree ID                | Leaves (structure IDs = GLB `extras.structureId`) | Meaning                                       |
| ---------------------- | ------------------------------------------------- | --------------------------------------------- |
| `liver` (top level)    | `liver`                                           | The combined liver surface                    |
| `group-blood-vessels`  | `portal`, `hepatic-veins`, `artery`               | Interface grouping of the represented vessels |
| `group-biliary-system` | `gallbladder`, `biliary`, `cystic`                | Interface grouping of the biliary structures  |

The groups are built from each structure's existing `category` and reuse the previous list's headings. They are interface groupings only. The liver surface stays a top-level leaf rather than a "Liver" group, so the tree does not suggest that the vessels or ducts are contained in it, and the groups make no claim about branching or containment between their members.

The adapter provides:

- `anatomyTree` and `groupIds` (tree data and default expansion);
- `sceneIdsForNode`: the scene structures a row stands for (itself, or a group's leaves);
- `normalizeVisibility`: applies the "missing means visible" contract to every structure;
- `visibilityFromHidden` / `hiddenFromVisibility`: converts between the app's existing hidden list and the tree's visibility map;
- `isStructureId`: distinguishes leaves from group rows;
- `assertAnatomyMapping`: runs at import and throws if any structure is missing from the tree, a leaf is unknown, or a leaf repeats.

`src/anatomy-adapter.test.ts` (run by `bun test`) covers the mapping, the validation failures, group-to-leaf mapping, and the visibility round trip.

## Decisions

- **State stays in the app.** `App.tsx` keeps its existing `hidden` list and single `selected` structure. The tree receives `visibilityFromHidden(hidden)` and writes back through `hiddenFromVisibility`. Isolate, Hide/Show, Restore all, the reveal switch, the tour, and reset keep writing the same `hidden` list, so the tree always reflects them.
- **Selection stays on leaves.** The scene highlights one structure (its colour at 0.35 emissive, others ghosted) and the details card describes one structure. Group selection would need multi-structure highlighting and group copy the app does not have, so `onSelectionChange` ignores group IDs. Group rows expand/collapse and toggle visibility for all their leaves; a partly hidden group shows "Mixed", and its toggle shows all of its leaves. Clicking a group's name does nothing.
- **Existing selection semantics are kept.** Selecting a leaf from the tree or the model unhides it and, for internal structures, turns on Reveal interior, as before. Selecting never changes the view label to "Custom view".
- **Reset remounts the tree** (a `key` that reset increments), clearing its internal search and expansion along with selection, visibility, tour and camera.
- **`/` shortcut** opens the panel and focuses the tree's search input.
- **Hidden structures are not pickable in 3D.** Hidden meshes have `visible = false`, and `pickVisibleMesh` (`src/picking.ts`) ignores intersections with hidden objects or hidden ancestors, so a hidden surface cannot select itself or block a visible one behind it. This was already true and was rechecked in the browser.
- **Colour keys.** The previous list showed each structure's colour dot. Since the component cannot be edited, `App.tsx` emits one CSS rule per structure that sets `--structure-color` on the row whose accessible name matches, and `style.css` draws the dot.

## Theme and preflight

`src/style.css` imports Tailwind CSS 4 and defines shadcn-compatible tokens (`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--ring`, and so on) mapped through `@theme inline`, tuned to the existing warm neutral palette. The app's own muted text colour was renamed from `--muted` to `--muted-ink`, because shadcn's `--muted` is a background colour.

As in kidneys, the app's element resets moved into `@layer base`, so the registry's utility classes win over them. Tailwind's preflight is in the same layer. The one preflight rule that changed the existing layout was `html { line-height: 1.5 }`, which is reset to `normal` in the base layer. Before and after builds were compared by recording the bounding box of every element outside the list at 1440 × 900 and 390 × 844, with the panel closed and open: with the panel closed nothing moved, and with it open the only changes are vertical offsets below the list, which is taller. Tree styling (`.registry-tree` rules) is unlayered and scoped to the component.

## Behaviour changes and limits

- The old list's search also matched FMA identifiers, source names and categories. The tree matches row labels only (and shows a group with its matching children). FMA identifiers remain in the details card and model notes.
- Visibility controls are now text pills ("Visible", "Hidden", "Mixed") instead of eye icons.
- Group rows are new: they expand/collapse and can show or hide a whole group.
- Screen-reader testing was not done. The tree's ARIA roles and keyboard model come from the registry component and were only exercised with keyboard input in headless Chromium.

## Friction and registry observations

No registry defect blocked the integration, and the component was not forked.

1. The CLI replaces an exact dependency pin with the registry's range (`1.8.0` became `^1.8.0`); the pin was restored by hand.
2. A group label is a button that calls `onSelectionChange` with the group ID. Consumers that only select leaves must ignore it, so that click does nothing. An option to make branch labels toggle expansion would avoid a dead click.
3. Rows expose no per-node hook (class or data attribute), so colour keys rely on matching `aria-label`.
4. Search covers labels only. Consumers whose old search matched synonyms or identifiers lose that unless the component gains keywords.
