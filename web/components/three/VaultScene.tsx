"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Text, Environment } from "@react-three/drei";
import type { Group, Mesh } from "three";
import * as THREE from "three";

/* ---------- Vault Door ---------- */
function VaultDoor() {
  const doorRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!doorRef.current) return;
    // Smooth oscillation: door swings open from 0 to ~70 degrees and back
    const t = clock.getElapsedTime();
    const swing = Math.sin(t * 0.4) * 0.5 + 0.5; // 0..1
    doorRef.current.rotation.y = THREE.MathUtils.lerp(0, -Math.PI * 0.42, swing);
  });

  return (
    <group ref={doorRef} position={[0.95, 0, 0.05]}>
      {/* Door panel — pivot is at left edge (local x=0) */}
      <RoundedBox
        args={[1.9, 2.6, 0.18]}
        radius={0.06}
        smoothness={4}
        position={[-0.95, 0, 0]}
      >
        <meshStandardMaterial
          color="#2563EB"
          metalness={0.92}
          roughness={0.08}
          envMapIntensity={1.2}
        />
      </RoundedBox>

      {/* Door handle / wheel deco */}
      <mesh position={[-1.25, 0, 0.12]}>
        <torusGeometry args={[0.22, 0.035, 16, 48]} />
        <meshStandardMaterial
          color="#94a3b8"
          metalness={0.95}
          roughness={0.05}
        />
      </mesh>

      {/* Locking bolts (decorative) */}
      {([-0.8, -0.3, 0.2, 0.7] as const).map((yPos, i) => (
        <mesh key={i} position={[-0.05, yPos, 0.1]}>
          <cylinderGeometry args={[0.04, 0.04, 0.14, 16]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- Vault Frame (the doorway border) ---------- */
function VaultFrame() {
  return (
    <group>
      {/* Back wall */}
      <RoundedBox
        args={[2.4, 3.0, 0.12]}
        radius={0.04}
        smoothness={4}
        position={[0, 0, -0.12]}
      >
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.85}
          roughness={0.15}
        />
      </RoundedBox>

      {/* Frame — slightly larger than door, sits behind it */}
      <RoundedBox
        args={[2.2, 2.85, 0.22]}
        radius={0.05}
        smoothness={4}
        position={[0, 0, -0.05]}
      >
        <meshStandardMaterial
          color="#334155"
          metalness={0.88}
          roughness={0.12}
        />
      </RoundedBox>
    </group>
  );
}

/* ---------- Inner vault glow + FYRST logo ---------- */
function VaultInterior() {
  const glowRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (!glowRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 0.8 + Math.sin(t * 2) * 0.2;
    glowRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <group position={[0, 0, -0.15]}>
      {/* Golden glow sphere */}
      <mesh ref={glowRef} position={[0, 0, -0.05]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#D97706"
          emissive="#D97706"
          emissiveIntensity={1.8}
          transparent
          opacity={0.25}
          toneMapped={false}
        />
      </mesh>

      {/* FYRST text */}
      <Text
        position={[0, 0, 0.02]}
        fontSize={0.38}
        fontWeight={800}
        color="#D97706"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#fff8e1"
      >
        FYRST
        <meshStandardMaterial
          color="#D97706"
          emissive="#D97706"
          emissiveIntensity={2.5}
          toneMapped={false}
        />
      </Text>
    </group>
  );
}

/* ---------- Scene composition ---------- */
function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 5, 5]} intensity={1.6} castShadow />
      <directionalLight position={[-3, 2, 4]} intensity={0.5} color="#93c5fd" />

      <Environment preset="city" />

      <group position={[0, 0.1, 0]} scale={1.05}>
        <VaultFrame />
        <VaultDoor />
        <VaultInterior />
      </group>
    </>
  );
}

/* ---------- Exported component ---------- */
export default function VaultScene() {
  return (
    <Suspense fallback={null}>
      <Canvas
        camera={{ position: [0, 0.3, 4.2], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        style={{ width: "100%", height: "100%" }}
      >
        <Scene />
      </Canvas>
    </Suspense>
  );
}
