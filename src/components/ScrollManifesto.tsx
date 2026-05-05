'use client';
import { useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
}

const FooterGlitchButton = ({ text, href }: { text: string; href: string }) => {
  return (
    <Link
      href={href}
      className="group relative inline-flex items-center gap-4 font-mono text-[10px] sm:text-xs tracking-[0.2em] px-8 py-4 bg-transparent border border-white/20 hover:border-[#00f3ff] text-white transition-all duration-300 overflow-hidden"
    >
      {/* Indicator dot that turns black on hover (contrasting with the new cyan background) */}
      <span className="w-2 h-2 bg-[#00f3ff] rounded-full shrink-0 group-hover:bg-[#020202] transition-colors z-10" />
      
      {/* Glitching Text */}
      <span className="font-bold uppercase tracking-[0.25em] z-10 glitch-btn-text" data-text={text}>
        {text}
      </span>
      
      {/* Aggressive hover background sweep (solid cyan) */}
      <div className="absolute inset-0 bg-[#00f3ff] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0" />
    </Link>
  );
};

export default function ScrollManifesto() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowPathRef = useRef<SVGPathElement>(null);
  const tracerRef = useRef<HTMLDivElement>(null);
  const textsRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    if (!glowPathRef.current || !tracerRef.current) return;

    const pathLength = glowPathRef.current.getTotalLength();
    
    gsap.set(glowPathRef.current, { 
      strokeDasharray: pathLength, 
      strokeDashoffset: pathLength 
    });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=400%", 
        scrub: 1,      
        pin: true,     
        refreshPriority: 0 
      }
    });

    tl.to(glowPathRef.current, {
      strokeDashoffset: 0,
      ease: "none",
      duration: 1
    }, 0); 

    tl.to(tracerRef.current, {
      motionPath: {
        path: "#circuit-path-bg",
        align: "#circuit-path-bg",
        alignOrigin: [0.5, 0.5],
      },
      ease: "none",
      duration: 1
    }, 0);

    const nodes = textsRef.current;
    
    const timeSlices = [
      { enter: 0.02, exit: 0.22 }, 
      { enter: 0.26, exit: 0.46 }, 
      { enter: 0.50, exit: 0.70 }, 
      { enter: 0.74, exit: 0.98 }, 
    ];

    nodes.forEach((node, i) => {
      if (!node) return;
      
      tl.fromTo(node, 
        { opacity: 0, y: 80, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.05, ease: "back.out(1.2)" },
        timeSlices[i].enter
      );

      tl.to(node, 
        { opacity: 0, y: -80, scale: 1.05, duration: 0.05, ease: "power2.in" },
        timeSlices[i].exit
      );
    });

  }, { scope: containerRef });

  return (
    <div className="relative w-full bg-[#020202] text-white">
      
      <section ref={containerRef} className="relative w-full h-screen flex items-center justify-center z-10">
        
        {/* Container is 220vh tall and anchored to the top to prevent clipping */}
        <div 
          className="absolute w-full h-[220vh] top-0 pointer-events-none flex items-start justify-center z-0"
          style={{
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 75%, transparent 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 10%, black 75%, transparent 100%)'
          }}
        >
          <svg 
            className="w-full h-full max-w-5xl opacity-40 overflow-visible" 
            viewBox="0 0 703 2467" 
            preserveAspectRatio="none"
          >
            <path 
              id="circuit-path-bg" 
              d="M2 2C2 196.5 484 160.5 596.5 438C709 715.5 33 1062 105.5 1301C204.5 1568 835 1736.5 675 2037C607.333 2164.09 393 2269 393 2465" 
              stroke="rgba(255,255,255,0.15)" 
              strokeWidth="4" 
              strokeLinecap="round"
              fill="none" 
            />
            <path 
              ref={glowPathRef}
              id="circuit-path-glow" 
              d="M2 2C2 196.5 484 160.5 596.5 438C709 715.5 33 1062 105.5 1301C204.5 1568 835 1736.5 675 2037C607.333 2164.09 393 2269 393 2465" 
              stroke="#00f3ff" 
              strokeWidth="6" 
              strokeLinecap="round"
              fill="none" 
              style={{ filter: 'drop-shadow(0 0 12px #00f3ff)' }}
            />
          </svg>

          <div 
            ref={tracerRef} 
            className="absolute w-3 h-3 bg-white rounded-full z-20"
            style={{ boxShadow: '0 0 20px 8px rgba(0, 243, 255, 0.8)' }}
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 z-30">
          
          <div ref={el => { textsRef.current[0] = el; }} className="absolute max-w-4xl text-center opacity-0">
            <p className="font-mono text-[10px] sm:text-xs text-[#00f3ff] mb-4 tracking-[0.3em] uppercase">[ SYS_ANALYSIS // 01 ]</p>
            <h2 className="text-[clamp(1.5rem,5vw,4rem)] font-black uppercase tracking-tighter leading-[0.9]">
              We’ve analyzed hundreds of websites.
            </h2>
          </div>

          <div ref={el => { textsRef.current[1] = el; }} className="absolute max-w-5xl text-center opacity-0">
            <p className="font-mono text-[10px] sm:text-xs text-[#ff003c] mb-4 tracking-[0.3em] uppercase">[ DIAGNOSTIC // 02 ]</p>
            <h2 className="text-[clamp(1.5rem,5vw,3.5rem)] font-black uppercase tracking-tighter leading-[0.9] text-neutral-400">
              Most are paralyzed by bloated code, poor SEO, and static design. <br/><span className="text-white mt-2 block">They are brochures in a dynamic world.</span>
            </h2>
          </div>

          <div ref={el => { textsRef.current[2] = el; }} className="absolute max-w-3xl text-center opacity-0">
            <p className="font-mono text-[10px] sm:text-xs text-neutral-500 mb-4 tracking-[0.3em] uppercase">[ CORE_DIRECTIVE // 03 ]</p>
            <h2 className="text-[clamp(2rem,8vw,6rem)] font-black uppercase tracking-tighter leading-[0.9] text-transparent" style={{ WebkitTextStroke: '2px white' }}>
              We don't do static.
            </h2>
          </div>

          <div ref={el => { textsRef.current[3] = el; }} className="absolute max-w-6xl text-center opacity-0">
            <p className="font-mono text-[10px] sm:text-xs text-[#00f3ff] mb-4 tracking-[0.3em] uppercase">[ DEPLOYMENT // 04 ]</p>
            <h2 className="text-[clamp(1.5rem,4.5vw,4.5rem)] font-black uppercase tracking-tighter leading-[0.9]">
              Our mission is to design and develop websites that actively <span className="text-[#00f3ff]">engage</span>, <span className="text-[#00f3ff]">convert</span>, and <span className="text-[#ff003c]">dominate</span>.
            </h2>
          </div>

        </div>
      </section>

      {/* --- GLITCH ENDING SECTION --- */}
      <section className="relative w-full min-h-[100svh] flex flex-col justify-center items-center bg-transparent z-20">
        
        <style>{`
          /* Main SHALL WE glitch */
          .glitch-text-custom {
              font-size: clamp(3rem, 12vw, 8rem);
              font-weight: 900;
              color: #fff;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3), 0 0 20px rgba(0,243,255,0.5);
              position: relative;
              display: inline-block;
              animation: glitch-skew 4s infinite;
              letter-spacing: 0.05em;
              white-space: nowrap;
          }
          .glitch-text-custom::before, .glitch-text-custom::after {
              content: attr(data-text);
              position: absolute;
              top: 0; left: 0; width: 100%; height: 100%; background: transparent;
          }
          .glitch-text-custom::before {
              animation: glitch-1 0.8s infinite linear alternate-reverse;
              color: #ff003c; 
              text-shadow: 2px 0 0 #00f3ff, -2px 0 0 lime;
              z-index: -1;
          }
          .glitch-text-custom::after {
              animation: glitch-2 0.8s infinite linear alternate-reverse;
              color: #00f3ff; 
              text-shadow: 2px 0 0 #ff003c, -2px 0 0 #ff0;
              z-index: -2;
          }

          /* Button Glitch Effect - ALWAYS ON */
          .glitch-btn-text {
              position: relative;
              display: inline-block;
              animation: glitch-skew 3s infinite;
              color: #fff;
              transition: color 0.1s ease;
          }
          .glitch-btn-text::before, .glitch-btn-text::after {
              content: attr(data-text);
              position: absolute;
              top: 0; left: 0; width: 100%; height: 100%;
              background: transparent;
          }
          .glitch-btn-text::before {
              animation: glitch-1 1.5s infinite linear alternate-reverse;
              color: #ff003c; text-shadow: 2px 0 0 #00f3ff; z-index: -1;
          }
          .glitch-btn-text::after {
              animation: glitch-2 2s infinite linear alternate-reverse;
              color: #00f3ff; text-shadow: -2px 0 0 #ff003c; z-index: -2;
          }

          /* Button Glitch Hover Effect - GO WILD & INVERT */
          .group:hover .glitch-btn-text {
              animation: glitch-skew 0.3s infinite;
              color: #020202; /* Invert to black against cyan background */
          }
          .group:hover .glitch-btn-text::before {
              animation: glitch-1 0.15s infinite linear alternate-reverse;
              text-shadow: none; /* Cleaner look against solid background */
              color: #ff003c;
          }
          .group:hover .glitch-btn-text::after {
              animation: glitch-2 0.2s infinite linear alternate-reverse;
              text-shadow: none;
              color: #fff; /* Mix white in for chaotic contrast */
          }

          /* Shared Keyframes */
          @keyframes glitch-skew {
              0%, 100% { transform: skew(0deg) }
              2% { transform: skew(2deg) }
              4% { transform: skew(-2deg) }
              6% { transform: skew(1deg) }
              8% { transform: skew(-1deg) }
              10%, 90% { transform: skew(0deg) }
          }
          @keyframes glitch-1 {
              0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); opacity: .8 }
              10% { clip-path: inset(20% 0 30% 0); transform: translate(-5px, 3px); opacity: 1 }
              20% { clip-path: inset(10% 0 60% 0); transform: translate(5px, -3px); opacity: .6 }
              30% { clip-path: inset(40% 0 40% 0); transform: translate(-5px, 5px); opacity: 1 }
              40% { clip-path: inset(70% 0 10% 0); transform: translate(5px, -5px); opacity: .7 }
              50% { clip-path: inset(30% 0 50% 0); transform: translate(-3px, 3px); opacity: .9 }
              60% { clip-path: inset(50% 0 30% 0); transform: translate(3px, -3px); opacity: .5 }
              70% { clip-path: inset(80% 0 10% 0); transform: translate(-4px, 4px); opacity: .8 }
              80% { clip-path: inset(15% 0 70% 0); transform: translate(4px, -4px); opacity: 1 }
          }
          @keyframes glitch-2 {
              0%, 100% { clip-path: inset(0 0 0 0); transform: translate(0); opacity: .8 }
              10% { clip-path: inset(60% 0 20% 0); transform: translate(5px, -3px); opacity: .6 }
              20% { clip-path: inset(30% 0 50% 0); transform: translate(-5px, 3px); opacity: 1 }
              30% { clip-path: inset(10% 0 70% 0); transform: translate(5px, -5px); opacity: .7 }
              40% { clip-path: inset(40% 0 40% 0); transform: translate(-5px, 5px); opacity: .9 }
              50% { clip-path: inset(70% 0 10% 0); transform: translate(3px, -3px); opacity: .5 }
              60% { clip-path: inset(20% 0 60% 0); transform: translate(-3px, 3px); opacity: 1 }
              70% { clip-path: inset(50% 0 30% 0); transform: translate(4px, -4px); opacity: .8 }
              80% { clip-path: inset(80% 0 10% 0); transform: translate(-4px, 4px); opacity: .6 }
          }
        `}</style>

        {/* Subtle radial cyan glow to keep the depth, with the hard borders completely removed */}
        <div className="absolute inset-0 pointer-events-none mix-blend-screen opacity-60" style={{ background: 'radial-gradient(circle at center, rgba(0, 243, 255, 0.05) 0%, transparent 60%)' }} />
        
        {/* Huge STUDIO TEN backdrop text overlay - Added text-center here! */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center pointer-events-none select-none z-0 mix-blend-overlay">
          <h1 className="text-[24vw] font-black uppercase tracking-tighter leading-[0.8] text-transparent opacity-20 text-center" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}>
            STUDIO<br/>TEN
          </h1>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-12 text-center px-6 mt-12">
          
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 bg-neutral-600 rounded-full" />
              <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em] text-neutral-500">
                STUDIO_TEN // AWAITING_INPUT
              </p>
            </div>
            
            {/* The Main Glitch Text Block */}
            <div className="relative inline-block py-4">
              <div className="glitch-text-custom font-black drop-shadow-2xl" data-text="SHALL WE?">
                SHALL WE?
              </div>
            </div>
          </div>
          
          <FooterGlitchButton text="CONTACT US" href="/contact" />
        </div>

      </section>
    </div>
  );
}