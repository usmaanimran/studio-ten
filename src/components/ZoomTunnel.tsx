'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function ZoomTunnel() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgSvgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  
  // NEW: Ref for the drip overlay
  const dripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let heightRatio = window.innerWidth / window.innerHeight;

    const updateRatio = () => {
      heightRatio = window.innerWidth / window.innerHeight;
    };
    window.addEventListener('resize', updateRatio);

    const ctx = gsap.context(() => {
      
      // Initialize the drip high above the screen
      gsap.set(dripRef.current, { yPercent: -100 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top", 
          end: "+=400%", // Slightly increased to give the drip time to fall
          pin: true,
          scrub: true,
          refreshPriority: 1, // CRITICAL FIX: Forces this pin to calculate BEFORE ScrollManifesto so the layout doesn't break
          invalidateOnRefresh: true
        }
      });

      // 1. Fade in the white text mask while it stays perfectly still (YOUR LOGIC)
      tl.fromTo(
        containerRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 1 }
      )
      // 2. Fade in the psychedelic background & internal text (YOUR LOGIC)
      .fromTo(
        [bgSvgRef.current, contentRef.current],
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 1 }
      )
      // 3. Zoom the SVG path mask (YOUR LOGIC)
      .fromTo(
        pathRef.current,
        {
          scale: () => Math.min(1, (window.innerWidth - 80) / 489), 
          x: () => (window.innerWidth - 489) / 2, 
          y: () => (window.innerHeight - 72) / 2,
          transformOrigin: "44% 50%" 
        },
        {
          scale: 800, 
          x: () => (window.innerWidth - 489) / 2, 
          y: () => (window.innerHeight - 72) / 2,
          transformOrigin: "44% 50%", 
          duration: 3, 
          ease: "power2.inOut"
        },
        "<" 
      )
      // 4. NEW: The Drip Effect. Slides down to cover the screen in #020202
      .to(dripRef.current, {
        yPercent: 0,
        duration: 1.5,
        ease: "power1.inOut"
      }, "-=1.0") // Starts dropping just before the zoom finishes
      
      .to({}, { duration: 0.5 }); // Tiny buffer at the end
    });

    return () => {
      window.removeEventListener('resize', updateRatio);
      ctx.revert();
    };
  }, []);

  return (
    <div className="w-full bg-transparent">
      {/* SVG Clip Path Definition (Hidden) */}
      <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" id="clipContainer" className="absolute top-0 left-0 opacity-0 pointer-events-none z-0">
        <clipPath id="clip-path1">
          <path 
            ref={pathRef} 
            id="logoPath" 
            d="M49.125 44.5312C49.125 48.8125 48.375 52.5625 46.875 55.7812C45.4062 58.9688 43.375 61.625 40.7812 63.75C38.2188 65.875 35.2031 67.4688 31.7344 68.5312C28.2969 69.5938 24.5938 70.125 20.625 70.125C19.0938 70.125 17.4062 69.9219 15.5625 69.5156C13.75 69.1094 11.9062 68.6094 10.0312 68.0156C8.15625 67.3906 6.34375 66.7344 4.59375 66.0469C2.875 65.3281 1.34375 64.6562 0 64.0312L2.0625 44.7188C4.71875 46.3125 7.65625 47.5312 10.875 48.375C14.125 49.1875 17.3125 49.5938 20.4375 49.5938C21.0312 49.5938 21.75 49.5781 22.5938 49.5469C23.4375 49.4844 24.2344 49.3438 24.9844 49.125C25.7656 48.875 26.4219 48.5156 26.9531 48.0469C27.4844 47.5781 27.75 46.9062 27.75 46.0312C27.75 45.4375 27.5625 44.9375 27.1875 44.5312C26.8125 44.0938 26.3281 43.75 25.7344 43.5C25.1406 43.2188 24.4688 43.0156 23.7188 42.8906C22.9688 42.7344 22.2344 42.625 21.5156 42.5625C20.7969 42.5 20.125 42.4688 19.5 42.4688C18.875 42.4688 18.375 42.4688 18 42.4688C15.3125 42.4688 12.8594 42 10.6406 41.0625C8.45312 40.125 6.5625 38.8281 4.96875 37.1719C3.40625 35.4844 2.1875 33.5 1.3125 31.2188C0.4375 28.9062 0 26.4062 0 23.7188C0 20.0312 0.734375 16.7344 2.20312 13.8281C3.70312 10.8906 5.6875 8.40625 8.15625 6.375C10.6562 4.3125 13.5156 2.73437 16.7344 1.64062C19.9531 0.546875 23.2812 0 26.7188 0C28.25 0 29.8281 0.0625 31.4531 0.1875C33.0781 0.28125 34.6875 0.46875 36.2812 0.75C37.9062 1.03125 39.4844 1.39063 41.0156 1.82812C42.5469 2.26562 44 2.8125 45.375 3.46875L43.5938 22.5C41.4688 21.7812 39.2344 21.1875 36.8906 20.7188C34.5781 20.2187 32.3125 19.9688 30.0938 19.9688C29.6875 19.9688 29.1562 19.9844 28.5 20.0156C27.875 20.0156 27.2031 20.0625 26.4844 20.1562C25.7969 20.2187 25.0938 20.3281 24.375 20.4844C23.6562 20.6406 23.0156 20.8594 22.4531 21.1406C21.8906 21.3906 21.4375 21.7344 21.0938 22.1719C20.75 22.6094 20.5938 23.125 20.625 23.7188C20.6562 24.4062 20.9062 24.9688 21.375 25.4062C21.875 25.8125 22.5 26.1406 23.25 26.3906C24.0312 26.6094 24.875 26.7656 25.7812 26.8594C26.7188 26.9531 27.6406 27.0156 28.5469 27.0469C29.4531 27.0469 30.2969 27.0469 31.0781 27.0469C31.8594 27.0156 32.5 27.0312 33 27.0938C35.5 27.25 37.75 27.7812 39.75 28.6875C41.75 29.5938 43.4375 30.7969 44.8125 32.2969C46.2188 33.7969 47.2812 35.5938 48 37.6875C48.75 39.75 49.125 42.0312 49.125 44.5312ZM100.641 2.4375L100.172 22.3125L86.2031 22.875L82.6406 67.3125L62.8594 68.3438L62.9531 23.9062L48.9844 24.6562L49.5469 2.53125L100.641 2.4375ZM159.281 17.3438C159.281 19.6562 159.172 22.2031 158.953 24.9844C158.734 27.7656 158.375 30.6406 157.875 33.6094C157.375 36.5781 156.719 39.5938 155.906 42.6562C155.125 45.6875 154.141 48.6094 152.953 51.4219C151.766 54.2344 150.375 56.875 148.781 59.3438C147.219 61.7812 145.406 63.9219 143.344 65.7656C141.312 67.5781 139.031 69 136.5 70.0312C133.969 71.0938 131.156 71.625 128.062 71.625C124.438 71.625 121.281 71.0312 118.594 69.8438C115.938 68.6875 113.656 67.125 111.75 65.1562C109.844 63.1562 108.281 60.8438 107.062 58.2188C105.844 55.5625 104.891 52.7656 104.203 49.8281C103.516 46.8594 103.031 43.8438 102.75 40.7812C102.5 37.6875 102.375 34.7188 102.375 31.875C102.375 27.5 102.594 23.1406 103.031 18.7969C103.469 14.4219 104.094 10.0625 104.906 5.71875L126.844 6.5625C126 11.4688 125.266 16.4062 124.641 21.375C124.047 26.3125 123.75 31.2812 123.75 36.2812C123.75 36.8125 123.766 37.6094 123.797 38.6719C123.859 39.7031 123.953 40.875 124.078 42.1875C124.203 43.4688 124.375 44.7969 124.594 46.1719C124.844 47.5156 125.172 48.75 125.578 49.875C125.984 51 126.469 51.9219 127.031 52.6406C127.625 53.3594 128.312 53.7188 129.094 53.7188C130 53.7188 130.812 53.2969 131.531 52.4531C132.25 51.5781 132.875 50.4219 133.406 48.9844C133.969 47.5469 134.453 45.8906 134.859 44.0156C135.266 42.1406 135.609 40.1875 135.891 38.1562C136.172 36.125 136.391 34.0938 136.547 32.0625C136.734 30.0312 136.875 28.1406 136.969 26.3906C137.094 24.6406 137.172 23.0938 137.203 21.75C137.234 20.4062 137.25 19.4062 137.25 18.75C137.25 16.3125 137.203 13.8906 137.109 11.4844C137.047 9.04688 136.938 6.625 136.781 4.21875H158.719C159.094 8.53125 159.281 12.9062 159.281 17.3438ZM216.141 32.25C216.141 36.625 215.578 40.5781 214.453 44.1094C213.328 47.6094 211.75 50.7344 209.719 53.4844C207.719 56.2031 205.328 58.5469 202.547 60.5156C199.766 62.4844 196.719 64.1094 193.406 65.3906C190.094 66.6406 186.562 67.5781 182.812 68.2031C179.094 68.7969 175.266 69.0938 171.328 69.0938C169.859 69.0938 168.422 69.0625 167.016 69C165.609 68.9062 164.172 68.7812 162.703 68.625L164.016 5.71875C167.453 4.625 170.984 3.85937 174.609 3.42188C178.266 2.95312 181.891 2.71875 185.484 2.71875C189.953 2.71875 194.062 3.39062 197.812 4.73438C201.562 6.07813 204.797 8.01562 207.516 10.5469C210.234 13.0781 212.344 16.1719 213.844 19.8281C215.375 23.4844 216.141 27.625 216.141 32.25ZM196.922 35.25C196.953 33.5625 196.766 31.9375 196.359 30.375C195.984 28.8125 195.344 27.4375 194.438 26.25C193.562 25.0312 192.438 24.0625 191.062 23.3438C189.688 22.5938 188.047 22.1875 186.141 22.125L184.266 51.1875C186.141 50.9062 187.844 50.2969 189.375 49.3594C190.906 48.3906 192.219 47.2188 193.312 45.8438C194.438 44.4375 195.297 42.8906 195.891 41.2031C196.516 39.4844 196.859 37.7188 196.922 35.9062V35.25ZM244.312 3.46875L239.156 67.3125L219.375 68.3438V4.78125L244.312 3.46875ZM304.875 36.375C304.875 39.2188 304.547 41.9688 303.891 44.625C303.234 47.25 302.281 49.7188 301.031 52.0312C299.812 54.3438 298.312 56.4688 296.531 58.4062C294.781 60.3125 292.797 61.9531 290.578 63.3281C288.391 64.7031 286 65.7812 283.406 66.5625C280.812 67.3125 278.062 67.6875 275.156 67.6875C272.344 67.6875 269.656 67.3281 267.094 66.6094C264.562 65.8906 262.188 64.8906 259.969 63.6094C257.75 62.2969 255.734 60.7344 253.922 58.9219C252.141 57.0781 250.609 55.0469 249.328 52.8281C248.078 50.5781 247.094 48.1719 246.375 45.6094C245.688 43.0469 245.344 40.375 245.344 37.5938C245.344 34.875 245.672 32.2188 246.328 29.625C246.984 27 247.922 24.5312 249.141 22.2188C250.391 19.9063 251.891 17.7812 253.641 15.8438C255.391 13.9063 257.344 12.2344 259.5 10.8281C261.688 9.42188 264.047 8.32813 266.578 7.54688C269.109 6.76562 271.781 6.375 274.594 6.375C279.125 6.375 283.25 7.07812 286.969 8.48438C290.719 9.89062 293.906 11.9062 296.531 14.5312C299.188 17.125 301.234 20.2813 302.672 24C304.141 27.6875 304.875 31.8125 304.875 36.375ZM284.062 37.5938C284.062 36.25 283.859 34.9531 283.453 33.7031C283.078 32.4219 282.516 31.2969 281.766 30.3281C281.016 29.3281 280.078 28.5312 278.953 27.9375C277.859 27.3125 276.594 27 275.156 27C273.688 27 272.375 27.2656 271.219 27.7969C270.062 28.3281 269.062 29.0625 268.219 30C267.406 30.9062 266.781 31.9844 266.344 33.2344C265.906 34.4531 265.688 35.75 265.688 37.125C265.688 38.4375 265.875 39.75 266.25 41.0625C266.625 42.375 267.188 43.5625 267.938 44.625C268.688 45.6875 269.609 46.5469 270.703 47.2031C271.828 47.8594 273.125 48.1875 274.594 48.1875C276.062 48.1875 277.375 47.9062 278.531 47.3438C279.719 46.75 280.719 45.9688 281.531 45C282.344 44 282.969 42.8594 283.406 41.5781C283.844 40.2969 284.062 38.9688 284.062 37.5938ZM376.453 2.4375L375.984 22.3125L362.016 22.875L358.453 67.3125L338.672 68.3438L338.766 23.9062L324.797 24.6562L325.359 2.53125L376.453 2.4375ZM423.422 1.875C423.234 4.8125 423.062 7.71875 422.906 10.5938C422.75 13.4687 422.547 16.375 422.297 19.3125L402.422 20.3438L401.953 26.25H415.922L414.891 40.7812L400.828 41.25L400.359 48.0938H411.984H420.234C420.047 51.5312 419.844 54.9531 419.625 58.3594C419.438 61.7344 419.266 65.125 419.109 68.5312L378.703 69.4688L380.203 1.875H423.422ZM488.812 2.25L485.438 65.8125L460.875 68.0625L447.75 34.0312L445.688 68.7188H424.594L426.281 2.25L449.719 1.125L465.938 34.875L466.688 3L488.812 2.25Z"
          />
        </clipPath>
      </svg>

      <section ref={sectionRef} className="w-full h-screen min-h-[100svh] flex items-center justify-center relative overflow-hidden z-10 bg-transparent">
        
        {/* NEW DRIP OVERLAY: Covers the screen in black as it slides down */}
        <div 
          ref={dripRef} 
          className="absolute left-0 w-full z-[60] pointer-events-none flex flex-col"
          style={{ top: 0, height: '120vh' }} 
        >
          {/* Solid black block that follows the drip */}
          <div className="w-full h-[100vh] bg-[#020202]" />
          {/* The curved drip SVG that leads the transition */}
          <svg className="w-full h-[20vh] text-[#020202] block -mt-1" preserveAspectRatio="none" viewBox="0 0 1000 300" fill="currentColor">
            <path d="M 0 0 L 1000 0 L 1000 50 C 950 50 950 250 900 250 C 850 250 850 80 800 80 C 750 80 750 200 700 200 C 650 200 650 40 600 40 C 550 40 550 280 500 280 C 450 280 450 100 400 100 C 350 100 350 220 300 220 C 250 220 250 60 200 60 C 150 60 150 260 100 260 C 50 260 50 50 0 50 Z" />
          </svg>
        </div>

        {/* The Masked Container (YOUR EXACT LOGIC) */}
        <div 
          ref={containerRef}
          className="w-full h-screen relative flex justify-center items-center overflow-hidden bg-white opacity-0 invisible" 
          style={{ clipPath: 'url(#clip-path1)' }}
        >
          <svg 
            ref={bgSvgRef} 
            className="absolute inset-0 w-full h-full z-0 block opacity-0 invisible" 
            viewBox="0 0 1200 900" 
            preserveAspectRatio="xMidYMid slice" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="swirlGradient" cx="50%" cy="50%" r="80%">
                <stop offset="0%" stopColor="#ff7eb3" />
                <stop offset="50%" stopColor="#7ec8ff" />
                <stop offset="100%" stopColor="#e8a2ff" />
              </radialGradient>
              <filter id="swirl" x="0" y="0">
                <feTurbulence type="turbulence" baseFrequency="0.012 0.018" numOctaves="2" seed="8" result="turb" />
                <feDisplacementMap in2="turb" in="SourceGraphic" scale="120" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
            <circle cx="600" cy="450" r="800" fill="url(#swirlGradient)" filter="url(#swirl)" />
          </svg>

          <div ref={contentRef} className="relative z-10 text-center font-sans opacity-0 invisible w-full px-4 text-[#020202]">
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
              WE DON'T JUST BUILD WEBSITES,<br />WE TELL STORIES.
            </h1>
            <p className="text-sm md:text-base font-mono tracking-widest max-w-xl mx-auto">
              STUDIO TEN is a collective of designers, developers, and strategists who craft immersive digital experiences that captivate audiences and drive results. We blend creativity with cutting-edge technology to bring your vision to life in the most engaging way possible.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}