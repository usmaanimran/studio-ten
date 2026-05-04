'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Optimized character set
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$*+-=";

const services = [
  { id: '01', title: 'Web Dev', slug: 'web-architecture', desc: 'High-performance digital systems built for scale.' },
  { id: '02', title: 'Social Media', slug: 'social-media', desc: 'Aggressive growth strategies for the digital economy.' },
  { id: '03', title: 'AI Automations', slug: 'ai-automations', desc: 'Agentic workflows and autonomous decision engines.' },
  { id: '04', title: 'Designing', slug: 'Designing', desc: 'Immersive visual identities that demand attention.' },
];

export default function ServicesGrid() {
  const router = useRouter();
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches || 'ontouchstart' in window);
  }, []);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(mouseX, { stiffness: 800, damping: 35 });
  const springY = useSpring(mouseY, { stiffness: 800, damping: 35 });

  useEffect(() => {
    if (isTouchDevice) return; 
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 45);
      mouseY.set(e.clientY - 45);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, isTouchDevice]);

  const handleNavigate = (slug: string) => {
    if (isTransitioning) return;
    
    if (slug === 'web-architecture') {
      setIsTransitioning(true);
      document.body.style.cursor = 'wait';

      // 1. Fire the GPU Glitch instantly. Zero ms delay.
      window.dispatchEvent(new CustomEvent('START_GLITCH', { detail: { mode: 'FORWARD' } }));

      // 2. Change the route in the background while the black terminal covers the screen
      setTimeout(() => {
        document.body.style.cursor = 'default';
        router.push(`/services/${slug}`);
      }, 1000);
    } else {
      // For all other pages, skip the glitch and navigate normally 
      // (This leaves room for you to add unique ones later)
      router.push(`/services/${slug}`);
    }
  };

  return (
    <>
      {!isTouchDevice && isMounted && createPortal(
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[99999] flex items-center justify-center rounded-full bg-white text-black font-black uppercase text-[10px] tracking-widest text-center leading-none"
          style={{ width: 90, height: 90, x: springX, y: springY }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: hoveredId ? 1 : 0, opacity: hoveredId ? 1 : 0 }}
          transition={{ scale: { type: "spring", stiffness: 300, damping: 20 }, opacity: { duration: 0.2 } }}
        >
          Click<br />Me
        </motion.div>,
        document.body
      )}

      <motion.section
        animate={{
          y: isTransitioning ? "8vh" : "0vh",
          scale: isTransitioning ? 0.92 : 1,
          opacity: isTransitioning ? 0 : 1
        }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        style={{ willChange: "transform, opacity", pointerEvents: isTransitioning ? "none" : "auto" }}
        className="w-full grid grid-cols-1 sm:grid-cols-2 border-l border-t sm:border-t-0 border-white/10 relative z-10"
      >
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            index={index}
            isTouchDevice={isTouchDevice}
            isHovered={hoveredId === service.id}
            onHoverStart={() => setHoveredId(service.id)}
            onHoverEnd={() => setHoveredId(null)}
            onClick={() => handleNavigate(service.slug)}
          />
        ))}
      </motion.section>
    </>
  );
}

function ServiceCard({ service, index, isTouchDevice, onHoverStart, onHoverEnd, onClick }: any) {
  const [glitchText, setGlitchText] = useState(service.title);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScramble = () => {
    let iteration = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setGlitchText(service.title.split("").map((letter: string, i: number) => {
        if (i < iteration) return service.title[i];
        if (letter === " ") return " ";
        return LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }).join(""));

      if (iteration >= service.title.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      iteration += 1 / 2;
    }, 30);
  };

  const triggerScramble = () => {
    if (isTouchDevice) return; 
    onHoverStart();
    startScramble();
  };

  const handleMouseLeave = () => {
    if (isTouchDevice) return;
    onHoverEnd();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGlitchText(service.title);
  };

  const handleInteraction = () => {
    if (isTouchDevice) startScramble(); 
    onClick(); 
  };

  return (
    <motion.button
      onClick={handleInteraction} 
      onMouseEnter={triggerScramble}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      whileHover={isTouchDevice ? {} : { x: [0, -3, 3, -2, 2, 0], y: [0, 2, -2, 1, -1, 0], transition: { duration: 0.3, ease: "linear" } }}
      style={{ willChange: "transform, opacity" }}
      className={`group relative text-left p-3 sm:p-6 lg:p-8 xl:p-12 border-b border-r border-white/10 flex flex-col justify-between transition-colors duration-300 min-h-[105px] sm:min-h-[160px] lg:min-h-[220px] overflow-hidden ${isTouchDevice ? '' : 'cursor-none hover:bg-white'}`}
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 mix-blend-overlay pointer-events-none" />

      <div className="flex justify-between items-start mb-2 sm:mb-8 lg:mb-12 relative z-10">
        <span className={`font-mono text-[9px] sm:text-[10px] text-neutral-500 uppercase tracking-widest transition-colors duration-300 ${isTouchDevice ? '' : 'group-hover:text-black'}`}>
          Service // {service.id}
        </span>
        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white opacity-20 transition-all duration-300 shrink-0 ${isTouchDevice ? '' : 'group-hover:bg-black group-hover:opacity-100 group-hover:animate-ping'}`} />
      </div>

      <div className="mt-auto relative z-10">
        <div className="relative mb-1 sm:mb-3">
          <h3 className="text-[clamp(1.15rem,6vw,2.5rem)] lg:text-4xl xl:text-5xl 2xl:text-6xl font-black uppercase tracking-tighter leading-[0.85] break-words hyphens-auto invisible pointer-events-none select-none" aria-hidden="true">
            {service.title}
          </h3>
          <h3 className={`absolute top-0 left-0 w-full text-[clamp(1.15rem,6vw,2.5rem)] lg:text-4xl xl:text-5xl 2xl:text-6xl font-black uppercase tracking-tighter leading-[0.85] break-words hyphens-auto transition-colors duration-300 ${isTouchDevice ? '' : 'group-hover:text-black'}`}>
            {glitchText}
          </h3>
        </div>

        <p className={`font-mono text-[8px] sm:text-[9px] lg:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-neutral-400 max-w-xs leading-tight sm:leading-relaxed transition-colors duration-300 ${isTouchDevice ? '' : 'group-hover:text-neutral-800'}`}>
          {service.desc}
        </p>
      </div>
    </motion.button>
  );
}