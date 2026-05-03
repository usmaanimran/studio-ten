'use client';
import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { MotionValue, useMotionValueEvent } from 'framer-motion';

// ─── VERTEX SHADER ─────────────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// ─── FRAGMENT SHADER ────────────────────────────────────────────────────────────
const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uMouse;       // NDC [-1, 1]
  uniform vec2  uVelocity;    // screen-space mouse velocity
  uniform float uDisintegrate;
  uniform vec2  uResolution;
  uniform float uZoom;        // 4.5 → 1.0 on reveal
  uniform float uIntensity;   // 0.0 → 1.0 fade-in

  varying vec2 vUv;

  #define TAU 6.28318530718

  // ─── Quintic gradient noise ─────────────────────────────────────────────────
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    return mix(
      mix(dot(hash2(i),           f          ),
          dot(hash2(i+vec2(1,0)), f-vec2(1,0)), u.x),
      mix(dot(hash2(i+vec2(0,1)), f-vec2(0,1)),
          dot(hash2(i+vec2(1,1)), f-vec2(1,1)), u.x),
      u.y);
  }

  // ─── Curl noise: analytically divergence-free velocity field ───────────────
  vec2 curlNoise(vec2 p, float t) {
    const float e = 0.0035;
    vec2 pt = p + vec2(t * 0.19, t * 0.14);
    float n0 = noise(pt + vec2(0.0,  e));
    float n1 = noise(pt - vec2(0.0,  e));
    float n2 = noise(pt + vec2( e, 0.0));
    float n3 = noise(pt - vec2( e, 0.0));
    return vec2(n0-n1, -(n2-n3)) / (2.0*e);
  }

  // ─── 5-octave FBM ──────────────────────────────────────────────────────────
  const mat2 ROT = mat2(1.75, 1.15, -1.15, 1.75);
  float fbm(vec2 p) {
    float v = 0.0, a = 0.50;
    for (int i = 0; i < 5; i++) { v += a*noise(p); p = ROT*p; a *= 0.49; }
    return v;
  }

  // ─── Curl-advected triple domain warp ──────────────────────────────────────
  float fluidDensity(vec2 p, float t) {
    vec2 c1 = curlNoise(p * 0.50, t * 0.35);
    p += c1 * 0.44;

    vec2 c2 = curlNoise(p * 1.05 + vec2(3.73, 1.82), t * 0.28);
    p += c2 * 0.26;

    vec2 c3 = curlNoise(p * 1.90 + vec2(8.31, 5.15), t * 0.50);
    p += c3 * 0.12;

    return fbm(p * 0.87);
  }

  // ─── Thin-film iridescence (physically-based) ──────────────────────────────
  vec3 thinFilmIridescence(float phase) {
    vec3 c;
    c.r = 0.5 + 0.5*cos(TAU * phase * 0.62);
    c.g = 0.5 + 0.5*cos(TAU * (phase * 0.78 + 0.333));
    c.b = 0.5 + 0.5*cos(TAU * (phase + 0.667));
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    return mix(vec3(luma), c, 0.22);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = (vUv - 0.5);
    uv.x *= aspect;

    float t = uTime;

    // ─── Mouse interaction (Authentic Aerodynamics) ────────────────────────
    vec2 mWorld = vec2(uMouse.x * aspect * 0.5, uMouse.y * 0.5);
    vec2 toMouse = uv - mWorld;
    float mDist = length(toMouse);
    float mSpeed = length(uVelocity);

    // Comet-trail stretch
    vec2 motionDir = normalize(uVelocity + vec2(1e-5));
    float motionStr = clamp(mSpeed * 0.20, 0.0, 0.80);
    vec2 stretchedToMouse = toMouse - motionDir * dot(toMouse, motionDir) * motionStr * 0.38;
    float mDistS = length(stretchedToMouse);

    // Normalize safe
    vec2 toMouseN = normalize(stretchedToMouse + vec2(1e-5));

    // 1. Aerodynamic Repulsion (Parting the fog)
    // By SUBTRACTING this vector, we sample closer to the cursor, pushing 
    // the visual pixels outward. This eliminates the "pinch" (black hole) effect.
    float lensR = 0.35;
    float lens = smoothstep(lensR, 0.0, mDistS);
    vec2 pressure = toMouseN * pow(lens, 1.85) * 0.080;

    // 2. Vortex Swirl (Turbulent wake)
    vec2 tangent = vec2(-toMouse.y, toMouse.x) / (mDist + 0.001);
    float vortexMask = smoothstep(0.40, 0.0, mDist) * clamp(mSpeed * 0.22, 0.0, 1.0);
    vec2 vortex = tangent * vortexMask * 0.052;

    // 3. Wake Drag (Pulling fog along)
    // Subtraction pulls the texture in the direction of the velocity vector
    vec2 wake = motionDir * mSpeed * 0.008 * smoothstep(0.5, 0.0, mDist);

    // APPLIED AERODYNAMICS
    vec2 distUv = uv - pressure + vortex - wake;
    vec2 fieldUv = distUv * uZoom;

    // ─── Sample fluid density ──────────────────────────────────────────────
    float f = fluidDensity(fieldUv, t);
    float v = clamp(f * 0.5 + 0.5, 0.0, 1.0);

    // ─── Screen-space normals — fake surface lighting at zero cost ─────────
    float df_dx = dFdx(f) * 85.0;
    float df_dy = dFdy(f) * 85.0;
    vec3 norm = normalize(vec3(-df_dx, -df_dy, 1.0));

    // ─── Analytical chromatic dispersion ───────────────────────────────────
    float dispAmt = smoothstep(0.47, 0.65, v) * 0.009;
    float fR = f + dot(norm.xy, vec2( 1.0,  0.5)) * dispAmt;
    float fB = f + dot(norm.xy, vec2(-0.85, -0.4)) * dispAmt;
    float vR = clamp(fR*0.5+0.5, 0.0, 1.0);
    float vB = clamp(fB*0.5+0.5, 0.0, 1.0);

    // ─── Disintegrate on scroll ────────────────────────────────────────────
    float alpha = uIntensity * 0.91;
    if (uDisintegrate > 0.001) {
      vec2 rawUv = vUv - 0.5;
      rawUv.x *= aspect;
      vec2 disC = curlNoise(rawUv * 1.1, t * 0.32);
      float disDist = length(rawUv + disC * uDisintegrate * 0.60);
      float power = uDisintegrate * uDisintegrate * uDisintegrate;
      f -= power * disDist * 4.8;
      v  = clamp(f*0.5+0.5, 0.0, 1.0);
      alpha *= 1.0 - smoothstep(0.0, 0.95, uDisintegrate);
    }

    // ─── COLOR PIPELINE ────────────────────────────────────────────────────
    vec3 col = vec3(0.003, 0.004, 0.013);
    col = mix(col, vec3(0.007, 0.013, 0.030), smoothstep(0.22, 0.50, v));
    col = mix(col, vec3(0.013, 0.023, 0.050), smoothstep(0.42, 0.58, v));

    float vWall = smoothstep(0.50, 0.58, v) * (1.0 - smoothstep(0.58, 0.78, v));
    col = mix(col, vec3(0.18, 0.26, 0.36), vWall * 1.75);

    float vCore = smoothstep(0.57, 0.635, v) * (1.0 - smoothstep(0.635, 0.72, v));
    vec3 veinChroma = vec3(
      vR * 0.76 + 0.18,
      v  * 0.80 + 0.13,
      vB * 0.86 + 0.09
    );
    col = mix(col, veinChroma, vCore * 2.15);

    float flare = smoothstep(0.69, 0.80, v);
    col = mix(col, vec3(0.82, 0.89, 0.96), flare * 0.36);

    // ─── Thin-film iridescence overlay ────────────────────────────────────
    float iridZone = smoothstep(0.48, 0.62, v) * (1.0 - smoothstep(0.62, 0.82, v));
    float filmPhase = v * 2.1 + t * 0.04 + mDist * 0.65;
    vec3 iriColor = thinFilmIridescence(filmPhase);
    col = mix(col, col * iriColor * 1.65, iridZone * 0.30);

    // ─── Specular highlight ───────────────────────────────────────────────
    vec3 keyDir = normalize(vec3(0.58, 0.72, 1.0));
    float spec = pow(max(0.0, dot(norm, keyDir)), 32.0);
    col += vec3(0.16, 0.22, 0.30) * spec * smoothstep(0.50, 0.66, v) * 0.75;

    // ─── Mouse proximity brightening ──────────────────────────────────────
    float mProx = 1.0 - smoothstep(0.0, 0.40, mDist);
    col += vec3(0.007, 0.017, 0.032) * mProx * mProx * 5.5;
    col += veinChroma * vCore * mProx * 0.18;

    // ─── Two-layer film grain ──────────────────────────────────────────────
    float g1 = fract(sin(dot(vUv, vec2(12.9898, 78.233)) + t*0.73) * 43758.545);
    float g2 = fract(sin(dot(vUv, vec2(93.989,  67.346)) + t*0.38) * 23421.631);
    col += ((g1+g2)*0.5 - 0.5) * 0.012;

    // ─── Cinematic vignette ───────────────────────────────────────────────
    vec2 vigUv = (vUv - 0.5) * vec2(aspect, 1.0);
    float vig = 1.0 - smoothstep(0.32, 1.42, length(vigUv * 1.72));
    col *= vig * 0.83 + 0.17;

    col = max(col, vec3(0.0));
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

// ─── FieldMesh: manages uniforms, mouse tracking, and frame updates ────────────
interface FieldMeshProps {
  isReady: boolean;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
  scrollProgress: MotionValue<number>;
}

function FieldMesh({ isReady, mouseRef, scrollProgress }: FieldMeshProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();

  const targetMouse  = useRef(new THREE.Vector2(0, 0));
  const currentMouse = useRef(new THREE.Vector2(0, 0));
  const prevMouse    = useRef(new THREE.Vector2(0, 0));
  const currentZoom  = useRef(4.5);
  const currentAlpha = useRef(0.0);

  const uniforms = useMemo(() => ({
    uTime:         { value: 0 },
    uMouse:        { value: new THREE.Vector2(0, 0) },
    uVelocity:     { value: new THREE.Vector2(0, 0) },
    uDisintegrate: { value: 0 },
    uResolution:   { value: new THREE.Vector2(size.width, size.height) },
    uZoom:         { value: 4.5 },
    uIntensity:    { value: 0.0 },
  }), [size.width, size.height]);

  useMotionValueEvent(scrollProgress, 'change', (latest) => {
    if (matRef.current) {
      const dis = Math.max(0, Math.min(1, (latest - 0.14) / 0.56));
      matRef.current.uniforms.uDisintegrate.value = dis;
    }
  });

  useFrame((state, delta) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    const coords = mouseRef.current;

    u.uTime.value = state.clock.getElapsedTime();
    u.uResolution.value.set(size.width, size.height);

    const ndcX =  (coords.x / size.width)  * 2 - 1;
    const ndcY = -((coords.y / size.height) * 2 - 1);
    targetMouse.current.set(ndcX, ndcY);

    const dampFactor = 3.8;
    currentMouse.current.x = THREE.MathUtils.damp(currentMouse.current.x, targetMouse.current.x, dampFactor, delta);
    currentMouse.current.y = THREE.MathUtils.damp(currentMouse.current.y, targetMouse.current.y, dampFactor, delta);

    const velX = THREE.MathUtils.clamp((currentMouse.current.x - prevMouse.current.x) / delta, -8, 8);
    const velY = THREE.MathUtils.clamp((currentMouse.current.y - prevMouse.current.y) / delta, -8, 8);
    prevMouse.current.copy(currentMouse.current);

    u.uMouse.value.copy(currentMouse.current);
    u.uVelocity.value.set(velX, velY);

    currentZoom.current  = THREE.MathUtils.damp(currentZoom.current,  isReady ? 1.0 : 4.5, 1.8, delta);
    currentAlpha.current = THREE.MathUtils.damp(currentAlpha.current, isReady ? 1.0 : 0.0, 2.2, delta);
    u.uZoom.value      = currentZoom.current;
    u.uIntensity.value = currentAlpha.current;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

// ─── FluidBackground: canvas wrapper ──────────────────────────────────────────
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
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="absolute inset-0 z-0 bg-[#010208] pointer-events-none">
      <Canvas
        dpr={isMobile ? 1 : [1, 1.5]}
        camera={{ position: [0, 0, 1] }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <FieldMesh
          isReady={isReady}
          mouseRef={mouseRef}
          scrollProgress={scrollProgress}
        />
      </Canvas>
    </div>
  );
}