# Verification — 2026-09-22

## Commands and clean installation

Verified with Bun 1.4.2 on Linux:

- `bun install --frozen-lockfile` — passes in a clean temporary copy with no `node_modules`, `dist`, `.asset-cache`, `.git`, or sibling checkout. Installed 55 packages from the pinned lockfile using the package cache.
- `bun run typecheck` — passes (also included in the build).
- `bun run build` — passes; static output in `dist/`.
- `bun run verify:model` — passes: SHA-256, seven expected structure/FMA pairs, 77 unique source elements, 123,178 vertices, 218,056 triangles, finite positions and valid indices.
- `bun test` — two state-regression tests, six assertions, all pass. They exercise selecting hidden anatomy after isolation and empty-scene transitions without duplicate visibility entries.
- `bun run prepare:model` — regenerated the GLB from this repository's official input cache, verifying every input hash. Runtime output reproduces the documented SHA-256.
- `git diff --check` — passes.

The clean-copy build/test run was done in `/tmp/organui-liver-clean.oX57b8`; it did not have access to model preparation inputs inside its directory and did not need them for normal operation. No sibling services were stopped.

Development preview: `http://127.0.0.1:5175/`. Production preview: `http://127.0.0.1:4175/`, started with `bun run preview --port 4175 --strictPort`.

## Clean design refresh

Aligned Liver with the updated Heart layout: neutral full-window stage, compact brand/header, anatomy panel collapsed on arrival, selection chip, grouped/searchable anatomy, camera dropdown, and guided exploration inside the panel. The code and bundled assets remain independent of the Heart checkout.

The refreshed production build was visually checked at 1440 × 900, 800 × 700, and 390 × 844. No horizontal overflow or application console errors were observed. Rechecked scene picking, sidebar focus/Escape, `/` search from the collapsed state, FMA search, reveal, isolation and restoration, all-hidden recovery, all four tour steps, reset, camera menu keyboard navigation, arrow-key rotation, zoom, and the mobile return to 3D. Opening the sidebar preserves orbit and zoom while adjusting the framing for available width. Updated screenshots come from this build.

`bun run build` (including type checking), `bun test`, and formatting checks pass. The clean-install, model-preparation, reduced-motion, and failure-fixture checks below were performed on the initial implementation; they were not repeated for this layout refresh.

## Actual browser checks

Inspected the real GLB in the Codex in-app Chromium browser, at desktop widths (including 1440 px) and 390 × 844 mobile. This used actual rendered geometry and UI interaction, not a screenshot substitute or a mocked canvas.

| Check | Evidence / result |
| --- | --- |
| Initial loading | Progress display appears; real model loads and camera buttons become enabled. |
| Geometry | Whole liver tissue, gallbladder, simplified vessel and duct branches render in source-relative positions. Surface seams are visible and documented. |
| List selection | Selecting Gallbladder changes the detail heading, list pressed state, and selection chip. |
| Scene selection | Clicking the green gallbladder in the inferior view selects Gallbladder in the list and inspector. Rechecked on production build. |
| Search | Searching `portal` returns Portal vein; searching `cystic` returns Cystic duct. Reset clears search. |
| Hidden selection | Keyboard Enter selects Cystic duct, reveals the interior and allows isolation. |
| Visibility | Hide Gallbladder removes the actual rendered mesh and changes its row to Show Gallbladder. |
| Isolation | Isolate shows only the selected gallbladder, fits its camera, and updates all seven visibility states. Visually inspected. |
| Empty scene | Hiding the isolated group shows “All structures are hidden”; Restore all structures recovers the scene. |
| Reset | Restores all visibility, clears selection, turns off reveal, clears search/tour, and activates Overview. |
| Camera | Inferior exposes the gallbladder; posterior/superior presets respond. The compact dropdown exposes all five presets. Zoom buttons and focused-model arrow keys visibly change the camera. Free rotation changes the menu label to Custom view; sidebar toggles preserve the viewing angle. |
| Interior | Selecting an internal group automatically activates Reveal interior. Portal, arterial, venous and biliary trees remain selectable through the translucent tissue. |
| Tour | All four steps change selection, view and reveal state; Finish returns to reset state. |
| Mobile | Real model renders at 390 px; document width is within viewport width. Camera controls, search, selection and isolation operate. Anatomy opens below the stage; View in 3D closes it and returns focus to the header. The tour is inside Anatomy. |
| Reduced motion | A development fixture sets the reduced-motion media query; model loads and named camera views remain usable. Code disables damping and CSS transitions. No auto-rotation or animated camera flights are implemented. |
| Model unavailable | Fixture returns HTTP 503 only for the GLB. Clear failure text and retry appear; structure descriptions still work. Clicking Retry restores the genuine model after the fixture releases the failure. |
| WebGL unavailable | Fixture denies WebGL context creation. Clear WebGL 2 guidance replaces loading, and the anatomy list remains usable. |
| Production | Final built app renders at desktop/mobile sizes, with scene picking, isolation/hiding/reset, keyboard camera controls, and no application console errors. |

The fixtures are in `tests/browser-fixture.html`, served only by Vite development. Open `/tests/browser-fixture.html?mode=model`, `?mode=webgl`, or `?mode=reduced`. They are excluded from the production build. `model` intentionally restores fetch on the Retry button so recovery can be exercised.

## Evidence and limits

- [Desktop screenshot](screenshots/desktop.png): refreshed production app, initial Overview with Anatomy collapsed.
- [Interior screenshot](screenshots/interior.png): final production app, selected portal vein and translucent liver surface.
- [Mobile screenshot](screenshots/mobile.png): final production app at 390 px.

Screenshots render BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International; see [model provenance](MODEL_PROVENANCE.md).

Vite warns about the roughly 969 kB minified Three.js engine chunk (257 kB gzip); model loading is separate from the text interface. R3F's use of `THREE.Clock` emits a non-fatal deprecation warning with Three.js 0.186. Fault-injection pages intentionally log request/renderer errors. One in-app test tab crashed during earlier failure testing; subsequent fresh tabs successfully rendered and exercised the final production build.

Not verified: physical touchscreen/pinch gestures, Safari/Firefox, physical iOS/Android devices, low-end GPU performance, a full assistive-technology audit, or expert anatomical accuracy. No clinical validation is claimed. Public hosting and social/video publication were not performed.
