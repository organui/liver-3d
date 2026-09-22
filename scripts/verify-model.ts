import { createHash } from "node:crypto";
import { NodeIO } from "@gltf-transform/core";
import { structures } from "../src/anatomy";
import manifest from "../public/models/manifest.json";
const bytes = new Uint8Array(
  await Bun.file("public/models/liver.glb").arrayBuffer(),
);
const assert = (condition: unknown, message: string) => {
  if (!condition) throw Error(message);
};
assert(
  createHash("sha256").update(bytes).digest("hex") === manifest.runtime.sha256,
  "Runtime checksum mismatch",
);
const doc = await new NodeIO().readBinary(bytes),
  nodes = doc.getRoot().listNodes(),
  owned = new Set<string>();
assert(nodes.length === structures.length, "Incorrect group count");
let triangles = 0,
  vertices = 0;
for (const s of structures) {
  const node = nodes.find((n) => n.getName() === s.id),
    record = manifest.structures.find((r) => r.id === s.id);
  assert(node && record, `Missing structure ${s.id}`);
  assert(node!.getExtras().fma === s.fma, `FMA mismatch ${s.id}`);
  for (const e of record!.elements) {
    assert(!owned.has(e.id), `Duplicate source element ${e.id}`);
    owned.add(e.id);
  }
  const primitive = node!.getMesh()!.listPrimitives()[0],
    position = primitive.getAttribute("POSITION")!,
    index = primitive.getIndices()!;
  assert(
    position.getCount() ===
      record!.elements.reduce((n, e) => n + e.vertices, 0),
    `Vertex count mismatch ${s.id}`,
  );
  assert(
    index.getCount() / 3 ===
      record!.elements.reduce((n, e) => n + e.triangles, 0),
    `Triangle count mismatch ${s.id}`,
  );
  assert(
    Array.from(position.getArray()!).every(Number.isFinite),
    `Invalid coordinates ${s.id}`,
  );
  assert(
    Array.from(index.getArray()!).every(
      (i) => Number.isInteger(i) && i >= 0 && i < position.getCount(),
    ),
    `Invalid indices ${s.id}`,
  );
  vertices += position.getCount();
  triangles += index.getCount() / 3;
}
console.log(
  `Verified ${nodes.length} structures, ${owned.size} source elements, ${vertices} vertices, ${triangles} triangles and runtime SHA-256.`,
);
