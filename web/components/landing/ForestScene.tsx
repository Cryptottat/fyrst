"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Detailed Pine Tree (near/mid range) ─────────────────────
function Tree({
  position,
  height = 10,
  trunkColor = "#3D2B1F",
  leafColor = "#1B4332",
}: {
  position: [number, number, number];
  height?: number;
  trunkColor?: string;
  leafColor?: string;
}) {
  const s = height / 10;
  return (
    <group position={position}>
      <mesh position={[0, height * 0.25, 0]}>
        <cylinderGeometry args={[0.08 * s, 0.18 * s, height * 0.5, 5]} />
        <meshToonMaterial color={trunkColor} />
      </mesh>
      {[0, 0.18, 0.36].map((offset, i) => (
        <mesh key={i} position={[0, height * (0.4 + offset * 0.7), 0]}>
          <coneGeometry args={[(1.6 - i * 0.4) * s, height * (0.35 - i * 0.06), 5]} />
          <meshToonMaterial color={leafColor} />
        </mesh>
      ))}
      <mesh position={[0, height * 0.82, 0]}>
        <coneGeometry args={[0.4 * s, height * 0.25, 5]} />
        <meshToonMaterial color={leafColor} />
      </mesh>
    </group>
  );
}

// ─── Shared geometries ──────────────────────────────────────
const triGeo = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
    -0.5, 0, 0,  0.5, 0, 0,  0, 1, 0,
  ]), 3));
  g.computeVertexNormals();
  return g;
})();

const trunkBoxGeo = new THREE.BoxGeometry(1, 1, 1);

