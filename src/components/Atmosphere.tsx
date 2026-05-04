'use client';
import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// ─── Particle layer props ──────────────────────────────────────────────────────
interface ParticleLayerProps {
  count: number;
  innerRadius: number;
  outerRadius: number;
  color: string;
  size: number;
  rotationSpeed: { y: number; z: number };
  oscillation: { amplitude: number; frequency: number; phase: number };
  opacity?: number;
}

// ─── ParticleLayer ─────────────────────────────────────────────────────────────
// Each layer is a volumetric shell of particles. Using cbrt() for uniform
// volume distribution — without it particles cluster at the centre.
// Additive blending makes overlapping particles glow, matching fluid vein physics.
function ParticleLayer({
  count,
  innerRadius,
  outerRadius,
  color,
  size,
  rotationSpeed,
  oscillation,
  opacity = 1,
}: ParticleLayerProps) {
  const ref = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Shell distribution: radius between inner and outer using cbrt
      const t = Math.random();
      const r = innerRadius + (outerRadius - innerRadius) * Math.cbrt(t);
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count, innerRadius, outerRadius]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!ref.current) return;

    ref.current.rotation.y = time * rotationSpeed.y;
    ref.current.rotation.z = time * rotationSpeed.z;

    // Gentle breathing: the entire layer oscillates on Y
    ref.current.position.y =
      Math.sin(time * oscillation.frequency + oscillation.phase) * oscillation.amplitude;
    // Subtle X drift: adds a second axis of life
    ref.current.position.x =
      Math.cos(time * oscillation.frequency * 0.61 + oscillation.phase) *
      oscillation.amplitude * 0.38;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={size}
        sizeAttenuation
        depthWrite={false}
        opacity={opacity}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// ─── StarLayer: near-static "deep field" background stars ──────────────────────
// These barely move — they're the distant backdrop, not the atmosphere itself.
function StarLayer({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 12 + Math.random() * 4;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const time = state.clock.getElapsedTime();
    ref.current.rotation.y = time * 0.008;
    ref.current.rotation.x = time * 0.003;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#c4d8e8"
        size={0.025}
        sizeAttenuation
        depthWrite={false}
        opacity={0.5}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// ─── Atmosphere ────────────────────────────────────────────────────────────────
export default function Atmosphere() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Particle budget scaled to device
  const c = isMobile
    ? { primary: 500, secondary: 200, accent: 60, micro: 120, stars: 80 }
    : { primary: 2000, secondary: 800, accent: 150, micro: 300, stars: 200 };

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
  dpr={isMobile ? 1 : [1, 1.5]}
  camera={{ position: [0, 0, 1] }}
  gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
>
        {/* Depth fog matches the fluid background base color */}
        <fog attach="fog" args={['#010208', 3, 12]} />

        {/* ── Layer 1: Primary — prussian-silver, slow counter-rotation ─── */}
        {/* Matches fluid vein wall color: cool desaturated silver */}
        <ParticleLayer
          count={c.primary}
          innerRadius={2}
          outerRadius={10}
          color="#2e4a62"           // Deep prussian blue-silver
          size={isMobile ? 0.024 : 0.019}
          rotationSpeed={{ y: 0.038, z: 0.014 }}
          oscillation={{ amplitude: 0.07, frequency: 0.20, phase: 0 }}
        />

        {/* ── Layer 2: Secondary — deep indigo ghost, counter-rotation ──── */}
        {/* Matches fluid body: indigo-teal mid-tones */}
        <ParticleLayer
          count={c.secondary}
          innerRadius={1.5}
          outerRadius={8}
          color="#1a3048"           // Dark indigo-teal
          size={isMobile ? 0.016 : 0.013}
          rotationSpeed={{ y: -0.055, z: 0.026 }}
          oscillation={{ amplitude: 0.05, frequency: 0.28, phase: Math.PI / 3 }}
        />

        {/* ── Layer 3: Accent — near-white specks, fast rotation ────────── */}
        {/* These are the "hottest" points — match flare peak color */}
        <ParticleLayer
          count={c.accent}
          innerRadius={1}
          outerRadius={7}
          color="#a0c0d8"           // Light silver-blue — flare peak echo
          size={isMobile ? 0.034 : 0.028}
          rotationSpeed={{ y: 0.086, z: -0.038 }}
          oscillation={{ amplitude: 0.09, frequency: 0.16, phase: Math.PI * 0.8 }}
        />

        {/* ── Layer 4: Micro — fine mist, opposite axes ─────────────────── */}
        {/* Very small, very fast — gives a dusty, atmospheric haze */}
        <ParticleLayer
          count={c.micro}
          innerRadius={3}
          outerRadius={9}
          color="#1e3a50"           // Very dark prussian — almost invisible
          size={isMobile ? 0.010 : 0.008}
          rotationSpeed={{ y: -0.028, z: 0.042 }}
          oscillation={{ amplitude: 0.03, frequency: 0.44, phase: Math.PI * 1.4 }}
          opacity={0.6}
        />

        {/* ── Layer 5: Stars — near-static deep field ───────────────────── */}
        {!isMobile && <StarLayer count={c.stars} />}
      </Canvas>
    </div>
  );
}