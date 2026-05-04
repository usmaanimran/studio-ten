'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type TransitionState = 'IDLE' | 'GLITCH_OUT' | 'TERMINAL' | 'GLITCH_IN';
type TransitionMode = 'FORWARD' | 'RETURN';

export default function PageTransitionEffect() {
  const path = usePathname();
  const [status, setStatus] = useState<TransitionState>('IDLE');
  const [mode, setMode] = useState<TransitionMode>('FORWARD');
  const [terminalText, setTerminalText] = useState('');

  // 1. Listen for the instant trigger
  useEffect(() => {
    const onStart = (e: Event) => {
      const payload = (e as CustomEvent).detail;
      setMode(payload?.mode || 'FORWARD');
      setStatus('GLITCH_OUT');
    };

    window.addEventListener('START_GLITCH', onStart);
    return () => window.removeEventListener('START_GLITCH', onStart);
  }, []);

  // 2. High-Performance State Machine
  useEffect(() => {
    let t1: NodeJS.Timeout;
    let t2: NodeJS.Timeout;
    let typeInterval: NodeJS.Timeout;

    if (status === 'GLITCH_OUT') {
      // Phase 1: CSS GPU Shredder
      t1 = setTimeout(() => {
        setStatus('TERMINAL');
      }, 400); // 400ms of aggressive visual tearing
      
    } else if (status === 'TERMINAL') {
      // Phase 2: Terminal Sequence
      if (mode === 'FORWARD') {
        const textToType = "Warning: Intrusion detected.\nRe-routing secure connection...";
        let i = 0;
        setTerminalText('');
        typeInterval = setInterval(() => {
          setTerminalText(textToType.substring(0, i));
          i += 2;
          if (i > textToType.length) clearInterval(typeInterval);
        }, 20);
        
        t2 = setTimeout(() => setStatus('GLITCH_IN'), 1000);
        
      } else if (mode === 'RETURN') {
        let p = 0;
        typeInterval = setInterval(() => {
          p += Math.floor(Math.random() * 20) + 5;
          if (p > 100) p = 100;
          
          const blocks = '█'.repeat(Math.floor(p / 4));
          const spaces = '░'.repeat(25 - Math.floor(p / 4));
          
          setTerminalText(
            `Terminating instance...\nRe-establishing root node...\n\n[${blocks}${spaces}] ${p}%\n\n${p === 100 ? 'SYS_RETURN OK. Booting...' : ''}`
          );
          
          if (p >= 100) clearInterval(typeInterval);
        }, 50); 
        
        t2 = setTimeout(() => setStatus('GLITCH_IN'), 1200); 
      }
      
    } else if (status === 'GLITCH_IN') {
      // Phase 3: Shred the terminal away to reveal the new page
      t1 = setTimeout(() => {
        setStatus('IDLE');
      }, 500); 
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(typeInterval);
    };
  }, [status, mode]);

  if (status === 'IDLE') return null;

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none">
      
      {/* 
        THE INDUSTRY SECRET: GPU Compositor Glitches
        By using backdrop-filter and clip-path, we manipulate the pixels already rendered 
        by the browser. It costs 0ms of CPU time, completely eliminating the freeze.
      */}
      <style>{`
        .gpu-glitch-layer {
          position: fixed; inset: 0; z-index: 999998;
          pointer-events: none;
        }
        .gpu-slice-1 {
          backdrop-filter: invert(1) hue-rotate(180deg) contrast(2);
          animation: slice-anim-1 0.3s infinite steps(2, end);
        }
        .gpu-slice-2 {
          backdrop-filter: hue-rotate(90deg) saturate(300%);
          animation: slice-anim-2 0.25s infinite steps(2, end);
        }
        .gpu-slice-3 {
          backdrop-filter: invert(0.8) sepia(100%) hue-rotate(-90deg);
          animation: slice-anim-3 0.2s infinite steps(2, end);
        }

        @keyframes slice-anim-1 {
          0% { clip-path: inset(10% 0 70% 0); transform: translateX(-20px); }
          20% { clip-path: inset(40% 0 20% 0); transform: translateX(25px); }
          40% { clip-path: inset(80% 0 5% 0); transform: translateX(-15px); }
          60% { clip-path: inset(5% 0 80% 0); transform: translateX(30px); }
          80% { clip-path: inset(50% 0 30% 0); transform: translateX(-25px); }
          100% { clip-path: inset(20% 0 50% 0); transform: translateX(20px); }
        }
        @keyframes slice-anim-2 {
          0% { clip-path: inset(70% 0 10% 0); transform: translateX(15px); }
          20% { clip-path: inset(20% 0 50% 0); transform: translateX(-20px); }
          40% { clip-path: inset(5% 0 80% 0); transform: translateX(10px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translateX(-25px); }
          80% { clip-path: inset(30% 0 40% 0); transform: translateX(15px); }
          100% { clip-path: inset(50% 0 20% 0); transform: translateX(-10px); }
        }
        @keyframes slice-anim-3 {
          0% { clip-path: inset(30% 0 50% 0); transform: translateX(-10px); }
          20% { clip-path: inset(80% 0 10% 0); transform: translateX(10px); }
          40% { clip-path: inset(10% 0 70% 0); transform: translateX(-15px); }
          60% { clip-path: inset(50% 0 20% 0); transform: translateX(20px); }
          80% { clip-path: inset(5% 0 80% 0); transform: translateX(-10px); }
          100% { clip-path: inset(40% 0 30% 0); transform: translateX(15px); }
        }

        .glitch-layer {
          position: absolute; inset: 0; background: #020202; color: #00f3ff;
          display: flex; flex-direction: column; justify-content: center;
          padding: 2rem; font-family: var(--font-geist-mono), monospace;
        }
        @media (min-width: 768px) { .glitch-layer { padding: 6rem; } }
        
        .glitch-base { z-index: 10; }
        .glitch-red {
          z-index: 11; color: #ff003c; transform: translateX(-4px);
          mix-blend-mode: screen; animation: terminal-glitch-1 0.2s infinite linear alternate-reverse;
        }
        .glitch-cyan {
          z-index: 12; color: #00f3ff; transform: translateX(4px);
          mix-blend-mode: screen; animation: terminal-glitch-2 0.25s infinite linear alternate-reverse;
        }
        
        @keyframes terminal-glitch-1 {
          0% { clip-path: inset(20% 0 80% 0); }
          20% { clip-path: inset(60% 0 10% 0); }
          40% { clip-path: inset(10% 0 50% 0); }
          60% { clip-path: inset(80% 0 5% 0); }
          80% { clip-path: inset(30% 0 40% 0); }
          100% { clip-path: inset(70% 0 20% 0); }
        }
        @keyframes terminal-glitch-2 {
          0% { clip-path: inset(10% 0 60% 0); }
          20% { clip-path: inset(80% 0 5% 0); }
          40% { clip-path: inset(30% 0 20% 0); }
          60% { clip-path: inset(70% 0 15% 0); }
          80% { clip-path: inset(20% 0 50% 0); }
          100% { clip-path: inset(50% 0 30% 0); }
        }

        .shred-out {
          animation: shred-out-anim 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        @keyframes shred-out-anim {
          0% { opacity: 1; filter: invert(0) brightness(1); transform: scale(1); }
          20% { opacity: 1; filter: invert(1) brightness(2); transform: scale(1.02) skewX(2deg); }
          40% { opacity: 1; filter: invert(0) brightness(1); transform: scale(1) skewX(-2deg); }
          60% { opacity: 0.8; filter: invert(1) brightness(3); transform: scale(1.05) skewX(5deg); }
          100% { opacity: 0; filter: invert(0) brightness(1) blur(4px); transform: scale(1.1); }
        }
      `}</style>

      {/* PHASE 1: Zero-Freeze GPU Screen Tearing */}
      {status === 'GLITCH_OUT' && (
        <>
          <div className="gpu-glitch-layer gpu-slice-1" />
          <div className="gpu-glitch-layer gpu-slice-2" />
          <div className="gpu-glitch-layer gpu-slice-3" />
        </>
      )}

      {/* PHASE 2 & 3: Black Terminal Screen */}
      {(status === 'TERMINAL' || status === 'GLITCH_IN') && (
        <div className={`absolute inset-0 ${status === 'GLITCH_IN' ? 'shred-out' : ''}`}>
          <div className="glitch-layer glitch-base">
            <div className="w-full max-w-2xl whitespace-pre-wrap leading-relaxed mx-auto text-left text-sm sm:text-base">
              <span className="opacity-50 text-white">root@studio-ten:~# </span>
              {terminalText}
              {status === 'TERMINAL' && <span className="animate-pulse bg-[#00f3ff] w-2 h-4 inline-block ml-1 align-middle" />}
            </div>
          </div>

          {status === 'GLITCH_IN' && (
            <>
              <div className="glitch-layer glitch-red">
                <div className="w-full max-w-2xl whitespace-pre-wrap leading-relaxed mx-auto text-left text-sm sm:text-base">
                  <span className="opacity-50 text-white">root@studio-ten:~# </span>{terminalText}
                </div>
              </div>
              <div className="glitch-layer glitch-cyan">
                <div className="w-full max-w-2xl whitespace-pre-wrap leading-relaxed mx-auto text-left text-sm sm:text-base">
                  <span className="opacity-50 text-white">root@studio-ten:~# </span>{terminalText}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}