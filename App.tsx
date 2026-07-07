
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { Header } from './components/Header.tsx';
import { WelcomeScreen } from './components/WelcomeScreen.tsx';
import { ChatMessage } from './components/ChatMessage.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { VoiceChatOverlay } from './components/VoiceChatOverlay.tsx';
import { Logo } from './components/Logo.tsx';
import { DeveloperModal } from './components/DeveloperModal.tsx';
import { VoiceLoginModal } from './components/VoiceLoginModal.tsx';
import { Message, User, ChatSession, Attachment, AssistantConfig, ChatThemeConfig } from './types.ts';
import { backend } from './services/backend.ts';
import { THEME_PRESETS, resolveTheme } from './themePresets.ts';
import { 
  Trash2, Settings2, Moon, Sun, ArrowRight, X, Mail, Lock, 
  User as UserIcon, Eye, EyeOff, Loader2, Crown, CheckCircle2,
  ArrowDown, AlertCircle, RefreshCcw, UserCircle, Plus, Search, Bell, BellOff
} from 'lucide-react';

const socket: Socket = io();

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(backend.getCurrentUser());
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);

  
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [imageProgress, setImageProgress] = useState<number>(0);
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  const [isVoiceLoginOpen, setIsVoiceLoginOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeveloperOpen, setIsDeveloperOpen] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('chatnova_theme') as any) || 'light');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('chatnova_notifications') !== 'false');
  const [selectedModelId, setSelectedModelId] = useState(() => localStorage.getItem('chatnova_selected_model') || 'gemini-3-flash-preview');
  const [appError, setAppError] = useState<{ message: string; type: 'error' | 'warning' } | null>(null);
  
  const [settingsTab, setSettingsTab] = useState<'account' | 'personalize' | 'theme' | 'preferences' | 'api'>('account');
  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem('chatnova_custom_api_key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [localConfig, setLocalConfig] = useState<AssistantConfig>({
    customName: 'Chat Nova', personality: 'friendly', expertise: ['General Knowledge'], verbosity: 80
  });
  const [localThemeConfig, setLocalThemeConfig] = useState<ChatThemeConfig>({
    presetId: 'classic'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter(s => 
      s.title.toLowerCase().includes(query) || 
      s.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }, [sessions, searchQuery]);

  // Sync state with Backend on load
  useEffect(() => {
    if (user) {
      const loadedSessions = backend.getSessions().filter(s => s.messages.length > 0);
      const newSession: ChatSession = { id: Date.now().toString(), title: 'New Chat', messages: [], updatedAt: Date.now() };
      setSessions([newSession, ...loadedSessions]);
      setCurrentSessionId(newSession.id);
      if (user.assistantConfig) setLocalConfig(user.assistantConfig);
      if (user.chatThemeConfig) setLocalThemeConfig(user.chatThemeConfig);
    }
  }, [user]);

  // Sync sessions to persistent store
  useEffect(() => {
    if (user && sessions.length > 0) {
      backend.saveSessions(sessions);
    }
  }, [sessions, user]);

  // Socket.io real-time collaboration
  useEffect(() => {
    if (!user || !currentSessionId) return;

    socket.emit('join_session', currentSessionId);

    const handleSessionState = (session: ChatSession) => {
      setSessions(prev => {
        const exists = prev.find(s => s.id === session.id);
        if (exists) {
          return prev.map(s => s.id === session.id ? session : s);
        }
        return [session, ...prev];
      });
    };

    const handleSessionUpdated = (session: ChatSession) => {
      setSessions(prev => prev.map(s => s.id === session.id ? session : s));
    };

    const handleUserTyping = (typingUser: User) => {
      if (typingUser.id !== user.id) {
        setTypingUsers(prev => {
          if (!prev.find(u => u.id === typingUser.id)) {
            return [...prev, typingUser];
          }
          return prev;
        });
      }
    };

    const handleUserStoppedTyping = (typingUser: User) => {
      setTypingUsers(prev => prev.filter(u => u.id !== typingUser.id));
    };

    socket.on('session_state', handleSessionState);
    socket.on('session_updated', handleSessionUpdated);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);

    return () => {
      socket.emit('leave_session', currentSessionId);
      socket.off('session_state', handleSessionState);
      socket.off('session_updated', handleSessionUpdated);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      setTypingUsers([]);
    };
  }, [currentSessionId, user]);

  useEffect(() => {
    const root = document.documentElement;
    theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem('chatnova_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chatnova_notifications', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, isLoading, isImageGenerating]);

  useEffect(() => {
    if (appError) {
      const timer = setTimeout(() => setAppError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [appError]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);
    try {
      let result;
      if (authMode === 'signin') {
        result = await backend.login(email, password);
        if (!result) setAuthError("Invalid credentials.");
      } else {
        result = await backend.register({ email, password, name: fullName, platform: 'email' });
      }
      if (result) setUser(result);
    } catch (err: any) { 
      setAuthError(err.message || "Authentication failed."); 
    } finally { 
      setIsAuthenticating(false); 
    }
  };

  const handleGuestLogin = async () => {
    setAuthError(null);
    setIsGuestLoading(true);
    try {
      const result = await backend.login('guest@chatnova.ai', 'password123');
      if (result) {
        setUser(result);
      } else {
        setAuthError("Guest account is currently unavailable.");
      }
    } catch (err: any) {
      setAuthError("Failed to initiate guest session.");
    } finally {
      setIsGuestLoading(false);
    }
  };

  const handleLogout = () => {
    backend.logout();
    setUser(null);
    setSessions([]);
    setCurrentSessionId(null);
    setIsSettingsOpen(false);
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setIsUpgrading(true);
    try {
      const updated = await backend.updateUserProfile({ isPremium: true, powerfulModelUsage: 0 });
      setUser(updated);
      setIsUpgradeOpen(false);
    } catch (e: any) {
      setAppError({ message: "Upgrade failed. Please try again.", type: 'error' });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleModelChange = async (id: string) => {
    if (id === 'gemini-3-pro-preview' && !user?.isPremium) {
      setIsUpgradeOpen(true);
      return;
    }
    setSelectedModelId(id);
    localStorage.setItem('chatnova_selected_model', id);
  };

  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!user) return;
    setAppError(null);
    
    let activeId = currentSessionId;
    let currentHistory: Message[] = [];

    // Handle new session creation locally first to ensure immediate feedback
    if (!activeId) {
      const newSession: ChatSession = { id: Date.now().toString(), title: content.slice(0, 30) || 'New Talk', messages: [], updatedAt: Date.now() };
      setSessions(prev => [newSession, ...prev]);
      activeId = newSession.id;
      setCurrentSessionId(activeId);
    } else {
      // Find current messages from state, defaulting to empty array if not found
      const session = sessions.find(s => s.id === activeId);
      if (session) {
        currentHistory = session.messages;
      }
    }

    const isImg = !attachments?.length && /(generate|create|draw|image|picture|paint|painting)/i.test(content);
    
    // Create new messages
    const uMsg: Message = { 
      id: Date.now().toString(), 
      role: 'user', 
      content, 
      attachments, 
      timestamp: Date.now(),
      senderName: user.name,
      senderAvatar: user.avatar || user.name[0]
    };
    const aId = (Date.now() + 1).toString();
    const aMsg: Message = { id: aId, role: 'assistant', content: '', timestamp: Date.now() };

    const isFirstMessage = currentHistory.length === 0;
    const newTitle = isFirstMessage ? (content.slice(0, 30) || 'New Chat') : undefined;

    // Update UI state with both messages (including the empty assistant placeholder)
    setSessions(prev => {
      const newSessions = prev.map(s => s.id === activeId ? { 
        ...s, 
        title: newTitle || s.title,
        messages: [...s.messages, uMsg, aMsg], 
        updatedAt: Date.now() 
      } : s);
      const updatedSession = newSessions.find(s => s.id === activeId);
      if (updatedSession) socket.emit('update_session', { sessionId: activeId, session: updatedSession });
      return newSessions;
    });
    
    if (isImg) {
      setIsImageGenerating(true);
      setImageProgress(0);
    }
    setIsLoading(true);

    try {
      // IMPORTANT: Pass the history + new user message directly to backend. 
      // Do NOT pass the empty assistant placeholder, and do NOT rely on the backend reading from DB/State which might be stale.
      const historyForAI = [...currentHistory, uMsg];
      const stream = backend.processMessage(historyForAI, selectedModelId);
      
      for await (const chunk of stream) {
        if (chunk.progress !== undefined) setImageProgress(chunk.progress);
        
        setSessions(prev => {
          const newSessions = prev.map(s => s.id === activeId ? {
            ...s,
            messages: s.messages.map(m => m.id === aId ? {
              ...m,
              content: chunk.text ? chunk.text.split('[SUGGESTIONS]')[0] : m.content,
              suggestions: chunk.text?.includes('[SUGGESTIONS]') ? chunk.text.split('[SUGGESTIONS]')[1].split('\n').map(x => x.replace(/^- /, '').trim()).filter(Boolean) : m.suggestions,
              image: chunk.image || m.image,
              sources: chunk.sources || m.sources
            } : m)
          } : s);
          const updatedSession = newSessions.find(s => s.id === activeId);
          if (updatedSession) socket.emit('update_session', { sessionId: activeId, session: updatedSession });
          return newSessions;
        });

        if (chunk.image) setIsImageGenerating(false);
        if (chunk.text) setIsLoading(false);
      }
    } catch (e: any) { 
      setIsLoading(false); 
      setIsImageGenerating(false);
      console.error(e);
      setAppError({ message: e.message || "Failed to generate response.", type: 'error' });
      // Remove the placeholder on error
      setSessions(prev => {
        const newSessions = prev.map(s => s.id === activeId ? { ...s, messages: s.messages.filter(m => m.id !== aId) } : s);
        const updatedSession = newSessions.find(s => s.id === activeId);
        if (updatedSession) socket.emit('update_session', { sessionId: activeId, session: updatedSession });
        return newSessions;
      });
    }
  };

  const createNewChat = () => {
    const sess: ChatSession = { id: Date.now().toString(), title: 'New Chat', messages: [], updatedAt: Date.now() };
    setSessions(p => [sess, ...p]);
    setCurrentSessionId(sess.id);
    setIsSidebarOpen(false);
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(ts));
  };

  const currentSession = useMemo(() => sessions.find(s => s.id === currentSessionId), [sessions, currentSessionId]);
  const messages = currentSession?.messages || [];

  if (isAppLoading) return <SplashScreen onComplete={() => setIsAppLoading(false)} />;

  if (!user) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-950 flex items-center justify-center p-4 z-[100] bg-aurora">
        <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-700">
          <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-3xl border border-white/20 dark:border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl flex flex-col items-center">
            <div className="mb-10"><Logo size="lg" loading={isAuthenticating || isGuestLoading} hideText={isAuthenticating || isGuestLoading} /></div>
            <div className="w-full text-center mb-10">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{authMode === 'signin' ? 'Welcome Back' : 'Join Chat Nova'}</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Next-Gen Intelligence</p>
            </div>
            {authError && <div className="w-full mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold border border-red-100">{authError}</div>}
            <form onSubmit={handleAuth} className="w-full space-y-4">
              {authMode === 'signup' && (
                <div className="relative group">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Full Name" className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold shadow-sm" />
                </div>
              )}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" className="w-full pl-12 pr-4 py-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold shadow-sm" />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full pl-12 pr-12 py-4 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold shadow-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              <button type="submit" disabled={isAuthenticating || isGuestLoading} className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                {isAuthenticating ? <Loader2 size={20} className="animate-spin" /> : (authMode === 'signin' ? 'Sign In' : 'Create Account')}
                {!isAuthenticating && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="w-full mt-4 flex flex-col gap-4">
              <div className="relative py-2 flex items-center gap-4">
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              </div>

              <button 
                onClick={handleGuestLogin} 
                disabled={isAuthenticating || isGuestLoading}
                className="w-full py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-[0.98]"
              >
                {isGuestLoading ? <Loader2 size={18} className="animate-spin text-cyan-600" /> : <UserCircle size={18} className="text-cyan-600" />}
                Continue as Guest
              </button>
            </div>

            <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); }} className="mt-8 text-sm font-black text-cyan-600 hover:text-cyan-700 transition-colors">
              {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentChatTheme = resolveTheme(user?.chatThemeConfig, theme === 'dark');

  const appLayout = (
    <div className="flex h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-20 z-0 bg-aurora" />
      
      {appError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-3xl shadow-2xl flex items-center gap-4 border backdrop-blur-xl ${
            appError.type === 'error' ? 'bg-red-50/90 dark:bg-red-950/90 border-red-100 dark:border-red-900/30 text-red-600' : 'bg-amber-50/90 dark:bg-amber-950/90 border-amber-100 text-amber-600'
          }`}>
            <AlertCircle size={20} className="flex-shrink-0" />
            <p className="flex-1 text-[13px] font-bold leading-tight">{appError.message}</p>
            <button onClick={() => setAppError(null)}><X size={16} /></button>
          </div>
        </div>
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-r sidebar-transition lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full p-4 pt-10 md:pt-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2"><Logo size="sm" /><span className="font-black tracking-tight">Chat Nova</span></div>
            <button onClick={()=>setIsSidebarOpen(false)} className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={18}/></button>
          </div>
          
          <button onClick={createNewChat} className="w-full bg-cyan-600 text-white p-4 rounded-2xl font-black mb-6 shadow-lg shadow-cyan-600/10 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Plus size={18} />
            New Conversation
          </button>

          <div className="mb-6 px-1">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-slate-50/80 dark:bg-slate-850/40 backdrop-blur-md border border-slate-100/80 dark:border-white/5 rounded-2xl transition-all duration-300 group-hover:border-slate-200 dark:group-hover:border-white/10 focus-within:border-cyan-500/50 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.1)]">
                <Search className="absolute left-3.5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" size={15} />
                <input 
                  type="text" 
                  placeholder="Search chats..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-9 py-3 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-colors"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 p-1 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all active:scale-90"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
            <div className="px-2 mb-2"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Recent Chats</span></div>
            {filteredSessions.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-slate-400 font-medium">No chats found</div>
            ) : (
              filteredSessions.map(s => (
                <div key={s.id} onClick={() => { setCurrentSessionId(s.id); setIsSidebarOpen(false); }} className={`group p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all ${currentSessionId === s.id ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <div className="flex flex-col min-w-0 flex-1 pr-2">
                    <span className="truncate text-sm font-bold">{s.title === 'New Chat' && s.messages.length === 0 ? 'New Chat' : s.title}</span>
                    <span className={`text-[10px] font-medium mt-0.5 ${currentSessionId === s.id ? 'text-cyan-600/70' : 'text-slate-400'}`}>{formatDate(s.updatedAt)}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setSessions(p => p.filter(x => x.id !== s.id)); if (currentSessionId === s.id) setCurrentSessionId(null); }} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 flex-shrink-0">
                    <Trash2 size={12}/>
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="w-full p-3 mb-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between font-bold text-sm">
              <div className="flex items-center gap-2">
                {theme === 'light' ? <Sun size={16}/> : <Moon size={16}/>}
                <span>{theme === 'light' ? 'Light Appearance' : 'Dark Appearance'}</span>
              </div>
            </button>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center font-black text-white dark:text-slate-900">{user.avatar || user.name[0]}</div>
               <div className="flex-1 overflow-hidden font-black truncate text-sm">{user.name}</div>
               <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Settings2 size={18}/></button>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <Header 
          onToggleSidebar={() => setIsSidebarOpen(true)} 
          onVoiceChat={() => {
            if (user?.platform === 'guest') {
              setIsVoiceLoginOpen(true);
            } else {
              setIsVoiceModeActive(true);
            }
          }} 
          selectedModelId={selectedModelId} 
          onModelChange={handleModelChange} 
          user={user} 
          onUpgradeRequest={() => setIsUpgradeOpen(true)}
          onDeveloperClick={() => setIsDeveloperOpen(true)}
        />
        <main className="flex-1 overflow-y-auto no-scrollbar pt-20 transition-all duration-300" style={!currentChatTheme.isClassicPreset ? { backgroundColor: currentChatTheme.background } : undefined}>
          <div className="max-w-4xl mx-auto px-4 md:px-8 pb-40">
            {messages.length === 0 ? <WelcomeScreen userName={user.name} onSuggestionClick={handleSendMessage} cartoonCharacter={user.assistantConfig?.customName || user.cartoonCharacter} /> : (
              <div className="space-y-6">
                {messages.filter(m => !(m.role === 'assistant' && m.content === '' && !m.image)).map((m, idx, filtered) => (
                  <ChatMessage 
                    key={m.id} 
                    message={m} 
                    onSuggestionClick={handleSendMessage} 
                    cartoonCharacter={user.assistantConfig?.customName || user.cartoonCharacter} 
                    isGenerating={isLoading && !isImageGenerating && m.id === messages[messages.length - 1]?.id && m.role === 'assistant'}
                    themeConfig={user?.chatThemeConfig}
                    isDarkMode={theme === 'dark'}
                  />
                ))}
                {isImageGenerating && (
                  <div className="flex flex-col gap-3 w-full max-w-[92%] sm:max-w-[75%] animate-in fade-in slide-in-from-bottom-4">
                    <div className="relative w-full aspect-square max-w-[400px] rounded-[2rem] overflow-hidden bg-gradient-to-br from-slate-50 to-cyan-50 dark:from-slate-800 dark:to-slate-900 animate-pulse border border-slate-100 dark:border-white/5">
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <span className="text-5xl font-black text-cyan-600/40">{imageProgress}%</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synthesizing...</span>
                      </div>
                    </div>
                  </div>
                )}
                {messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === '' && !messages[messages.length - 1]?.image && (
                  <div className="flex justify-start py-2 animate-in fade-in slide-in-from-bottom-2">
                    <div 
                      style={!currentChatTheme.isClassicPreset ? { backgroundColor: currentChatTheme.assistantBubble, color: currentChatTheme.assistantText, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'}` } : undefined}
                      className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] px-6 py-4 flex items-center gap-4 shadow-sm animate-pulse"
                    >
                      <div className="flex gap-1 animate-pulse">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"/>
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-75"/>
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-150"/>
                      </div>
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 italic">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
            
            {typingUsers.length > 0 && (
              <div className="flex justify-start py-2 animate-in fade-in slide-in-from-bottom-2 mt-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-[2rem] px-6 py-4 flex items-center gap-4 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce"/>
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-75"/>
                    <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-150"/>
                  </div>
                  <span className="text-[11px] font-black text-slate-500 italic">
                    {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              </div>
            )}
          </div>
        </main>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-slate-950 to-transparent pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading || isImageGenerating} 
              onVoiceChat={() => setIsVoiceModeActive(true)}
              onTyping={() => {
                if (currentSessionId && user) {
                  socket.emit('typing', { sessionId: currentSessionId, user });
                }
              }}
              onStopTyping={() => {
                if (currentSessionId && user) {
                  socket.emit('stop_typing', { sessionId: currentSessionId, user });
                }
              }}
            />
          </div>
        </div>
      </div>

      {isVoiceModeActive && <VoiceChatOverlay onClose={() => setIsVoiceModeActive(false)} userName={user.name} user={user} />}

      <DeveloperModal isOpen={isDeveloperOpen} onClose={() => setIsDeveloperOpen(false)} />

      <VoiceLoginModal 
        isOpen={isVoiceLoginOpen} 
        onClose={() => setIsVoiceLoginOpen(false)} 
        onAuthSuccess={(newUser) => { 
          setUser(newUser); 
          setIsVoiceModeActive(true); 
        }} 
      />

      {isUpgradeOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => !isUpgrading && setIsUpgradeOpen(false)}/>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] p-8 md:p-12 border shadow-2xl animate-in zoom-in-95 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-3xl flex items-center justify-center mb-6 text-purple-600"><Crown size={40} /></div>
             <h2 className="text-2xl md:text-3xl font-black mb-3 text-slate-900 dark:text-white">Upgrade to Pro</h2>
             <p className="text-sm text-slate-500 font-medium mb-8">Unlock the full power of Chat Nova with advanced reasoning and real-time grounding.</p>
             <button onClick={handleUpgrade} disabled={isUpgrading} className="w-full py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-purple-500/20">
               {isUpgrading ? <Loader2 size={24} className="animate-spin" /> : 'Unlock Pro - $19.99/mo'}
             </button>
             <button onClick={()=>setIsUpgradeOpen(false)} className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Maybe Later</button>
          </div>
        </div>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}/>
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 border border-slate-100 dark:border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center gap-1.5 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
               {[
                 { id: 'account', label: 'Account' },
                 { id: 'personalize', label: 'Personalize' },
                 { id: 'theme', label: 'Chat Theme' },
                 { id: 'api', label: 'API Key' },
                 { id: 'preferences', label: 'Preferences' }
               ].map(t => (
                 <button 
                   key={t.id} 
                   onClick={() => setSettingsTab(t.id as any)} 
                   className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${
                     settingsTab === t.id 
                       ? 'bg-cyan-600 text-white shadow-sm' 
                       : 'text-slate-400 hover:text-slate-650'
                   }`}
                 >
                   {t.label}
                 </button>
               ))}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
              {settingsTab === 'account' ? (
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-black text-xl">{user.avatar || user.name[0]}</div>
                    <div className="min-w-0">
                      <span className="text-lg font-black block leading-tight truncate text-slate-900 dark:text-white">{user.name}</span>
                      <span className="text-xs text-slate-500 truncate block">{user.email}</span>
                    </div>
                    {user.isPremium && <div className="ml-auto text-amber-600"><Crown size={20}/></div>}
                  </div>
                  <button onClick={handleLogout} className="w-full p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-black">Sign Out</button>
                </div>
              ) : settingsTab === 'personalize' ? (
                <div className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Assistant Name</label>
                     <input value={localConfig.customName} onChange={e => setLocalConfig({ ...localConfig, customName: e.target.value })} placeholder="Assistant Name" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-white/5 rounded-2xl font-bold outline-none" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Personality</label>
                     <div className="grid grid-cols-2 gap-2">
                        {['friendly', 'professional', 'sarcastic', 'zen'].map(p => (
                          <button key={p} onClick={() => setLocalConfig({ ...localConfig, personality: p as any })} className={`p-3 rounded-xl border dark:border-white/5 text-[10px] font-black uppercase transition-all ${localConfig.personality === p ? 'bg-cyan-600 text-white border-cyan-600 shadow-lg' : 'text-slate-500'}`}>{p}</button>
                        ))}
                     </div>
                   </div>
                </div>
              ) : settingsTab === 'theme' ? (
                <div className="space-y-6">
                  {/* Preset Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Select a Theme Preset</label>
                    <div className="grid grid-cols-2 gap-2">
                      {THEME_PRESETS.map(p => {
                        const isActive = localThemeConfig.presetId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setLocalThemeConfig({
                                presetId: p.id,
                                background: p.background,
                                userBubble: p.userBubble,
                                userText: p.userText,
                                assistantBubble: theme === 'dark' ? p.assistantBubbleDark : p.assistantBubble,
                                assistantText: theme === 'dark' ? p.assistantTextDark : p.assistantText,
                                fontFamily: p.fontFamily
                              });
                            }}
                            className={`p-3 rounded-xl border dark:border-white/5 text-[10px] font-black uppercase transition-all flex items-center justify-between ${
                              isActive 
                                ? 'bg-cyan-600 text-white border-cyan-600 shadow-lg' 
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-750'
                            }`}
                          >
                            <span>{p.name}</span>
                            <div className="flex gap-1">
                              <div className="w-3.5 h-3.5 rounded-full border border-white/20" style={{ backgroundColor: p.userBubble }} />
                              <div className="w-3.5 h-3.5 rounded-full border border-white/20 animate-pulse" style={{ backgroundColor: p.background }} />
                            </div>
                          </button>
                        );
                      })}
                      
                      {/* Custom Theme selection option */}
                      <button
                        type="button"
                        onClick={() => {
                          setLocalThemeConfig(prev => ({
                            ...prev,
                            presetId: 'custom',
                            background: prev.background || (theme === 'dark' ? '#090d16' : '#f8fafc'),
                            userBubble: prev.userBubble || '#0891b2',
                            userText: prev.userText || '#ffffff',
                            assistantBubble: prev.assistantBubble || (theme === 'dark' ? '#1e293b' : '#ffffff'),
                            assistantText: prev.assistantText || (theme === 'dark' ? '#f1f5f9' : '#1e293b'),
                            fontFamily: prev.fontFamily || 'sans'
                          }));
                        }}
                        className={`p-3 rounded-xl border dark:border-white/5 text-[10px] font-black uppercase transition-all flex items-center justify-between col-span-2 ${
                          localThemeConfig.presetId === 'custom'
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-lg'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-750'
                        }`}
                      >
                        <span>🎨 Custom Theme Creator (Pick Colors)</span>
                        {localThemeConfig.presetId === 'custom' && <CheckCircle2 size={14} className="text-white" />}
                      </button>
                    </div>
                  </div>

                  {/* Individual custom configuration overrides */}
                  {localThemeConfig.presetId === 'custom' && (
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Chat Background</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={localThemeConfig.background || '#ffffff'} 
                              onChange={e => setLocalThemeConfig({ ...localThemeConfig, background: e.target.value })}
                              className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                            />
                            <span className="text-xs font-mono font-bold uppercase">{localThemeConfig.background}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Font Family</label>
                          <select 
                            value={localThemeConfig.fontFamily || 'sans'} 
                            onChange={e => setLocalThemeConfig({ ...localThemeConfig, fontFamily: e.target.value as any })}
                            className="bg-white dark:bg-slate-800 border dark:border-white/5 rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                          >
                            <option value="sans">Sans-serif (Modern)</option>
                            <option value="serif">Serif (Editorial)</option>
                            <option value="mono">Monospace (Technical)</option>
                            <option value="rounded">Rounded (Comfortable)</option>
                          </select>
                        </div>
                      </div>

                      <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">User Bubbles</span>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-[10px] font-bold text-slate-500">Bubble Bg</span>
                              <input 
                                type="color" 
                                value={localThemeConfig.userBubble || '#0891b2'} 
                                onChange={e => setLocalThemeConfig({ ...localThemeConfig, userBubble: e.target.value })}
                                className="w-7 h-7 rounded cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-[10px] font-bold text-slate-500">Text Color</span>
                              <input 
                                type="color" 
                                value={localThemeConfig.userText || '#ffffff'} 
                                onChange={e => setLocalThemeConfig({ ...localThemeConfig, userText: e.target.value })}
                                className="w-7 h-7 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 border-l pl-4 border-slate-200 dark:border-slate-800">
                          <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">AI Bubbles</span>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-[10px] font-bold text-slate-500">Bubble Bg</span>
                              <input 
                                type="color" 
                                value={localThemeConfig.assistantBubble || '#ffffff'} 
                                onChange={e => setLocalThemeConfig({ ...localThemeConfig, assistantBubble: e.target.value })}
                                className="w-7 h-7 rounded cursor-pointer"
                              />
                            </div>
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-[10px] font-bold text-slate-500">Text Color</span>
                              <input 
                                type="color" 
                                value={localThemeConfig.assistantText || '#111827'} 
                                onChange={e => setLocalThemeConfig({ ...localThemeConfig, assistantText: e.target.value })}
                                className="w-7 h-7 rounded cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Cute preview pane inside settings */}
                      <div className="mt-4 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 flex flex-col gap-2">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Live Preview</span>
                        <div className="rounded-lg p-3 flex flex-col gap-2 text-xs" style={{ backgroundColor: localThemeConfig.background }}>
                          <div className="self-end px-3 py-1.5 rounded-[1rem] rounded-tr-none font-bold" style={{ backgroundColor: localThemeConfig.userBubble, color: localThemeConfig.userText, fontFamily: localThemeConfig.fontFamily === 'serif' ? 'Georgia, serif' : localThemeConfig.fontFamily === 'mono' ? 'monospace' : 'sans-serif' }}>
                            Hey there! Look at my styling...
                          </div>
                          <div className="self-start px-3 py-1.5 rounded-[1rem] rounded-tl-none font-bold shadow-sm" style={{ backgroundColor: localThemeConfig.assistantBubble, color: localThemeConfig.assistantText, fontFamily: localThemeConfig.fontFamily === 'serif' ? 'Georgia, serif' : localThemeConfig.fontFamily === 'mono' ? 'monospace' : 'sans-serif' }}>
                            Super cool! Let's build together.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Preloaded theme sample preview if not custom */}
                  {localThemeConfig.presetId !== 'custom' && (
                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-3">
                      <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Preset Details & Preview</span>
                      <div className="rounded-xl p-4 flex flex-col gap-2 text-xs" style={{ backgroundColor: resolveTheme(localThemeConfig, theme === 'dark').background }}>
                        <div className="self-end px-3 py-1.5 rounded-[1rem] rounded-tr-none font-semibold shadow-sm" style={{ backgroundColor: resolveTheme(localThemeConfig, theme === 'dark').userBubble, color: resolveTheme(localThemeConfig, theme === 'dark').userText, fontFamily: localThemeConfig.fontFamily === 'serif' ? 'Georgia, serif' : localThemeConfig.fontFamily === 'mono' ? 'monospace' : 'sans-serif' }}>
                          Let's try out {THEME_PRESETS.find(p => p.id === localThemeConfig.presetId)?.name}!
                        </div>
                        <div className="self-start px-3 py-1.5 rounded-[1rem] rounded-tl-none font-semibold shadow-sm" style={{ backgroundColor: resolveTheme(localThemeConfig, theme === 'dark').assistantBubble, color: resolveTheme(localThemeConfig, theme === 'dark').assistantText, fontFamily: localThemeConfig.fontFamily === 'serif' ? 'Georgia, serif' : localThemeConfig.fontFamily === 'mono' ? 'monospace' : 'sans-serif' }}>
                          Perfect, this looks beautiful! Ready to chat.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : settingsTab === 'api' ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block">Custom Gemini API Key</label>
                    <div className="relative">
                      <input 
                        type={showApiKey ? "text" : "password"}
                        value={localApiKey} 
                        onChange={e => setLocalApiKey(e.target.value)} 
                        placeholder="AI Studio API Key (AI_KEY_... or GEMINI_...)" 
                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-white/5 rounded-2xl font-bold outline-none pr-12 text-xs" 
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
                      >
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 space-y-2 leading-relaxed font-semibold">
                    <p>💡 Running on GitHub Pages or static hosting? No problem! Save your Gemini API key here, and the chatbot will connect directly from your browser with no server required.</p>
                    <p>🔒 Your API Key is stored safely in your browser's local storage and is never sent to any secondary server.</p>
                    <p>⚡ If no key is entered, Chat Nova automatically runs our high-performance Smart Offline Chatbot Simulator so the interface remains fully interactive!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block">Appearance</label>
                    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-700">
                      <div className="flex items-center gap-3">
                        {theme === 'light' ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-cyan-500" />}
                        <span>{theme === 'light' ? 'Light Theme' : 'Dark Theme'}</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-cyan-500' : 'bg-slate-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block">Notifications</label>
                    <button onClick={() => setNotificationsEnabled(!notificationsEnabled)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border dark:border-white/5 rounded-2xl flex items-center justify-between font-bold text-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-700">
                      <div className="flex items-center gap-3">
                        {notificationsEnabled ? <Bell size={18} className="text-cyan-500" /> : <BellOff size={18} className="text-slate-400" />}
                        <span>Push Notifications</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${notificationsEnabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    </button>
                    <p className="text-xs text-slate-500 px-2 leading-relaxed">
                      Receive notifications when long-running tasks like image generation or complex reasoning are complete.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3">
              <button onClick={async () => { 
                const updated = await backend.updateUserProfile({ 
                  assistantConfig: localConfig,
                  chatThemeConfig: localThemeConfig
                }); 
                setUser(updated); 
                localStorage.setItem('chatnova_custom_api_key', localApiKey);
                setIsSettingsOpen(false); 
              }} className="flex-1 py-4 bg-cyan-600 text-white rounded-2xl font-black shadow-lg shadow-cyan-600/10 active:scale-95 transition-all">Save Changes</button>
              <button onClick={() => setIsSettingsOpen(false)} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black active:scale-95 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return appLayout;
};

export default App;
