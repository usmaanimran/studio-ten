'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion, Variants, useScroll, useTransform, useSpring, useMotionTemplate } from 'framer-motion';
import Link from 'next/link';

import FluidBackground from '@/components/FluidBackground';
import Atmosphere from '@/components/Atmosphere';
import Preloader from '@/components/Preloader';
import ServicesGrid from '@/components/ServicesGrid';

// ─────────────────────────────────────────────
// SMOOTH SCROLL EASING
// ─────────────────────────────────────────────
const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);

// ─────────────────────────────────────────────
// DECRYPT LINK COMPONENT (CYBER SCRAMBLE)
// ─────────────────────────────────────────────
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";

const DecryptLink = ({ idleText, hoverText, href, className }: { idleText: string, hoverText: string, href: string, className?: string }) => {
  const [text, setText] = useState(idleText);
  const [isHovered, setIsHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let iteration = 0;
    const target = isHovered ? hoverText : idleText;
    
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setText((prev) => 
        target.split("").map((letter, index) => {
          if (index < iteration) {
            return target[index];
          }
          return LETTERS[Math.floor(Math.random() * LETTERS.length)];
        }).join("")
      );

      if (iteration >= target.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      iteration += 1 / 3; // Controls the speed of decryption
    }, 30);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isHovered, idleText, hoverText]);

  return (
    <Link 
      href={href} 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)} 
      className={className}
    >
      <span className="w-2 h-2 bg-white rounded-full group-hover:bg-neutral-400 transition-colors animate-pulse shrink-0" />
      [ {text} ]
    </Link>
  );
};

