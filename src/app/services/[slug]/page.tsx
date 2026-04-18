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
    <main className="min-h-screen w-full bg-[#e5e5e5] text-black font-mono flex flex-col justify-center cursor-crosshair relative overflow-hidden">
      <motion.div
        initial={{ y: "-25vh" }} 
        animate={{ y: "-150vh" }} 
        transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="fixed top-0 left-[-25vw] w-[150vw] h-[150vh] bg-[#020202] z-[9999] pointer-events-none origin-center"
        style={{ rotate: "-10deg" }}
      />
      <Link href="/" className="fixed top-6 left-6 sm:top-10 sm:left-10 z-40 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-black transition-colors">
        &lt;&lt; SYS_RETURN
      </Link>
      <motion.div 
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        className="max-w-7xl mx-auto w-full p-6 sm:p-12 lg:p-24"
      >
        <p className="text-[10px] text-neutral-500 uppercase tracking-[0.3em] mb-4">[ DEPLOYED_NODE // {slug} ]</p>
        <h1 className="text-4xl sm:text-6xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.8]">{title}</h1>
        <div className="mt-12 max-w-2xl">
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