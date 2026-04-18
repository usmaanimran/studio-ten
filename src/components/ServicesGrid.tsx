'use client';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { useRouter } from 'next/navigation';

const LETTERS = "AB89!@#$%^&*()_+-=";

const services = [
  { id: '01', title: 'Web Dev', slug: 'web-architecture', desc: 'High-performance digital systems built for scale.' },
  { id: '02', title: 'Social Media', slug: 'social-media', desc: 'Aggressive growth strategies for the digital economy.' },
  { id: '03', title: 'AI Automations', slug: 'ai-automations', desc: 'Agentic workflows and autonomous decision engines.' },
  { id: '04', title: 'Graphic & Brand Design', slug: 'graphic-brand-design', desc: 'Immersive visual identities that demand attention.' },
];

export default function ServicesGrid() {
  const router = useRouter();
  const [transitioningTo, setTransitioningTo] = useState<{slug: string, title: string} | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(mouseX, { stiffness: 800, damping: 35 });
  const springY = useSpring(mouseY, { stiffness: 800, damping: 35 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 45);
      mouseY.set(e.clientY - 45);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handleNavigate = (slug: string, title: string) => {
    if (transitioningTo) return; 
    setTransitioningTo({ slug, title });
    
    setTimeout(() => {
      router.push(`/services/${slug}`);
    }, 1200); 
  };

  return (
    <>
      {isMounted && createPortal(
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[99999] flex items-center justify-center rounded-full bg-white text-black font-black uppercase text-[10px] tracking-widest text-center leading-none"
          style={{ 
            width: 90, 
            height: 90, 
            x: springX, 
            y: springY 
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: hoveredId ? 1 : 0,
            opacity: hoveredId ? 1 : 0,
          }}
          transition={{ 
            scale: { type: "spring", stiffness: 300, damping: 20 }, 
            opacity: { duration: 0.2 } 
          }}
        >
          Click<br/>Me
        </motion.div>,
        document.body
      )}

      <AnimatePresence>
        {transitioningTo && (
          <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden flex items-center justify-center">
            
            {/* SVG Filter to create the brutalist torn/noise edge */}
            <svg className="absolute w-0 h-0">
              <defs>
                <filter id="torn-edge-out" x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
                  <feDisplacementMap in="SourceGraphic" in2="noise" scale="150" xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
            </svg>

            {/* Jagged Diagonal Wipe Overlay */}
            <motion.div
              initial={{ x: "120%", y: "120%", rotate: -45 }}
              animate={{ x: "-10%", y: "-10%", rotate: -45 }}
              transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
              className="absolute w-[300vw] h-[300vh] bg-[#020202]"
              style={{ filter: "url(#torn-edge-out)" }}
            >
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            </motion.div>
            
            {/* Text fading in over the black sweep */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.95] }}
              transition={{ duration: 1.2, times: [0, 0.3, 0.8, 1], ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center mix-blend-difference text-center z-10"
            >
              <div className="flex flex-col items-center">
                <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-[0.4em] mb-3">
                  ESTABLISHING_UPLINK //
                </span>
                <span className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">
                  {transitioningTo.title}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADDED Y-AXIS UPWARD SLIDE HERE --- */}
      <motion.section 
        animate={{ 
          y: transitioningTo ? "-40vh" : "0vh", 
          scale: transitioningTo ? 0.95 : 1, 
          filter: transitioningTo ? "blur(10px)" : "blur(0px)",
          opacity: transitioningTo ? 0 : 1
        }}
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="w-full grid grid-cols-1 sm:grid-cols-2 border-l border-t sm:border-t-0 border-white/10 pointer-events-auto relative z-10"
      >
        {services.map((service, index) => (
          <ServiceCard 
            key={service.id}
            service={service}
            index={index}
            isHovered={hoveredId === service.id}
            onHoverStart={() => setHoveredId(service.id)}
            onHoverEnd={() => setHoveredId(null)}
            onClick={() => handleNavigate(service.slug, service.title)}
          />
        ))}
      </motion.section>
    </>
  );
}

function ServiceCard({ service, index, isHovered, onHoverStart, onHoverEnd, onClick }: any) {
  const [glitchText, setGlitchText] = useState(service.title);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerScramble = () => {
    onHoverStart();
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

  const handleMouseLeave = () => {
    onHoverEnd();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGlitchText(service.title);
  };

  return (
    <motion.button 
      onClick={onClick}
      onMouseEnter={triggerScramble}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ delay: index * 0.1, duration: 0.8 }}
      whileHover={{ 
        x: [0, -3, 3, -2, 2, 0],
        y: [0, 2, -2, 1, -1, 0],
        transition: { duration: 0.3, ease: "linear" }
      }}
      className="group relative cursor-none text-left p-6 lg:p-8 xl:p-12 border-b border-r border-white/10 flex flex-col justify-between hover:bg-white transition-colors duration-300 min-h-[160px] lg:min-h-[220px] overflow-hidden"
    >
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-0 group-hover:opacity-10 mix-blend-overlay pointer-events-none" />
      <div className="flex justify-between items-start mb-8 lg:mb-12 relative z-10">
        <span className="font-mono text-[10px] text-neutral-500 group-hover:text-black uppercase tracking-widest transition-colors duration-300">
          Service // {service.id}
        </span>
        <div className="w-2 h-2 rounded-full bg-white opacity-20 group-hover:bg-black group-hover:opacity-100 transition-all duration-300 shrink-0 group-hover:animate-ping" />
      </div>
      <div className="mt-auto relative z-10">
        <h3 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black uppercase tracking-tighter leading-[0.85] mb-3 group-hover:text-black transition-colors duration-300">
          {glitchText}
        </h3>
        <p className="font-mono text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-neutral-400 group-hover:text-neutral-800 max-w-xs leading-relaxed transition-colors duration-300">
          {service.desc}
        </p>
      </div>
    </motion.button>
  );
}