// ─────────────────────────────────────────────
// SCROLL CONTENT
// ─────────────────────────────────────────────
function ScrollContent({
  coords,
  scrollContainerRef,
  isReady,
  mouseCoordsRef,
}: {
  coords: { x: number; y: number };
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  isReady: boolean;
  mouseCoordsRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainerRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  const xTranslate   = useTransform(smoothProgress, [0, 0.33],   ['0%', '-50%']);
  const heroOpacity  = useTransform(smoothProgress, [0, 0.15],   [1, 0]);
  const mainTrackY       = useTransform(smoothProgress, [0.66, 1], ['0%', '-100%']);
  const mainTrackOpacity = useTransform(smoothProgress, [0.75, 1], [1, 0]);
  const aboutY       = useTransform(smoothProgress, [0.66, 1], ['50%', '0%']);
  const aboutScale   = useTransform(smoothProgress, [0.66, 1], [0.85, 1]);
  const aboutOpacity = useTransform(smoothProgress, [0.70, 1], [0, 1]);
  const textRevealPercent = useTransform(smoothProgress, [0.75, 0.95], [0, 100]);
  const textBgSize = useMotionTemplate`${textRevealPercent}% 100%`;
  const atmosphereOpacity = useTransform(smoothProgress, [0.40, 0.75], [0, 1]);

  const textVariants: Variants = {
    hidden: { opacity: 0, y: '100%' },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.2,
        ease: [0.33, 1, 0.68, 1],
        delay: custom * 0.1 + 0.4,
      },
    }),
  };

  return (
    <div ref={containerRef} className="relative h-[400vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        
        <div className="absolute inset-0 z-0">
          <FluidBackground isReady={isReady} mouseRef={mouseCoordsRef} scrollProgress={smoothProgress} />
        </div>

        <motion.div style={{ opacity: atmosphereOpacity }} className="absolute inset-0 z-[1] pointer-events-none">
          <Atmosphere />
        </motion.div>

        {/* TRACK 1: HERO + SERVICES */}
        <motion.div
          style={{ x: xTranslate, y: mainTrackY, opacity: mainTrackOpacity }}
          className="absolute inset-0 z-10 flex w-[200vw] h-full pointer-events-none mix-blend-difference"
        >
          {/* === SECTION 1: HERO === */}
          <motion.div style={{ opacity: heroOpacity }} className="w-screen h-full relative p-6 sm:p-10 lg:p-24 flex flex-col justify-between pointer-events-none">
            <header className="flex justify-between items-start font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]">
              <motion.div custom={0} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="overflow-hidden">
                <p>S_10 // Vol. 0.011</p>
              </motion.div>
              <motion.div custom={1} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="overflow-hidden text-right">
                <p>Shall We?</p>
                <p className="text-neutral-500 mt-1">LK — Global</p>
              </motion.div>
            </header>

            <div className="flex flex-col w-full">
              <div className="overflow-hidden">
                <motion.h1 custom={2} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="text-[12vw] md:text-[10vw] font-black uppercase leading-[0.8] tracking-tighter">
                  Studio
                </motion.h1>
              </div>
              <div className="overflow-hidden flex justify-end w-full md:pr-[10vw]">
                <motion.h1 custom={3} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="text-[12vw] md:text-[10vw] font-black uppercase leading-[0.8] tracking-tighter">
                  Ten
                </motion.h1>
              </div>
            </div>

            <footer className="grid grid-cols-2 md:grid-cols-3 gap-8 items-end border-t border-white/20 pt-8 mt-12">
              <div className="hidden md:block" />
              <motion.div custom={4} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="overflow-hidden">
                <p className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-left md:text-center">Built For Change</p>
              </motion.div>
              <motion.div custom={5} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="overflow-hidden flex justify-end">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest hidden sm:inline">Side Scroll</span>
                  <div className="w-8 sm:w-12 h-[1px] bg-white relative overflow-hidden">
                    <motion.div className="absolute inset-0 bg-neutral-900" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }} />
                  </div>
                </div>
              </motion.div>
            </footer>
          </motion.div>

          {/* === SECTION 2: SERVICES === */}
          <div className="w-screen h-full flex flex-col justify-center p-6 sm:p-12 lg:p-24 pointer-events-none">
            <div className="max-w-7xl w-full mx-auto flex flex-col justify-center pointer-events-none">
              <div className="mb-6 lg:mb-10 overflow-hidden shrink-0">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-tighter text-white">
                  The Core Pillars
                </h2>
              </div>
              <div className="w-full pointer-events-auto">
                <ServicesGrid />
              </div>
            </div>
          </div>
        </motion.div>

        {/* TRACK 2: ABOUT */}
        <motion.div style={{ y: aboutY, scale: aboutScale, opacity: aboutOpacity }} className="absolute inset-0 z-20 flex flex-col justify-center p-6 sm:p-12 lg:p-24 pointer-events-none mix-blend-difference">
          <div className="max-w-[90rem] mx-auto w-full flex flex-col lg:flex-row gap-10 md:gap-14 lg:gap-24 items-start justify-between">
            <div className="w-full lg:w-1/2 flex flex-col gap-4 md:gap-6 shrink-0 relative">
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.3em] block">
                [ CRAFTED WITH INTENTION // STUDIO_TEN ]
              </span>
              <h2 className="text-[14vw] md:text-[11vw] lg:text-[7vw] font-black uppercase leading-[0.8] tracking-tighter text-white break-words">
                STUDIO<br /><span className="text-neutral-500">TEN.</span> 
              </h2>
            </div>

            <div className="w-full lg:w-1/2 flex flex-col gap-6 md:gap-8 pt-2 md:pt-6 lg:pt-24 relative max-w-2xl lg:max-w-3xl">
              <div className="w-12 h-[2px] bg-white/20" />
              <motion.p 
                style={{
                  backgroundImage: "linear-gradient(90deg, #ffffff, #ffffff)",
                  backgroundSize: textBgSize,
                  backgroundRepeat: "no-repeat",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "#525252",
                }}
                className="text-base sm:text-lg md:text-xl lg:text-2xl font-medium leading-relaxed tracking-tight"
              >
                Founded in 2026, Studio Ten was born with a singular vision: to bridge the gap between raw, brutalist design and next-generation agentic intelligence. We operate as a high-performance architectural node, working 1-to-1 with our clients to dive deep into their operational ecosystems. 
                <br /><br />
                By identifying systemic bottlenecks and uncovering hidden friction, we don't just build interfaces—we engineer bespoke digital realities and autonomous decision engines tailored to solve your most complex challenges at scale.
              </motion.p>
              
              <div className="grid grid-cols-2 gap-4 mt-2 md:mt-6 border-t border-white/10 pt-6 md:pt-8 font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                <div><span className="block text-white mb-1">Status</span><span>Active // Online</span></div>
                <div><span className="block text-white mb-1">Objective</span><span>System Domination</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* COORDINATE DISPLAYS */}
        <div className="absolute inset-0 pointer-events-none mix-blend-difference z-30">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={isReady ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }} className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-8 items-center gap-3 font-mono text-[9px] text-neutral-500 uppercase tracking-[0.2em] hidden md:flex">
            <span>TRK_X_AXIS //</span><span className="text-white">[ {coords.x.toString().padStart(4, '0')} ]</span>
          </motion.div>
        </div>

        <div className="absolute inset-0 pointer-events-none mix-blend-difference z-30">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={isReady ? { opacity: 1, x: 0 } : {}} transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }} className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 items-center gap-3 font-mono text-[9px] text-neutral-500 uppercase tracking-[0.2em] hidden md:flex" style={{ writingMode: 'vertical-rl' }}>
            <span>TRK_Y_AXIS //</span><span className="text-white">[ {coords.y.toString().padStart(4, '0')} ]</span>
          </motion.div>
        </div>

        {/* --- DECRYPT CONTACT BUTTON --- */}
        <div className="absolute inset-0 pointer-events-none mix-blend-difference z-40">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={isReady ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }}
            className="absolute right-6 top-6 sm:right-10 sm:top-10 pointer-events-auto"
          >
            <DecryptLink 
              idleText="CONTACT_US"
              hoverText="INITIATE_CONNECTION"
              href="/contact"
              className="group flex items-center gap-3 font-mono text-[10px] sm:text-xs text-white uppercase tracking-[0.2em] hover:text-neutral-400 transition-colors"
            />
          </motion.div>
        </div>
        {/* ------------------------------------------ */}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT PAGE
