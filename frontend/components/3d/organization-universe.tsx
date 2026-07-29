"use client";

import { useRef, useMemo, useState, useCallback } from "react";
import { Canvas, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface OrgNodeData {
  id: string;
  type: "ceo" | "executive" | "specialist";
  title: string;
  status: string;
  confidence: number;
  runtime: number;
  capabilities?: string[];
}

interface OrgUniverseProps {
  nodes: OrgNodeData[];
  isExecuting?: boolean;
  className?: string;
  onNodeClick?: (node: OrgNodeData) => void;
}

export default function OrganizationUniverse({ nodes, isExecuting = false, className, onNodeClick }: OrgUniverseProps) {
  const ceoNode = nodes.find((n) => n.type === "ceo");
  const execNodes = nodes.filter((n) => n.type === "executive");
  const specNodes = nodes.filter((n) => n.type === "specialist");

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 3, 7], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 5, 5]} intensity={1.2} color="#3b82f6" />
        <pointLight position={[-3, -2, 3]} intensity={0.6} color="#60a5fa" />
        <pointLight position={[3, -1, -2]} intensity={0.3} color="#818cf8" />
        <OrbitControls enablePan enableZoom enableRotate autoRotate={!isExecuting} autoRotateSpeed={0.6} minDistance={3} maxDistance={15} />
        <OrgUniverseGraph
          ceoNode={ceoNode}
          execNodes={execNodes}
          specNodes={specNodes}
          isExecuting={isExecuting}
          onNodeClick={onNodeClick}
        />
      </Canvas>
    </div>
  );
}

function OrgUniverseGraph({
  ceoNode,
  execNodes,
  specNodes,
  isExecuting,
  onNodeClick,
}: {
  ceoNode?: OrgNodeData;
  execNodes: OrgNodeData[];
  specNodes: OrgNodeData[];
  isExecuting: boolean;
  onNodeClick?: (node: OrgNodeData) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const execPositions = useMemo(() => {
    const ep = execNodes.map((_, i) => {
      const angle = (i / execNodes.length) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(angle) * 2.4, z: Math.sin(angle) * 2.4 };
    });
    return ep;
  }, [execNodes.length]);

  const specPositions = useMemo(() => {
    const positions: { x: number; z: number; parentIndex: number }[] = [];
    specNodes.forEach((_, i) => {
      const parentIdx = i % Math.max(execNodes.length, 1);
      const angle = (Math.floor(i / Math.max(execNodes.length, 1)) / Math.ceil(specNodes.length / Math.max(execNodes.length, 1))) * Math.PI * 2 + parentIdx * 0.8;
      const radius = 3.8 + Math.random() * 0.3;
      const parentPos = execPositions.length > 0 && parentIdx < execPositions.length
        ? execPositions[parentIdx]
        : null;
      const cx = parentPos ? parentPos.x + Math.cos(angle) * radius * 0.3 : Math.cos(angle) * radius;
      const cz = parentPos ? parentPos.z + Math.sin(angle) * radius * 0.3 : Math.sin(angle) * radius;
      positions.push({ x: cx, z: cz, parentIndex: parentIdx });
    });
    return positions;
  }, [specNodes.length, execPositions]);

  const execToSpecConnections = useMemo(() => {
    return specNodes.map((node, i) => {
      const pi = specPositions[i]?.parentIndex ?? 0;
      const fromX = execPositions.length > pi ? execPositions[pi].x : 0;
      const fromZ = execPositions.length > pi ? execPositions[pi].z : 0;
      return {
        from: [fromX, 0.2, fromZ] as [number, number, number],
        to: [specPositions[i].x, -0.1, specPositions[i].z] as [number, number, number],
        status: node.status,
      };
    });
  }, [specNodes, specPositions, execPositions]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.15) * 0.04;
  });

  return (
    <group ref={groupRef}>
      {ceoNode && (
        <group position={[0, 0.6, 0]}>
          <CeoSphere status={ceoNode.status} confidence={ceoNode.confidence} isExecuting={isExecuting} onClick={() => onNodeClick?.(ceoNode)} />
        </group>
      )}

      {execNodes.map((node, i) => {
        const pos = execPositions[i];
        return (
          <group key={node.id}>
            <EnergyBeam
              from={[0, 0.5, 0]}
              to={[pos.x, 0.3, pos.z]}
              status={node.status}
              isExecuting={isExecuting}
              intensity={0.6}
            />
            <group position={[pos.x, 0.3, pos.z]}>
              <ExecSphere status={node.status} confidence={node.confidence} isExecuting={isExecuting} onClick={() => onNodeClick?.(node)} />
            </group>
          </group>
        );
      })}

      {specNodes.map((node, i) => {
        const pos = specPositions[i];
        return (
          <group key={node.id}>
            <EnergyBeam
              from={[execPositions[pos.parentIndex]?.x ?? 0, 0.2, execPositions[pos.parentIndex]?.z ?? 0]}
              to={[pos.x, -0.1, pos.z]}
              status={node.status}
              isExecuting={isExecuting}
              intensity={0.3}
            />
            <group position={[pos.x, -0.1, pos.z]}>
              <SpecSphere status={node.status} confidence={node.confidence} isExecuting={isExecuting} onClick={() => onNodeClick?.(node)} />
            </group>
          </group>
        );
      })}
    </group>
  );
}

