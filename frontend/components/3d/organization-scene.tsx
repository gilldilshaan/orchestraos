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

interface OrgSceneProps {
  nodes: OrgNodeData[];
  className?: string;
}

export default function OrganizationScene({ nodes, className }: OrgSceneProps) {
  const ceoNode = nodes.find((n) => n.type === "ceo");
  const execNodes = nodes.filter((n) => n.type === "executive");
  const specNodes = nodes.filter((n) => n.type === "specialist");

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 3, 6], fov: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 5, 5]} intensity={1} color="#3b82f6" />
        <pointLight position={[-3, -2, 3]} intensity={0.5} color="#60a5fa" />
        <OrbitControls enablePan enableZoom enableRotate autoRotate autoRotateSpeed={0.8} />
        <OrgGraph ceoNode={ceoNode} execNodes={execNodes} specNodes={specNodes} />
      </Canvas>
    </div>
  );
}

function OrgGraph({
  ceoNode,
  execNodes,
  specNodes,
}: {
  ceoNode?: OrgNodeData;
  execNodes: OrgNodeData[];
  specNodes: OrgNodeData[];
}) {
  const groupRef = useRef<THREE.Group>(null);

  const execPositions = useMemo(() => {
    return execNodes.map((_, i) => {
      const angle = (i / execNodes.length) * Math.PI * 2 - Math.PI / 2;
      return { x: Math.cos(angle) * 2.2, z: Math.sin(angle) * 2.2 };
    });
  }, [execNodes.length]);

  const specPositions = useMemo(() => {
    return specNodes.map((_, i) => {
      const angle = (i / specNodes.length) * Math.PI * 2;
      const radius = 3.5 + Math.random() * 0.5;
      return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
    });
  }, [specNodes.length]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {/* CEO at center */}
      {ceoNode && (
        <group position={[0, 0.5, 0]}>
          <OrgSphere status={ceoNode.status} isCeo color="#8b5cf6" />
          <GlowRing />
        </group>
      )}

      {/* Executive ring */}
      {execNodes.map((node, i) => (
        <group key={node.id}>
          <BeamConnection from={[0, 0.5, 0]} to={[execPositions[i].x, 0.2, execPositions[i].z]} status={node.status} />
          <group position={[execPositions[i].x, 0.2, execPositions[i].z]}>
            <OrgSphere status={node.status} color="#3b82f6" size={0.35} />
            <NodeLabel label={node.title} status={node.status} />
            {node.confidence > 0 && <MiniRing confidence={node.confidence} />}
          </group>
        </group>
      ))}

      {/* Specialist outer ring */}
      {specNodes.map((node, i) => (
        <group key={node.id}>
          <group position={[specPositions[i].x, -0.1, specPositions[i].z]}>
            <OrgSphere status={node.status} color="#10b981" size={0.22} />
          </group>
        </group>
      ))}
    </group>
  );
}

function OrgSphere({ status, isCeo, color, size }: { status: string; isCeo?: boolean; color: string; size?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (status === "running") {
      ref.current.scale.setScalar(1 + Math.sin(t * 3) * 0.06);
      (ref.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.4 + Math.sin(t * 3) * 0.2;
    }
    if (status === "completed") {
      ref.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.02);
    }
  });

  const s = size ?? (isCeo ? 0.5 : 0.35);

  return (
    <>
      <mesh ref={glowRef} scale={1.6}>
        <sphereGeometry args={[s, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh ref={ref}>
        <sphereGeometry args={[s, 32, 32]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={status === "running" ? 0.5 : status === "completed" ? 0.15 : 0.05}
          metalness={0.3}
          roughness={0.2}
          transparent
          opacity={status === "failed" ? 0.5 : 0.9}
        />
      </mesh>
    </>
  );
}

function GlowRing() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.PI / 2;
    ref.current.rotation.z = clock.getElapsedTime() * 0.2;
  });
  return (
    <mesh ref={ref}>
      <ringGeometry args={[0.7, 0.78, 48]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function MiniRing({ confidence }: { confidence: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = confidence >= 0.8 ? "#10b981" : confidence >= 0.5 ? "#f59e0b" : "#ef4444";

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.x = Math.PI / 2.5;
    ref.current.rotation.z = clock.getElapsedTime() * 0.3;
  });

  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <ringGeometry args={[0.45, 0.48, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function BeamConnection({ from, to, status }: { from: [number, number, number]; to: [number, number, number]; status: string }) {
  const ref = useRef<THREE.Mesh>(null);

  const points = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    mid.y += 0.3;
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(20);
  }, [from, to]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.15 + Math.sin(clock.getElapsedTime() * 2 + from[0]) * 0.1;
  });

  return (
    <line ref={ref as any}>
      <bufferGeometry {...geometry} />
      <lineBasicMaterial
        color={status === "completed" ? "#10b981" : "#3b82f6"}
        transparent
        opacity={0.2}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
}

function NodeLabel({ label, status }: { label: string; status: string }) {
  const color = status === "completed" ? "#10b981" : status === "failed" ? "#ef4444" : status === "running" ? "#3b82f6" : "#6b7280";
  return (
    <sprite position={[0, -0.6, 0]} scale={[0.6, 0.2, 1]}>
      <spriteMaterial attach="material" transparent opacity={0.8} depthWrite={false} />
    </sprite>
  );
}
