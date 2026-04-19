'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import WebArchitecturePage from '../../../components/services/WebArchitecture';

const formatTitle = (slug: string) => {
  return slug.split('-').join(' ').toUpperCase();
};

function DefaultServicePage({ slug, title }: { slug: string, title: string }) {
  return (
    <main className="min-h-[100dvh] w-full bg-[#e5e5e5] text-black font-mono flex flex-col justify-center cursor-crosshair relative overflow-hidden">

      {/* INCOMING TORN TRANSITION */}
      <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden flex items-center justify-center">
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="torn-edge-in" x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="150" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <motion.div
          initial={{ x: "-10%", y: "-10%", rotate: -45 }}
          animate={{ x: "-150%", y: "-150%", rotate: -45 }}
          transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
          className="absolute w-[300vw] h-[300vh] bg-[#020202]"
          style={{ filter: "url(#torn-edge-in)" }}
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        </motion.div>
      </div>

      <Link href="/" className="fixed top-6 left-6 sm:top-10 sm:left-10 z-40 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
        &lt;&lt; SYS_RETURN
      </Link>


      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="max-w-7xl mx-auto w-full px-6 sm:px-12 lg:px-24"
      >
        <p className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] mb-4">[ DEPLOYED_NODE // {slug} ]</p>
        <h1 className="text-[clamp(2.5rem,11vw,6rem)] sm:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.85] break-words hyphens-auto w-full">{title}</h1>
        <div className="mt-8 sm:mt-12 w-full max-w-full sm:max-w-2xl">
          <p className="text-sm sm:text-base leading-relaxed text-neutral-700">
            System architecture standing by. Content modules for this specific pillar will be deployed here. Awaiting further design specifications.
          </p>
        </div>
      </motion.div>
    </main>
  );
}

export default function ServicePage() {
  const params = useParams();
  const slug = params?.slug as string;

  // Render nothing until the slug is fully resolved by the router
  if (!slug) return null;

  const title = formatTitle(slug);

  if (slug === 'web-architecture') {
    return <WebArchitecturePage />;
  }

  return <DefaultServicePage slug={slug} title={title} />;
}