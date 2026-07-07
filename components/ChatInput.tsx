import React, { useState, useRef, useEffect } from 'react';
import { SendHorizonal, Mic, Paperclip, X, Sparkles, StopCircle, Palette, FileText } from 'lucide-react';
import { Attachment } from '../types.ts';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
  onVoiceChat?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  onTyping, 
  onStopTyping,
  onVoiceChat 
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    if (onTyping) {
      onTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (onStopTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping();
      }, 1000);
    }
  };

  const handleSend = () => {
    if ((input.trim() || attachments.length > 0) && !isLoading) {
      let finalContent = input;
      if (isDrawingMode && !input.toLowerCase().includes('generate')) {
        finalContent = `Generate an image of ${input}`;
      }
      onSendMessage(finalContent, attachments);
      setInput('');
      setAttachments([]);
      setIsDrawingMode(false);
      if (onStopTyping) onStopTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files) as File[];
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const resultStr = reader.result as string;
          const commaIndex = resultStr.indexOf(',');
          const base64Data = commaIndex > -1 ? resultStr.substring(commaIndex + 1) : resultStr;

          const newAttachment: Attachment = {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            data: base64Data
          };
          setAttachments(prev => [...prev, newAttachment]);
        };
        reader.readAsDataURL(file);
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const hasContent = !!(input.trim() || attachments.length > 0);

  return (
    <div className="relative w-full max-w-2xl mx-auto px-4 pb-4 md:pb-6">
      
      {/* Capsule Prompt container */}
      <div className={`relative flex flex-col w-full bg-slate-50 dark:bg-slate-900 border transition-all duration-300 rounded-[2rem] overflow-hidden
        ${isDrawingMode 
          ? 'border-blue-500/50 shadow-[0_4px_24px_rgba(59,130,246,0.15)]' 
          : 'border-slate-200/80 dark:border-white/10 focus-within:border-slate-300 dark:focus-within:border-slate-700 focus-within:bg-white dark:focus-within:bg-slate-950 focus-within:shadow-sm'
        }
      `}>
        
        {/* Draw mode active label */}
        {isDrawingMode && (
          <div className="px-5 pt-3 flex items-center gap-1.5 animate-in fade-in duration-300">
            <Palette size={12} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Image Synthesizer Enabled</span>
          </div>
        )}

        {/* Selected attachments previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-5 pt-4 pb-1 max-h-24 overflow-y-auto no-scrollbar animate-in slide-in-from-top-2 duration-200">
            {attachments.map((att, idx) => {
              const isImage = att.mimeType.startsWith('image/');
              return (
                <div 
                  key={idx} 
                  className="relative group flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 pl-2 pr-7 py-1 rounded-xl text-xs font-bold shadow-sm"
                >
                  {isImage ? (
                    <div className="w-5 h-5 rounded overflow-hidden border border-slate-200 dark:border-slate-700 flex-shrink-0">
                      <img src={`data:${att.mimeType};base64,${att.data}`} alt="Attachment" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <FileText size={12} className="text-blue-500 flex-shrink-0" />
                  )}
                  <span className="truncate max-w-[120px] text-[10px] font-bold text-slate-600 dark:text-slate-300">{att.name}</span>
                  <button 
                    onClick={() => setAttachments(p => p.filter((_, i) => i !== idx))} 
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-red-500 rounded-full transition-all"
                  >
                    <X size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Interactive Text & Control Panel */}
        <div className="flex items-end gap-2 px-4 py-2">
          
          {/* Paperclip attach trigger button */}
          <div className="flex items-center self-end pb-1.5 flex-shrink-0">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*,application/pdf,text/*"
              multiple
            />
            <button 
              onClick={triggerFileInput}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-all duration-200 cursor-pointer"
              title="Upload files"
            >
              <Paperclip size={18} />
            </button>
          </div>

          {/* Text Input area */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={onKeyDown}
              placeholder={isDrawingMode ? "Describe the image you want to create..." : "Enter a prompt here"}
              className="w-full max-h-32 min-h-[44px] py-2.5 bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 no-scrollbar"
              rows={1}
            />
          </div>

          {/* Buttons on the right */}
          <div className="flex items-center gap-1 self-end pb-1.5 flex-shrink-0">
            
            {/* Dictation voice input */}
            {onVoiceChat && (
              <button 
                onClick={onVoiceChat}
                className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-all duration-200 cursor-pointer"
                title="Use microphone"
              >
                <Mic size={18} />
              </button>
            )}

            {/* Synthesizer mode toggle button */}
            <button 
              onClick={() => setIsDrawingMode(!isDrawingMode)} 
              className={`p-2.5 rounded-full transition-all duration-200 cursor-pointer
                ${isDrawingMode 
                  ? 'bg-blue-500/10 text-blue-500 dark:text-blue-400' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-blue-500 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                }`}
              title="Generate Images with Spark"
            >
              <Sparkles size={18} />
            </button>

            {/* Send button (grows tactilely when content is ready to dispatch) */}
            <button 
              onClick={handleSend} 
              disabled={isLoading || !hasContent} 
              className={`p-2.5 rounded-full transition-all duration-200 flex items-center justify-center
                ${hasContent && !isLoading
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm hover:scale-105 active:scale-95 cursor-pointer' 
                  : 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                }`}
            >
              {isLoading ? (
                <StopCircle size={18} className="animate-spin text-blue-500" />
              ) : (
                <SendHorizonal size={18} />
              )}
            </button>

          </div>

        </div>

      </div>

      <p className="text-[10px] text-center mt-2 text-slate-400 dark:text-slate-500 font-medium select-none tracking-normal">
        Chat Nova can make mistakes. Verify important info.
      </p>
    </div>
  );
};
