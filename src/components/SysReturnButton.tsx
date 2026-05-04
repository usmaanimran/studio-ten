'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";

export default function SysReturnButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [displayText, setDisplayText] = useState('BACK');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pathname === '/services/web-architecture') {
      window.history.pushState({ trap: true }, '');
      const handlePopState = () => {
        window.dispatchEvent(new CustomEvent('START_GLITCH', { detail: { mode: 'RETURN' } }));
        setTimeout(() => router.replace('/'), 1000);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [pathname, router]);

  const triggerScramble = () => {
    let iteration = 0;
    const text = 'BACK';
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayText(text.split("").map((l, i) => {
        if (i < iteration) return text[i];
        return LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }).join(""));
      if (iteration >= text.length) clearInterval(intervalRef.current!);
      iteration += 1 / 3;
    }, 30);
  };

  const executeReturn = () => {
    document.body.style.cursor = 'wait';
    if (pathname === '/services/web-architecture') {
      window.history.back();
    } else {
      document.body.style.cursor = 'default';
      router.push('/');
    }
  };

  return (
    <button
      onClick={executeReturn}
      onMouseEnter={triggerScramble}
      className={`group relative flex items-center gap-3 font-mono text-[9px] sm:text-xs tracking-[0.2em] px-5 py-2.5 transition-all duration-200 active:scale-95 !bg-[#0a0a0a] border border-white/20 hover:border-[#00f3ff] !text-white hover:!text-white shadow-xl overflow-hidden ${className}`}
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)",
        willChange: "transform, clip-path"
      }}
    >
      {/* Visual Indicator Layer */}
      <div className="absolute left-0 top-0 w-1 h-full bg-[#00f3ff] opacity-40 group-hover:opacity-100 transition-opacity" />
      
      {/* Pulsing Status Dot */}
      <div className="relative flex items-center justify-center">
        <span className="absolute w-3 h-3 bg-[#00f3ff]/30 rounded-full animate-ping" />
        <span className="w-1.5 h-1.5 bg-[#00f3ff] rounded-full shrink-0 z-10" />
      </div>

      <span className="font-bold uppercase tracking-[0.25em] z-10">
        &lt;&lt; {displayText}
      </span>

      {/* Hover Slide-up Effect */}
      <div className="absolute inset-0 bg-[#1a1a1a] translate-y-full group-hover:translate-y-0 transition-transform duration-300 -z-0" />
    </button>
  );
}