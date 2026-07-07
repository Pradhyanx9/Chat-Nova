
export type Role = 'user' | 'assistant';

export interface Attachment {
  data: string; // base64
  mimeType: string;
  name: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  image?: string;
  attachments?: Attachment[];
  sources?: any[];
  suggestions?: string[];
  timestamp: number;
  senderName?: string;
  senderAvatar?: string;
}

export interface AssistantConfig {
  customName: string;
  personality: 'friendly' | 'professional' | 'sarcastic' | 'zen';
  expertise: string[];
  verbosity: number; // 0 (short) to 100 (detailed)
}

export interface ChatThemeConfig {
  presetId: string; // 'classic' | 'forest' | 'vintage' | 'cyberpunk' | 'sunset' | 'custom'
  background?: string;
  userBubble?: string;
  userText?: string;
  assistantBubble?: string;
  assistantText?: string;
  fontFamily?: 'sans' | 'serif' | 'mono' | 'rounded';
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  platform: 'google' | 'facebook' | 'apple' | 'guest' | 'email';
  cartoonCharacter?: string;
  assistantConfig?: AssistantConfig;
  chatThemeConfig?: ChatThemeConfig;
  isPremium?: boolean; // New: track premium status
  powerfulModelUsage?: number; // New: track 0-70 usage
  createdAt?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}
