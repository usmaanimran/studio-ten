'use client';
import { motion } from 'framer-motion';

const services = [
  { id: '01', title: 'Web Architecture', desc: 'High-performance digital systems built for scale.' },
  { id: '02', title: 'Social Scaling', desc: 'Aggressive growth strategies for the digital economy.' },
  { id: '03', title: 'AI Automations', desc: 'Agentic workflows and autonomous decision engines.' },
  { id: '04', title: 'Graphic & Brand Design', desc: 'Immersive visual identities that demand attention.' },
];

export default function ServicesGrid() {
  return (
    // Removed h-full so the grid naturally fits its content, preventing overlap
    <section className="w-full grid grid-cols-1 sm:grid-cols-2 border-l border-t sm:border-t-0 border-white/10 pointer-events-auto">
      {services.map((service, index) => (
        <motion.div 
          key={service.id}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ delay: index * 0.1, duration: 0.8 }}
          // Explicit safe min-heights for different screen sizes
          className="group relative p-6 lg:p-8 xl:p-12 border-b border-r border-white/10 flex flex-col justify-between hover:bg-white/5 transition-colors duration-500 min-h-[160px] lg:min-h-[220px]"
        >
          {/* Top Identifier */}
          <div className="flex justify-between items-start mb-8 lg:mb-12">
            <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-widest">
              Service // {service.id}
            </span>
            <div className="w-2 h-2 rounded-full bg-white opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          
          {/* Content */}
          <div className="mt-auto">
            {/* Smoother typography scaling specific for short laptop heights */}
            <h3 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black uppercase tracking-tighter leading-[0.85] mb-3">
              {service.title}
            </h3>
            <p className="font-mono text-[9px] lg:text-[10px] uppercase tracking-[0.2em] text-neutral-400 max-w-xs leading-relaxed">
              {service.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </section>
  );
}