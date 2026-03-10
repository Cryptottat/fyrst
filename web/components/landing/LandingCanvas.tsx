"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  Pixelation,
  Bloom,
} from "@react-three/postprocessing";
import * as THREE from "three";
import Hedgi from "./Hedgi";
import ForestScene from "./ForestScene";

interface LandingCanvasProps {
  scrollDepth: number;
}

// Hedgehog center for orbit pivot
const HEDGI_CENTER = new THREE.Vector3(0, 0.35, 3);
const MAX_ORBIT_ANGLE = (50 * Math.PI) / 180; // ±50° = 100° total

function CameraController({ scrollDepth }: { scrollDepth: number }) {
  const smoothDepth = useRef(0);
  const mouseX = useRef(0);
  const smoothMouseX = useRef(0);

  // Track mouse X position (-1 to 1)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.current = (e.clientX / window.innerWidth) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame(({ camera }, delta) => {
    // Smooth scroll depth
    const diff = scrollDepth - smoothDepth.current;
    const maxSpeed = 0.25;
    const approach = 2.5;
    let step = diff * approach * delta;
    const maxStep = maxSpeed * delta;
    step = THREE.MathUtils.clamp(step, -maxStep, maxStep);
    if (Math.abs(diff) < 0.001) {
      smoothDepth.current = scrollDepth;
    } else {
      smoothDepth.current += step;
    }

    // Smooth mouse for orbit
    smoothMouseX.current = THREE.MathUtils.lerp(smoothMouseX.current, mouseX.current, 0.03);

    const d = smoothDepth.current;
    const ease = (v: number) => v * v * (3 - 2 * v);

    // Orbit intensity: 0 at d≤0.5, ramps to 1 at d=1.0
    const orbitIntensity = d > 0.5 ? Math.min((d - 0.5) / 0.5, 1) : 0;
    const orbitAngle = smoothMouseX.current * MAX_ORBIT_ANGLE * orbitIntensity;

    if (d <= 0.4) {
      // ─── Phase 1: Sky → Forest descent ───
      const camY = 28 - d * 26.8;
      camera.position.set(0, camY, 10);
      camera.lookAt(0, camY - (2 + d * 2), 0);
    } else if (d <= 0.7) {
      // ─── Phase 2: Sweeping arc toward hedgehog ───
      const t = ease((d - 0.4) / 0.3);
      const camY = THREE.MathUtils.lerp(17.28, 1.2, t);
      const baseCamX = Math.sin(t * Math.PI) * 2.5;
      const baseCamZ = THREE.MathUtils.lerp(10, 5.5, t);
      const lookY = THREE.MathUtils.lerp(14.48, 0.5, t);
      const lookZ = THREE.MathUtils.lerp(0, 3, t);

      // Apply orbit offset around hedgehog (blended by orbitIntensity)
      const distXZ = Math.sqrt(
        (baseCamX - HEDGI_CENTER.x) ** 2 + (baseCamZ - HEDGI_CENTER.z) ** 2,
      );
      const baseAngle = Math.atan2(baseCamX - HEDGI_CENTER.x, baseCamZ - HEDGI_CENTER.z);
      const finalAngle = baseAngle + orbitAngle;

      const camX = HEDGI_CENTER.x + Math.sin(finalAngle) * distXZ;
      const camZ = HEDGI_CENTER.z + Math.cos(finalAngle) * distXZ;

      camera.position.set(camX, camY, camZ);
      camera.lookAt(0, lookY, lookZ);
    } else {
      // ─── Phase 3: Ground level orbit ───
      const t = ease((d - 0.7) / 0.3);
      const camY = THREE.MathUtils.lerp(1.2, 1.0, t);
      const lookY = THREE.MathUtils.lerp(0.5, 2.0, t);

      // Orbit camera around hedgehog center
      const baseDist = 2.5; // distance from hedgehog in XZ
      const baseAngle = 0; // straight behind (positive Z)
      const finalAngle = baseAngle + orbitAngle;

      const camX = HEDGI_CENTER.x + Math.sin(finalAngle) * baseDist;
      const camZ = HEDGI_CENTER.z + Math.cos(finalAngle) * baseDist;

      camera.position.set(camX, camY, camZ);
      camera.lookAt(HEDGI_CENTER.x, lookY, HEDGI_CENTER.z);
    }
  });

  return null;
}

function Scene({ scrollDepth }: { scrollDepth: number }) {
  return (
    <>
      <CameraController scrollDepth={scrollDepth} />
      <ForestScene scrollDepth={scrollDepth} />
      <Hedgi scrollDepth={scrollDepth} position={[0, 0.35, 3]} scale={0.8} />
      <EffectComposer>
        <Pixelation granularity={4} />
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
          intensity={0.5}
        />
      </EffectComposer>
    </>
  );
}

export default function LandingCanvas({ scrollDepth }: LandingCanvasProps) {
  return (
    <Canvas
      className="!fixed inset-0 z-10"
      camera={{ position: [0, 28, 10], fov: 55, near: 0.1, far: 600 }}
      gl={{ antialias: false, alpha: false }}
      dpr={[1, 1.5]}
    >
      <Suspense fallback={null}>
        <Scene scrollDepth={scrollDepth} />
      </Suspense>
    </Canvas>
  );
}