// ─── Billboard trees (InstancedMesh — 3 draw calls for ALL) ──
function BillboardInstanced({
  trees,
}: {
  trees: { pos: [number, number, number]; h: number; leaf: string }[];
}) {
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const canopy1Ref = useRef<THREE.InstancedMesh>(null);
  const canopy2Ref = useRef<THREE.InstancedMesh>(null);
  const count = trees.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!trunkRef.current || !canopy1Ref.current || !canopy2Ref.current) return;
    const col = new THREE.Color();
    const brown = new THREE.Color("#3D2B1F");

    for (let i = 0; i < count; i++) {
      const t = trees[i];
      const w = t.h * 0.35;

      // Trunk
      dummy.position.set(t.pos[0], t.pos[1] + t.h * 0.15, t.pos[2]);
      dummy.scale.set(w * 0.12, t.h * 0.3, w * 0.12);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      trunkRef.current.setMatrixAt(i, dummy.matrix);
      trunkRef.current.setColorAt(i, brown);

      // Canopy plane 1
      dummy.position.set(t.pos[0], t.pos[1] + t.h * 0.25, t.pos[2]);
      dummy.scale.set(w, t.h * 0.75, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      canopy1Ref.current.setMatrixAt(i, dummy.matrix);

      // Canopy plane 2 (crossed 90°)
      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.updateMatrix();
      canopy2Ref.current.setMatrixAt(i, dummy.matrix);

      col.set(t.leaf);
      canopy1Ref.current.setColorAt(i, col);
      canopy2Ref.current.setColorAt(i, col);
    }

    [trunkRef, canopy1Ref, canopy2Ref].forEach((r) => {
      r.current!.instanceMatrix.needsUpdate = true;
      if (r.current!.instanceColor) r.current!.instanceColor.needsUpdate = true;
    });
  }, [trees, count, dummy]);

  if (count === 0) return null;
  return (
    <>
      <instancedMesh ref={trunkRef} args={[trunkBoxGeo, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial />
      </instancedMesh>
      <instancedMesh ref={canopy1Ref} args={[triGeo, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={canopy2Ref} args={[triGeo, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  );
}

// ─── Horizon triangles (InstancedMesh — 2 draw calls for ALL) ──
function HorizonInstanced({
  trees,
}: {
  trees: { pos: [number, number, number]; h: number; leaf: string }[];
}) {
  const ref1 = useRef<THREE.InstancedMesh>(null);
  const ref2 = useRef<THREE.InstancedMesh>(null);
  const count = trees.length;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!ref1.current || !ref2.current) return;
    const col = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const t = trees[i];
      const w = t.h * 0.5;

      dummy.position.set(t.pos[0], t.pos[1], t.pos[2]);
      dummy.scale.set(w, t.h, 1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      ref1.current.setMatrixAt(i, dummy.matrix);

      dummy.rotation.set(0, Math.PI / 2, 0);
      dummy.updateMatrix();
      ref2.current.setMatrixAt(i, dummy.matrix);

      col.set(t.leaf);
      ref1.current.setColorAt(i, col);
      ref2.current.setColorAt(i, col);
    }

    ref1.current.instanceMatrix.needsUpdate = true;
    ref2.current.instanceMatrix.needsUpdate = true;
    if (ref1.current.instanceColor) ref1.current.instanceColor.needsUpdate = true;
    if (ref2.current.instanceColor) ref2.current.instanceColor.needsUpdate = true;
  }, [trees, count, dummy]);

  if (count === 0) return null;
  return (
    <>
      <instancedMesh ref={ref1} args={[triGeo, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={ref2} args={[triGeo, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  );
}

// ─── Puffy Cloud ────────────────────────────────────────────
function Cloud({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
      </mesh>
      <mesh position={[1.3, 0.2, 0]}>
        <sphereGeometry args={[1.1, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-1.1, 0.15, 0.3]}>
        <sphereGeometry args={[1.2, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.75} />
      </mesh>
      <mesh position={[0.3, 0.4, -0.3]}>
        <sphereGeometry args={[0.9, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// ─── Bird (zigzags down through trees) ──────────────────────
function Bird({ scrollDepth }: { scrollDepth: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const leftWingRef = useRef<THREE.Mesh>(null);
  const rightWingRef = useRef<THREE.Mesh>(null);
  const mouseX = useRef(0);

  const perchPoints = useMemo(
    () => [
      new THREE.Vector3(0, 26, 3),
      new THREE.Vector3(-3.5, 20, 1.5),
      new THREE.Vector3(3.5, 15.5, 1.5),
      new THREE.Vector3(-4, 11, 1.5),
      new THREE.Vector3(3, 7, 1.5),
      new THREE.Vector3(-3.5, 3.5, 1.5),
      new THREE.Vector3(0, 1.3, 3), // land on hedgehog
    ],
    []
  );

  // Track mouse for bird facing direction
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.current = (e.clientX / window.innerWidth) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Smoothed progress so bird doesn't teleport on snap scroll
  const smoothProgress = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    const targetProgress = Math.min(scrollDepth / 0.85, 1);
    // Lerp toward target — bird flies smoothly regardless of scroll speed
    smoothProgress.current = THREE.MathUtils.lerp(
      smoothProgress.current,
      targetProgress,
      0.03
    );

    const total = perchPoints.length - 1;
    const raw = smoothProgress.current * total;
    const idx = Math.min(Math.floor(raw), total - 1);
    const frac = raw - idx;

    const from = perchPoints[idx];
    const to = perchPoints[Math.min(idx + 1, total)];

    const pos = new THREE.Vector3().lerpVectors(from, to, frac);
    pos.y += Math.sin(frac * Math.PI) * 2;

    groupRef.current.position.copy(pos);

    // Face toward mouse
    const targetRotY = -mouseX.current * 0.8;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotY,
      0.06
    );

    // Wings always flap — faster in flight, gentler when perched
    const speed = Math.abs(targetProgress - smoothProgress.current);
    const inFlight = speed > 0.005;
    const flapSpeed = inFlight ? 14 : 6;
    const flapRange = inFlight ? 0.7 : 0.3;
    const flap = Math.sin(t * flapSpeed) * flapRange;

    if (leftWingRef.current) leftWingRef.current.rotation.z = flap;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -flap;

    groupRef.current.visible = true;
  });

  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshToonMaterial color="#F5E6CA" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.15, 0.12]}>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshToonMaterial color="#F5E6CA" />
      </mesh>
      {/* Beak */}
      <mesh position={[0, 0.12, 0.28]} rotation={[Math.PI / 2 + 0.3, 0, 0]}>
        <coneGeometry args={[0.03, 0.1, 8]} />
        <meshToonMaterial color="#D4A853" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.06, 0.19, 0.21]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshBasicMaterial color="#1A1A1A" />
      </mesh>
      <mesh position={[0.06, 0.19, 0.21]}>
        <sphereGeometry args={[0.025, 6, 6]} />
        <meshBasicMaterial color="#1A1A1A" />
      </mesh>
      {/* Left Wing */}
      <mesh ref={leftWingRef} position={[-0.2, 0.05, 0]}>
        <boxGeometry args={[0.28, 0.04, 0.16]} />
        <meshToonMaterial color="#7EC8E3" />
      </mesh>
      {/* Right Wing */}
      <mesh ref={rightWingRef} position={[0.2, 0.05, 0]}>
        <boxGeometry args={[0.28, 0.04, 0.16]} />
        <meshToonMaterial color="#7EC8E3" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.05, -0.22]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[0.1, 0.02, 0.16]} />
        <meshToonMaterial color="#9B72CF" />
      </mesh>
    </group>
  );
}

// ─── Distant Flock (birds circling high in the sky) ─────────
function DistantFlock({ scrollDepth = 0 }: { scrollDepth?: number }) {
  const count = 35;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const instanceCount = count * 2;

  const parentDummy = useMemo(() => new THREE.Object3D(), []);
  const childDummy = useMemo(() => new THREE.Object3D(), []);
  const finalMatrix = useMemo(() => new THREE.Matrix4(), []);

  const birds = useMemo(() => {
    const colors = [
      "#1A1A1A", "#2D2D2D", "#444444",  // dark
      "#666666", "#888888", "#AAAAAA",  // gray
      "#D0D0D0", "#F0F0F0",            // light
      "#3B2F20", "#5C4033", "#8B7355", // brown
      "#2F4F4F", "#4A6670",            // teal-gray
    ];
    return Array.from({ length: count }, (_, i) => ({
      radius: 10 + Math.random() * 25,
      height: 28 + Math.random() * 14,
      speed: 0.12 + Math.random() * 0.18,
      phase: (i / count) * Math.PI * 2 + Math.random() * 0.5,
      wobble: Math.random() * Math.PI * 2,
      flapSpeed: 3 + Math.random() * 4,
      flapPhase: Math.random() * Math.PI * 2,
      size: 0.1 + Math.random() * 0.12,
      color: new THREE.Color(colors[Math.floor(Math.random() * colors.length)]),
    }));
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      meshRef.current.setColorAt(i * 2, birds[i].color);
      meshRef.current.setColorAt(i * 2 + 1, birds[i].color);
    }
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [birds, count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const b = birds[i];
      const angle = t * b.speed + b.phase;
      const x = Math.cos(angle) * b.radius;
      const z = Math.sin(angle) * b.radius - 15;
      const y = b.height + Math.sin(t * 0.8 + b.wobble) * 1.5;
      const facing = -angle + Math.PI / 2;
      const flap = Math.sin(t * b.flapSpeed + b.flapPhase) * 0.6;

      const wingW = b.size * 1.8;
      const wingH = b.size * 0.15;
      const wingD = b.size * 0.5;
      const halfW = wingW * 0.5;

      // Parent: bird position + facing
      parentDummy.position.set(x, y, z);
      parentDummy.rotation.set(0, facing, 0);
      parentDummy.scale.set(1, 1, 1);
      parentDummy.updateMatrix();

      // Left wing: offset to left, pivot at inner edge
      childDummy.position.set(-halfW, 0, 0);
      childDummy.rotation.set(0, 0, flap);
      childDummy.scale.set(wingW, wingH, wingD);
      childDummy.updateMatrix();
      finalMatrix.multiplyMatrices(parentDummy.matrix, childDummy.matrix);
      meshRef.current.setMatrixAt(i * 2, finalMatrix);

      // Right wing: offset to right, pivot at inner edge
      childDummy.position.set(halfW, 0, 0);
      childDummy.rotation.set(0, 0, -flap);
      childDummy.updateMatrix();
      finalMatrix.multiplyMatrices(parentDummy.matrix, childDummy.matrix);
      meshRef.current.setMatrixAt(i * 2 + 1, finalMatrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (scrollDepth > 0.6) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, instanceCount]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

// ─── Fireflies ──────────────────────────────────────────────
function Fireflies({
  count = 60,
  scrollDepth = 0,
}: {
  count?: number;
  scrollDepth?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 14,
      y: Math.random() * 10,
      z: (Math.random() - 0.5) * 14,
      speed: 0.2 + Math.random() * 0.3,
      offset: Math.random() * Math.PI * 2,
      phase: Math.random() * Math.PI * 2,
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    const brightness =
      scrollDepth > 0.3 && scrollDepth < 0.85 ? 1 : 0.05;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      dummy.position.set(
        p.x + Math.sin(t * p.speed + p.offset) * 0.5,
        p.y + Math.sin(t * p.speed * 0.7 + p.phase) * 0.3,
        p.z + Math.cos(t * p.speed + p.offset) * 0.5
      );
      const flicker =
        (Math.sin(t * 4 + p.phase) * 0.5 + 0.5) * brightness;
      dummy.scale.setScalar(0.02 + flicker * 0.04);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#EAFF70" transparent opacity={0.9} />
    </instancedMesh>
  );
}

// ─── Red Eyes (danger section) ──────────────────────────────
function RedEyes({ scrollDepth = 0 }: { scrollDepth?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const visibility =
    scrollDepth > 0.35 && scrollDepth < 0.7
      ? Math.sin(((scrollDepth - 0.35) / 0.35) * Math.PI)
      : 0;

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((pair, i) => {
      pair.children.forEach((eye) => {
        const mesh = eye as THREE.Mesh;
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.opacity =
            visibility *
            (0.5 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.5);
        }
      });
    });
  });

  const eyePairs = useMemo(
    () => [
      { pos: [-5, 5, -2] as [number, number, number], size: 0.1 },
      { pos: [5.5, 3, -3] as [number, number, number], size: 0.08 },
      { pos: [-4, 8, -4] as [number, number, number], size: 0.12 },
      { pos: [4.5, 6, -2.5] as [number, number, number], size: 0.07 },
      { pos: [-6, 2, -1.5] as [number, number, number], size: 0.09 },
    ],
    []
  );

  return (
    <group ref={groupRef}>
      {eyePairs.map((pair, i) => (
        <group key={i}>
          <mesh position={[pair.pos[0] - 0.12, pair.pos[1], pair.pos[2]]}>
            <sphereGeometry args={[pair.size, 8, 8]} />
            <meshBasicMaterial color="#E84855" transparent opacity={0} />
          </mesh>
          <mesh position={[pair.pos[0] + 0.12, pair.pos[1], pair.pos[2]]}>
            <sphereGeometry args={[pair.size, 8, 8]} />
            <meshBasicMaterial color="#E84855" transparent opacity={0} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Shared foliage geometries ───────────────────────────────
const grassBladeGeo = new THREE.BoxGeometry(1, 1, 1);
const flowerHeadGeo = new THREE.SphereGeometry(1, 6, 6);
const rockGeo = new THREE.DodecahedronGeometry(1, 0);

// ─── Ground Foliage (instanced grass + flowers + rocks) ──────
function GroundFoliage({ scrollDepth = 0 }: { scrollDepth?: number }) {
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const stemRef = useRef<THREE.InstancedMesh>(null);
  const petalRef = useRef<THREE.InstancedMesh>(null);
  const rockRef = useRef<THREE.InstancedMesh>(null);

  const data = useMemo(() => {
    let s = 99;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };

    const hedgiX = 0, hedgiZ = 3, safeR = 1.2;
    const isSafe = (x: number, z: number) => {
      const dx = x - hedgiX, dz = z - hedgiZ;
      return dx * dx + dz * dz > safeR * safeR;
    };

    const grass: { x: number; z: number; h: number; lean: number; color: string }[] = [];
    const flowers: { x: number; z: number; h: number; color: string }[] = [];
    const rocks: { x: number; z: number; sx: number; sy: number; sz: number; ry: number; color: string }[] = [];

    const grassColors = ["#2D6A4F", "#245E3A", "#1B4332", "#3A7D5C", "#1F5738", "#1A3A2A", "#2E5E3E", "#3D7D4F"];
    const flowerColors = ["#E84855", "#D4A853", "#9B72CF", "#7EC8E3", "#FF69B4", "#FFFFFF", "#FFB347", "#77DD77", "#FF6B9D", "#FFD93D"];
    const rockColors = ["#4A4A4A", "#5C5C5C", "#3D3D3D", "#6B6B6B", "#555555"];

    // Dense grass — close ring (radius 1.2-6)
    for (let i = 0; i < 800; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 1.2 + rand() * 5;
      const x = Math.cos(angle) * dist;
      const z = hedgiZ + Math.sin(angle) * dist;
      if (!isSafe(x, z)) continue;
      grass.push({ x, z, h: 0.1 + rand() * 0.45, lean: (rand() - 0.5) * 0.5, color: grassColors[Math.floor(rand() * grassColors.length)] });
    }

    // Medium grass — wider ring (radius 5-15)
    for (let i = 0; i < 600; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 5 + rand() * 10;
      const x = Math.cos(angle) * dist;
      const z = hedgiZ + Math.sin(angle) * dist;
      grass.push({ x, z, h: 0.15 + rand() * 0.55, lean: (rand() - 0.5) * 0.6, color: grassColors[Math.floor(rand() * grassColors.length)] });
    }

    // Far grass patches (radius 12-25)
    for (let i = 0; i < 400; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 12 + rand() * 13;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      grass.push({ x, z, h: 0.2 + rand() * 0.5, lean: (rand() - 0.5) * 0.7, color: grassColors[Math.floor(rand() * grassColors.length)] });
    }

    // Dense flowers — close ring (radius 1.3-7)
    for (let i = 0; i < 200; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 1.3 + rand() * 6;
      const x = Math.cos(angle) * dist;
      const z = hedgiZ + Math.sin(angle) * dist;
      if (!isSafe(x, z)) continue;
      flowers.push({ x, z, h: 0.12 + rand() * 0.3, color: flowerColors[Math.floor(rand() * flowerColors.length)] });
    }

    // Medium flowers — wider (radius 5-15)
    for (let i = 0; i < 150; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 5 + rand() * 10;
      const x = Math.cos(angle) * dist;
      const z = hedgiZ + Math.sin(angle) * dist;
      flowers.push({ x, z, h: 0.15 + rand() * 0.35, color: flowerColors[Math.floor(rand() * flowerColors.length)] });
    }

    // Rocks
    for (let i = 0; i < 30; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 1.8 + rand() * 14;
      const x = Math.cos(angle) * dist;
      const z = hedgiZ + Math.sin(angle) * dist;
      if (!isSafe(x, z)) continue;
      const bs = 0.15 + rand() * 0.5;
      rocks.push({ x, z, sx: bs * (0.8 + rand() * 0.6), sy: bs * (0.5 + rand() * 0.5), sz: bs * (0.8 + rand() * 0.6), ry: rand() * Math.PI * 2, color: rockColors[Math.floor(rand() * rockColors.length)] });
    }
    for (let i = 0; i < 15; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = 8 + rand() * 20;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const bs = 0.5 + rand() * 1.2;
      rocks.push({ x, z, sx: bs * (0.7 + rand() * 0.6), sy: bs * (0.4 + rand() * 0.6), sz: bs * (0.7 + rand() * 0.6), ry: rand() * Math.PI * 2, color: rockColors[Math.floor(rand() * rockColors.length)] });
    }

    return { grass, flowers, rocks };
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Set up instanced transforms + colors
  useEffect(() => {
    const col = new THREE.Color();

    // Grass
    if (grassRef.current) {
      for (let i = 0; i < data.grass.length; i++) {
        const g = data.grass[i];
        dummy.position.set(g.x, g.h / 2, g.z);
        dummy.scale.set(0.03, g.h, 0.02);
        dummy.rotation.set(0, 0, g.lean);
        dummy.updateMatrix();
        grassRef.current.setMatrixAt(i, dummy.matrix);
        col.set(g.color);
        grassRef.current.setColorAt(i, col);
      }
      grassRef.current.instanceMatrix.needsUpdate = true;
      if (grassRef.current.instanceColor) grassRef.current.instanceColor.needsUpdate = true;
    }

    // Flower stems
    if (stemRef.current) {
      for (let i = 0; i < data.flowers.length; i++) {
        const f = data.flowers[i];
        dummy.position.set(f.x, f.h / 2, f.z);
        dummy.scale.set(0.02, f.h, 0.02);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        stemRef.current.setMatrixAt(i, dummy.matrix);
      }
      stemRef.current.instanceMatrix.needsUpdate = true;
    }

    // Flower heads
    if (petalRef.current) {
      for (let i = 0; i < data.flowers.length; i++) {
        const f = data.flowers[i];
        dummy.position.set(f.x, f.h + 0.04, f.z);
        dummy.scale.set(0.05, 0.05, 0.05);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        petalRef.current.setMatrixAt(i, dummy.matrix);
        col.set(f.color);
        petalRef.current.setColorAt(i, col);
      }
      petalRef.current.instanceMatrix.needsUpdate = true;
      if (petalRef.current.instanceColor) petalRef.current.instanceColor.needsUpdate = true;
    }

    // Rocks
    if (rockRef.current) {
      for (let i = 0; i < data.rocks.length; i++) {
        const r = data.rocks[i];
        dummy.position.set(r.x, r.sy * 0.4, r.z);
        dummy.scale.set(r.sx, r.sy, r.sz);
        dummy.rotation.set(0, r.ry, 0);
        dummy.updateMatrix();
        rockRef.current.setMatrixAt(i, dummy.matrix);
        col.set(r.color);
        rockRef.current.setColorAt(i, col);
      }
      rockRef.current.instanceMatrix.needsUpdate = true;
      if (rockRef.current.instanceColor) rockRef.current.instanceColor.needsUpdate = true;
    }
  }, [data, dummy]);

  const gc = data.grass.length;
  const fc = data.flowers.length;
  const rc = data.rocks.length;
  const show = scrollDepth >= 0.55;

  return (
    <group visible={show}>
      <instancedMesh ref={grassRef} args={[grassBladeGeo, undefined, gc]}>
        <meshBasicMaterial />
      </instancedMesh>
      <instancedMesh ref={stemRef} args={[grassBladeGeo, undefined, fc]}>
        <meshBasicMaterial color="#245E3A" />
      </instancedMesh>
      <instancedMesh ref={petalRef} args={[flowerHeadGeo, undefined, fc]}>
        <meshBasicMaterial />
      </instancedMesh>
      <instancedMesh ref={rockRef} args={[rockGeo, undefined, rc]}>
        <meshBasicMaterial />
      </instancedMesh>
    </group>
  );
}

// ─── Golden Clearing Light ──────────────────────────────────
function ClearingLight({ scrollDepth = 0 }: { scrollDepth?: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const intensity = scrollDepth > 0.8 ? ((scrollDepth - 0.8) / 0.2) * 4 : 0;

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.intensity = THREE.MathUtils.lerp(
        lightRef.current.intensity,
        intensity,
        0.05
      );
    }
  });

  return (
    <>
      <pointLight
        ref={lightRef}
        position={[0, 3, 0]}
        color="#D4A853"
        intensity={0}
        distance={15}
      />
      {scrollDepth > 0.8 && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[5, 32]} />
          <meshBasicMaterial
            color="#D4A853"
            transparent
            opacity={((scrollDepth - 0.8) / 0.2) * 0.2}
          />
        </mesh>
      )}
    </>
  );
}

// ─── Main Forest Scene ──────────────────────────────────────
interface ForestSceneProps {
  scrollDepth: number;
}

export default function ForestScene({ scrollDepth }: ForestSceneProps) {
  // Bumpy terrain with vertex color variation
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1200, 1200, 100, 100);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const groundPalette = [
      new THREE.Color("#1A2F1A"), new THREE.Color("#1E361E"),
      new THREE.Color("#162C16"), new THREE.Color("#223D22"),
      new THREE.Color("#1D331D"), new THREE.Color("#253F25"),
      new THREE.Color("#1B2E1B"), new THREE.Color("#2A4A2A"),
    ];
    let gs = 777;
    const gr = () => { gs = (gs * 16807) % 2147483647; return (gs - 1) / 2147483646; };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y =
        Math.sin(x * 0.08) * Math.cos(z * 0.06) * 1.2 +
        Math.sin(x * 0.2 + 1.5) * Math.cos(z * 0.15 + 0.7) * 0.5 +
        Math.sin(x * 0.5 + 3) * Math.cos(z * 0.4) * 0.2;
      pos.setY(i, y);
      const c = groundPalette[Math.floor(gr() * groundPalette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  // Camera at z=10 looking toward z=0 → only need trees with z < 12
  const { nearTrees, farTrees, horizonTrees } = useMemo(() => {
    const near: { pos: [number, number, number]; h: number; leaf: string }[] = [];
    const far: { pos: [number, number, number]; h: number; leaf: string }[] = [];
    const horizon: { pos: [number, number, number]; h: number; leaf: string }[] = [];

    // Diverse leaf colors — forest variety + warm sunlit tones
    const leafColors = [
      "#1B4332", "#2D6A4F", "#1A3A2A", "#245E3A", "#1F4E3D", // deep greens
      "#3A7D44", "#4A9050", "#5BAD5E",                         // mid greens
      "#6B8E23", "#556B2F", "#8FBC8F",                         // olive / sage
      "#2E8B57", "#228B22",                                     // forest greens
      "#4F7942", "#355E3B",                                     // hunter greens
    ];

    let seed = 12345;
    const srand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const pick = () => leafColors[Math.floor(srand() * leafColors.length)];

    // Clear zone: camera-to-hedgehog corridor
    const inClearZone = (x: number, z: number) =>
      Math.abs(x) < 2.5 && z > 1.5 && z < 12;

    // Behind camera check (camera at z=10)
    const behindCamera = (z: number) => z > 12;

    const tooClose = (x: number, z: number, minDist: number, list: { pos: [number, number, number] }[]) =>
      list.some((t) => {
        const dx = t.pos[0] - x;
        const dz = t.pos[2] - z;
        return dx * dx + dz * dz < minDist * minDist;
      });

    // ── Landmark trees (bird perch sides) ──
    const landmarks: [number, number, number, number][] = [
      [-4, 0, -1, 22], [4, 0, -1, 20],
      [-4.5, 0, -3, 16], [3.5, 0, -2, 14],
      [-4, 0, -4, 10],
    ];
    for (const [x, y, z, h] of landmarks) {
      near.push({ pos: [x, y, z], h, leaf: pick() });
    }

    // ── Near trees (detailed 3D, dist 3-8) — denser ──
    for (let i = 0; i < 90; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (3 + srand() * 6);
      const z = -10 + srand() * 20;
      if (inClearZone(x, z) || behindCamera(z) || tooClose(x, z, 1.8, near)) continue;
      near.push({ pos: [x, 0, z], h: 10 + srand() * 12, leaf: pick() });
    }

    // ── Mid trees (detailed 3D, dist 8-35) — much denser ──
    for (let i = 0; i < 220; i++) {
      const angle = srand() * Math.PI * 2;
      const dist = 8 + srand() * 27;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (inClearZone(x, z) || behindCamera(z) || tooClose(x, z, 1.5, near)) continue;
      near.push({ pos: [x, 0, z], h: 8 + srand() * 14, leaf: pick() });
    }

    // ── Front-facing angle helper (PI to 2PI = camera's front hemisphere) ──
    // At large distances, full-circle random wastes 95%+ positions to behindCamera filter.
    // PI→2PI gives z ≤ 0, always in front of camera at z=10.
    const frontAngle = () => Math.PI + srand() * Math.PI;

    // ── Transition zone (billboard, dist 20-45) ──
    for (let i = 0; i < 150; i++) {
      const angle = frontAngle();
      const dist = 20 + srand() * 25;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      far.push({ pos: [x, 0, z], h: 8 + srand() * 12, leaf: pick() });
    }

    // ── Far trees (billboard, dist 35-80) ──
    for (let i = 0; i < 200; i++) {
      const angle = frontAngle();
      const dist = 35 + srand() * 45;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      far.push({ pos: [x, 0, z], h: 6 + srand() * 14, leaf: pick() });
    }

    // ── Horizon band 1 (dist 50-140) ──
    for (let i = 0; i < 1200; i++) {
      const angle = frontAngle();
      const dist = 50 + srand() * 90;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      horizon.push({ pos: [x, 0, z], h: 2 + srand() * 8, leaf: pick() });
    }

    // ── Horizon band 2 (dist 120-280) ──
    for (let i = 0; i < 1500; i++) {
      const angle = frontAngle();
      const dist = 120 + srand() * 160;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      horizon.push({ pos: [x, 0, z], h: 1.5 + srand() * 6, leaf: pick() });
    }

    // ── Horizon band 3 (dist 250-450) ──
    for (let i = 0; i < 1200; i++) {
      const angle = frontAngle();
      const dist = 250 + srand() * 200;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      horizon.push({ pos: [x, 0, z], h: 1 + srand() * 4, leaf: pick() });
    }

    // ── Ultra-far horizon (dist 400-600) ──
    for (let i = 0; i < 1000; i++) {
      const angle = frontAngle();
      const dist = 400 + srand() * 200;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      horizon.push({ pos: [x, 0, z], h: 0.8 + srand() * 3, leaf: pick() });
    }

    return { nearTrees: near, farTrees: far, horizonTrees: horizon };
  }, []);

  // Terrain edge fade — radial gradient alphaMap so ground fades to transparent at edges
  const terrainAlphaMap = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#ffffff");
    gradient.addColorStop(0.8, "#aaaaaa");
    gradient.addColorStop(1, "#000000");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  // Sky color per-frame (no fog)
  useFrame(({ scene }) => {
    const skyColor = new THREE.Color();
    if (scrollDepth < 0.25) {
      // Bright clear sky — hold vivid blue longer
      skyColor.lerpColors(
        new THREE.Color("#5BB8F5"),
        new THREE.Color("#4A9FD8"),
        scrollDepth / 0.25
      );
    } else if (scrollDepth < 0.5) {
      // Dusk transition
      skyColor.lerpColors(
        new THREE.Color("#4A9FD8"),
        new THREE.Color("#1A2A3A"),
        (scrollDepth - 0.25) / 0.25
      );
    } else if (scrollDepth < 0.75) {
      // Dark forest
      skyColor.lerpColors(
        new THREE.Color("#1A2A3A"),
        new THREE.Color("#0A0E0D"),
        (scrollDepth - 0.5) / 0.25
      );
    } else {
      // Golden dark
      skyColor.lerpColors(
        new THREE.Color("#0A0E0D"),
        new THREE.Color("#1A1508"),
        (scrollDepth - 0.75) / 0.25
      );
    }
    scene.background = skyColor;
  });

  const sunIntensity =
    scrollDepth < 0.25 ? 1.5 : scrollDepth < 0.5 ? 0.6 : 0.15;
  const ambientIntensity =
    scrollDepth < 0.25 ? 1.0 : scrollDepth < 0.5 ? 0.4 : 0.35;

  return (
    <>

      {/* Sun — brighter, more vivid */}
      <mesh position={[15, 38, -30]}>
        <sphereGeometry args={[4, 16, 16]} />
        <meshBasicMaterial color="#FFF4B8" />
      </mesh>

      {/* Lighting */}
      <directionalLight
        position={[8, 35, 10]}
        intensity={sunIntensity}
        color={scrollDepth > 0.8 ? "#D4A853" : "#FFFBE6"}
      />
      <ambientLight intensity={ambientIntensity} />
      <hemisphereLight
        args={[
          scrollDepth < 0.25 ? "#A0D8F0" : "#1B4332",
          "#1A2F1A",
          scrollDepth < 0.25 ? 0.6 : 0.15,
        ]}
      />

      {/* Clouds (high up) */}
      <Cloud position={[8, 32, -15]} scale={1.2} />
      <Cloud position={[-10, 34, -20]} scale={0.9} />
      <Cloud position={[14, 30, -25]} scale={1.5} />
      <Cloud position={[-5, 33, -12]} scale={0.7} />

      {/* Distant bird flock circling in the sky */}
      <DistantFlock scrollDepth={scrollDepth} />

      {/* Ground — bumpy terrain with varied colors, fades at edges */}
      <mesh geometry={terrainGeo}>
        <meshToonMaterial vertexColors transparent alphaMap={terrainAlphaMap} />
      </mesh>

      {/* Near trees (always visible — around hedgehog) */}
      {nearTrees.map((tree, i) => (
        <Tree key={`n${i}`} position={tree.pos} height={tree.h} leafColor={tree.leaf} />
      ))}

      {/* Far/horizon trees: hide when camera is near ground */}
      {scrollDepth < 0.75 && (
        <>
          <BillboardInstanced trees={farTrees} />
          <HorizonInstanced trees={horizonTrees} />
        </>
      )}


      {/* Bird zigzagging down */}
      <Bird scrollDepth={scrollDepth} />

      {/* Fireflies (mid-lower forest) */}
      <Fireflies count={60} scrollDepth={scrollDepth} />

      {/* Red Eyes */}
      <RedEyes scrollDepth={scrollDepth} />

      {/* Grass & flowers around hedgehog (only near ground) */}
      <GroundFoliage scrollDepth={scrollDepth} />

      {/* Golden clearing at bottom */}
      <ClearingLight scrollDepth={scrollDepth} />
    </>
  );
}
