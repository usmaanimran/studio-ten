'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Cryptic / Alien glyphs mixed with system hex dumps
const loadingLogs = [
  "⍙⎍⍾_⏣⎈⍙ // 0x000A1F",
  "⎀⍙⍾_⎍⏣⎈ // 0x1A4B9C",
  "⎈⏣⎀_⍙⎍⍾ // 0x8F3E2D",
  "⍾⎍⍙_⏣⎀⎈ // DECRYPTING_KERN",
  "TRANSLATING_NON_TERRESTRIAL //",
  "SYSTEM_READY // PROTOCOL_X"
];

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const duration = 2800; // Tension build-up time
    const intervalTime = 30;
    const steps = duration / intervalTime;
    let currentStep = 0;

    // Easing curve to aggressively slow down right before the 'X' drops
    const easeOutQuart = (x: number): number => {
      return 1 - Math.pow(1 - x, 4);
    };

    const interval = setInterval(() => {
      currentStep++;
      
      const rawProgress = Math.min((currentStep / steps), 1);
      const easedProgress = easeOutQuart(rawProgress) * 100;
      
      setCount(easedProgress);

      const newStatusIndex = Math.floor((easedProgress / 100) * (loadingLogs.length - 1));
      setStatusIndex(newStatusIndex);

      if (currentStep >= steps) {
        clearInterval(interval);
        setCount(100);
        // Wait longer on the 'X' before opening the shutters
        setTimeout(onComplete, 900); 
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [onComplete]);

  const displayCount = Math.floor(count);
  const isComplete = displayCount >= 100;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none text-white overflow-hidden">
      
      {/* 1. CINEMATIC SHUTTER BACKGROUND */}
      <div className="absolute inset-0 flex w-full h-full">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="h-full flex-1 bg-[#020202] border-r border-white/[0.02] last:border-none"
            exit={{
              y: '-100%',
              transition: { 
                duration: 0.9, 
                ease: [0.76, 0, 0.24, 1],
                delay: i * 0.08 
              }
            }}
          />
        ))}
      </div>

      {/* 2. FOREGROUND CONTENT */}
      <motion.div
        className="absolute inset-0 z-10 flex flex-col justify-between p-8 md:p-12 lg:p-24"
        exit={{ opacity: 0, y: -20, transition: { duration: 0.4, ease: "easeOut" } }} 
      >
        {/* Top Header - Injected with Alien Glyphs */}
        <header className="flex justify-between items-start font-mono text-[10px] md:text-xs uppercase tracking-[0.2em] text-neutral-500">
          <div className="flex flex-col gap-1 overflow-hidden">
            <motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.2 }} className="text-white">
              ⎈_10 // KERNEL
            </motion.span>
            <motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.3 }}>
              VOL_⍾.011
            </motion.span>
          </div>
          <div className="text-right flex flex-col gap-1 overflow-hidden">
            <motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.2 }}>
              SYS_MEM // {(displayCount * 0.64).toFixed(1)}GB
            </motion.span>
            <motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.3 }}>
              ⎍⏣ // GLOBAL
            </motion.span>
          </div>
        </header>

        {/* Center Typography (Counter -> X) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center items-center mix-blend-difference">
          <AnimatePresence mode="wait">
            {!isComplete ? (
              // The ticking numbers
              <motion.div
                key="counter"
                className="relative flex items-center"
                initial={{ y: 20, opacity: 0, rotate: 2 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)", transition: { duration: 0.3 } }}
              >
                <h1 className="text-[28vw] md:text-[22vw] font-black uppercase leading-[0.8] tracking-tighter">
                  {displayCount.toString().padStart(3, '0')}
                </h1>
                <span className="text-[4vw] md:text-[2vw] font-mono tracking-widest absolute bottom-[10%] -right-[15%] text-neutral-500">
                  %
                </span>
              </motion.div>
            ) : (
              // The massive 'X' drop
              <motion.h1
                key="x-mark"
                initial={{ scale: 0.5, opacity: 0, filter: "blur(20px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ 
                  duration: 0.5, 
                  ease: [0.175, 0.885, 0.32, 1.275] // Sick cinematic snap-back ease
                }}
                className="text-[40vw] md:text-[30vw] font-black uppercase leading-[0.8] tracking-tighter text-white"
              >
                X
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Footer Info */}
        <footer className="flex justify-between items-end font-mono text-[10px] md:text-xs uppercase tracking-[0.2em]">
          
          {/* Dynamic Loading Log & Progress Bar */}
          <div className="max-w-[300px] w-full">
            <div className="h-[1px] w-full bg-white/10 mb-4 relative overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-white"
                style={{ width: `${count}%` }} 
              />
            </div>
            <div className="overflow-hidden h-4">
              <motion.p 
                key={statusIndex}
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className={`${isComplete ? 'text-white font-bold' : 'text-neutral-400'} whitespace-nowrap`}
              >
                {loadingLogs[statusIndex]}
              </motion.p>
            </div>
          </div>

          {/* Online Indicator */}
          <div className="hidden md:flex gap-3 items-center">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-white opacity-75 ${isComplete ? 'animate-none' : 'animate-ping'}`}></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span>{isComplete ? 'UPLINK_ESTABLISHED' : 'AWAITING_SIGNAL'}</span>
          </div>
        </footer>

      </motion.div>
    </motion.div>
  );
}