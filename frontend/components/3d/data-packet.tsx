"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DataPacketProps {
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  color?: string;
  speed?: number;
  active?: boolean;
  particleSize?: number;
}

export default function DataPacket({
  from,
  to,
  count = 12,
  color = "#3b82f6",
  speed = 0.3,
  active = true,
  particleSize = 0.03,
}: DataPacketProps) {
  const ref = useRef<THREE.Points>(null);

  const { curve, progress } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 0.4;
    const crv = new THREE.QuadraticBezierCurve3(start, mid, end);
    const prog = new Float32Array(count).map(() => Math.random());
    return { curve: crv, progress: prog };
  }, [from, to, count]);

  useFrame(({ clock }) => {
    if (!ref.current || !active) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const p = ((t * speed + progress[i]) % 1);
      const point = curve.getPoint(p);
      pos[i * 3] = point.x;
      pos[i * 3 + 1] = point.y;
      pos[i * 3 + 2] = point.z;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(count * 3), 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={particleSize}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

interface DataPacketStreamProps {
  waypoints: [number, number, number][];
  color?: string;
  speed?: number;
  active?: boolean;
  particleCount?: number;
  className?: string;
}

export function DataPacketStream({
  waypoints,
  color = "#3b82f6",
  speed = 0.3,
  active = true,
  particleCount = 30,
  className,
}: DataPacketStreamProps) {
  if (waypoints.length < 2 || !active) return null;

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 2, 5], fov: 50 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
        <StreamCore waypoints={waypoints} color={color} speed={speed} particleCount={particleCount} />
      </Canvas>
    </div>
  );
}

function StreamCore({ waypoints, color = "#3b82f6", speed = 0.3, active = true, particleCount = 30 }: DataPacketStreamProps & { waypoints: [number, number, number][] }) {
  const ref = useRef<THREE.Points>(null);

  const { curve, progress } = useMemo(() => {
    const pts = waypoints.map((w) => new THREE.Vector3(...w));
    if (pts.length === 2) {
      const mid = new THREE.Vector3().addVectors(pts[0], pts[1]).multiplyScalar(0.5);
      mid.y += 0.5;
      const crv = new THREE.QuadraticBezierCurve3(pts[0], mid, pts[1]);
      return { curve: crv as any, progress: new Float32Array(particleCount).map(() => Math.random()) };
    }
    const catmullCurve = new THREE.CatmullRomCurve3(pts);
    return { curve: catmullCurve, progress: new Float32Array(particleCount).map(() => Math.random()) };
  }, [waypoints, particleCount]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < particleCount; i++) {
      const p = ((t * speed + progress[i]) % 1);
      const point = curve.getPoint(p);
      pos[i * 3] = point.x;
      pos[i * 3 + 1] = point.y;
      pos[i * 3 + 2] = point.z;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[new Float32Array(particleCount * 3), 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
