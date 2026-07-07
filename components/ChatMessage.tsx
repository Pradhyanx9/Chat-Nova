import React, { useState, useEffect, useRef } from 'react';
import { Message, ChatThemeConfig } from '../types.ts';
import { Copy, Check, Maximize2, Download, FileText, Sparkles, User as UserIcon } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onEdit?: (id: string, newContent: string) => void;
  onSuggestionClick?: (suggestion: string) => void;
  cartoonCharacter?: string;
  isGenerating?: boolean;
  themeConfig?: ChatThemeConfig;
  isDarkMode?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onEdit, 
  onSuggestionClick, 
  cartoonCharacter, 
  isGenerating,
  isDarkMode = false
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [displayedText, setDisplayedText] = useState(message.content);
  const fullTextRef = useRef(message.content);

  useEffect(() => {
    fullTextRef.current = message.content;
    if (isUser) {
      setDisplayedText(message.content);
    }
  }, [message.content, isUser]);

  useEffect(() => {
    if (isUser) return;

    const interval = setInterval(() => {
      setDisplayedText(current => {
        const fullText = fullTextRef.current;
        const diff = fullText.length - current.length;
        
        if (diff > 0) {
          const charsToAdd = diff > 200 ? 8 : diff > 100 ? 4 : diff > 50 ? 2 : 1;
          return fullText.slice(0, current.length + charsToAdd);
        } else if (diff < 0) {
          return fullText;
        } else if (!isGenerating) {
          clearInterval(interval);
          return fullText;
        }
        return current;
      });
    }, 20);

    return () => clearInterval(interval);
  }, [isGenerating, isUser]);

  const isTyping = isGenerating || displayedText.length < message.content.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `ChatNova_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={`flex w-full py-6 md:py-8 ${isUser ? 'justify-end' : 'justify-start'} border-b border-slate-50 dark:border-white/[0.03] last:border-0 transition-colors`}>
      <div className="w-full max-w-3xl mx-auto flex gap-4 md:gap-6 px-4">
        
        {/* Avatar Section (Left-aligned like Gemini) */}
        <div className="flex-shrink-0">
          {!isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm">
              <Sparkles size={15} className="animate-pulse" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-semibold uppercase border border-slate-200/50 dark:border-white/10">
              {message.senderName ? message.senderName.substring(0, 2).toUpperCase() : <UserIcon size={14} />}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 flex flex-col">
          
          {/* Header Name */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 tracking-tight">
              {isUser ? (message.senderName || "You") : (cartoonCharacter || "Chat Nova")}
            </span>
            
            {/* Copy button only visible on hover */}
            <div className="opacity-0 group-hover:opacity-100 md:opacity-100 flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                title="Copy message"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          {/* Actual text message (Aesthetic Gemini Typography: high line height, sans-serif, deep slate colors) */}
          <div className="text-slate-800 dark:text-slate-200 text-sm md:text-[15px] leading-relaxed font-normal mt-1 tracking-normal break-words whitespace-pre-wrap">
            {isUser ? message.content : displayedText}
            {!isUser && isTyping && (
              <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-500 rounded-sm animate-pulse align-middle" />
            )}
          </div>

          {/* Attachments rendering */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {message.attachments.map((att, idx) => {
                const isImage = att.mimeType.startsWith('image/');
                return (
                  <div 
                    key={idx} 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400"
                  >
                    {isImage ? (
                      <div className="w-5 h-5 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex-shrink-0">
                        <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <FileText size={12} className="text-blue-500" />
                    )}
                    <span className="truncate max-w-[120px]">{att.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* AI generated image display */}
          {message.image && (
            <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-white/5 bg-slate-100 dark:bg-slate-900 mt-4 group/img max-w-lg shadow-sm">
              <img src={message.image} alt="Generated visual asset" className="w-full h-auto object-cover max-h-[450px]" referrerPolicy="no-referrer" />
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <button 
                  onClick={() => handleDownload(message.image!)} 
                  className="p-2 bg-slate-950/80 backdrop-blur-md rounded-xl text-white hover:bg-slate-900 border border-white/10 transition-all shadow-md"
                  title="Download Image"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Suggested prompts buttons */}
          {!isUser && message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, idx) => (
                <button 
                  key={idx} 
                  onClick={() => onSuggestionClick?.(suggestion)} 
                  className="px-4 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/50 dark:hover:bg-slate-900/90 border border-slate-100 dark:border-white/5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
