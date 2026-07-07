
import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Check, Zap, Cpu, Sparkles, Brain, Rocket, Mic, Crown, Lock, Info } from 'lucide-react';
import { Logo } from './Logo.tsx';
import { User } from '../types.ts';

export const MODELS = [
  { 
    id: 'gemini-3-flash-preview', 
    label: 'Nova 3.0 Turbo', 
    description: 'Ultra-fast and efficient for daily queries.',
    tag: 'Turbo',
    icon: <Zap size={14} className="text-amber-500" />,
    color: 'bg-amber-500/10'
  },
  { 
    id: 'gemini-3-pro-preview', 
    label: 'Nova 3.0 Elite', 
    description: 'Superior reasoning and complex tasks.',
    tag: 'Elite',
    icon: <Crown size={14} className="text-purple-500" />,
    color: 'bg-purple-500/10',
    isPremium: true,
    maxUsage: 70
  },
  { 
    id: 'gemini-flash-lite-latest', 
    label: 'Nova 3.0 Lite', 
    description: 'Lean and exceptionally quick response times.',
    tag: 'Lite',
    icon: <Rocket size={14} className="text-emerald-500" />,
    color: 'bg-emerald-500/10'
  }
];

interface HeaderProps {
  onToggleSidebar: () => void;
  onVoiceChat: () => void;
  selectedModelId: string;
  onModelChange: (id: string) => void;
  user: User;
  onUpgradeRequest: () => void;
  onDeveloperClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onToggleSidebar, 
  onVoiceChat, 
  selectedModelId, 
  onModelChange, 
  user,
  onUpgradeRequest,
  onDeveloperClick
}) => {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedModel = MODELS.find(m => m.id === selectedModelId) || MODELS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const usageCount = user.powerfulModelUsage || 0;
  const isUsageExceeded = usageCount >= 70;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-2xl z-40 border-b border-gray-100 dark:border-white/5 h-16 flex items-center justify-between px-3 md:px-6 transition-all duration-300">
      <div className="flex items-center gap-2 md:gap-3">
        <button 
          onClick={onToggleSidebar} 
          className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl lg:hidden transition-all active:scale-90"
        >
          <Menu size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex items-center gap-2">
          <Logo size="xs" hideText={true} className="h-6 md:h-7" />
          <span className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200">
            Nova
          </span>
          <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-500 dark:text-blue-400 px-1.5 py-0.5 rounded-md leading-none select-none">
            3.5
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-4 flex-1 justify-center max-w-[150px] sm:max-w-sm mx-auto">
        <div className="relative flex flex-col items-center w-full" ref={menuRef}>
          <button 
            onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
            className="group flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-1.5 md:py-2 bg-white/50 dark:bg-white/5 backdrop-blur-md border border-gray-200 dark:border-white/10 hover:border-cyan-500/40 rounded-full transition-all duration-300 shadow-sm hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] active:scale-95 w-full justify-between sm:w-auto"
          >
            <div className={`flex items-center justify-center w-4 h-4 md:w-5 md:h-5 rounded-full ${selectedModel.color} flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]`}>
              {/* Fix: Cast icon to React.ReactElement<any> to resolve TypeScript overload error for 'size' property */}
              {React.cloneElement(selectedModel.icon as React.ReactElement<any>, { size: 12 })}
            </div>
            <span className="text-[8px] md:text-[9px] font-black text-black dark:text-white uppercase tracking-wider leading-none truncate max-w-[60px] sm:max-w-none transition-all duration-300 group-hover:scale-105 group-hover:text-cyan-600">
              {selectedModel.label}
            </span>
            <ChevronDown size={10} className={`text-gray-400 transition-transform ${isModelMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isModelMenuOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-[90vw] max-w-[320px] bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 rounded-[2rem] shadow-2xl p-1.5 animate-in zoom-in-95 origin-top overflow-hidden">
              <div className="px-4 py-2 mb-1 border-b border-gray-50 dark:border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain size={10} className="text-cyan-500" />
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-400">Nova Engines</p>
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                {MODELS.map((model) => {
                  const isLocked = model.isPremium && !user.isPremium;
                  const isDisabled = model.isPremium && isUsageExceeded;
                  return (
                    <button
                      key={model.id}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isLocked) onUpgradeRequest();
                        else onModelChange(model.id);
                        setIsModelMenuOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-[1.4rem] transition-all group/item
                        ${selectedModelId === model.id ? 'bg-gray-50 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}
                        ${isDisabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                      `}
                    >
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedModelId === model.id ? 'bg-black dark:bg-white shadow-lg' : 'bg-white dark:bg-slate-800 border border-gray-100'}`}>
                        {isLocked ? <Lock size={12} className="text-gray-400" /> : <span className={selectedModelId === model.id ? 'text-white dark:text-black' : ''}>{model.icon}</span>}
                      </div>
                      <div className="flex flex-col items-start flex-1 text-left">
                        <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-tight ${model.isPremium ? 'text-purple-600' : 'text-black dark:text-white'}`}>
                          {model.label}
                        </span>
                        <span className="text-[9px] text-gray-500 font-medium leading-tight mt-0.5 line-clamp-1">{model.description}</span>
                      </div>
                      {selectedModelId === model.id && !isLocked && <div className="w-4 h-4 flex items-center justify-center bg-cyan-600 rounded-full flex-shrink-0"><Check size={8} className="text-white" strokeWidth={4} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <button 
          onClick={onVoiceChat} 
          className="p-2 md:p-2.5 text-black dark:text-white bg-gray-50 dark:bg-white/5 hover:bg-cyan-50 rounded-full transition-all border border-gray-100 dark:border-white/5 active:scale-90"
          title="Voice Chat"
        >
          <Mic size={18} strokeWidth={2.5} />
        </button>

        {/* Creator Info Button */}
        <button 
          onClick={onDeveloperClick}
          className="relative group p-1.5 sm:p-2 md:p-2.5 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 hover:from-cyan-500/20 hover:to-purple-500/20 text-cyan-600 dark:text-cyan-400 rounded-full border border-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 shrink-0"
          title="Creator Profile (Prazan Kashyap)"
        >
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 opacity-20 group-hover:opacity-40 blur-md transition-opacity duration-300 pointer-events-none" />
          <span className="text-[10px] font-black uppercase tracking-wider pl-1.5 pr-0.5 hidden sm:inline select-none text-slate-800 dark:text-slate-100">Prazan Kashyap</span>
          <div className="relative w-5 h-5 rounded-full bg-slate-950 flex items-center justify-center border border-cyan-500/30 overflow-hidden font-mono font-black text-[9px] text-cyan-400 shrink-0">
            PK
          </div>
        </button>
      </div>
    </header>
  );
};
