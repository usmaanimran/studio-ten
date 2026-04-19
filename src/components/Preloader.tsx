'use client';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';

const loadingLogs = [
  "⍙⎍⍾_⏣⎈⍙ // 0x000A1F",
  "⎀⍙⍾_⎍⏣⎈ // 0x1A4B9C",
  "⎈⏣⎀_⍙⎍⍾ // 0x8F3E2D",
  "⍾⎍⍙_⏣⎀⎈ // DECRYPTING_KERN",
  "TRANSLATING_NON_TERRESTRIAL //",
  "SYSTEM_READY // PROTOCOL_X"
];

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [isComplete, setIsComplete] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const currentIndexRef = useRef(0);

  const count = useMotionValue(0);
  const roundedCount = useTransform(count, (latest) => Math.floor(latest).toString().padStart(3, '0'));
  const memoryCount = useTransform(count, (latest) => (Math.floor(latest) * 0.64).toFixed(1));
  const progressWidth = useTransform(count, (latest) => `${latest}%`);

  useEffect(() => {
    const controls = animate(count, 100, {
      duration: 2.8,
      // FIX 1: Add a 500ms delay. This gives Three.js the time it needs 
      // to compile the heavy shaders in the background before the animation starts.
      delay: 0.5, 
      ease: [0.165, 0.84, 0.44, 1],
      onUpdate: (value) => {
        const newStatusIndex = Math.floor((value / 100) * (loadingLogs.length - 1));
        if (newStatusIndex !== currentIndexRef.current) {
          currentIndexRef.current = newStatusIndex;
          setStatusIndex(newStatusIndex);
        }
      },
      onComplete: () => {
        setIsComplete(true);
        setTimeout(onComplete, 900);
      }
    });

    return () => controls.stop();
  }, [count, onComplete]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none text-white overflow-hidden">
      
      <div className="absolute inset-0 flex w-full h-full">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="h-full flex-1 bg-[#020202] border-r border-white/[0.02] last:border-none"
            exit={{
              y: '-100%',
              transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1], delay: i * 0.08 }
            }}
          />
        ))}
      </div>

      <motion.div
        className="absolute inset-0 z-10 flex flex-col justify-between p-8 md:p-12 lg:p-24"
        exit={{ opacity: 0, y: -20, transition: { duration: 0.4, ease: "easeOut" } }} 
      >
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
            <motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.2 }} className="flex gap-1 justify-end">
              SYS_MEM // <motion.span>{memoryCount}</motion.span>GB
            </motion.span>
            <motion.span initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ delay: 0.3 }}>
              ⎍⏣ // GLOBAL
            </motion.span>
          </div>
        </header>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full flex justify-center items-center mix-blend-difference">
          <AnimatePresence mode="wait">
            {!isComplete ? (
              <motion.div
                key="counter"
                className="relative flex items-center"
                initial={{ y: 20, opacity: 0, rotate: 2 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.5, opacity: 0, filter: "blur(10px)", transition: { duration: 0.3 } }}
              >
                {/* FIX 2: Added 'tabular-nums'. This forces every digit to take up the exact same width, stopping the horizontal shaking. */}
                <motion.h1 className="text-[28vw] md:text-[22vw] font-black uppercase leading-[0.8] tracking-tighter tabular-nums">
                  {roundedCount}
                </motion.h1>
                <span className="text-[4vw] md:text-[2vw] font-mono tracking-widest absolute bottom-[10%] -right-[15%] text-neutral-500">
                  %
                </span>
              </motion.div>
            ) : (
              <motion.h1
                key="x-mark"
                initial={{ scale: 0.5, opacity: 0, filter: "blur(20px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.5, ease: [0.175, 0.885, 0.32, 1.275] }}
                className="text-[40vw] md:text-[30vw] font-black uppercase leading-[0.8] tracking-tighter text-white"
              >
                X
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        <footer className="flex justify-between items-end font-mono text-[10px] md:text-xs uppercase tracking-[0.2em]">
          <div className="max-w-[300px] w-full">
            <div className="h-[1px] w-full bg-white/10 mb-4 relative overflow-hidden">
              <motion.div
                className="absolute top-0 left-0 h-full bg-white"
                style={{ width: progressWidth }}
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