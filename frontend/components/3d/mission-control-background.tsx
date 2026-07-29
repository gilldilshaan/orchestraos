"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MissionControlBackgroundProps {
  className?: string;
  intensity?: number;
  isExecuting?: boolean;
}

export default function MissionControlBackground({
  className,
  intensity = 0.6,
  isExecuting = false,
}: MissionControlBackgroundProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 12], fov: 65 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: false }}>
        <NeuralMesh intensity={intensity} isExecuting={isExecuting} />
        <DepthFog />
      </Canvas>
    </div>
  );
}

function NeuralMesh({ intensity, isExecuting }: { intensity: number; isExecuting: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const connectionsRef = useRef<THREE.LineSegments>(null);

  const count = 600;
  const connectionDistance = 3.5;

  const { positions, colors, connectionPairs } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 3 + Math.random() * 7;
      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = radius * Math.cos(phi) * (Math.random() > 0.5 ? 1 : 0.6);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      const bright = 0.2 + Math.random() * 0.4;
      cols[i * 3] = bright * 0.6;
      cols[i * 3 + 1] = bright * 0.7;
      cols[i * 3 + 2] = bright;
    }

    const pairs: [number, number][] = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < connectionDistance && Math.random() < 0.03) {
          pairs.push([i, j]);
        }
      }
    }

    return { positions: pos, colors: cols, connectionPairs: pairs };
  }, []);

  const linePositions = useMemo(() => {
    const arr = new Float32Array(connectionPairs.length * 6);
    connectionPairs.forEach(([i, j], idx) => {
      arr[idx * 6] = positions[i * 3];
      arr[idx * 6 + 1] = positions[i * 3 + 1];
      arr[idx * 6 + 2] = positions[i * 3 + 2];
      arr[idx * 6 + 3] = positions[j * 3];
      arr[idx * 6 + 4] = positions[j * 3 + 1];
      arr[idx * 6 + 5] = positions[j * 3 + 2];
    });
    return arr;
  }, [connectionPairs, positions]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const speed = isExecuting ? intensity * 0.15 : intensity * 0.06;
    const pos = pointsRef.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const baseX = positions[i3];
      const baseY = positions[i3 + 1];
      const baseZ = positions[i3 + 2];
      pos[i3] = baseX + Math.sin(t * speed + baseY * 0.5) * 0.15;
      pos[i3 + 1] = baseY + Math.cos(t * speed * 0.7 + baseX * 0.5) * 0.1;
      pos[i3 + 2] = baseZ + Math.sin(t * speed * 0.5 + baseZ * 0.3) * 0.1;
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;

    if (connectionsRef.current) {
      const linePos = connectionsRef.current.geometry.attributes.position.array as Float32Array;
      connectionPairs.forEach(([i, j], idx) => {
        const idx6 = idx * 6;
        linePos[idx6] = pos[i * 3];
        linePos[idx6 + 1] = pos[i * 3 + 1];
        linePos[idx6 + 2] = pos[i * 3 + 2];
        linePos[idx6 + 3] = pos[j * 3];
        linePos[idx6 + 4] = pos[j * 3 + 1];
        linePos[idx6 + 5] = pos[j * 3 + 2];
      });
      connectionsRef.current.geometry.attributes.position.needsUpdate = true;
      const opacity = 0.06 + Math.sin(t * 0.3) * 0.03;
      (connectionsRef.current.material as THREE.LineBasicMaterial).opacity = opacity * intensity;
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.06}
          color="#60a5fa"
          transparent
          opacity={0.5 * intensity}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <lineSegments ref={connectionsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.06 * intensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

function DepthFog() {
  useFrame(({ clock }) => {
    // Handled via scene fog
  });
  return null;
}
