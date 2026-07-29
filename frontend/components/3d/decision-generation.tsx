"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface DecisionGenerationProps {
  active?: boolean;
  confidence?: number;
  className?: string;
  onComplete?: () => void;
}

export default function DecisionGeneration({
  active = false,
  confidence = 0.85,
  className,
  onComplete,
}: DecisionGenerationProps) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 4]} intensity={2} color="#3b82f6" />
        <DecisionCore active={active} confidence={confidence} onComplete={onComplete} />
      </Canvas>
    </div>
  );
}

function DecisionCore({ active, confidence, onComplete }: { active: boolean; confidence: number; onComplete?: () => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const particleRef = useRef<THREE.Points>(null);
  const [phase, setPhase] = useState<"idle" | "gathering" | "pulse" | "materialize" | "complete">("idle");
  const [intensity, setIntensity] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const particleCount = 80;

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 2 + Math.random() * 3;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  useEffect(() => {
    if (active) {
      setPhase("gathering");
      timeoutRef.current = setTimeout(() => setPhase("pulse"), 1200);
      return () => clearTimeout(timeoutRef.current!);
    } else {
      setPhase("idle");
      setIntensity(0);
    }
  }, [active]);

  useEffect(() => {
    if (phase === "pulse") {
      timeoutRef.current = setTimeout(() => setPhase("materialize"), 800);
      return () => clearTimeout(timeoutRef.current!);
    }
    if (phase === "materialize") {
      timeoutRef.current = setTimeout(() => {
        setPhase("complete");
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timeoutRef.current!);
    }
  }, [phase, onComplete]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!groupRef.current) return;

    switch (phase) {
      case "idle":
        groupRef.current.rotation.y = t * 0.1;
        break;

      case "gathering": {
        const progress = Math.min((t - Math.floor(t / 1.2) * 1.2) / 1.2, 1);
        setIntensity(progress);
        groupRef.current.rotation.y = t * 0.3;

        if (coreRef.current) {
          const breathe = 1 + Math.sin(t * 2) * 0.02 * progress;
          coreRef.current.scale.setScalar(breathe);
          (coreRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3 + progress * 0.5;
        }

        if (ringRef.current) {
          ringRef.current.scale.setScalar(1 + progress * 1.5);
          (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + progress * 0.4;
          ringRef.current.rotation.z = t * (0.5 + progress);
        }

        if (particleRef.current) {
          const pos = particleRef.current.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < particleCount; i++) {
            const baseR = 2 + ((i % 5) * 0.6);
            const targetR = 0.5 + (i % 3) * 0.2;
            const r = baseR - (baseR - targetR) * progress;
            const theta = Math.atan2(pos[i * 3 + 1], pos[i * 3]) + t * 0.5;
            const phi = Math.acos(pos[i * 3 + 2] / (baseR));
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
          }
          particleRef.current.geometry.attributes.position.needsUpdate = true;
          (particleRef.current.material as THREE.PointsMaterial).opacity = 0.3 + progress * 0.7;
        }
        break;
      }

      case "pulse": {
        const pulseProgress = Math.min((t - Math.floor(t / 0.8) * 0.8) / 0.8, 1);

        if (coreRef.current) {
          const scale = 1 + Math.sin(t * 8) * 0.05 * (1 - pulseProgress);
          coreRef.current.scale.setScalar(scale);
          const emissive = 0.8 + Math.sin(t * 10) * 0.3;
          (coreRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = emissive;
        }

        if (flashRef.current) {
          const flash = Math.sin(t * 12) * 0.5 + 0.5;
          flashRef.current.scale.setScalar(1 + flash * 3);
          (flashRef.current.material as THREE.MeshBasicMaterial).opacity = flash * 0.6;
        }

        if (ringRef.current) {
          ringRef.current.scale.setScalar(3 + Math.sin(t * 6) * 0.5);
          (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(t * 6) * 0.2;
          ringRef.current.rotation.z = t * 2;
        }

        if (particleRef.current) {
          (particleRef.current.material as THREE.PointsMaterial).size = 0.04 + Math.sin(t * 8) * 0.03;
          const pos = particleRef.current.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < particleCount; i++) {
            const r = 0.3 + (i % 5) * 0.08;
            const theta = t * (1 + (i % 3) * 0.2);
            const phi = Math.acos(2 * (i / particleCount) - 1);
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
          }
          particleRef.current.geometry.attributes.position.needsUpdate = true;
        }
        break;
      }

      case "materialize": {
        if (coreRef.current) {
          (coreRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.4 + Math.sin(t * 1) * 0.1;
        }
        if (ringRef.current) {
          ringRef.current.scale.setScalar(3 + Math.sin(t * 0.5) * 0.2);
          (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.15 + Math.sin(t * 0.5) * 0.05;
          ringRef.current.rotation.z = t * 0.3;
        }
        groupRef.current.rotation.y = t * 0.05;
        break;
      }

      case "complete": {
        if (coreRef.current) {
          (coreRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.3 + Math.sin(t * 0.5) * 0.1;
        }
        break;
      }
    }
  });

  const decisionColor = useMemo(() => {
    if (confidence >= 0.8) return new THREE.Color("#10b981");
    if (confidence >= 0.5) return new THREE.Color("#f59e0b");
    return new THREE.Color("#ef4444");
  }, [confidence]);

  return (
    <group ref={groupRef}>
      {phase !== "idle" && (
        <>
          <mesh ref={flashRef}>
            <sphereGeometry args={[0.8, 32, 32]} />
            <meshBasicMaterial color={decisionColor} transparent opacity={0} side={THREE.BackSide} />
          </mesh>

          <mesh ref={ringRef}>
            <ringGeometry args={[0.5, 0.6, 64]} />
            <meshBasicMaterial color={decisionColor} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>

          <points ref={particleRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
            </bufferGeometry>
            <pointsMaterial
              size={0.03}
              color={decisionColor}
              transparent
              opacity={0}
              sizeAttenuation
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </points>
        </>
      )}

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshPhysicalMaterial
          color="#1e40af"
          emissive={decisionColor}
          emissiveIntensity={0.2}
          metalness={0.3}
          roughness={0.15}
          transparent
          opacity={0.9}
        />
      </mesh>

      {(phase === "complete" || phase === "idle") && (
        <mesh>
          <ringGeometry args={[0.7, 0.75, 48]} />
          <meshBasicMaterial color={decisionColor} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
