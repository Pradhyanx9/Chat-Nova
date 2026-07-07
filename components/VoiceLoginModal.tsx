import React, { useState } from 'react';
import { X, Mic, Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import { backend } from '../services/backend.ts';
import { User } from '../types.ts';

interface VoiceLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const VoiceLoginModal: React.FC<VoiceLoginModalProps> = ({ isOpen, onClose, onAuthSuccess }) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let result;
      if (authMode === 'signin') {
        result = await backend.login(email, password);
        if (!result) {
          setError("Invalid email or password. Please try again.");
        }
      } else {
        result = await backend.register({ 
          email, 
          password, 
          name: fullName || email.split('@')[0], 
          platform: 'email' 
        });
      }

      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onAuthSuccess(result);
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please verify your details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 overflow-y-auto">
      {/* Dark blur backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Card container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Glowing visual effect behind card */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Gradient Banner */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-purple-500" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-6 top-6 p-2 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all cursor-pointer border border-slate-100 dark:border-white/5 z-10"
        >
          <X size={16} />
        </button>

        <div className="p-6 md:p-10 flex flex-col items-center">
          
          {/* Animated Mic Logo Graphic */}
          <div className="relative mb-6">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-emerald-400 to-purple-500 rounded-full opacity-30 blur animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shadow-xl">
              <Mic size={28} className="animate-bounce-slow" />
            </div>
            {/* Pulsing rings */}
            <span className="absolute inset-0 rounded-full border border-cyan-500/30 animate-ping opacity-75" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">Unlock Voice Mode</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.15em] mt-1.5 flex items-center justify-center gap-1">
              <Sparkles size={12} className="text-cyan-500" /> Registered Account Required
            </p>
          </div>

          {success ? (
            <div className="w-full py-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-3">
                <CheckCircle size={24} />
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">Authentication Successful!</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Launching Voice companion...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full space-y-4">
              
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/50 rounded-2xl text-xs font-bold leading-relaxed">
                  {error}
                </div>
              )}

              {authMode === 'signup' && (
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required 
                    type="text"
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="Full Name" 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:border-cyan-500/50 transition-colors" 
                  />
                </div>
              )}

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  required 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="Email Address" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:border-cyan-500/50 transition-colors" 
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  required 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Password" 
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm text-slate-800 dark:text-slate-100 shadow-sm focus:border-cyan-500/50 transition-colors" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-md"
              >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : (authMode === 'signin' ? 'Sign In & Connect Voice' : 'Register & Connect Voice')}
              </button>

              <div className="text-center mt-4">
                <button 
                  type="button"
                  onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setError(null); }} 
                  className="text-xs font-black text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {authMode === 'signin' ? "Don't have an account yet? Create one" : "Already registered? Sign in here"}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
};
