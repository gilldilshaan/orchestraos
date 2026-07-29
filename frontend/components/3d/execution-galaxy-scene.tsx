"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface GalaxyNode {
  id: string;
  label: string;
  status: string;
  phase: number;
  confidence: number;
}

interface GalaxyProps {
  nodes: GalaxyNode[];
  className?: string;
}

export default function ExecutionGalaxyScene({ nodes, className }: GalaxyProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 3, 5]} intensity={0.8} color="#3b82f6" />
        <OrbitControls enablePan enableZoom enableRotate autoRotate autoRotateSpeed={0.5} />
        <Galaxy nodes={nodes} />
      </Canvas>
    </div>
  );
}

function Galaxy({ nodes }: { nodes: GalaxyNode[] }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.05) * 0.05;
  });

  return (
    <group ref={ref}>
      {nodes.map((node, i) => (
        <GalaxyNode key={node.id} node={node} index={i} total={nodes.length} />
      ))}
    </group>
  );
}

function GalaxyNode({ node, index, total }: { node: GalaxyNode; index: number; total: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const position = useMemo(() => {
    const angle = (index / total) * Math.PI * 2;
    const radius = 1.5 + node.phase * 1.2 + Math.random() * 0.3;
    const yOffset = (node.phase - total / 2) * 0.3 + Math.sin(index * 2.5) * 0.2;
    return {
      x: Math.cos(angle) * radius,
      y: yOffset,
      z: Math.sin(angle) * radius,
    };
  }, [index, total, node.phase]);

  const color = useMemo(() => {
    switch (node.status) {
      case "completed": return new THREE.Color("#10b981");
      case "running": return new THREE.Color("#3b82f6");
      case "failed": return new THREE.Color("#ef4444");
      case "retrying": return new THREE.Color("#f59e0b");
      default: return new THREE.Color("#4b5563");
    }
  }, [node.status]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();

    if (node.status === "running") {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 3 + index) * 0.08);
      (meshRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3 + Math.sin(t * 3 + index) * 0.2;
    }

    if (node.status === "completed") {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 0.3 + index) * 0.02);
    }

    if (node.status === "failed" && glowRef.current) {
      const flicker = Math.random() > 0.95 ? 0.1 : 0.3;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = flicker;
    }
  });

  const size = 0.25 + node.confidence * 0.15;

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Glow */}
      <mesh ref={glowRef} scale={1.8}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} />
      </mesh>

      {/* Core sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 24, 24]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={node.status === "running" ? 0.4 : 0.1}
          metalness={0.2}
          roughness={0.3}
          transparent
          opacity={node.status === "failed" ? 0.5 : 0.9}
        />
      </mesh>
    </group>
  );
}
