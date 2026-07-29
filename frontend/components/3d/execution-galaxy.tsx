"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface GalaxyNodeData {
  id: string;
  label: string;
  status: string;
  phase: number;
  confidence: number;
  parentId?: string;
}

interface ExecutionGalaxyProps {
  nodes: GalaxyNodeData[];
  isExecuting?: boolean;
  className?: string;
  onNodeClick?: (node: GalaxyNodeData) => void;
}

export default function ExecutionGalaxy({ nodes, isExecuting = false, className, onNodeClick }: ExecutionGalaxyProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 3, 9], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.15} />
        <pointLight position={[0, 3, 5]} intensity={0.8} color="#3b82f6" />
        <pointLight position={[-3, 0, 3]} intensity={0.4} color="#60a5fa" />
        <OrbitControls enablePan enableZoom enableRotate autoRotate={false} autoRotateSpeed={0.4} minDistance={4} maxDistance={18} />
        <GalaxyCore nodes={nodes} isExecuting={isExecuting} onNodeClick={onNodeClick} />
      </Canvas>
    </div>
  );
}

function GalaxyCore({ nodes, isExecuting, onNodeClick }: { nodes: GalaxyNodeData[]; isExecuting: boolean; onNodeClick?: (node: GalaxyNodeData) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.04) * 0.04;
  });

  const nodePositions = useMemo(() => {
    return nodes.map((node, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 + node.phase * 0.5;
      const radius = 1.8 + node.phase * 1.5 + Math.random() * 0.4;
      const yOffset = (node.phase * 0.4) + Math.sin(i * 1.7) * 0.3;
      return {
        x: Math.cos(angle) * radius,
        y: yOffset,
        z: Math.sin(angle) * radius,
      };
    });
  }, [nodes]);

  const connections = useMemo(() => {
    const conns: { from: number; to: number }[] = [];
    nodes.forEach((node, i) => {
      if (node.parentId) {
        const parentIdx = nodes.findIndex((n) => n.id === node.parentId);
        if (parentIdx >= 0) conns.push({ from: parentIdx, to: i });
      }
    });
    return conns;
  }, [nodes]);

  const phases = useMemo(() => {
    const maxPhase = Math.max(...nodes.map((n) => n.phase), 0);
    return Array.from({ length: maxPhase + 1 }, (_, i) => i);
  }, [nodes]);

  return (
    <group ref={ref}>
      {phases.map((phase) => {
        const phaseNodes = nodes.filter((n) => n.phase === phase);
        if (phaseNodes.length < 2) return null;
        const avgRadius = phaseNodes.reduce((sum, n, idx) => {
          const i = nodes.indexOf(n);
          const angle = (i / nodes.length) * Math.PI * 2 + n.phase * 0.5;
          const radius = 1.8 + n.phase * 1.5 + Math.random() * 0.4;
          return sum + radius;
        }, 0) / phaseNodes.length;
        return (
          <OrbitRing key={phase} radius={avgRadius} yOffset={phase * 0.2} phase={phase} isExecuting={isExecuting} />
        );
      })}

      {connections.map((conn, i) => {
        const from = nodePositions[conn.from];
        const to = nodePositions[conn.to];
        if (!from || !to) return null;
        const fromNode = nodes[conn.from];
        const toNode = nodes[conn.to];
        return (
          <GalaxyBeam
            key={`beam-${i}`}
            from={[from.x, from.y, from.z]}
            to={[to.x, to.y, to.z]}
            status={toNode?.status ?? "idle"}
            isExecuting={isExecuting}
          />
        );
      })}

      {nodes.map((node, i) => {
        const pos = nodePositions[i];
        const isHovered = hoveredId === node.id;
        return (
          <GalaxyNode
            key={node.id}
            node={node}
            position={[pos.x, pos.y, pos.z]}
            isExecuting={isExecuting}
            isHovered={isHovered}
            onHover={setHoveredId}
            onClick={() => onNodeClick?.(node)}
          />
        );
      })}
    </group>
  );
}

function OrbitRing({ radius, yOffset, phase, isExecuting }: { radius: number; yOffset: number; phase: number; isExecuting: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.PI / 2.2;
    ref.current.rotation.z = clock.getElapsedTime() * (isExecuting ? 0.08 : 0.03) * (phase % 2 === 0 ? 1 : -1);
  });

  return (
    <mesh ref={ref} position={[0, yOffset, 0]}>
      <ringGeometry args={[radius - 0.02, radius + 0.02, 64]} />
      <meshBasicMaterial
        color={`hsl(${210 + phase * 20}, 70%, ${50 + phase * 8}%)`}
        transparent
        opacity={0.08}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function GalaxyBeam({ from, to, status, isExecuting }: { from: [number, number, number]; to: [number, number, number]; status: string; isExecuting: boolean }) {
  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 0.2;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(16);
  }, [from, to]);

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);

  useFrame(({ clock }) => {
    if (!geometry) return;
  });

  return (
    <lineSegments>
      <bufferGeometry {...geometry} />
      <lineBasicMaterial
        color={status === "completed" ? "#10b981" : status === "running" ? "#3b82f6" : status === "failed" ? "#ef4444" : "#4b5563"}
        transparent
        opacity={isExecuting ? 0.15 : 0.06}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

function GalaxyNode({ node, position, isExecuting, isHovered, onHover, onClick }: {
  node: GalaxyNodeData;
  position: [number, number, number];
  isExecuting: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [crackActive, setCrackActive] = useState(false);

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
      const pulse = 1 + Math.sin(t * 3 + node.phase) * (isHovered ? 0.1 : 0.06);
      meshRef.current.scale.setScalar(pulse);
      (meshRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = (isHovered ? 0.7 : 0.3) + Math.sin(t * 3 + node.phase) * 0.2;
    }

    if (node.status === "completed") {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 0.3 + node.phase) * 0.02);
    }

    if (node.status === "failed" && glowRef.current) {
      const flicker = Math.random() > 0.95 ? 0.05 : 0.15;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = flicker;
    }

    if (isHovered && glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(t * 2) * 0.08;
    }
  });

  const size = 0.22 + node.confidence * 0.15;

  return (
    <group position={position}>
      <mesh ref={glowRef} scale={isHovered ? 2.2 : 1.8}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={node.status === "failed" ? 0.04 : 0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => onHover(node.id)}
        onPointerOut={() => onHover(null)}
      >
        <sphereGeometry args={[size, 24, 24]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={node.status === "running" ? 0.4 : isHovered ? 0.3 : 0.08}
          metalness={0.25}
          roughness={0.25}
          transparent
          opacity={node.status === "failed" ? 0.5 : 0.9}
        />
      </mesh>
    </group>
  );
}