// ─────────────────────────────────────────────
export default function StudioTenHome() {
  const [isReady, setIsReady] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLElement>(null);
  const mouseCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const currentSectionRef = useRef(0);
  const isScrollingRef    = useRef(false);
  const rafRef            = useRef<number>(0);
  const TOTAL_SECTIONS    = 4;

  const scrollToSection = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const clamped = Math.max(0, Math.min(TOTAL_SECTIONS - 1, index));
    if (clamped === currentSectionRef.current && isScrollingRef.current) return;

    currentSectionRef.current = clamped;
    isScrollingRef.current    = true;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startValue  = container.scrollTop;
    const targetValue = clamped * window.innerHeight;
    const duration    = 950; 
    const startTime   = performance.now();

    const step = (now: number) => {
      const elapsed  = now - startTime;
      const t        = Math.min(elapsed / duration, 1);
      const eased    = easeOutQuint(t);

      container.scrollTop = startValue + (targetValue - startValue) * eased;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        container.scrollTop   = targetValue;
        isScrollingRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
      mouseCoordsRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (isScrollingRef.current) return;
      const direction = e.deltaY > 0 ? 1 : -1;
      scrollToSection(currentSectionRef.current + direction);
    };

    let touchStartY = 0;
    const handleTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY; };
    const handleTouchEnd = (e: TouchEvent) => {
      if (isScrollingRef.current) return;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 40) {
        scrollToSection(currentSectionRef.current + (deltaY > 0 ? 1 : -1));
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isScrollingRef.current) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        scrollToSection(currentSectionRef.current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        scrollToSection(currentSectionRef.current - 1);
      }
    };

    container.addEventListener('wheel',      handleWheel,      { passive: false });
    container.addEventListener('touchstart', handleTouchStart, { passive: true  });
    container.addEventListener('touchend',   handleTouchEnd,   { passive: true  });
    window.addEventListener(   'keydown',    handleKeyDown);

    return () => {
      container.removeEventListener('wheel',      handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend',   handleTouchEnd);
      window.removeEventListener(   'keydown',    handleKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollToSection]);

  return (
    <main ref={scrollContainerRef} className="relative w-full h-screen overflow-y-auto overflow-x-hidden bg-[#020202] text-white cursor-crosshair">
      <AnimatePresence>
        {!isReady && <Preloader key="preloader" onComplete={() => setIsReady(true)} />}
      </AnimatePresence>

      <ScrollContent coords={coords} scrollContainerRef={scrollContainerRef} isReady={isReady} mouseCoordsRef={mouseCoordsRef} />
    </main>
  );
}