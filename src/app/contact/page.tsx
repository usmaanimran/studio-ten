'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=";

// ─────────────────────────────────────────────
// DECRYPT RETURN LINK
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
      className="fixed top-6 left-6 sm:top-10 sm:left-10 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-colors z-50"
    >
      &lt;&lt; {displayText}
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
    <main className="min-h-screen w-full bg-[#020202] text-white font-mono p-6 sm:p-12 lg:p-24 flex flex-col justify-center cursor-crosshair">
      
      <DecryptReturnLink text="SYS_RETURN" href="/" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl w-full mx-auto"
      >
        <div className="mb-12 border-b border-white/20 pb-8">
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tighter mb-2">
            Secure Terminal_
          </h1>
          <p className="text-[10px] sm:text-xs text-neutral-500 uppercase tracking-widest">
            Establishing encrypted connection to Studio Ten node...
          </p>
        </div>

        {status === 'SUCCESS' ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-500 flex flex-col gap-4">
            <p>[OK] TRANSMISSION RECEIVED.</p>
            <p>Our autonomous units will process your data and respond shortly.</p>
            <button onClick={() => setStatus('IDLE')} className="text-left mt-8 text-neutral-500 hover:text-white uppercase text-xs tracking-widest">
              [ INITIATE_NEW_CONNECTION ]
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-8 relative z-10">
            {/* NAME INPUT */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
              <label htmlFor="name" className="text-neutral-500 text-xs sm:text-sm whitespace-nowrap">
                root@studio-ten:~# <span className="text-white">set_designation</span>
              </label>
              <input id="name" type="text" required disabled={status === 'TRANSMITTING'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-transparent border-none outline-none text-white w-full placeholder:text-neutral-700 focus:ring-0 focus:border-b focus:border-white/50 py-1" placeholder="[ Enter your name ]" />
            </div>

            {/* EMAIL INPUT */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
              <label htmlFor="email" className="text-neutral-500 text-xs sm:text-sm whitespace-nowrap">
                root@studio-ten:~# <span className="text-white">set_protocol</span>
              </label>
              <input id="email" type="email" required disabled={status === 'TRANSMITTING'} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="bg-transparent border-none outline-none text-white w-full placeholder:text-neutral-700 focus:ring-0 focus:border-b focus:border-white/50 py-1" placeholder="[ Enter your email address ]" />
            </div>

            {/* PHONE INPUT */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 group">
              <label htmlFor="phone" className="text-neutral-500 text-xs sm:text-sm whitespace-nowrap">
                root@studio-ten:~# <span className="text-white">set_comlink</span>
              </label>
              <input id="phone" type="tel" disabled={status === 'TRANSMITTING'} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="bg-transparent border-none outline-none text-white w-full placeholder:text-neutral-700 focus:ring-0 focus:border-b focus:border-white/50 py-1" placeholder="[ Enter your contact number ]" />
            </div>

            {/* MESSAGE INPUT */}
            <div className="flex flex-col gap-2 group">
              <label htmlFor="message" className="text-neutral-500 text-xs sm:text-sm">
                root@studio-ten:~# <span className="text-white">load_payload</span>
              </label>
              <textarea id="message" required disabled={status === 'TRANSMITTING'} rows={6} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="bg-white/5 border border-white/10 outline-none text-white w-full p-4 placeholder:text-neutral-700 focus:border-white/50 resize-none font-mono text-sm" placeholder="> Type your requirements here..." />
            </div>

            {/* STATUS / SUBMIT */}
            <div className="mt-4 flex items-center gap-6">
              
              {/* SICK EXECUTE BUTTON */}
              <motion.button 
                type="submit" 
                disabled={status === 'TRANSMITTING'}
                whileHover={status !== 'TRANSMITTING' ? { 
                  backgroundColor: "#ffffff", 
                  color: "#000000",
                  letterSpacing: "0.4em",
                  boxShadow: "0px 0px 20px rgba(255, 255, 255, 0.4)"
                } : {}}
                whileTap={status !== 'TRANSMITTING' ? {
                  scale: 0.95,
                  x: [0, -5, 5, -5, 5, 0], // The "Glitch Shake"
                  transition: { duration: 0.3 }
                } : {}}
                className="relative overflow-hidden uppercase tracking-[0.2em] text-xs font-bold border border-white px-8 py-3 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none group"
              >
                <span className="relative z-10">{status === 'TRANSMITTING' ? './transmitting...' : './execute'}</span>
                
                {/* Background sliding scanline effect */}
                <div className="absolute inset-0 bg-neutral-200 translate-y-[100%] group-hover:translate-y-[-100%] transition-transform duration-[1.5s] ease-in-out z-0 opacity-20" />
              </motion.button>
              
              {status === 'ERROR' && (
                <span className="text-red-500 text-xs uppercase tracking-widest animate-pulse">
                  [!] TRANSMISSION_FAILED
                </span>
              )}
            </div>
          </form>
        )}
      </motion.div>
    </main>
  );
}