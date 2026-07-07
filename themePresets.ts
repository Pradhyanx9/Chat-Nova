import { ChatThemeConfig } from './types.ts';

export interface ThemePreset {
  id: string;
  name: string;
  background: string;       // Tailwind background class or solid color hex
  backgroundDark: string;   // For dark mode
  userBubble: string;       // Hex
  userText: string;         // Hex
  assistantBubble: string;  // Hex
  assistantText: string;    // Hex
  assistantBubbleDark: string; // Hex
  assistantTextDark: string;   // Hex
  fontFamily: 'sans' | 'serif' | 'mono' | 'rounded';
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic',
    name: 'Classic Nova',
    background: '#f8fafc', // slate-50
    backgroundDark: '#020617', // slate-950
    userBubble: '#0891b2', // cyan-600
    userText: '#ffffff',
    assistantBubble: '#ffffff',
    assistantBubbleDark: '#0f172a', // slate-900
    assistantText: '#1e293b', // slate-800
    assistantTextDark: '#f1f5f9', // slate-100
    fontFamily: 'sans'
  },
  {
    id: 'forest',
    name: 'Forest Mint',
    background: '#f0fdf4', // green-50
    backgroundDark: '#022c22', // emerald-950
    userBubble: '#059669', // emerald-600
    userText: '#ffffff',
    assistantBubble: '#ffffff',
    assistantBubbleDark: '#064e3b', // emerald-900
    assistantText: '#064e3b', // emerald-900
    assistantTextDark: '#ecfdf5', // emerald-50
    fontFamily: 'sans'
  },
  {
    id: 'vintage',
    name: 'Vintage Memoir',
    background: '#fdfaf2', // warm paper
    backgroundDark: '#120f0a', // very dark warm charcoal
    userBubble: '#854d0e', // yellow-800
    userText: '#ffffff',
    assistantBubble: '#fffefa',
    assistantBubbleDark: '#1c1917', // stone-900
    assistantText: '#292524', // stone-800
    assistantTextDark: '#fafaf9', // stone-50
    fontFamily: 'serif'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    background: '#09070f', // deep purple-black
    backgroundDark: '#030105', // jet black purple
    userBubble: '#d946ef', // fuchsia-500
    userText: '#ffffff',
    assistantBubble: '#181124', // purple-solid
    assistantBubbleDark: '#0d0714',
    assistantText: '#22d3ee', // neon cyan
    assistantTextDark: '#f472b6', // pink-400
    fontFamily: 'mono'
  },
  {
    id: 'sunset',
    name: 'Sunset Glow',
    background: '#fff7ed', // orange-50
    backgroundDark: '#1c0d02', // warm dark orange/black
    userBubble: '#ea580c', // orange-600
    userText: '#ffffff',
    assistantBubble: '#ffffff',
    assistantBubbleDark: '#2c1401',
    assistantText: '#431407', // orange-950
    assistantTextDark: '#ffedd5', // orange-100
    fontFamily: 'rounded'
  }
];

export function resolveTheme(config: ChatThemeConfig | undefined, isDarkMode: boolean) {
  // Default fallback if config or preset is missing
  const activeConfig = config || { presetId: 'classic' };
  
  if (activeConfig.presetId !== 'custom') {
    const preset = THEME_PRESETS.find(p => p.id === activeConfig.presetId) || THEME_PRESETS[0];
    
    // Compute dark mode overrides where appropriate
    const bg = isDarkMode ? preset.backgroundDark : preset.background;
    const isClassic = preset.id === 'classic';
    
    return {
      background: bg,
      userBubble: preset.userBubble,
      userText: preset.userText,
      assistantBubble: isDarkMode ? preset.assistantBubbleDark : preset.assistantBubble,
      assistantText: isDarkMode ? preset.assistantTextDark : preset.assistantText,
      fontFamily: preset.fontFamily,
      isClassicPreset: isClassic
    };
  }
  
  // Handle custom theme settings
  return {
    background: activeConfig.background || (isDarkMode ? '#020617' : '#f8fafc'),
    userBubble: activeConfig.userBubble || '#0891b2',
    userText: activeConfig.userText || '#ffffff',
    assistantBubble: activeConfig.assistantBubble || (isDarkMode ? '#0f172a' : '#ffffff'),
    assistantText: activeConfig.assistantText || (isDarkMode ? '#f1f5f9' : '#1e293b'),
    fontFamily: activeConfig.fontFamily || 'sans',
    isClassicPreset: false
  };
}

export function getFontFamilyClasses(fontFamily: 'sans' | 'serif' | 'mono' | 'rounded') {
  switch (fontFamily) {
    case 'serif':
      return 'font-serif tracking-normal';
    case 'mono':
      return 'font-mono tracking-normal';
    case 'rounded':
      return 'font-sans tracking-tight leading-relaxed';
    default:
      return 'font-sans tracking-tight';
  }
}

export function getFontFamilyInlineStyle(fontFamily: 'sans' | 'serif' | 'mono' | 'rounded'): { fontFamily: string } {
  switch (fontFamily) {
    case 'serif':
      return { fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' };
    case 'mono':
      return { fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, "Courier New", monospace' };
    case 'rounded':
      return { fontFamily: 'Comfortaa, Outfit, system-ui, -apple-system, sans-serif' };
    default:
      return { fontFamily: 'Inter, system-ui, -apple-system, sans-serif' };
  }
}
