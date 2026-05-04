'use client';
import { useMemo, Suspense } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { EffectComposer, Glitch } from '@react-three/postprocessing';
import { GlitchMode } from 'postprocessing';
import * as THREE from 'three';
import { motion } from 'framer-motion';

function FullImg({ url }: { url: string }) {
  // Suspend component until the screenshot is successfully converted into a WebGL texture
  const tex = useLoader(THREE.TextureLoader, url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const { viewport } = useThree();
  
  return (
    <mesh>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <meshBasicMaterial map={tex} toneMapped={false} depthTest={false} />
    </mesh>
  );
}

export default function GlitchOverlay({ url, fading, onDone }: { url: string, fading: boolean, onDone: () => void }) {
  // STRICT TYPESCRIPT FIX: Explicitly define Vector2s and memoize them
  const delayVec = useMemo(() => new THREE.Vector2(0, 0), []);
  const durationVec = useMemo(() => new THREE.Vector2(1, 1), []);
  // High strength to mimic the wild Codepen block displacement
  const strengthVec = useMemo(() => new THREE.Vector2(0.6, 1.0), []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 1.2, ease: 'easeInOut' }}
      onAnimationComplete={() => {
        if (fading) onDone();
      }}
      className="fixed inset-0 z-[999999] pointer-events-none"
    >
      <Canvas orthographic camera={{ position: [0, 0, 1], zoom: 1 }} gl={{ antialias: false }}>
        <Suspense fallback={null}>
          <FullImg url={url} />
        </Suspense>
        
        {/* The Authentic Three.js GlitchPass Wrapper */}
        <EffectComposer>
          <Glitch
            delay={delayVec}
            duration={durationVec}
            strength={strengthVec}
            mode={GlitchMode.CONSTANT_WILD}
            active={!fading}
          />
        </EffectComposer>
      </Canvas>
    </motion.div>
  );
}