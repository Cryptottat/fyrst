"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";

interface HedgiProps {
  scrollDepth?: number;
  position?: [number, number, number];
  scale?: number;
}

const BASE_SCALE = 250;
const WANDER_RADIUS = 1.2;

export default function Hedgi({ scrollDepth = 0, position = [0, 0.35, 3], scale = 0.8 }: HedgiProps) {
  const outerRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  const { scene, animations } = useGLTF("/models/hedge.glb");

  const cleanedAnimations = useMemo(() => {
    return animations.map((clip) => {
      const c = clip.clone();
      c.tracks = c.tracks.filter((track) => !track.name.endsWith(".scale"));
      return c;
    });
  }, [animations]);

  const { actions } = useAnimations(cleanedAnimations, innerRef);

  // Align Hips rest pose to animation average so no vertical pop on stop
  useEffect(() => {
    if (!innerRef.current) return;
    const hips = innerRef.current.getObjectByName("Hips");
    if (hips) {
      // Animation Hips Z avg ≈ -0.091, rest = -0.1408 → difference causes pop
      hips.position.z = -0.091;
    }
  }, [scene]);

  const [moving, setMoving] = useState(false);
  const nextToggle = useRef(0);
  const targetWeight = useRef(0);
  const currentWeight = useRef(0);

  const homePos = useMemo(() => new THREE.Vector3(position[0], position[1], position[2]), [position]);
  const currentPos = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const targetPos = useRef(new THREE.Vector3(position[0], position[1], position[2]));
  const currentRotY = useRef(0);

  useEffect(() => {
    const clipName = Object.keys(actions)[0];
    if (!clipName || !actions[clipName]) return;
    const action = actions[clipName];
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.setEffectiveWeight(0);
    action.play();
  }, [actions]);

  useFrame((state) => {
    if (!outerRef.current) return;
    const t = state.clock.elapsedTime;

    // ─── Wander / pause toggle ───
    if (t >= nextToggle.current) {
      if (moving) {
        setMoving(false);
        targetWeight.current = 0;
        nextToggle.current = t + 2 + Math.random() * 3;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * WANDER_RADIUS;
        targetPos.current.set(
          homePos.x + Math.cos(angle) * dist,
          homePos.y,
          homePos.z + Math.sin(angle) * dist,
        );
        setMoving(true);
        targetWeight.current = 1;
        nextToggle.current = t + 1.5 + Math.random() * 2;
      }
    }

    // Animation weight
    currentWeight.current = THREE.MathUtils.lerp(currentWeight.current, targetWeight.current, 0.04);
    const clipName = Object.keys(actions)[0];
    if (clipName && actions[clipName]) {
      actions[clipName]!.setEffectiveWeight(currentWeight.current);
      actions[clipName]!.setEffectiveTimeScale(0.6);
    }

    // Walk toward target
    if (moving) {
      currentPos.current.lerp(targetPos.current, 0.008);
      const dx = targetPos.current.x - currentPos.current.x;
      const dz = targetPos.current.z - currentPos.current.z;
      if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        const rot = Math.atan2(dx, dz);
        currentRotY.current = THREE.MathUtils.lerp(currentRotY.current, rot, 0.04);
      }
    }

    // Apply transforms
    outerRef.current.position.copy(currentPos.current);
    outerRef.current.rotation.y = currentRotY.current;

    const breathe = Math.sin(t * 1.5) * 0.01;
    outerRef.current.scale.setScalar(scale * BASE_SCALE * (1 + breathe));

    // Idle head bob
    if (!moving) {
      outerRef.current.rotation.x = Math.sin(t * 0.8) * 0.02;
      outerRef.current.rotation.z = Math.sin(t * 0.6) * 0.01;
    } else {
      outerRef.current.rotation.x = THREE.MathUtils.lerp(outerRef.current.rotation.x, 0, 0.05);
      outerRef.current.rotation.z = THREE.MathUtils.lerp(outerRef.current.rotation.z, 0, 0.05);
    }
  });

  return (
    <group ref={outerRef} position={position} dispose={null}>
      <group ref={innerRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload("/models/hedge.glb");
