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
  const [transitioningTo, setTransitioningTo] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // To use Portals safely in Next.js, we must wait until the component mounts on the client
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // --- OPTIMIZED CUSTOM CURSOR LOGIC ---
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Springs make the cursor follow slightly smoothly rather than instantly snapping
  const springX = useSpring(mouseX, { stiffness: 800, damping: 35 });
  const springY = useSpring(mouseY, { stiffness: 800, damping: 35 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - 45); // Offset by half the width (90/2) to center it
      mouseY.set(e.clientY - 45); // Offset by half the height (90/2)
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const handleNavigate = (slug: string) => {
    if (transitioningTo) return; 
    setTransitioningTo(slug);
    
    setTimeout(() => {
      router.push(`/services/${slug}`);
    }, 800); 
  };

  return (
    <>
      {/* React Portal: Renders the cursor at the absolute root of the DOM (document.body).
        This guarantees it will never get trapped or hidden by parent CSS transforms.
      */}
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

      {/* --- PAGE SWEEP TRANSITION --- */}
      <AnimatePresence>
        {transitioningTo && (
          <motion.div
            initial={{ y: "120vh" }} 
            animate={{ y: "-25vh" }} 
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }} 
            className="fixed top-0 left-[-25vw] w-[150vw] h-[150vh] bg-[#020202] z-[9999] pointer-events-none origin-center"
            style={{ rotate: "-10deg" }} 
          />
        )}
      </AnimatePresence>

      <section className="w-full grid grid-cols-1 sm:grid-cols-2 border-l border-t sm:border-t-0 border-white/10 pointer-events-auto relative z-10">
        {services.map((service, index) => (
          <ServiceCard 
            key={service.id}
            service={service}
            index={index}
            isHovered={hoveredId === service.id}
            onHoverStart={() => setHoveredId(service.id)}
            onHoverEnd={() => setHoveredId(null)}
            onClick={() => handleNavigate(service.slug)}
          />
        ))}
      </section>
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
      // 'cursor-none' hides the global crosshair so only our portal circle is visible
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