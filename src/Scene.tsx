import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Box3,
  BufferGeometry,
  Group,
  Mesh,
  PerspectiveCamera,
  Spherical,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { structures, type StructureId, type ViewName } from "./anatomy";
export type Command = {
  serial: number;
  type: "view" | "zoom" | "rotate";
  view: ViewName;
  amount?: number;
  axis?: "horizontal" | "vertical";
};
type Props = {
  selected: StructureId | null;
  hidden: StructureId[];
  reveal: boolean;
  isolated: boolean;
  command: Command;
  reducedMotion: boolean;
  onSelect: (id: StructureId) => void;
  onProgress: (n: number) => void;
  onReady: () => void;
  onError: (message: string) => void;
  onOrbit: () => void;
};
type Part = { id: StructureId; geometry: BufferGeometry };
const directions: Record<ViewName, [number, number, number]> = {
  Overview: [-0.25, 0.28, 1],
  Anterior: [0, 0, 1],
  Posterior: [0, 0, -1],
  Inferior: [0, -1, 0.01],
  Superior: [0, 1, 0.01],
};
function fittingDistance(
  bounds: Box3,
  direction: Vector3,
  fov: number,
  aspect: number,
) {
  const center = bounds.getCenter(new Vector3());
  const vertical = Math.tan((fov * Math.PI) / 360);
  const horizontal = vertical * aspect;
  const right = new Vector3(0, 1, 0).cross(direction).normalize();
  const up = direction.clone().cross(right).normalize();
  let distance = 0;
  for (const x of [bounds.min.x, bounds.max.x])
    for (const y of [bounds.min.y, bounds.max.y])
      for (const z of [bounds.min.z, bounds.max.z]) {
        const corner = new Vector3(x, y, z).sub(center);
        distance = Math.max(
          distance,
          Math.abs(corner.dot(right)) / horizontal + corner.dot(direction),
          Math.abs(corner.dot(up)) / vertical + corner.dot(direction),
        );
      }
  return distance * 1.08;
}
function CameraRig({ parts, ...props }: Props & { parts: Part[] }) {
  const { camera, gl, invalidate, size } = useThree(),
    controls = useRef<OrbitControls | null>(null),
    lastCommand = useRef(-1),
    lastAspect = useRef<number | null>(null),
    lastFramedStructure = useRef<StructureId | null>(null);
  const orbitCallback = useRef(props.onOrbit);
  orbitCallback.current = props.onOrbit;
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement);
    controls.current = c;
    c.enablePan = false;
    c.dampingFactor = 0.12;
    c.minDistance = 0.3;
    c.maxDistance = 24;
    const change = () => invalidate(),
      start = () => orbitCallback.current();
    c.addEventListener("change", change);
    c.addEventListener("start", start);
    return () => {
      c.removeEventListener("change", change);
      c.removeEventListener("start", start);
      c.dispose();
      controls.current = null;
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (controls.current) controls.current.enableDamping = !props.reducedMotion;
  }, [props.reducedMotion]);
  useEffect(() => {
    const c = controls.current;
    if (!c || !parts.length) return;
    const command = props.command;
    const aspect = size.width / size.height;
    if (!Number.isFinite(aspect) || aspect <= 0) return;
    const sameCommand = command.serial === lastCommand.current;
    const framedStructure = props.isolated ? props.selected : null;
    const framingChanged = framedStructure !== lastFramedStructure.current;
    if (sameCommand && aspect === lastAspect.current && !framingChanged) return;
    const bounds = new Box3();
    for (const p of parts)
      if (!props.isolated || p.id === props.selected) {
        p.geometry.computeBoundingBox();
        bounds.union(p.geometry.boundingBox!);
      }
    const fov = (camera as PerspectiveCamera).fov;
    // Opening the sidebar changes the viewport. Keep the user's orbit and zoom
    // while compensating for the new aspect ratio instead of replaying a preset.
    if (sameCommand && framingChanged) {
      const direction = camera.position.clone().sub(c.target).normalize();
      c.target.copy(bounds.getCenter(new Vector3()));
      camera.position
        .copy(c.target)
        .add(
          direction.multiplyScalar(
            fittingDistance(bounds, direction, fov, aspect),
          ),
        );
    } else if (sameCommand && lastAspect.current !== null) {
      const offset = camera.position.clone().sub(c.target);
      const direction = offset.clone().normalize();
      const ratio =
        fittingDistance(bounds, direction, fov, aspect) /
        fittingDistance(bounds, direction, fov, lastAspect.current);
      camera.position.copy(c.target).add(offset.multiplyScalar(ratio));
    } else if (command.type === "zoom") {
      camera.position
        .sub(c.target)
        .multiplyScalar(command.amount ?? 1)
        .clampLength(c.minDistance, c.maxDistance)
        .add(c.target);
    } else if (command.type === "rotate") {
      const p = camera.position.clone().sub(c.target);
      const spherical = new Spherical().setFromVector3(p);
      if (command.axis === "vertical") spherical.phi += command.amount ?? 0;
      else spherical.theta += command.amount ?? 0;
      spherical.makeSafe();
      camera.position.copy(p.setFromSpherical(spherical).add(c.target));
    } else {
      const center = bounds.getCenter(new Vector3());
      const direction = new Vector3(...directions[command.view]).normalize();
      const distance = fittingDistance(bounds, direction, fov, aspect);
      c.target.copy(center);
      camera.position.copy(center).add(direction.multiplyScalar(distance));
      camera.up.set(0, 1, 0);
    }
    lastCommand.current = command.serial;
    lastAspect.current = aspect;
    lastFramedStructure.current = framedStructure;
    c.update();
    invalidate();
  }, [
    props.command,
    props.isolated,
    props.selected,
    parts,
    camera,
    invalidate,
    size.width,
    size.height,
  ]);
  useFrame(() => controls.current?.update());
  return null;
}
function Anatomy(props: Props) {
  const [parts, setParts] = useState<Part[]>([]),
    [hover, setHover] = useState<StructureId | null>(null);
  const { gl, invalidate } = useThree();
  useEffect(() => {
    const abort = new AbortController();
    let owned: Group | undefined;
    let live = true;
    const load = async () => {
      const response = await fetch(
        `${import.meta.env.BASE_URL}models/liver.glb`,
        { signal: abort.signal },
      );
      if (!response.ok)
        throw Error(`Model request failed (${response.status}).`);
      const length = Number(response.headers.get("content-length")),
        reader = response.body?.getReader();
      if (!reader) throw Error("This browser cannot read the model.");
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (live)
          props.onProgress(
            length ? Math.min(95, Math.round((loaded / length) * 95)) : 0,
          );
      }
      const bytes = new Uint8Array(loaded);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      const data = await new GLTFLoader().parseAsync(bytes.buffer, "");
      owned = data.scene;
      const meshes: Part[] = [];
      data.scene.traverse((o) => {
        if (o instanceof Mesh) {
          const id =
            o.userData.structureId ?? o.parent?.userData.structureId ?? o.name;
          if (structures.some((s) => s.id === id))
            meshes.push({ id, geometry: o.geometry });
        }
      });
      if (meshes.length !== structures.length)
        throw Error("The model is missing expected structures.");
      if (live) {
        setParts(meshes);
        props.onReady();
        invalidate();
      } else dispose();
    };
    const dispose = () =>
      owned?.traverse((o) => {
        if (o instanceof Mesh) {
          o.geometry.dispose();
          const materials = Array.isArray(o.material)
            ? o.material
            : [o.material];
          materials.forEach((m) => m.dispose());
        }
      });
    load().catch((e) => {
      if (live && e.name !== "AbortError") props.onError(e.message);
    });
    return () => {
      live = false;
      abort.abort();
      dispose();
    };
  }, []);
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault();
      props.onError(
        "The 3D graphics connection was lost. Retry to restore the model.",
      );
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, props.onError]);
  useEffect(() => {
    gl.domElement.style.cursor = hover ? "pointer" : "grab";
    return () => {
      gl.domElement.style.cursor = "";
    };
  }, [hover, gl]);
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#fff7ee", "#b6a09a", 1.1]} />
      <directionalLight position={[-4, 7, 6]} intensity={2} />
      <directionalLight position={[5, 1, -3]} intensity={1.3} />
      <directionalLight position={[0, -4, 5]} intensity={0.7} />
      {parts.map((p) => {
        const s = structures.find((s) => s.id === p.id)!;
        const ghost = props.reveal && p.id === "liver";
        return (
          <mesh
            key={p.id}
            geometry={p.geometry}
            visible={!props.hidden.includes(p.id)}
            renderOrder={ghost ? 2 : 0}
            onClick={(e) => {
              if (ghost || e.delta > 5) return;
              e.stopPropagation();
              props.onSelect(p.id);
            }}
            onPointerOver={(e) => {
              if (!ghost) {
                e.stopPropagation();
                setHover(p.id);
              }
            }}
            onPointerOut={() => setHover(null)}
            raycast={ghost ? () => {} : undefined}
          >
            <meshStandardMaterial
              color={s.color}
              roughness={0.48}
              metalness={0.03}
              transparent={ghost}
              opacity={ghost ? 0.12 : 1}
              depthWrite={!ghost}
              side={2}
              emissive={s.color}
              emissiveIntensity={
                props.selected === p.id ? 0.13 : hover === p.id ? 0.08 : 0
              }
            />
          </mesh>
        );
      })}
      <CameraRig {...props} parts={parts} />
    </>
  );
}
export default function Scene(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 12], fov: 34, near: 0.01, far: 100 }}
      gl={(defaults) => {
        try {
          return new WebGLRenderer({
            ...defaults,
            antialias: true,
            alpha: true,
          });
        } catch (error) {
          props.onError(
            "WebGL 2 is unavailable. Enable hardware acceleration or try a browser with WebGL 2 support.",
          );
          throw error;
        }
      }}
    >
      <Anatomy {...props} />
    </Canvas>
  );
}
