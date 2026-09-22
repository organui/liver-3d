import { mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { unzipSync, strFromU8 } from "fflate";
import { Document, NodeIO } from "@gltf-transform/core";
import { BufferGeometry, Float32BufferAttribute, Color } from "three";
import { structures } from "../src/anatomy";
import inputs from "./model-inputs.json";
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
await mkdir(".asset-cache", { recursive: true });
for (const input of inputs) {
  const file = Bun.file(`.asset-cache/${input.file}`);
  if (!(await file.exists())) {
    const response = await fetch(input.url);
    if (!response.ok) throw Error(`Download failed: ${input.file}`);
    await Bun.write(file, response);
  }
  if (hash(new Uint8Array(await file.arrayBuffer())) !== input.sha256)
    throw Error(
      `Source checksum mismatch: ${input.file}; review changed upstream data before updating pins.`,
    );
}
const mappings = Object.fromEntries(
  await Promise.all(
    ["isa", "partof"].map(async (k) => [
      k,
      (await Bun.file(`.asset-cache/${k}_element_parts.txt`).text())
        .trim()
        .split(/\r?\n/)
        .slice(1)
        .map((l) => l.split("\t")),
    ]),
  ),
) as Record<string, string[][]>;
const selectedIds = new Set(
  structures.flatMap((s) =>
    mappings[s.mapping]
      .filter((r) => (s.concepts as readonly string[]).includes(r[0]))
      .map((r) => `isa_BP3D_4.0_obj_99/${r[2]}.obj`),
  ),
);
const archive = unzipSync(
  new Uint8Array(
    await Bun.file(".asset-cache/isa_BP3D_4.0_obj_99.zip").arrayBuffer(),
  ),
  { filter: (entry) => selectedIds.has(entry.name) },
);
const min = [Infinity, Infinity, Infinity],
  max = [-Infinity, -Infinity, -Infinity],
  used = new Set<string>(),
  selectedRows: string[] = [];
const prepared = structures.map((s) => {
  const rows = mappings[s.mapping].filter((r) =>
    (s.concepts as readonly string[]).includes(r[0]),
  );
  for (const concept of s.concepts)
    if (!rows.some((r) => r[0] === concept))
      throw Error(`Missing concept ${concept}`);
  selectedRows.push(...rows.map((r) => [s.id, s.mapping, ...r].join("\t")));
  const ids = [...new Set(rows.map((r) => r[2]))],
    positions: number[] = [],
    indices: number[] = [];
  const elements = ids.map((id) => {
    if (used.has(id)) throw Error(`Duplicate ownership ${id}`);
    used.add(id);
    const bytes = archive[`isa_BP3D_4.0_obj_99/${id}.obj`];
    if (!bytes) throw Error(`Missing ${id}`);
    const offset = positions.length / 3;
    let vertices = 0,
      triangles = 0;
    for (const line of strFromU8(bytes).split(/\r?\n/)) {
      const t = line.trim().split(/\s+/);
      if (t[0] === "v") {
        const p = t.slice(1, 4).map(Number);
        if (p.length !== 3 || !p.every(Number.isFinite))
          throw Error(`Invalid vertex ${id}`);
        p.forEach((v, j) => {
          min[j] = Math.min(min[j], v);
          max[j] = Math.max(max[j], v);
        });
        positions.push(...p);
        vertices++;
      }
      if (t[0] === "f") {
        const face = t.slice(1).map((v) => {
          const n = Number(v.split("/")[0]);
          return offset + (n > 0 ? n - 1 : vertices + n);
        });
        for (let j = 1; j < face.length - 1; j++) {
          indices.push(face[0], face[j], face[j + 1]);
          triangles++;
        }
      }
    }
    return {
      id,
      sha256: hash(bytes),
      bytes: bytes.length,
      vertices,
      triangles,
    };
  });
  return { s, positions, indices, elements };
});
const center = min.map((v, i) => (v + max[i]) / 2),
  scale = 0.02;
const doc = new Document(),
  buffer = doc.createBuffer(),
  scene = doc.createScene("OrganUI Liver — BodyParts3D 4.0");
doc.getRoot().getAsset().copyright =
  "BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International";
for (const { s, positions, indices } of prepared) {
  const p = new Float32Array(positions.length);
  for (let i = 0; i < p.length; i += 3) {
    p[i] = (positions[i] - center[0]) * scale;
    p[i + 1] = (positions[i + 2] - center[2]) * scale;
    p[i + 2] = -(positions[i + 1] - center[1]) * scale;
  }
  const g = new BufferGeometry()
    .setAttribute("position", new Float32BufferAttribute(p, 3))
    .setIndex(indices);
  g.computeVertexNormals();
  const c = new Color(s.color),
    mat = doc
      .createMaterial(s.id)
      .setBaseColorFactor([c.r, c.g, c.b, 1])
      .setRoughnessFactor(0.6)
      .setDoubleSided(true);
  const prim = doc
    .createPrimitive()
    .setAttribute(
      "POSITION",
      doc.createAccessor().setType("VEC3").setArray(p).setBuffer(buffer),
    )
    .setAttribute(
      "NORMAL",
      doc
        .createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array(g.getAttribute("normal").array))
        .setBuffer(buffer),
    )
    .setIndices(
      doc
        .createAccessor()
        .setType("SCALAR")
        .setArray(new Uint32Array(indices))
        .setBuffer(buffer),
    )
    .setMaterial(mat);
  scene.addChild(
    doc
      .createNode(s.id)
      .setMesh(doc.createMesh(s.id).addPrimitive(prim))
      .setExtras({ structureId: s.id, fma: s.fma, concepts: s.concepts }),
  );
  g.dispose();
}
const bytes = await new NodeIO().writeBinary(doc);
await Bun.write("public/models/liver.glb", bytes);
await Bun.write(
  "public/models/manifest.json",
  JSON.stringify(
    {
      dataset: "BodyParts3D",
      version: "4.0",
      release: "2013-05-16",
      retrieved: "2026-09-22",
      license: "CC-BY-4.0",
      licenseUrl: "https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html",
      credit: doc.getRoot().getAsset().copyright,
      inputs,
      transform: {
        sourceBounds: { min, max },
        center,
        scale,
        axes: "[x,z,-y]",
      },
      runtime: { file: "liver.glb", bytes: bytes.length, sha256: hash(bytes) },
      structures: prepared.map(({ s, elements }) => ({
        id: s.id,
        name: s.name,
        fma: s.fma,
        sourceName: s.sourceName,
        mapping: s.mapping,
        concepts: s.concepts,
        elements,
      })),
    },
    null,
    2,
  ) + "\n",
);
await Bun.write(
  "docs/model-source/selected-mappings.tsv",
  "group\thierarchy\tconcept id\tname\telement file id\n" +
    selectedRows.join("\n") +
    "\n",
);
console.log(
  `Prepared ${structures.length} groups, ${used.size} elements, ${bytes.length} bytes; SHA256 ${hash(bytes)}`,
);