function CeoSphere({ status, confidence, isExecuting, onClick }: { status: string; confidence: number; isExecuting: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(t * (isExecuting ? 2 : 0.5)) * (hovered ? 0.06 : 0.03));
      (ref.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = (hovered ? 0.8 : 0.3) + Math.sin(t * (isExecuting ? 3 : 0.8)) * 0.2;
    }
    if (glowRef.current) {
      const glow = hovered ? 0.2 : 0.08;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = glow + Math.sin(t * (isExecuting ? 2 : 0.5)) * 0.04;
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2;
      ringRef.current.rotation.z = t * (isExecuting ? 0.5 : 0.15);
    }
  });

  return (
    <group>
      <mesh ref={glowRef} scale={hovered ? 2.5 : 1.8}>
        <sphereGeometry args={[0.5, 24, 24]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.08} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh
        ref={ref}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial
          color="#7c3aed"
          emissive="#8b5cf6"
          emissiveIntensity={0.3}
          metalness={0.4}
          roughness={0.15}
          transparent
          opacity={0.95}
        />
      </mesh>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.7, 0.78, 48]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={hovered ? 0.4 : 0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <MiniRing confidence={confidence} hovered={hovered} />
    </group>
  );
}

function ExecSphere({ status, confidence, isExecuting, onClick }: { status: string; confidence: number; isExecuting: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    if (status === "running" || isExecuting) {
      ref.current.scale.setScalar(1 + Math.sin(t * 3) * (hovered ? 0.08 : 0.05));
      (ref.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = (hovered ? 0.8 : 0.4) + Math.sin(t * 3) * 0.2;
    }
    if (status === "completed") {
      ref.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
    }
    if (glowRef.current) {
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = (hovered ? 0.15 : 0.06) + Math.sin(t * 2) * 0.03;
    }
  });

  return (
    <group>
      <mesh ref={glowRef} scale={hovered ? 2 : 1.6}>
        <sphereGeometry args={[0.35, 24, 24]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh
        ref={ref}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshPhysicalMaterial
          color="#2563eb"
          emissive="#3b82f6"
          emissiveIntensity={status === "running" ? 0.5 : 0.1}
          metalness={0.3}
          roughness={0.2}
          transparent
          opacity={status === "failed" ? 0.5 : 0.9}
        />
      </mesh>
      <MiniRing confidence={confidence} hovered={hovered} />
    </group>
  );
}

function SpecSphere({ status, confidence, isExecuting, onClick }: { status: string; confidence: number; isExecuting: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ref.current) return;
    if (status === "running") {
      ref.current.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
    }
  });

  return (
    <group>
      <mesh
        ref={ref}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshPhysicalMaterial
          color="#059669"
          emissive="#10b981"
          emissiveIntensity={status === "running" ? 0.4 : 0.05}
          metalness={0.2}
          roughness={0.3}
          transparent
          opacity={status === "failed" ? 0.5 : 0.9}
        />
      </mesh>
    </group>
  );
}

function MiniRing({ confidence, hovered }: { confidence: number; hovered: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = confidence >= 0.8 ? "#10b981" : confidence >= 0.5 ? "#f59e0b" : "#ef4444";

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.PI / 2.5;
    ref.current.rotation.z = clock.getElapsedTime() * (hovered ? 0.6 : 0.3);
  });

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <ringGeometry args={[0.45, 0.48, 32]} />
      <meshBasicMaterial color={color} transparent opacity={hovered ? 0.5 : 0.25} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function EnergyBeam({ from, to, status, isExecuting, intensity }: { from: [number, number, number]; to: [number, number, number]; status: string; isExecuting: boolean; intensity: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const lineRef = useRef<any>(null);

  const { curve, points } = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 0.3;
    const crv = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = crv.getPoints(24);
    return { curve: crv, points: pts };
  }, [from, to]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    const baseOpacity = isExecuting ? 0.3 : 0.15;
    mat.opacity = baseOpacity + Math.sin(clock.getElapsedTime() * 2 + from[0]) * 0.1;
  });

  return (
    <>
      <lineSegments ref={lineRef}>
        <bufferGeometry {...geometry} />
        <lineBasicMaterial
          color={status === "completed" ? "#10b981" : status === "running" ? "#3b82f6" : "#4b5563"}
          transparent
          opacity={0.15 * intensity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
      {isExecuting && (
        <EnergyParticles curve={curve} status={status} intensity={intensity} />
      )}
    </>
  );
}

function EnergyParticles({ curve, status, intensity }: { curve: THREE.QuadraticBezierCurve3; status: string; intensity: number }) {
  const count = 8;
  const ref = useRef<THREE.Points>(null);
  const progress = useMemo(() => new Float32Array(count).map(() => Math.random()), []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const p = ((t * 0.3 + progress[i]) % 1);
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
        <bufferAttribute attach="attributes-position" args={[new Float32Array(count * 3), 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color={status === "completed" ? "#10b981" : "#3b82f6"}
        transparent
        opacity={0.6 * intensity}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
