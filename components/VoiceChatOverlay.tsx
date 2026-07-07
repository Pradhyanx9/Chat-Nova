
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { X, Mic, MicOff, Volume2, AlertCircle, RefreshCcw, Play, Waves } from 'lucide-react';
import { Logo } from './Logo.tsx';
import { AIFace } from './AIFace.tsx';
import { getSystemInstruction, createBlob, decode, decodeAudioData } from '../services/gemini.ts';
import { Message, User } from '../types.ts';

interface VoiceChatOverlayProps {
  onClose: () => void;
  userName: string;
  user?: User;
  cartoonCharacter?: string;
  chatContext?: Message[];
}

export const VoiceChatOverlay: React.FC<VoiceChatOverlayProps> = ({ onClose, userName, user, cartoonCharacter, chatContext = [] }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [voiceIntensity, setVoiceIntensity] = useState(0);
  const [status, setStatus] = useState("Ready to join");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        try { sessionRef.current.close(); } catch (e) {}
      }
      sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      sourcesRef.current.clear();
      if (inputAudioCtxRef.current) {
        try { inputAudioCtxRef.current.close(); } catch (e) {}
      }
      if (outputAudioCtxRef.current) {
        try { outputAudioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  const handleSelectKey = async () => {
    const aistudio = (window as any).aistudio;
    if (aistudio && aistudio.openSelectKey) {
      await aistudio.openSelectKey();
      setNeedsApiKey(false);
      startSession(true);
    }
  };

  const startSession = async (skipKeyCheck = false) => {
    if (isConnecting || isActive) return;
    setIsConnecting(true);
    setErrorStatus(null);
    setStatus("Connecting...");

    try {
      const aistudio = (window as any).aistudio;
      if (!skipKeyCheck && aistudio && aistudio.hasSelectedApiKey) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setNeedsApiKey(true);
          setIsConnecting(false);
          setStatus("API Key Required");
          return;
        }
      }

      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await inputAudioCtxRef.current.resume();
      await outputAudioCtxRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const micSource = inputAudioCtxRef.current.createMediaStreamSource(stream);

      const ai = new GoogleGenAI({ apiKey });
      const personaInstruction = getSystemInstruction(user) + (cartoonCharacter ? `\n\nACTING ROLE: You are ${cartoonCharacter}.` : "");

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            setStatus(cartoonCharacter ? `Calling ${cartoonCharacter}` : "Nova Live");
            if (inputAudioCtxRef.current) {
              const scriptProcessor = inputAudioCtxRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const energy = inputData.reduce((acc, v) => acc + Math.abs(v), 0) / inputData.length;
                setIsUserSpeaking(energy > 0.01);
                setVoiceIntensity(energy * 5);
                sessionPromise.then(s => s?.sendRealtimeInput({ media: createBlob(inputData) }));
              };
              micSource.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioCtxRef.current.destination);
            }
          },
          onmessage: async (message: any) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioCtxRef.current) {
              setIsModelSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtxRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioCtxRef.current, 24000, 1);
              const source = outputAudioCtxRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioCtxRef.current.destination);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
            
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) {}
              });
              sourcesRef.current.clear();
              setIsModelSpeaking(false);
              if (outputAudioCtxRef.current) {
                nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
              }
            }
          },
          onerror: (e: any) => {
            const msg = e.message || "Connection lost";
            if (msg.includes("Requested entity was not found")) {
              setNeedsApiKey(true);
              setIsActive(false);
              setIsConnecting(false);
              setStatus("API Key Required");
            } else {
              setErrorStatus(msg);
              setIsConnecting(false);
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          systemInstruction: personaInstruction + "\nKeep responses extremely brief for speed.",
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      setErrorStatus(err.message || "Failed to access mic");
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-slate-950 flex flex-col items-center justify-between p-6 animate-in fade-in overflow-hidden">
      <div className="w-full flex justify-between items-center z-50">
        <div className="flex items-center gap-3">
          <Logo size="xs" hideText />
          <div>
            <h3 className="font-black text-sm">{cartoonCharacter || "Voice Chat"}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500">{status}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-slate-900 rounded-full"><X size={20} /></button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {needsApiKey ? (
          <div className="text-center space-y-6 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-cyan-600" />
            </div>
            <h2 className="text-2xl font-black">API Key Required</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">
              Live Voice requires a paid Google Cloud API key. Please select one to continue.
              <br/><br/>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline">Learn more about billing</a>
            </p>
            <button onClick={handleSelectKey} className="px-8 py-4 bg-cyan-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all w-full max-w-xs">
              Select API Key
            </button>
            <button onClick={onClose} className="block mx-auto mt-4 text-xs font-bold text-slate-400 hover:text-slate-600">
              Cancel
            </button>
          </div>
        ) : !isActive ? (
          <div className="text-center space-y-6">
            <button onClick={() => startSession()} disabled={isConnecting} className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center border-2 border-cyan-500/20 active:scale-95 transition-all disabled:opacity-50 mx-auto">
              {isConnecting ? <RefreshCcw size={32} className="text-cyan-600 animate-spin" /> : <Play size={32} className="text-cyan-600 ml-1" />}
            </button>
            <h2 className="text-xl font-black">Chat Nova Live Voice</h2>
            {errorStatus && <p className="text-xs text-red-500 font-bold max-w-xs mx-auto">{errorStatus}</p>}
          </div>
        ) : (
          <div className="w-64 h-64">
            <AIFace isSpeaking={isModelSpeaking} isListening={isUserSpeaking} intensity={voiceIntensity} />
          </div>
        )}
      </div>

      {isActive && (
        <button onClick={onClose} className="px-12 py-4 bg-red-600 text-white font-black rounded-full shadow-2xl active:scale-95 transition-all">End Session</button>
      )}
    </div>
  );
};
