# OrganUI Liver

An interactive 3D liver explorer for the web.

**Status:** repository initialized; the viewer has not been implemented yet.

This standalone anatomy example will combine a focused 3D experience with clear interface controls and source code that developers can run and adapt. It is part of the same OrganUI series as [OrganUI Heart](https://github.com/organui/heart-3d).

## Planned first release

- Explore an anatomical liver with rotation, zoom, reset, and preset views.
- Select, label, isolate, hide, and restore structures supported by the chosen model.
- Browse a searchable anatomy list linked to the 3D view.
- Follow a short guided exploration of the available anatomy.
- Use the interface on desktop and mobile, with keyboard-operable controls and a text alternative for anatomy information.

Model selection will determine the available structures. Liver segments, internal vessels, and bile ducts are not confirmed features. Model provenance, content-review status, and limitations will be documented alongside the implementation.

The initial release is an educational interface demonstration.

## Development

The planned foundation is React, TypeScript, Three.js, and Bun. Application scaffolding, dependencies, and verified run commands will be added during implementation.

Read the [build brief](docs/BUILD_BRIEF.md) for the proposed scope and acceptance criteria.

This repository has its own dependencies and Git history. It must run independently of the OrganUI website monorepo and other organ examples.

## Models and attribution

No third-party anatomy assets are included yet. Each selected asset will have its source, version, license, attribution, and modifications recorded. Third-party models retain their own licenses.

## License

Original project code is licensed under the [MIT License](LICENSE). Third-party models and other assets, when added, are governed by their documented licenses.

Part of [OrganUI](https://github.com/organui).
