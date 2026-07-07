
import React, { useEffect, useState, useMemo } from 'react';

interface AIFaceProps {
  isSpeaking: boolean;
  isListening: boolean;
  intensity?: number; // 0 to 1 scale
}

export const AIFace: React.FC<AIFaceProps> = ({ isSpeaking, isListening, intensity = 0 }) => {
  const [blink, setBlink] = useState(false);
  const [randomFrequency, setRandomFrequency] = useState(0);

  // Blinking logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    }, 3500 + Math.random() * 2500);

    return () => clearInterval(blinkInterval);
  }, []);

  // Sync internal frequency animation for mouth jitter when speaking
  useEffect(() => {
    if (!isSpeaking) return;
    const interval = setInterval(() => {
      setRandomFrequency(Math.random());
    }, 60);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const stateColor = useMemo(() => {
    if (isSpeaking) return 'rgba(34, 211, 238, 0.8)'; // Cyan
    if (isListening) return 'rgba(129, 140, 248, 0.8)'; // Indigo
    return 'rgba(255, 255, 255, 0.4)'; // Neutral
  }, [isSpeaking, isListening]);

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Outer Atmospheric Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-[80px] transition-all duration-1000 opacity-40"
        style={{ 
          backgroundColor: stateColor,
          transform: `scale(${1 + intensity * 0.3})`
        }} 
      />

      {/* Orbital Rings - Glassmorphic */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`absolute w-[90%] h-[90%] border border-white/10 dark:border-white/5 rounded-full animate-[spin_12s_linear_infinite] backdrop-blur-[1px]`} />
        <div className={`absolute w-[100%] h-[100%] border border-dashed border-white/20 dark:border-white/10 rounded-full animate-[spin_20s_linear_infinite_reverse]`} />
        <div className={`absolute w-[75%] h-[75%] border-t border-l border-white/30 dark:border-white/15 rounded-full animate-[spin_8s_ease-in-out_infinite]`} />
      </div>

      {/* Main Core Sphere */}
      <div className="relative w-40 h-40 rounded-full overflow-hidden flex items-center justify-center shadow-2xl">
        {/* Sphere Background with Nebula Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br transition-colors duration-700 
          ${isSpeaking ? 'from-cyan-500/20 to-blue-600/20' : isListening ? 'from-indigo-500/20 to-purple-600/20' : 'from-slate-200/10 to-slate-400/10'} 
          backdrop-blur-xl border border-white/20 dark:border-white/5`} 
        />
        
        {/* Internal Neural Mesh (Subtle) */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[length:12px_12px]" />

        <svg viewBox="0 0 100 100" className="w-full h-full relative z-10 drop-shadow-lg">
          {/* Expressive Iris Eyes */}
          <g className="transition-all duration-300">
            {/* Left Iris */}
            <circle cx="35" cy="42" r="6" fill="currentColor" className="text-white/10 dark:text-white/5" />
            <ellipse 
              cx="35" cy="42" 
              rx="3" ry={blink ? "0.2" : "3"} 
              fill="currentColor" 
              className={`transition-all duration-100 ${isSpeaking ? 'text-cyan-400' : isListening ? 'text-indigo-400' : 'text-slate-500'}`}
              style={{ filter: `blur(${isSpeaking ? '1px' : '0px'})` }}
            />
            {isSpeaking && <circle cx="35" cy="42" r={2 + intensity * 4} fill="currentColor" className="text-cyan-400/20 animate-ping" />}

            {/* Right Iris */}
            <circle cx="65" cy="42" r="6" fill="currentColor" className="text-white/10 dark:text-white/5" />
            <ellipse 
              cx="65" cy="42" 
              rx="3" ry={blink ? "0.2" : "3"} 
              fill="currentColor" 
              className={`transition-all duration-100 ${isSpeaking ? 'text-cyan-400' : isListening ? 'text-indigo-400' : 'text-slate-500'}`}
              style={{ filter: `blur(${isSpeaking ? '1px' : '0px'})` }}
            />
            {isSpeaking && <circle cx="65" cy="42" r={2 + intensity * 4} fill="currentColor" className="text-cyan-400/20 animate-ping" />}
          </g>

          {/* Dynamic Frequency Mouth */}
          <g className="transition-all duration-300">
            {isSpeaking ? (
              /* A reactive wave line */
              <path 
                d={`M 30 70 Q 40 ${70 - (intensity * 20) - (randomFrequency * 5)} 50 70 Q 60 ${70 + (intensity * 20) + (randomFrequency * 5)} 70 70`}
                stroke="currentColor" 
                strokeWidth="3" 
                strokeLinecap="round" 
                fill="none" 
                className="text-cyan-400 transition-all duration-75"
              />
            ) : isListening ? (
              /* Pulse dot */
              <circle cx="50" cy="70" r="2.5" fill="currentColor" className="text-indigo-400 animate-pulse" />
            ) : (
              /* Calm smile line */
              <path 
                d="M 38 70 Q 50 74 62 70" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                fill="none" 
                className="text-slate-500"
              />
            )}
          </g>
        </svg>

        {/* Gloss Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-white/20 pointer-events-none rounded-full" />
      </div>

      {/* Orbiting Particles */}
      {(isSpeaking || isListening) && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div 
              key={i}
              className={`absolute w-1.5 h-1.5 rounded-full blur-[1px] animate-[spin_${4+i}s_linear_infinite]`}
              style={{
                top: '50%',
                left: '50%',
                backgroundColor: isSpeaking ? '#22d3ee' : '#818cf8',
                transform: `rotate(${i * 120}deg) translateX(${90 + i * 10}px)`
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
