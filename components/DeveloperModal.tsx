import React from 'react';
import { X, Code2, Atom, Sparkles, Heart, Rocket, Globe, Milestone, Cpu } from 'lucide-react';

interface DeveloperModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
      {/* Premium blur backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Decorative Top Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-indigo-500" />
        
        {/* Header Close button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-100 dark:border-white/5 z-10"
        >
          <X size={16} />
        </button>

        <div className="p-6 md:p-10 max-h-[85vh] overflow-y-auto no-scrollbar">
          {/* Main profile card header */}
          <div className="flex flex-col items-center md:items-start md:flex-row gap-6 mb-8 border-b border-slate-100 dark:border-slate-800/80 pb-6">
            {/* Avatar container */}
            <div className="relative group shrink-0">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-cyan-500 via-emerald-400 to-purple-500 blur-md opacity-75 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-24 h-24 rounded-[2rem] bg-slate-950 flex items-center justify-center border-2 border-white dark:border-slate-800 overflow-hidden shadow-xl">
                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 font-mono">
                  P9
                </span>
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-cyan-500 to-purple-500 text-[8px] font-black tracking-widest text-white px-2 py-0.5 rounded-md uppercase font-mono shadow-sm">
                  FOUNDER
                </div>
              </div>
            </div>

            {/* Profile text */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1.5">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white">Pradhyanx9</h2>
                <span className="text-[10px] bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-100 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400 px-3 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Prazan Kashyap
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-3">
                Computer Science & Physics Enthusiast • Lead AI Architect of Chat Nova
              </p>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5">
                  <Code2 size={11} className="text-cyan-500" /> Coding
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5">
                  <Atom size={11} className="text-purple-500" /> Physics
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5">
                  <Sparkles size={11} className="text-yellow-500 animate-spin-slow" /> Artificial Intel
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Bento Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box 1: About Prazan */}
            <div className="p-5 rounded-[1.75rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Rocket size={16} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Who is Pradhyanx9?</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Pradhyanx9 (Prazan Kashyap) is a passionate developer driven by a profound fascination for computational systems and the elegant mathematical laws governing physics. He is dedicated to creating software that makes intelligent machines feel like genuine, high-performing partners.
              </p>
            </div>

            {/* Box 2: The Philosophy */}
            <div className="p-5 rounded-[1.75rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <Milestone size={16} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">The Vision</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                His mission is to engineer high-fidelity interfaces that democratize AI intelligence. Whether designing hybrid mobile architectures or clean, fast, desktop web layouts, Pradhyanx9 prioritizes low-latency speed, security, and delightful tactile layouts.
              </p>
            </div>

            {/* Box 3: Technical Approach */}
            <div className="col-span-1 md:col-span-2 p-5 rounded-[1.75rem] bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Cpu size={16} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">The Architecture & Scalene Modulator</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-3">
                Pradhyanx9 designed Chat Nova with a **Web-Centric High-Contrast Layout** and an experimental model-selection routing pipeline:
              </p>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-none pl-1">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-500 font-black">✓</span>
                  <span><strong>Adaptive Routing</strong>: Directs complex, scientific, or reasoning prompts to superior deep model pipelines while light requests are answered in microseconds.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-black">✓</span>
                  <span><strong>Tactile Search</strong>: Prominent inputs mimicking search engine precision for distraction-free interactions.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-500 font-black">✓</span>
                  <span><strong>AI Coding Collab</strong>: Co-developed alongside <strong>Scalene Modulator</strong> (Google AI Studio's agentic coder) to output exceptionally verified, fully static clean code.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Bottom message */}
          <div className="mt-8 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5">
              Made with <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" /> by Pradhyanx9 (Prazan Kashyap) & Scalene Modulator
            </p>
            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-mono mt-1">Luminix AI • All Rights Reserved © 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
};
