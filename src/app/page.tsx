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
// KINETIC FONT LIBRARY
// ─────────────────────────────────────────────
const KINETIC_FONTS = [
  'var(--font-geist-sans)',
  'var(--font-geist-mono)',
  '"Times New Roman", Times, serif', 
  '"Courier New", Courier, monospace', 
  'Impact, sans-serif',
  'Georgia, serif',
  '"Arial Black", sans-serif',
  'serif',
  'cursive'
];

// ─────────────────────────────────────────────
// DECRYPT LINK COMPONENT
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
          if (index < iteration) return target[index];
          return LETTERS[Math.floor(Math.random() * LETTERS.length)];
        }).join("")
      );

      if (iteration >= target.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      iteration += 1 / 3;
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
      // VIBE MATCH: Added border, padding, background, and invert on hover
      className={`group flex items-center gap-3 font-mono text-[10px] sm:text-xs text-white uppercase tracking-[0.2em] border border-white/20 bg-[#020202]/80 backdrop-blur-md px-6 py-3.5 hover:bg-white hover:text-black transition-all duration-300 ${className || ''}`}
    >
      {/* Live status dot that turns black when hovered */}
      <span className="w-2 h-2 bg-green-500 rounded-full group-hover:bg-black transition-colors animate-pulse shrink-0" />
      <span className="font-bold tracking-[0.25em]">{text}</span>
    </Link>
  );
};
// ─────────────────────────────────────────────
// DYNAMIC FONT TEXT COMPONENT (KINETIC TYPOGRAPHY)
// ─────────────────────────────────────────────
const DynamicFontText = ({ 
  text, 
  layoutId, 
  typographyState
}: { 
  text: string, 
  layoutId: string, 
  typographyState: { isGlitching: boolean; font: string; tick: number }
}) => {
  const [localMap, setLocalMap] = useState<string[]>(Array(text.length).fill(typographyState.font));
  const [isSettled, setIsSettled] = useState(false);

  useEffect(() => {
    // The Preloader -> Home shared layout transition takes 1.4 seconds.
    // We wait 2 seconds to ensure it is completely finished, then drop the transition duration to 0.
    const timer = setTimeout(() => setIsSettled(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typographyState.isGlitching) {
      setLocalMap(text.split('').map(() => KINETIC_FONTS[Math.floor(Math.random() * KINETIC_FONTS.length)]));
    }
  }, [typographyState, text]);

  return (
    <motion.span
      layout="position"
      layoutId={layoutId}
      // Smooth 1.4s transition for the initial preloader fly-in, then instant (0s) for the font glitches
      transition={isSettled ? { duration: 0 } : { duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
      className="relative block font-sans whitespace-nowrap text-[12vw] md:text-[10vw] font-black uppercase tracking-tighter leading-[0.8] text-white"
    >
      {/* 1. THE PHANTOM LAYER */}
      <span 
        className="invisible pointer-events-none select-none" 
        aria-hidden="true"
        style={{ fontFamily: typographyState.font }}
      >
        {text}
      </span>

      {/* 2. THE VISUAL LAYER */}
      <span className="absolute top-0 left-0 w-full h-full text-left pointer-events-none select-none" aria-hidden="true">
        {typographyState.isGlitching ? (
          // CHAOS STATE
          text.split('').map((char, i) => (
            <span key={i} style={{ fontFamily: localMap[i] }}>
              {char === " " ? "\u00A0" : char}
            </span>
          ))
        ) : (
          // LOCKED STATE
          <span style={{ fontFamily: typographyState.font }}>
            {text}
          </span>
        )}
      </span>
    </motion.span>
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
  isMobile
}: {
  coords: { x: number; y: number };
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  isReady: boolean;
  mouseCoordsRef: React.MutableRefObject<{ x: number; y: number }>;
  isMobile: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [typographyState, setTypographyState] = useState({
    isGlitching: false,
    font: 'var(--font-geist-sans)',
    tick: 0 
  });

  useEffect(() => {
    let isActive = true;
    let intervalId: NodeJS.Timeout;

    const runGlitch = async () => {
      for (let i = 1; i <= 4; i++) {
        if (!isActive) return;
        setTypographyState(prev => ({ ...prev, isGlitching: true, tick: Math.random() }));
        await new Promise(r => setTimeout(r, 180)); 
      }

      if (!isActive) return;
      const nextFont = KINETIC_FONTS[Math.floor(Math.random() * KINETIC_FONTS.length)];
      setTypographyState({ isGlitching: false, font: nextFont, tick: 0 });
    };

    const timeoutId = setTimeout(() => {
      if (!isActive) return;
      intervalId = setInterval(runGlitch, 3500); 
    }, 2000); 

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainerRef,
    offset: ['start start', 'end end'],
  });

  const springProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });
  const smoothProgress = isMobile ? scrollYProgress : springProgress;

  const xTranslate = useTransform(smoothProgress, [0, 0.33], ['0%', '-50%']);
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0]);
  const mainTrackY = useTransform(smoothProgress, [0.66, 1], ['0%', '-100%']);
  const mainTrackOpacity = useTransform(smoothProgress, [0.75, 1], [1, 0]);

  const aboutY = useTransform(smoothProgress, [0.66, 1], ['50%', '0%']);
  const aboutScale = useTransform(smoothProgress, [0.66, 1], [0.85, 1]);
  const aboutOpacity = useTransform(smoothProgress, [0.70, 1], [0, 1]);

  const textRevealPercent = useTransform(smoothProgress, [0.75, 0.95], [0, 100]);
  const textBgSize = useMotionTemplate`${textRevealPercent}% 100%`;

  const textVariants: Variants = {
    hidden: { opacity: 0, y: '100%' },
    visible: (custom: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1.2,
        ease: [0.33, 1, 0.68, 1],
        delay: custom * 0.1 + 0.8,
      },
    }),
  };

  return (
    <div ref={containerRef} className="relative h-[400dvh]">
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">

        <div className="absolute inset-0 z-0 pointer-events-none">
          <FluidBackground isReady={isReady} mouseRef={mouseCoordsRef} scrollProgress={smoothProgress} />
        </div>

        <div className="absolute inset-0 z-[1] pointer-events-none">
          <Atmosphere />
        </div>

        {/* TRACK 1: HERO + SERVICES */}
        <motion.div
          style={{ x: xTranslate, y: mainTrackY, opacity: mainTrackOpacity, willChange: "transform, opacity" }}
          className="absolute inset-0 z-10 flex w-[200vw] h-full pointer-events-none mix-blend-difference"
        >
          {/* === SECTION 1: HERO === */}
          <motion.div style={{ opacity: heroOpacity }} className="w-screen h-full relative px-4 py-8 pb-24 sm:px-6 sm:pb-32 lg:p-24 flex flex-col justify-between pointer-events-none">

            <header className="flex justify-between items-start font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]">
              <motion.div custom={0} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="overflow-hidden">
                <p>LK - GLOBAL </p>
              </motion.div>
             
            </header>

            {/* === HERO TEXT BURST === */}
            <div className="flex flex-col w-full">
              <div className="flex w-full">
                {isReady && (
                  <DynamicFontText text="STUDIO" layoutId="word-studio" typographyState={typographyState} />
                )}
              </div>
              <div className="flex justify-end w-full md:pr-[10vw]">
                {isReady && (
                  <DynamicFontText text="TEN" layoutId="word-ten" typographyState={typographyState} />
                )}
              </div>
            </div>

            <footer className="grid grid-cols-2 md:grid-cols-3 gap-8 items-end border-t border-white/20 pt-8 mt-12 relative z-20">
              <div className="hidden md:block" />
              <motion.div custom={2} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="overflow-hidden">
                <p className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-left md:text-center">Built For Change</p>
              </motion.div>
              <motion.div custom={3} variants={textVariants} initial="hidden" animate={isReady ? 'visible' : 'hidden'} className="overflow-hidden flex justify-end">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest hidden sm:inline">Scroll DOWN</span>
                  <div className="w-8 sm:w-12 h-[1px] bg-white relative overflow-hidden">
                    <motion.div className="absolute inset-0 bg-neutral-900" animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }} />
                  </div>
                </div>
              </motion.div>
            </footer>

          </motion.div>

          {/* === SECTION 2: SERVICES === */}
          <div className="w-screen h-full flex flex-col justify-center px-4 py-8 sm:px-6 sm:py-12 lg:p-24 pointer-events-none">
            <div className="max-w-7xl w-full mx-auto flex flex-col justify-center pointer-events-none">
              <div className="mb-6 lg:mb-10 overflow-hidden shrink-0" style={{ transform: "translateZ(0)", willChange: "transform" }}>
                <h2 className="text-[clamp(1.75rem,8vw,3rem)] lg:text-5xl xl:text-6xl font-black uppercase tracking-tighter text-white hyphens-auto break-words leading-[0.85]" style={{ WebkitFontSmoothing: "antialiased" }}>
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
        <motion.div style={{ y: aboutY, scale: aboutScale, opacity: aboutOpacity }} className="absolute inset-0 z-20 flex flex-col justify-start md:justify-center overflow-y-auto md:overflow-visible pt-24 md:pt-0 px-4 pb-8 sm:px-6 sm:pb-12 lg:p-24 pointer-events-none mix-blend-difference">
          <div className="max-w-[90rem] mx-auto w-full flex flex-col lg:flex-row gap-10 md:gap-14 lg:gap-24 items-start justify-between">
            <div className="w-full lg:w-1/2 flex flex-col gap-4 md:gap-6 shrink-0 relative">
              <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.3em] block">
                [ CRAFTED WITH INTENTION // STUDIO_TEN ]
              </span>
              <h2 className="text-[12vw] md:text-[11vw] lg:text-[7vw] font-black uppercase leading-[0.8] tracking-tighter text-white break-words">
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
                className="text-sm sm:text-base md:text-xl lg:text-2xl font-medium leading-relaxed tracking-tight"
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
      </div>

      {/* COORDINATE DISPLAYS */}
      <div className="fixed inset-0 pointer-events-none mix-blend-difference z-30">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isReady ? { opacity: 1, y: 0 } : {}} transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }} className="absolute left-1/2 -translate-x-1/2 bottom-4 sm:bottom-8 hidden md:flex items-center gap-2 sm:gap-3 font-mono text-[8px] sm:text-[9px] text-neutral-500 uppercase tracking-[0.2em]">
          <span>TRK_X_AXIS //</span><span className="text-white">[ {coords.x.toString().padStart(4, '0')} ]</span>
        </motion.div>
      </div>

      <div className="fixed inset-0 pointer-events-none mix-blend-difference z-30">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={isReady ? { opacity: 1, x: 0 } : {}} transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }} className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 sm:gap-3 font-mono text-[8px] sm:text-[9px] text-neutral-500 uppercase tracking-[0.2em]" style={{ writingMode: 'vertical-rl' }}>
          <span>TRK_Y_AXIS //</span><span className="text-white">[ {coords.y.toString().padStart(4, '0')} ]</span>
        </motion.div>
      </div>

      {/* DECRYPT CONTACT BUTTON */}
      <div className="fixed inset-0 pointer-events-none mix-blend-difference z-40">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={isReady ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }}
          className="absolute bottom-6 right-6 md:bottom-8 md:right-8 xl:bottom-auto xl:top-10 xl:right-10 pointer-events-auto"
        >
          <DecryptLink
            idleText="CONTACT_US"
            hoverText="NICE ONE"
            href="/contact"
            className="group flex items-center gap-3 font-mono text-[10px] sm:text-xs text-white uppercase tracking-[0.2em] hover:text-neutral-400 transition-colors"
          />
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT PAGE
// ─────────────────────────────────────────────
export default function StudioTenHome() {
  const [isReady, setIsReady] = useState(false);
  const [needsPreloader, setNeedsPreloader] = useState(true); // <-- ADDED THIS
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLElement>(null);
  const mouseCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const currentSectionRef = useRef(0);
  const isScrollingRef = useRef(false);
  const rafRef = useRef<number>(0);
  const TOTAL_SECTIONS = 4;

  // --- ADDED THIS EFFECT ---
  // Checks if we've already booted this session
  useEffect(() => {
    if (sessionStorage.getItem('studio_ten_booted')) {
      setNeedsPreloader(false);
      setIsReady(true);
    }
  }, []);
  // -------------------------

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches || window.matchMedia("(pointer: coarse)").matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToSection = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const clamped = Math.max(0, Math.min(TOTAL_SECTIONS - 1, index));
    if (clamped === currentSectionRef.current && isScrollingRef.current) return;

    currentSectionRef.current = clamped;
    isScrollingRef.current = true;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startValue = container.scrollTop;
    const targetValue = clamped * container.clientHeight;
    const duration = 950;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutQuint(t);

      container.scrollTop = startValue + (targetValue - startValue) * eased;

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        container.scrollTop = targetValue;
        isScrollingRef.current = false;
      }
    };

    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const updateCoords = (clientX: number, clientY: number) => {
      setCoords({ x: Math.round(clientX), y: Math.round(clientY) });
      mouseCoordsRef.current = { x: clientX, y: clientY };
    };

    const handleMouseMove = (e: MouseEvent) => updateCoords(e.clientX, e.clientY);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updateCoords(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.cancelable) e.preventDefault();
      if (!isReady || isScrollingRef.current) return;
      const direction = e.deltaY > 0 ? 1 : -1;
      scrollToSection(currentSectionRef.current + direction);
    };

    let touchStartY = 0;
    let touchStartSection = 0;
    const SWIPE_THRESHOLD = 40;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isMobile) return;
      touchStartY = e.touches[0].clientY;
      touchStartSection = currentSectionRef.current;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        isScrollingRef.current = false;
      }
    };

    const handleTouchMoveScroll = (e: TouchEvent) => {
      if (!isMobile) return;
      if (e.cancelable) e.preventDefault();

      if (!isScrollingRef.current && isReady) {
        if (container) {
          const currentY = e.touches[0].clientY;
          const delta = touchStartY - currentY;
          const expectedScroll = (touchStartSection * container.clientHeight) + delta;
          container.scrollTop = Math.max(0, Math.min(container.scrollHeight - container.clientHeight, expectedScroll));
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isMobile || !isReady || isScrollingRef.current) return;

      const touchEndY = e.changedTouches[0].clientY;
      const deltaY = touchStartY - touchEndY;

      let targetSection = touchStartSection;
      if (deltaY > SWIPE_THRESHOLD && touchStartSection < TOTAL_SECTIONS - 1) {
        targetSection += 1;
      } else if (deltaY < -SWIPE_THRESHOLD && touchStartSection > 0) {
        targetSection -= 1;
      }

      scrollToSection(targetSection);
    };

    const handleNativeScroll = () => {
      if (isScrollingRef.current) return;
      currentSectionRef.current = Math.round(container.scrollTop / container.clientHeight);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReady || isMobile) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        if (isScrollingRef.current) return;
        scrollToSection(currentSectionRef.current + 1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (isScrollingRef.current) return;
        scrollToSection(currentSectionRef.current - 1);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('scroll', handleNativeScroll, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMoveScroll, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('scroll', handleNativeScroll);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMoveScroll);
      container.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('keydown', handleKeyDown);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollToSection, isReady, isMobile]);

  return (
    <main
      ref={scrollContainerRef}
      className={`relative w-full h-[100dvh] overflow-y-auto overflow-x-hidden bg-[#020202] text-white cursor-crosshair ${isMobile ? 'touch-none' : 'touch-auto'}`}
    >
      <AnimatePresence>
        {/* --- ADDED LOGIC HERE --- */}
        {needsPreloader && !isReady && (
          <Preloader 
            key="preloader" 
            onComplete={() => {
              sessionStorage.setItem('studio_ten_booted', 'true');
              setIsReady(true);
            }} 
          />
        )}
      </AnimatePresence>

      <ScrollContent coords={coords} scrollContainerRef={scrollContainerRef} isReady={isReady} mouseCoordsRef={mouseCoordsRef} isMobile={isMobile} />
    </main>
  );
}