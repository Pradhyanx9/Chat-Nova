import React from 'react';
import { Sparkles, Code, Brain, Flame } from 'lucide-react';

interface WelcomeScreenProps {
  userName: string;
  onSuggestionClick?: (suggestion: string) => void;
  cartoonCharacter?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ userName, onSuggestionClick }) => {
  const suggestions = [
    {
      title: "Who created Chat Nova?",
      desc: "Learn about the founder Pradhyanx9 (Prazan Kashyap)",
      icon: <Brain size={18} className="text-cyan-500 dark:text-cyan-400" />,
      prompt: "Who created Chat Nova?"
    },
    {
      title: "Coding & Engineering",
      desc: "Explain the experimental Scalene Modulator architecture",
      icon: <Code size={18} className="text-purple-500 dark:text-purple-400" />,
      prompt: "Explain the experimental Scalene Modulator architecture in Chat Nova."
    },
    {
      title: "Explore Physics Concepts",
      desc: "Analyze quantum mechanics and general relativity laws",
      icon: <Flame size={18} className="text-amber-500 dark:text-amber-400" />,
      prompt: "Can you explain an interesting physics topic, like quantum superposition or relativity?"
    },
    {
      title: "Creative Brainstorming",
      desc: "Generate elegant UI mockup descriptions and visual ideas",
      icon: <Sparkles size={18} className="text-emerald-500 dark:text-emerald-400" />,
      prompt: "Help me brainstorm an elegant, minimalist dark dashboard design layout."
    }
  ];

  const firstFirstName = userName ? userName.split(' ')[0].split('@')[0] : "there";

  return (
    <div className="flex flex-col justify-center min-h-[60vh] py-12 px-4 max-w-3xl mx-auto relative z-10">
      
      {/* Immersive subtle ambient glows */}
      <div className="absolute top-20 left-1/3 w-80 h-80 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Gemini-style Left Aligned Typography */}
      <div className="mb-12 text-left animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-tight">
          <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent block font-bold">
            Hello, {firstFirstName}
          </span>
          <span className="text-slate-400 dark:text-slate-500 block font-normal mt-1">
            How can I help you today?
          </span>
        </h1>
      </div>

      {/* Suggesions Layout in a Grid of Clean, Minimal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        {suggestions.map((item, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick?.(item.prompt)}
            className="p-5 text-left rounded-2xl bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 border border-slate-100 dark:border-white/5 hover:border-slate-200 dark:hover:border-white/10 transition-all duration-300 hover:shadow-sm cursor-pointer flex flex-col justify-between h-36 relative overflow-hidden group"
          >
            {/* Top row with description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal font-medium max-w-[90%]">
              {item.desc}
            </p>

            {/* Bottom row with title & icon */}
            <div className="flex items-center justify-between w-full mt-auto pt-4">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {item.title}
              </span>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 transition-transform duration-300 group-hover:scale-110 shadow-sm flex-shrink-0">
                {item.icon}
              </div>
            </div>
          </button>
        ))}
      </div>
      
    </div>
  );
};
