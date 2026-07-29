"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface AiCoreProps {
  isExecuting?: boolean;
  confidence?: number;
  intensity?: number;
  compact?: boolean;
  className?: string;
}

export default function AiCore({
  isExecuting = false,
  confidence = 0.85,
  intensity = 0.6,
  compact = false,
  className,
}: AiCoreProps) {
  const cameraPos = compact ? [0, 0, 4.5] as const : [0, 0, 6] as const;
  return (
    <div className={className}>
      <Canvas camera={{ position: cameraPos, fov: compact ? 50 : 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.15} />
        <pointLight position={[0, 0, 4]} intensity={2.5} color="#3b82f6" />
        <pointLight position={[0, 0, -4]} intensity={0.8} color="#60a5fa" />
        <CoreGroup isExecuting={isExecuting} confidence={confidence} intensity={intensity} compact={compact} />
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} autoRotate autoRotateSpeed={isExecuting ? 1.8 : 0.6} />
      </Canvas>
    </div>
  );
}

function CoreGroup({ isExecuting, confidence, intensity, compact }: Required<Omit<AiCoreProps, 'className'>>) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const innerGlowRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  const ring3Ref = useRef<THREE.Mesh>(null);
  const ring4Ref = useRef<THREE.Mesh>(null);
  const confidenceRingRef = useRef<THREE.Mesh>(null);
  const hologramRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const energyRef = useRef<THREE.Points>(null);

  const particleCount = compact ? 80 : 160;

  const { particlePositions, particleSizes } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1.6 + Math.random() * 2;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      sizes[i] = 0.015 + Math.random() * 0.05;
    }
    return { particlePositions: positions, particleSizes: sizes };
  }, []);

  const energyParticleCount = compact ? 30 : 60;
  const energyPositions = useMemo(() => {
    const positions = new Float32Array(energyParticleCount * 3);
    for (let i = 0; i < energyParticleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 1.2;
      positions[i * 3] = radius * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 2] = radius * Math.sin(theta);
    }
    return positions;
  }, []);

  const confidenceColor = useMemo(() => {
    if (confidence >= 0.8) return new THREE.Color("#10b981");
    if (confidence >= 0.5) return new THREE.Color("#f59e0b");
    return new THREE.Color("#ef4444");
  }, [confidence]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const speed = isExecuting ? 1.2 : 0.4;

    if (coreRef.current) {
      const breathe = 1 + Math.sin(t * speed * 1.5) * 0.03 * intensity;
      coreRef.current.scale.setScalar(breathe);
      const pulse = 0.5 + Math.sin(t * speed * 2.5) * 0.2 * intensity;
      (coreRef.current.material as THREE.MeshPhysicalMaterial).emissiveIntensity = pulse;
    }

    if (innerGlowRef.current) {
      const breathe = 1 + Math.sin(t * speed * 1.8) * 0.06 * intensity;
      innerGlowRef.current.scale.setScalar(breathe);
      (innerGlowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t * speed * 2.5) * 0.1 * intensity;
    }

    if (glowRef.current) {
      const breathe = 1 + Math.sin(t * speed * 1.5) * 0.06 * intensity;
      glowRef.current.scale.setScalar(breathe);
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.06 + Math.sin(t * speed * 2) * 0.03 * intensity;
    }

    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 3;
      ring1Ref.current.rotation.z = t * speed * 0.35;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -Math.PI / 4;
      ring2Ref.current.rotation.z = t * speed * -0.25;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = Math.PI / 2.5;
      ring3Ref.current.rotation.z = t * speed * 0.18;
    }
    if (ring4Ref.current) {
      ring4Ref.current.rotation.x = -Math.PI / 3.5;
      ring4Ref.current.rotation.z = t * speed * -0.12;
    }
    if (confidenceRingRef.current) {
      confidenceRingRef.current.rotation.x = Math.PI / 2.2;
      confidenceRingRef.current.rotation.z = t * speed * 0.1;
      (confidenceRingRef.current.material as THREE.MeshBasicMaterial).color = confidenceColor;
      const pulse = 0.4 + Math.sin(t * speed * 1.5) * 0.15;
      (confidenceRingRef.current.material as THREE.MeshBasicMaterial).opacity = pulse;
    }

    if (hologramRef.current) {
      hologramRef.current.rotation.y = t * speed * 0.05;
      hologramRef.current.position.y = Math.sin(t * speed * 0.8) * 0.05;
    }

    if (particlesRef.current) {
      const pos = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const theta = Math.atan2(pos[i * 3 + 1], pos[i * 3]);
        const phi = Math.acos(Math.max(-1, Math.min(1, pos[i * 3 + 2] / 2.8)));
        const radius = 1.6 + ((i % 5) * 0.4);
        const angle = theta + t * speed * (0.04 + (i % 4) * 0.015);
        const lat = phi + t * speed * 0.01 * (i % 2 === 0 ? 1 : -1);
        pos[i * 3] = radius * Math.sin(lat) * Math.cos(angle);
        pos[i * 3 + 1] = radius * Math.sin(lat) * Math.sin(angle);
        pos[i * 3 + 2] = radius * Math.cos(lat);
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (energyRef.current && isExecuting) {
      const pos = energyRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < energyParticleCount; i++) {
        const idx = i * 3;
        pos[idx + 1] += Math.sin(t + i) * 0.008;
        if (pos[idx + 1] > 1.2) pos[idx + 1] = -1.2;
        const angle = t * 0.5 + i * 0.3;
        pos[idx] = Math.cos(angle) * (0.8 + (i % 3) * 0.3);
        pos[idx + 2] = Math.sin(angle) * (0.8 + (i % 3) * 0.3);
      }
      energyRef.current.geometry.attributes.position.needsUpdate = true;
      const mat = energyRef.current.material as THREE.PointsMaterial;
      mat.opacity = 0.4 + Math.sin(t * 1.5) * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[compact ? 1 : 1.5, 32, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>

      <mesh ref={coreRef}>
        <sphereGeometry args={[compact ? 0.5 : 0.65, 48, 48]} />
        <meshPhysicalMaterial
          color="#1e40af"
          emissive="#3b82f6"
          emissiveIntensity={0.5}
          metalness={0.15}
          roughness={0.15}
          transparent
          opacity={0.95}
        />
      </mesh>

      <mesh ref={innerGlowRef}>
        <sphereGeometry args={[compact ? 0.2 : 0.28, 32, 32]} />
        <meshBasicMaterial color="#93c5fd" transparent opacity={0.4} />
      </mesh>

      {/* Holographic layers */}
      <mesh ref={hologramRef}>
        <boxGeometry args={[compact ? 1.6 : 2.2, compact ? 1.6 : 2.2, compact ? 1.6 : 2.2]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.03}
          wireframe
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, compact ? -0.1 : -0.15, 0]}>
        <ringGeometry args={[compact ? 0.7 : 0.9, compact ? 0.72 : 0.93, 48]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, compact ? 0.1 : 0.15, 0]}>
        <ringGeometry args={[compact ? 0.7 : 0.9, compact ? 0.72 : 0.93, 48]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <mesh ref={ring1Ref}>
        <torusGeometry args={[compact ? 1.1 : 1.4, 0.018, 16, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.5} />
      </mesh>

      <mesh ref={ring2Ref}>
        <torusGeometry args={[compact ? 1.4 : 1.8, 0.014, 16, 64]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.35} />
      </mesh>

      <mesh ref={ring3Ref}>
        <torusGeometry args={[compact ? 1.6 : 2.1, 0.012, 16, 72]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.25} />
      </mesh>

      <mesh ref={ring4Ref}>
        <torusGeometry args={[compact ? 1.8 : 2.3, 0.01, 16, 80]} />
        <meshBasicMaterial color="#c084fc" transparent opacity={0.15} />
      </mesh>

      <mesh ref={confidenceRingRef}>
        <torusGeometry args={[compact ? 2.0 : 2.5, 0.03, 16, 80]} />
        <meshBasicMaterial color={confidenceColor} transparent opacity={0.6} />
      </mesh>

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#93c5fd"
          transparent
          opacity={0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {isExecuting && (
        <>
          <points ref={energyRef}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[energyPositions, 3]} />
            </bufferGeometry>
            <pointsMaterial
              size={0.06}
              color="#60a5fa"
              transparent
              opacity={0.5}
              sizeAttenuation
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </points>
          <EnergyPulse intensity={intensity} compact={compact} />
        </>
      )}
    </group>
  );
}

function EnergyPulse({ intensity, compact }: { intensity: number; compact: boolean }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const pulse = (Math.sin(t * 1.8) * 0.5 + 0.5) * intensity;
    const scale = 0.1 + pulse * (compact ? 1.8 : 2.5);
    ref.current.scale.setScalar(1 + scale);
    (ref.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.25 - pulse * 0.4);
    const hue = 0.58 + pulse * 0.08;
    (ref.current.material as THREE.MeshBasicMaterial).color.setHSL(hue, 0.8, 0.5);
  });

  return (
    <mesh ref={ref}>
      <ringGeometry args={[compact ? 0.5 : 0.65, compact ? 0.58 : 0.75, 48]} />
      <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}
