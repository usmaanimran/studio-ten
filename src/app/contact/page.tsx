'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";

// ─────────────────────────────────────────────
// DECRYPT ON MOUNT (PAGE LOAD EFFECT)
// ─────────────────────────────────────────────
const DecryptOnMount = ({ text, delay = 0, className = "" }: { text: string, delay?: number, className?: string }) => {
  const [displayText, setDisplayText] = useState(text.replace(/[^\s]/g, '█'));

  useEffect(() => {
    let timeout = setTimeout(() => {
      let iteration = 0;
      const interval = setInterval(() => {
        setDisplayText(text.split("").map((l, i) => {
          if (i < iteration) return text[i];
          if (l === ' ') return ' ';
          return LETTERS[Math.floor(Math.random() * LETTERS.length)];
        }).join(""));

        if (iteration >= text.length) {
          clearInterval(interval);
        }
        iteration += 1 / 2;
      }, 30);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, delay]);

  return <span className={className}>{displayText}</span>;
};

// ─────────────────────────────────────────────
// DECRYPT RETURN LINK (CYBERPUNK STYLED)
// ─────────────────────────────────────────────
const DecryptReturnLink = ({ text, href }: { text: string, href: string }) => {
  const [displayText, setDisplayText] = useState(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const triggerScramble = () => {
    let iteration = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(text.split("").map((l, i) => {
        if (i < iteration) return text[i];
        return LETTERS[Math.floor(Math.random() * LETTERS.length)];
      }).join(""));

      if (iteration >= text.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
      iteration += 1 / 3;
    }, 30);
  };

  return (
    <Link
      href={href}
      onMouseEnter={triggerScramble}
      // FIX: Removed fixed positioning so it aligns perfectly with the content grid below it.
      // Using inline-flex and w-fit keeps it from stretching.
      className="group relative inline-flex w-fit items-center gap-3 font-mono text-[9px] sm:text-xs tracking-[0.2em] px-5 py-2.5 transition-all duration-200 active:scale-95 !bg-[#0a0a0a] border border-white/20 hover:border-[#00f3ff] !text-white hover:!text-white shadow-xl overflow-hidden cursor-pointer"
      style={{
        clipPath: "polygon(0 0, 100% 0, 100% 70%, 90% 100%, 0 100%)",
        willChange: "transform, clip-path"
      }}
    >
      {/* Visual Indicator Layer */}
      <div className="absolute left-0 top-0 w-1 h-full bg-[#00f3ff] opacity-40 group-hover:opacity-100 transition-opacity" />
      
      {/* Pulsing Status Dot */}
      <div className="relative flex items-center justify-center z-10">
        <span className="absolute w-3 h-3 bg-[#00f3ff]/30 rounded-full animate-ping" />
        <span className="w-1.5 h-1.5 bg-[#00f3ff] rounded-full shrink-0" />
      </div>

      <span className="font-bold uppercase tracking-[0.25em] z-10 whitespace-nowrap">
        &lt;&lt; {displayText}
      </span>

      {/* Hover Slide-up Background */}
      <div className="absolute inset-0 bg-[#1a1a1a] translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-0" />
    </Link>
  );
};

export default function ContactTerminal() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'IDLE' | 'TRANSMITTING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('TRANSMITTING');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatus('SUCCESS');
        setFormData({ name: '', email: '', phone: '', message: '' });
      } else {
        setStatus('ERROR');
      }
    } catch (err) {
      setStatus('ERROR');
    }
  };

  return (
    <main className="min-h-[100dvh] w-full bg-[#020202] text-white font-mono p-6 sm:p-12 lg:p-24 flex flex-col overflow-y-auto cursor-crosshair">

      {/* FIX: Moved the button inside the max-w-3xl container so they share the exact same left-edge alignment */}
      <div className="max-w-3xl w-full mx-auto my-auto pt-12 sm:pt-24 pb-12">
        
        <div className="mb-10 sm:mb-12">
          <DecryptReturnLink text="BACK" href="/" />
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="mb-12 sm:mb-16 border-b border-white/10 pb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4">
              <DecryptOnMount text="Secure Terminal_" delay={200} />
            </h1>
            <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest leading-relaxed">
              <DecryptOnMount text="Establishing encrypted connection to Studio Ten node..." delay={800} />
            </p>
          </div>

          {status === 'SUCCESS' ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-green-500 flex flex-col gap-4 border border-green-500/20 bg-green-500/5 p-8">
              <p className="uppercase tracking-widest text-sm">[OK] TRANSMISSION RECEIVED.</p>
              <p className="text-xs text-green-500/70 leading-relaxed">Our autonomous units will process your data and respond shortly.</p>
              <button onClick={() => setStatus('IDLE')} className="text-left mt-8 text-neutral-500 hover:text-white uppercase text-xs tracking-widest transition-colors">
                [ INITIATE_NEW_CONNECTION ]
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-8 sm:gap-10 relative z-10">

              {/* NAME INPUT */}
              <div className="flex flex-col group">
                <label htmlFor="name" className="text-[10px] sm:text-xs md:text-sm font-mono tracking-widest mb-3 whitespace-nowrap">
                  <DecryptOnMount text="root@studio-ten:~#" delay={1200} className="text-neutral-500" /> <span className="text-white"><DecryptOnMount text="user_name" delay={1800} /></span>
                </label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-neutral-600 font-bold select-none text-sm sm:text-base">{'>'}</span>
                  <input id="name" type="text" required disabled={status === 'TRANSMITTING'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-transparent border-b border-white/20 focus:border-white outline-none text-white w-full pb-2 placeholder:text-neutral-800 transition-colors rounded-none font-mono text-sm sm:text-base" placeholder="[ Enter your name ]" />
                </div>
              </div>

              {/* EMAIL INPUT */}
              <div className="flex flex-col group">
                <label htmlFor="email" className="text-[10px] sm:text-xs md:text-sm font-mono tracking-widest mb-3 whitespace-nowrap">
                  <DecryptOnMount text="root@studio-ten:~#" delay={1400} className="text-neutral-500" /> <span className="text-white"><DecryptOnMount text="email_address" delay={2000} /></span>
                </label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-neutral-600 font-bold select-none text-sm sm:text-base">{'>'}</span>
                  <input id="email" type="email" required disabled={status === 'TRANSMITTING'} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-transparent border-b border-white/20 focus:border-white outline-none text-white w-full pb-2 placeholder:text-neutral-800 transition-colors rounded-none font-mono text-sm sm:text-base" placeholder="[ Enter your email address ]" />
                </div>
              </div>

              {/* PHONE INPUT */}
              <div className="flex flex-col group">
                <label htmlFor="phone" className="text-[10px] sm:text-xs md:text-sm font-mono tracking-widest mb-3 whitespace-nowrap">
                  <DecryptOnMount text="root@studio-ten:~#" delay={1600} className="text-neutral-500" /> <span className="text-white"><DecryptOnMount text="contact_number" delay={2200} /></span>
                </label>
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="text-neutral-600 font-bold select-none text-sm sm:text-base">{'>'}</span>
                  <input id="phone" type="tel" disabled={status === 'TRANSMITTING'} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-transparent border-b border-white/20 focus:border-white outline-none text-white w-full pb-2 placeholder:text-neutral-800 transition-colors rounded-none font-mono text-sm sm:text-base" placeholder="[ Enter your contact number ]" />
                </div>
              </div>

              {/* MESSAGE INPUT */}
              <div className="flex flex-col group">
                <label htmlFor="message" className="text-[10px] sm:text-xs md:text-sm font-mono tracking-widest mb-3">
                  <DecryptOnMount text="root@studio-ten:~#" delay={1800} className="text-neutral-500" /> <span className="text-white"><DecryptOnMount text="load_payload" delay={2400} /></span>
                </label>
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="text-neutral-600 font-bold select-none text-sm sm:text-base mt-3 sm:mt-4">{'>'}</span>
                  <textarea id="message" required disabled={status === 'TRANSMITTING'} rows={5} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="bg-white/[0.02] border border-white/10 focus:border-white/40 outline-none text-white w-full p-3 sm:p-4 placeholder:text-neutral-800 transition-colors rounded-none font-mono text-sm sm:text-base resize-y min-h-[120px]" placeholder="Type your requirements here..." />
                </div>
              </div>

              {/* STATUS / SUBMIT */}
              <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-4 border-t border-white/10">

                <div className="hidden sm:block text-neutral-500 text-xs md:text-sm font-mono">
                  root@studio-ten:~#
                </div>

                <motion.button
                  type="submit"
                  disabled={status === 'TRANSMITTING'}
                  whileTap={status !== 'TRANSMITTING' ? { scale: 0.98 } : {}}
                  className="relative overflow-hidden uppercase tracking-[0.2em] text-xs font-bold border border-white px-8 py-4 sm:py-3 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none group w-full sm:w-auto text-center bg-[#020202]"
                >
                  <span className="relative z-10 group-hover:text-black transition-colors duration-300">
                    {status === 'TRANSMITTING' ? './transmitting...' : './execute'}
                  </span>

                  <div className="absolute inset-0 bg-white translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 ease-in-out z-0" />
                </motion.button>

                {status === 'ERROR' && (
                  <span className="text-red-500 text-[10px] sm:text-xs uppercase tracking-widest animate-pulse w-full text-center sm:text-left mt-2 sm:mt-0">
                    [!] TRANSMISSION_FAILED
                  </span>
                )}
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </main>
  );
}