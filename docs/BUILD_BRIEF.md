# OrganUI Liver: first-release build brief

## Purpose

Build a polished, interactive anatomical liver explorer with useful interface controls and source code developers can run and adapt. This is a standalone example in OrganUI's organ series, alongside OrganUI Heart.

The intended launch pairs a live demo, a short video, and a public repository. The example should make OrganUI's interest in interfaces for health and science tangible and invite feedback from developers and educators. Customer demand and clinical usability have not yet been validated.

## Repository direction

- Repository: `organui/liver-3d`.
- Public title: **OrganUI Liver**.
- Standalone application alongside the existing OrganUI Turborepo and `heart-3d` repository.
- This repository contains the application, chosen runtime assets, provenance, documentation, and verification work needed to run it independently.
- The OrganUI monorepo is reserved for the later website, documentation, registry, and packages. Insights from working organ examples will inform those boundaries.
- Learn from the Heart implementation where useful, but do not modify it or require its checkout. A common viewer package should follow demonstrated reuse.

## Technology direction

Use React, TypeScript, Three.js, and Bun. A small Vite application is a reasonable starting point; React Three Fiber may be used where it helps implementation. Check current compatibility before selecting dependency versions. This is a proposed direction, not an existing application scaffold.

The sibling site's Base UI / Nova selection is useful visual context, but this app must not import that repository or require its setup. Choose interface dependencies for this application's needs.

## Model selection comes first

Inspect candidate geometry before committing to interactions. Build an inventory of actual meshes, anatomical identifiers, and source labels. Determine whether the liver is a single surface or contains independently addressable structures. A single surface does not establish segment boundaries or internal anatomy.

Investigate whether the source provides liver lobes, nearby gallbladder, portal and hepatic vessels, or biliary structures. These are candidates to inspect, not promised features. Include only geometry and mappings that can be supported by the source. If Couinaud segments are considered, obtain a suitable segmented source and document its anatomical basis and review status; do not infer segment boundaries from arbitrary mesh partitions or confuse lobes with segments.

BodyParts3D is a candidate source. Its official archive license page, checked on 22 September 2026, states CC BY 4.0, with a last-update date of 27 February 2025:

- [Official archive download page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html)
- [Official archive license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html)

No liver assets have been selected or inspected for this repository yet. Check the exact downloaded source and record its applicable terms; older project pages and downstream copies can have different license statements.

For each included asset, record its source URL, source/version identifier, license, required credits, checksum, preparation steps, and any modifications. Preserve anatomical orientation and relative positioning when converting related meshes. Keep large raw downloads and intermediate exports out of ordinary source history. Include practical runtime assets or a reproducible, documented retrieval step so a fresh checkout can run.

## First-release experience

1. Open directly into a carefully composed liver view, with visible loading progress while the model loads.
2. Rotate and zoom with understandable controls and a reliable reset action.
3. Select supported structures from the model or a searchable anatomy list; both entry points reflect the same selection.
4. Display the structure's name and a concise sourced explanation.
5. Isolate or hide a structure and restore the full view without losing control of the scene.
6. Offer useful named camera views and a short guided exploration based on the actual available anatomy.
7. Adapt the layout to mobile, support keyboard operation of interface controls, respect reduced-motion preferences, and make anatomy information available as text.
8. Show clear recovery or fallback behavior for missing assets and unavailable WebGL.

If candidate models cannot support useful structure selection, document that finding and adjust the scope explicitly before claiming the complete interaction set. A model with fewer verified structures is preferable to fabricated anatomy.

Present this as an educational interface demonstration and record the review status of labels and explanations. Blood-flow or bile-flow simulation, disease overlays, tumor segmentation, surgical planning, and treatment features are outside this initial release. Any later additions need suitable source data and an appropriate accuracy review.

## Design direction

The liver should be the visual focus. Use restrained typography, a coherent color system, legible annotations, and controls that make the task obvious. Use color consistently to distinguish supported structures and document when colors are illustrative. Maintain the OrganUI visual identity while composing the layout around the liver's shape and available anatomy.

Potential demonstration sequence: explore the liver, select an available structure, isolate it, restore surrounding anatomy, then navigate to another named view. The eventual video must show interactions that actually work.

## Acceptance criteria

- A fresh checkout can install dependencies and run using documented Bun commands, independently of sibling repositories.
- The real selected liver model renders successfully in a browser.
- Rotation, zoom, reset, selection from both entry points, isolation/restoration, and preset views work for the documented model scope.
- Structure labels map to actual model elements; references, limitations, and content-review status are documented.
- Desktop and mobile layouts are visually inspected. Meaningful interaction checks cover selection and visibility behavior, including reset.
- Applicable type checks and a production build pass. Material browser errors are resolved or clearly reported.
- README includes verified setup commands, screenshots or preview material when available, attribution, and an honest description of the completed scope.

The next implementation task should build and verify this application locally. Public deployment and social posting can follow when requested. Repository initialization alone does not mean the viewer has been built.
