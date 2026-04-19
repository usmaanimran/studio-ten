'use client';
import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MotionValue, useMotionValueEvent } from 'framer-motion';

// ─────────────────────────────────────────────
// SHADERS
// ─────────────────────────────────────────────

const vertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uDisintegrate;
  varying vec2 vUv;
  varying float vDistortion;

  // 3D Simplex Noise
  vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){ 
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( 
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;

    // ── Base organic noise distortion ──
    float baseNoise = snoise(position * 1.5 + uTime * 0.3);

    // ── Mouse influence (works with externally passed NDC coords) ──
    vec2 mappedMouse = uMouse * 2.5;
    float mouseDist = distance(position.xy, mappedMouse);
    float mouseInfluence = smoothstep(1.5, 0.0, mouseDist);
    float finalDistortion = baseNoise + (mouseInfluence * 0.8);

    vec3 newPosition = position + normal * (finalDistortion * 0.4);

    // ── Disintegration: scatter vertices with per-vertex noise seeds ──
    if (uDisintegrate > 0.001) {
      // Unique direction per vertex using prime-offset noise
      float nx = snoise(position * 2.5 + vec3(17.31, 0.0, 0.0));
      float ny = snoise(position * 2.5 + vec3(0.0, 43.17, 0.0));
      float nz = snoise(position * 2.5 + vec3(0.0, 0.0, 71.53));

      // Scatter outward from sphere + noise to break symmetry
      vec3 scatterDir = normalize(position + vec3(nx, ny, nz) * 0.65);

      // Cubic ease-in so it starts slow and accelerates dramatically
      float power = uDisintegrate * uDisintegrate * uDisintegrate;
      newPosition += scatterDir * power * 6.0;
    }

    vDistortion = finalDistortion;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  varying float vDistortion;
  uniform float uDisintegrate;

  void main() {
    vec3 colorA = vec3(0.05, 0.05, 0.05); // Deep dark
    vec3 colorB = vec3(0.55, 0.58, 0.62); // Metallic silver
    vec3 finalColor = mix(colorA, colorB, vDistortion + 0.5);
    float rim = 1.0 - smoothstep(0.0, 1.0, length(vUv - 0.5) * 2.0);
    finalColor *= (0.5 + rim * 0.5);

    // Fade out during disintegration — starts at 0.1, fully gone by 0.85
    float alpha = 1.0 - smoothstep(0.1, 0.85, uDisintegrate);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// ─────────────────────────────────────────────
// LIQUID BLOB MESH
// ─────────────────────────────────────────────

interface LiquidBlobProps {
  isReady: boolean;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgress: MotionValue<number>;
}

function LiquidBlob({ isReady, mouseRef, scrollProgress }: LiquidBlobProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const currentScale = useRef(0.01);
  // Persistent vector — no per-frame allocation
  const targetMouse = useRef(new THREE.Vector2(0, 0));

  const uniforms = useMemo(() => ({
    uTime:         { value: 0 },
    uMouse:        { value: new THREE.Vector2(0, 0) },
    uDisintegrate: { value: 0 },
  }), []);

  // ── Subscribe to scroll progress and drive disintegration ──
  // Blob stays intact 0–0.15, then fragments completely by 0.70
  useMotionValueEvent(scrollProgress, 'change', (latest) => {
    if (materialRef.current) {
      const dis = Math.max(0, Math.min(1, (latest - 0.15) / 0.55));
      materialRef.current.uniforms.uDisintegrate.value = dis;
    }
  });

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    // Read the ref — zero GC, no stale-closure issues
    const coords = mouseRef.current;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;

      // Convert window pixel coords → NDC [-1, 1]
      // state.size reflects the actual canvas dimensions
      const ndcX =  (coords.x / state.size.width)  * 2 - 1;
      const ndcY = -((coords.y / state.size.height) * 2 - 1);

      targetMouse.current.set(ndcX, ndcY);
      // Lerp for smooth lag; 0.08 is noticeably responsive
      materialRef.current.uniforms.uMouse.value.lerp(targetMouse.current, 0.08);
    }

    if (meshRef.current) {
      // Grow from zero when preloader completes
      const targetScale = isReady ? 1.8 : 0.01;
      currentScale.current = THREE.MathUtils.damp(currentScale.current, targetScale, 3, delta);
      meshRef.current.scale.setScalar(currentScale.current);

      // Mouse-driven rotation — re-read coords for rotation too
      const ndcX =  (coords.x / state.size.width)  * 2 - 1;
      const ndcY = -((coords.y / state.size.height) * 2 - 1);

      meshRef.current.rotation.x = THREE.MathUtils.lerp(
        meshRef.current.rotation.x, -ndcY * 0.5, 0.05
      );
      meshRef.current.rotation.y = THREE.MathUtils.lerp(
        meshRef.current.rotation.y, ndcX * 0.5 + time * 0.1, 0.05
      );
      meshRef.current.rotation.z = time * 0.05;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* REDUCED FROM 128 TO 32. This saves ~150,000 vertex calculations per frame */}
      <icosahedronGeometry args={[1, 32]} /> 
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        wireframe={false}
        transparent={true}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

interface FluidBackgroundProps {
  isReady?: boolean;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgress: MotionValue<number>;
}

 
export default function FluidBackground({
  isReady = true,
  mouseRef,
  scrollProgress,
}: FluidBackgroundProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches);
  }, []);

  return (
    // FIX: Added 'pointer-events-none' so the canvas doesn't steal touches
    <div className="absolute inset-0 z-0 bg-[#020202] pointer-events-none">
      <Canvas dpr={isMobile ? 1 : [1, 1.5]} camera={{ position: [0, 0, 4] }}>
        <LiquidBlob isReady={isReady} mouseRef={mouseRef} scrollProgress={scrollProgress} />
      </Canvas>
    </div>
  );
}