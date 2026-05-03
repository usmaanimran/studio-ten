// src/components/Preloader.tsx
'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Preloader({ onComplete }: { onComplete: () => void }) {
  const [isFinished, setIsFinished] = useState(false);

  return (
    <motion.div
      // Added mix-blend-difference here to match the home page's visual blending
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-transparent pointer-events-none mix-blend-difference"
    >
      {/* Updated text size classes to text-[12vw] md:text-[10vw] to perfectly match the Home Page sizing */}
      <div className="relative inline-flex flex-col text-[12vw] md:text-[10vw] font-sans font-black tracking-tighter uppercase leading-[0.8]">

        {/* BASE LAYER: Fades out INSTANTLY when the wipe finishes so it doesn't leave a ghost trail */}
        <div
          className={`text-transparent pb-3 md:pb-5 border-b-[3px] md:border-b-[5px] border-[#222222] whitespace-nowrap select-none flex gap-4 md:gap-8 transition-opacity duration-75 ${isFinished ? 'opacity-0' : 'opacity-100'}`}
        >
          <span>STUDIO</span>
          <span>TEN</span>
        </div>

        {/* REVEAL LAYER */}
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: ["0%", "35%", "65%", "100%"] }}
          transition={{
            duration: 2.4,
            times: [0, 0.35, 0.75, 1],
            ease: [
              [0.25, 1, 0.5, 1],
              "linear",
              [0.76, 0, 0.24, 1]
            ],
            delay: 0.3
          }}
          onAnimationComplete={() => {
            // CRITICAL: Drop the overflow-hidden cage so the text can break out and fly
            setIsFinished(true);
            // Millisecond pause to ensure state updates before triggering the layout swap
            setTimeout(onComplete, 50);
          }}
          // Fades out just the white underline smoothly
          exit={{ borderColor: "rgba(255,255,255,0)", transition: { duration: 0.2 } }}
          className={`absolute top-0 left-0 h-full whitespace-nowrap border-b-[3px] md:border-b-[5px] border-white pb-3 md:pb-5 ${isFinished ? 'overflow-visible' : 'overflow-hidden'}`}
          style={{ willChange: "width" }}
        >
          <div className="text-white flex gap-4 md:gap-8">
            <motion.span 
              layout="position"
              layoutId="word-studio" 
              transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
              className="block font-sans whitespace-nowrap text-[12vw] md:text-[10vw] font-black uppercase tracking-tighter leading-[0.8] text-white"
            >
              STUDIO
            </motion.span>
            <motion.span 
              layout="position"
              layoutId="word-ten" 
              transition={{ duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
              className="block font-sans whitespace-nowrap text-[12vw] md:text-[10vw] font-black uppercase tracking-tighter leading-[0.8] text-white"
            >
              TEN
            </motion.span>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}