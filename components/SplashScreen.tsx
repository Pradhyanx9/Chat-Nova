import React, { useEffect, useState, useRef } from 'react';
import { Logo } from './Logo.tsx';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'initial' | 'animating' | 'outro'>('initial');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play a gorgeous, futuristic Major 9th chime with high-frequency crystal ping
  const playStartupChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const now = ctx.currentTime;
      
      // Master gain node for smooth fade
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.25, now + 0.15);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      masterGain.connect(ctx.destination);
      
      // Low pass filter for warm, analog-sounding base chords
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.7);
      filter.connect(masterGain);
      
      // Warm Major 9th chord frequencies: C3, G3, C4, E4, G4, B4, D5
      const freqs = [130.81, 196.00, 261.63, 329.63, 392.00, 493.88, 587.33];
      
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        
        const oscGain = ctx.createGain();
        const vol = (1 - (idx / freqs.length) * 0.55) * 0.12;
        
        oscGain.gain.setValueAtTime(0, now);
        // Staggered entry for rich stereo-like depth
        oscGain.gain.linearRampToValueAtTime(vol, now + 0.05 + (idx * 0.04));
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        
        osc.connect(oscGain);
        oscGain.connect(filter);
        
        osc.start(now);
        osc.stop(now + 2.2);
      });
      
      // Shimmering high-pitch crystal ping
      const pingOsc = ctx.createOscillator();
      pingOsc.type = 'sine';
      pingOsc.frequency.setValueAtTime(1046.50, now + 0.45); // C6 crystal frequency
      
      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0, now);
      pingGain.gain.setValueAtTime(0, now + 0.44);
      pingGain.gain.linearRampToValueAtTime(0.1, now + 0.47);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      
      const hpFilter = ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(800, now);
      
      pingOsc.connect(pingGain);
      pingGain.connect(hpFilter);
      hpFilter.connect(masterGain);
      
      pingOsc.start(now);
      pingOsc.stop(now + 1.8);
      
    } catch (err) {
      console.warn("Failed to synthesize startup chime:", err);
    }
  };

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setPhase('animating');
      // Attempt to play on mount. If blocked by browser, it fails silently
      playStartupChime();
    }, 50);

    const timer2 = setTimeout(() => setPhase('outro'), 2400); 
    const timer3 = setTimeout(() => onComplete(), 2900);

    // Canvas fluid particle animation
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = canvas.offsetWidth || window.innerWidth;
    let height = canvas.height = canvas.offsetHeight || window.innerHeight;

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth || window.innerWidth;
        height = canvas.height = canvas.offsetHeight || window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Particle class representing floating light points
    interface Particle {
      x: number;
      y: number;
      radius: number;
      color: string;
      angle: number;
      speed: number;
      distance: number;
      opacity: number;
      pulseSpeed: number;
    }

    const particles: Particle[] = [];
    const particleCount = 45;

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 80 + Math.random() * 140;
      particles.push({
        x: width / 2 + Math.cos(angle) * distance,
        y: height / 2 + Math.sin(angle) * distance,
        radius: 0.8 + Math.random() * 1.8,
        color: i % 2 === 0 ? 'rgba(6, 182, 212,' : 'rgba(99, 102, 241,', // Cyan or Indigo
        angle: angle,
        speed: (0.2 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1) * 0.015,
        distance: distance,
        opacity: 0.1 + Math.random() * 0.5,
        pulseSpeed: 0.01 + Math.random() * 0.02
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Orbital particles drawing loop
      const centerX = width / 2;
      const centerY = height / 2;

      particles.forEach((p) => {
        p.angle += p.speed;
        p.opacity += p.pulseSpeed;
        if (p.opacity > 0.7 || p.opacity < 0.1) {
          p.pulseSpeed = -p.pulseSpeed;
        }

        const x = centerX + Math.cos(p.angle) * p.distance;
        const y = centerY + Math.sin(p.angle) * p.distance;

        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0, Math.min(1, p.opacity))})`;
        ctx.shadowBlur = p.radius * 6;
        ctx.shadowColor = p.color.includes('182') ? '#06b6d4' : '#6366f1';
        ctx.fill();
        ctx.shadowBlur = 0; // reset
      });

      // Ambient nebula background wash
      const gradient = ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 300);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.04)');
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.02)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 300, 0, Math.PI * 2);
      ctx.fill();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [onComplete]);

  return (
    <div 
      className={`
        fixed inset-0 z-[200] bg-white dark:bg-slate-950 
        flex flex-col items-center justify-center 
        transition-all duration-1000 ease-in-out select-none
        ${phase === 'outro' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100'}
      `}
      onClick={playStartupChime} // Immersive tap-trigger for backup audio activation
    >
      {/* HTML5 Canvas for the ambient particle orbital flow */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none" 
      />

      <div className={`
        flex flex-col items-center gap-10 z-10
        transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)
        ${phase === 'animating' ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}
      `}>
        {/* Central Black Sun rotating Logo with cyan/indigo glowing halo */}
        <div className="relative group cursor-pointer active:scale-95 transition-transform duration-300">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 blur-2xl opacity-20 group-hover:opacity-45 transition-opacity duration-1000 scale-110" />
          <Logo 
            size="xl" 
            glow={true} 
            hideText={true}
            loading={phase === 'animating'} 
          />
        </div>
        
        <div className={`flex flex-col items-center gap-2.5 transition-all duration-1000 delay-300 ${phase === 'animating' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/60 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-100/80 dark:border-white/5 shadow-xl">
            <Sparkles size={14} className="text-cyan-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
              Pradhyan AI initialized
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-bold dark:text-slate-500 uppercase tracking-widest mt-1 opacity-70">
            Tap anywhere to test chime sound
          </span>
        </div>
      </div>

      <div className="absolute bottom-16 flex flex-col items-center gap-3">
        <div className="w-56 h-1 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/20">
          <div className={`h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-[2400ms] ease-out ${phase === 'animating' ? 'w-full' : 'w-0'}`} />
        </div>
      </div>
    </div>
  );
};
