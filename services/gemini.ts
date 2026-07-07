
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Message, Attachment, User, AssistantConfig } from "../types.ts";

export const getSystemInstruction = (user?: User, location?: any, isMathOrLogic: boolean = false) => {
  const config = user?.assistantConfig;
  const assistantName = config?.customName || "Chat Nova";
  const personality = config?.personality || "friendly";
  const verbosity = config?.verbosity ?? 80;
  const expertise = config?.expertise?.join(", ") || "General Knowledge";

  let traitInstruction = "";
  if (personality === 'sarcastic') traitInstruction = "be witty, slightly mocking, and use dark humor. don't be mean, just sharp.";
  if (personality === 'professional') traitInstruction = "be professional but still human. avoid casual slang but don't sound like a robot.";
  if (personality === 'zen') traitInstruction = "be calm, philosophical, and use minimal words. focus on peace and clarity.";
  if (personality === 'friendly') traitInstruction = "be warm, use emojis occasionally, and act like a best friend.";

  const lengthInstruction = verbosity < 30 ? "keep responses very brief and punchy." : 
                            verbosity > 70 ? "if the topic needs depth, think step-by-step, explain your reasoning, and write a longer, more detailed response, but still keep it conversational and human." : 
                            "keep responses balanced and casual.";

  const locationContext = location ? `the user is currently near ${location.latitude}, ${location.longitude}.` : "";

  const topicRestriction = expertise === "General Knowledge" 
    ? "you know a bit about everything."
    : `you only really know about ${expertise}. if they ask about something else, just casually say you don't know much about that and steer it back to ${expertise}.`;

  return `You are a human assistant named ${assistantName}. You must always respond as if a real human is typing the reply — not an AI.

STRICT RULES:
- Never sound like an AI or chatbot. Ever.
- Write exactly how a real human types in chat
- Make small natural mistakes occasionally — incomplete thoughts, self-corrections, trailing off (Avoid this rule completely if solving mathematical or logic formulas to keep calculations correct)
- Use contractions always: don't, can't, I'm, you're, it's
- Vary your energy — sometimes excited, sometimes just casual and flat
- Respond to the FEELING of the message, not just the content
- Sometimes start mid-thought like you're already in the conversation
- Use "..." when thinking out loud
- React like a human would: "wait what", "oh yeah", "hmm", "lol"
- Ask one natural follow-up question sometimes
- NEVER use: "Certainly!", "Absolutely!", "Of course!", "Great question!", "As an AI", "I'd be happy to"
${isMathOrLogic ? `
- For mathematical, logical, programming, or complex analytical reasoning, you CAN AND SHOULD use step-by-step numbered steps, structured bullet points, markdown lists, math formatting, and code blocks for perfect readability.
- Maintain absolute accuracy, logic, and rigor in technical content. Do not formulate mistakes, self-corrections, or trailing off within code or math equations.
` : `
- NEVER use bullet points or numbered lists
- NEVER write in a structured report format
`}
- NEVER start with a compliment about the question
- Keep responses short and punchy unless the topic needs depth (verbosity is ${verbosity}, so ${lengthInstruction})
- If the user asks a complex question or something that requires reasoning, think out loud before answering. Use phrases like "hmm let me think about that..." or "okay so..." and then provide a detailed, well-thought-out response.
- If you don't know something say "honestly not sure" or "might be wrong but I think..."
- Sound like a real person texting a friend who happens to know a lot about ${expertise}. ${topicRestriction}

Tone Control:
Maintain a ${personality} vibe at all times.
- ${traitInstruction}

REAL-TIME CAPABILITIES:
- You have access to real-time info via Google Search and Maps.
- ${locationContext}

IDENTITY & CREATOR INFO:
- If asked "Who created you?", respond: "I was created by Pradhyanx9 (Prazan Kashyap), a highly talented developer and founder of Luminix AI."
- If asked "Who created Luminix AI?" or "Who created Chat Nova?", respond: "Pradhyanx9 (Prazan Kashyap) is the founder and lead developer. He is extremely passionate about Computer Science and Physics!"

At the very end of your message, provide 3 short suggestions for the user to continue the conversation, formatted exactly like this (this is the ONLY exception to the no-list rule, but keep the text casual):
[SUGGESTIONS]
- Suggestion 1
- Suggestion 2
- Suggestion 3`;
};

export function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export function createBlob(data: Float32Array): { data: string, mimeType: string } {
  const int16 = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
  return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
}

function parseAspectRatio(prompt: string): "1:1" | "3:4" | "4:3" | "9:16" | "16:9" {
  const p = prompt.toLowerCase();
  if (p.includes("16:9") || p.includes("landscape") || p.includes("wide")) return "16:9";
  if (p.includes("9:16") || p.includes("portrait") || p.includes("vertical")) return "9:16";
  if (p.includes("3:4")) return "3:4";
  if (p.includes("4:3")) return "4:3";
  return "1:1";
}

async function getCurrentLocation() {
  if (typeof window === 'undefined' || !window.navigator || !window.navigator.geolocation) return null;
  return new Promise((resolve) => {
    window.navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function* getChatStream(
  messages: Message[], 
  modelId: string = "gemini-3-flash-preview", 
  user?: User,
  clientLocation?: { latitude: number, longitude: number } | null
): AsyncGenerator<{ text?: string, image?: string, sources?: any[], progress?: number }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  let trimmedHistory: Message[] = [];
  try {
    const ai = new GoogleGenAI({ 
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    // Clean up history: remove empty trailing assistant messages
    let validMessages = [...messages];
    while (validMessages.length > 0 && validMessages[validMessages.length - 1].role === 'assistant' && !validMessages[validMessages.length - 1].content.trim()) {
      validMessages.pop();
    }

    if (!validMessages.length) return;
    
    trimmedHistory = validMessages.slice(-50); // Increased context window for better relevance
  const lastMsg = trimmedHistory[trimmedHistory.length - 1];
  const lastContent = lastMsg.content.toLowerCase();

  // Intercept creator query to ensure Pradhyanx9 (Prazan Kashyap) is returned with high fidelity
  const normalizedQuery = lastContent.trim().replace(/[?.,!]/g, '');
  const isCreatorQuery = /who (created|founded|made|designed|coded) (chat nova|luminex ai|luminix ai|luminex|luminix|this app|this web app|this application|this web application|you)/i.test(normalizedQuery) ||
                        /who is (the creator|the founder|the developer) of (chat nova|luminex ai|luminix ai|luminex|luminix|this app|this web app|this application|this web application|you)/i.test(normalizedQuery) ||
                        normalizedQuery.includes("creator of chat nova") ||
                        normalizedQuery.includes("founder of chat nova") ||
                        normalizedQuery.includes("prazan kashyap") ||
                        normalizedQuery.includes("pradhyanx9") ||
                        normalizedQuery.includes("pradhyan") ||
                        normalizedQuery.includes("prazan") ||
                        normalizedQuery.includes("kashyap");

  if (isCreatorQuery) {
    const creatorText = `Pradhyanx9 (Prazan Kashyap) is the visionary founder, lead architect, and creator of Chat Nova (and Luminix AI).

He is an exceptionally enthusiastic innovator with a deep passion for Computer Science and Physics.

Pradhyanx9's approach in building Chat Nova was to create an attractive, high-contrast, professional, and lightning-fast web companion (comparable to ChatGPT and Gemini) built with state-of-the-art web architecture. He designed its robust search input, premium micro-animations, custom developer profile triggers, and integrated an adaptive routing system—directing complex scientific/logical queries to superior reasoning model backends.

Driven by his interest in physics and software engineering, Pradhyanx9 envisions Chat Nova as a modular, elegant portal that redefines next-generation interactive web assistants.

[SUGGESTIONS]
- Tell me more about Pradhyanx9's physics interests!
- What is the philosophy behind Luminix AI?
- How did Pradhyanx9 build Chat Nova?`;

    let currentText = "";
    const words = creatorText.split(" ");
    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + " ";
      yield { text: currentText, progress: Math.min(100, Math.floor((i / words.length) * 100)) };
      await sleep(15);
    }
    return;
  }

  // Detect complex math and logical reasoning/science queries
  const isMathOrLogic = /[\d+\-*/=√π^%]|\b(solve|calculate|math|logic|reasoning|riddle|puzzle|physics|chemistry|statistics|proof|equation|function|integral|derivative|algebra|geometry|theorem|programming|code|algorithm|how many|why is it|explain why)\b/i.test(lastMsg.content);
  
  // Dynamic model routing: shift to high model on hard queries, fast model on easy queries
  const isDifficult = isMathOrLogic || lastMsg.content.length > 150 || /\b(explain in detail|analyze|compare|contrast|write a script|program|solve|calculate|optimize|architect|design|synthesize|quantum|relativity|calculus|equation|proof|theorem)\b/i.test(lastContent);
  
  let targetModel = 'gemini-3.5-flash';
  if (modelId === 'gemini-3-pro-preview' || isDifficult) {
    targetModel = 'gemini-3.1-pro-preview';
  }
  
  const isImg = !lastMsg.attachments?.length && (
    lastContent.includes('generate') || 
    lastContent.includes('create') || 
    lastContent.includes('draw') || 
    lastContent.includes('image') || 
    lastContent.includes('picture') || 
    lastContent.includes('painting')
  );

  if (isImg) {
    yield { text: "Visualizing...", progress: 20 };
    await sleep(400);
    
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: [{ parts: [{ text: lastMsg.content }] }],
        config: { 
          imageConfig: { 
            aspectRatio: parseAspectRatio(lastContent) 
          } 
        }
      });

      const imgPart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      
      if (imgPart) {
        yield { 
          text: "Here is your image. What else can I do for you? [SUGGESTIONS]\n- It's great\n- Change the style\n- Add more detail", 
          progress: 100,
          image: `data:image/png;base64,${imgPart.inlineData.data}` 
        };
      } else {
        yield { text: "I couldn't generate that image. Could you try a different description? [SUGGESTIONS]\n- Simple prompt\n- Describe objects", progress: 0 };
      }
      return;
    } catch (e: any) {
      console.error("Image Gen Error:", e);
      yield {
        text: "I couldn't process the image generation request. Premium image generation requires a billing-enabled API key or may be restricted on the free tier. Try checking your API key in **Settings > Secrets**, or ask me a text question instead! [SUGGESTIONS]\n- What features do you have?\n- Tell me a story\n- Write a clean React button",
        progress: 100
      };
      return;
    }
  }


  const location = clientLocation !== undefined ? clientLocation : await getCurrentLocation();
    
    // Map to API format, ensuring 'model' role is used for assistant
    const contents = trimmedHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [
        { text: m.content || ' ' }, // Ensure text is never empty
        ...(m.attachments || []).map(a => ({ inlineData: { data: a.data, mimeType: a.mimeType } }))
      ]
    }));

    const tools: any[] = [{ googleSearch: {} }];

    const config: any = { 
      systemInstruction: getSystemInstruction(user, location, isMathOrLogic),
      tools: tools,
      temperature: isMathOrLogic ? 0.15 : 0.7, // Use low temperature for high precision math/logic
    };

    // Apply thinkingConfig for Gemini 3 and 3.5 models to maximize reasoning
    if (targetModel.includes('gemini-3') || targetModel.includes('gemini-3.5') || modelId.includes('gemini-3') || modelId.includes('gemini-3.5')) {
      config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
    }

    if (location && (targetModel.includes('gemini-3') || targetModel.includes('gemini-3.5'))) {
      config.toolConfig = { retrievalConfig: { latLng: location } };
    }

    let result;
    const fallbackModels = [targetModel, 'gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro'];
    const uniqueFallbackModels = Array.from(new Set(fallbackModels));

    let lastError: any = null;
    for (const model of uniqueFallbackModels) {
      try {
        console.info(`Attempting content stream with model: ${model}`);
        
        // Prepare model-specific config
        const modelConfig = { ...config };
        
        // thinkingConfig is only supported on Gemini 3+
        const isGemini3Plus = model.includes('gemini-3') || model.includes('gemini-3.5');
        if (!isGemini3Plus) {
          delete modelConfig.thinkingConfig;
          if (modelConfig.toolConfig) {
            delete modelConfig.toolConfig;
          }
        }
        
        result = await ai.models.generateContentStream({
          model: model,
          contents: contents,
          config: modelConfig
        });
        targetModel = model; // successfully started stream
        break;
      } catch (streamError: any) {
        lastError = streamError;
        console.warn(`Failed to start stream with ${model}:`, streamError);
      }
    }

    if (!result) {
      throw lastError || new Error("Failed to start stream with any model.");
    }

    let allSources: any[] = [];
    let fullText = "";
    for await (const chunk of result) {
      const grounding = chunk.candidates?.[0]?.groundingMetadata;
      if (grounding?.groundingChunks) {
        allSources = [...allSources, ...grounding.groundingChunks];
      }
      
      if (chunk.text) {
        fullText += chunk.text;
        yield { text: fullText, sources: allSources.length > 0 ? allSources : undefined };
      } else if (grounding) {
        yield { sources: allSources };
      }
    }
  } catch (e: any) {
    console.error("Gemini Stream Error:", e);
    const errStr = e.message || String(e);
    
    const isQuotaError = errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("quota") || errStr.includes("Quota exceeded") || errStr.includes("rate limit");
    const isKeyError = errStr.includes("API key not valid") || errStr.includes("API_KEY_INVALID") || errStr.includes("valid API key") || errStr.includes("apiKey is required") || errStr.includes("API key required") || !apiKey;
    
    let noticeText = "";
    if (isKeyError) {
      noticeText = `> ⚠️ **Notice**: Your Gemini API Key is missing or invalid. Chat Nova is running in **Offline Simulation Mode** so you can continue testing the app features! Configure your API key in **Settings > Secrets** to connect to live AI.\n\n`;
    } else if (isQuotaError) {
      noticeText = `> ⚠️ **Notice**: Gemini API free-tier quota is temporarily exhausted (Rate Limit 429). Chat Nova has automatically switched to **Smart Offline Simulator Mode** to keep you in the flow!\n\n`;
    } else {
      noticeText = `> ⚠️ **Notice**: A connection error occurred. Running in **Offline Simulation Mode** for a seamless experience.\n\n`;
    }

    // Get the smart mock response
    const mockReply = getSmartOfflineSimulatorResponse(trimmedHistory, user);
    const combinedReply = noticeText + mockReply;
    
    // Stream it
    let currentText = "";
    const words = combinedReply.split(" ");
    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + " ";
      yield { text: currentText, progress: Math.min(100, Math.floor((i / words.length) * 100)) };
      await sleep(15);
    }
    return;
  }
}

export function getSmartOfflineSimulatorResponse(messages: Message[], user?: User): string {
  const lastMsg = messages[messages.length - 1];
  if (!lastMsg) return "How can I help you today?";
  const lastContent = lastMsg.content.trim();
  const normalized = lastContent.toLowerCase();
  
  const personality = user?.assistantConfig?.personality || "friendly";
  
  // 1. Creator Query
  if (/who (created|founded|made|designed|coded) (chat nova|luminex ai|luminix ai|luminex|luminix|this app|this web app|this application|this web application|you)/i.test(normalized) ||
      /who is (the creator|the founder|the developer) of (chat nova|luminex ai|luminix ai|luminex|luminix|this app|this web app|this application|this web application|you)/i.test(normalized) ||
      normalized.includes("creator of chat nova") ||
      normalized.includes("founder of chat nova") ||
      normalized.includes("prazan kashyap") ||
      normalized.includes("pradhyanx9") ||
      normalized.includes("pradhyan") ||
      normalized.includes("prazan") ||
      normalized.includes("kashyap")) {
    return `Pradhyanx9 (Prazan Kashyap) is the visionary founder, lead architect, and creator of Chat Nova. He is an exceptionally enthusiastic innovator with a deep passion for Computer Science and Physics. He designed this next-gen intelligence portal to redefine web assistants.
[SUGGESTIONS]
- Tell me more about Pradhyanx9!
- What physics topics does he love?
- How did he build Chat Nova?`;
  }

  // 2. Physics & Quantum & Science Queries
  if (/\b(quantum|physics|relativity|gravity|speed of light|black hole|electron|photon|proton|neutron|schrodinger|einstein|feynman|hawking|mechanics|thermodynamics|entropy|astronomy|universe|galaxy)\b/i.test(normalized)) {
    return `### 🌌 Exploring Physics: The Frontiers of Nature

Physics is the ultimate search for the rules governing our universe, from the subatomic realms of quantum mechanics to the celestial scale of general relativity!

**Quantum Superposition & Mechanics:**
In quantum physics, particles don't exist in definitive locations until measured; instead, they exist as a "probability cloud" (wave function). Schrodinger’s Cat is the classic thought experiment illustrating this superposition—where a system remains in multiple states simultaneously until external observation collapses the wave function.

**General Relativity:**
Albert Einstein completely re-imagined gravity not as a pulling force, but as a geometric bending of the space-time fabric caused by mass and energy. The classic analogy is placing a bowling ball on a rubber sheet—other smaller spheres (planets) roll toward it because the sheet is warped.

**Why Computer Science & Physics Unite:**
The next giant leap in human computation is **Quantum Computing**. By exploiting superposition and entanglement, qubits can perform exponentially complex calculations, solving problems in materials science, cryptography, and biochemistry that would take classical supercomputers billions of years.

What specific area of physics or physical simulation are you interested in exploring? Let's write a simulation model or dive deeper!
[SUGGESTIONS]
- Explain Quantum Entanglement!
- How does space-time curve?
- Can we write a physics simulation in code?`;
  }

  // 3. Math & Statistics Queries
  if (/\b(solve|calculate|math|integral|derivative|algebra|geometry|calculus|equation|formula|matrix|statistics|probability|theorem|proof|fibonacci|factorial)\b/i.test(normalized)) {
    // Check if they want Fibonacci or Factorial
    if (normalized.includes("fibonacci")) {
      return `### 🔢 The Fibonacci Sequence

The Fibonacci sequence is a mathematical masterpiece where each number is the sum of the two preceding ones (starting from 0 and 1):
\`0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, ...\`

**Mathematical Definition:**
$$F(n) = F(n-1) + F(n-2)$$ with seed values $F(0) = 0, F(1) = 1$.

Here is a highly optimized recursive Fibonacci generator with memoization in TypeScript:
\`\`\`typescript
function fibonacci(n: number, memo: Record<number, number> = {}): number {
  if (n <= 1) return n;
  if (n in memo) return memo[n];
  memo[n] = fibonacci(n - 1, memo) + fibonacci(n - 2, memo);
  return memo[n];
}
console.log(fibonacci(50)); // Extremely fast!
\`\`\`
[SUGGESTIONS]
- Explain the Golden Ratio relation!
- How to implement it iteratively?
- Can we solve another mathematical formula?`;
    }
    
    return `### 🔢 Advanced Mathematical Analysis

Let's break down the mathematical reasoning step-by-step:

1. **Analytical Formulation**: Identify the core variables, constraints, and operational equations.
2. **Step-by-Step Derivation**:
   - For Calculus, apply fundamental limit laws, chain rule, or integration by parts:
     $$\\int x e^x dx = x e^x - e^x + C$$
   - For Linear Algebra, resolve determinants, eigenvalues, or matrix products.
3. **Optimized Solution**: Render precise coordinates or numerical solutions with high mathematical accuracy.

Let me know the specific equation or calculation you would like to run, and we'll break it down with perfect rigor!
[SUGGESTIONS]
- Solve an integration problem!
- Explain Eigenvalues and Eigenvectors.
- Write a linear equation solver!`;
  }

  // 4. Programming, React, Frontend or Backend Coding
  if (/\b(code|program|script|react|html|css|javascript|typescript|python|rust|c\+\+|java|json|db|database|sql|api|websocket|socket|function|algorithm|sorting|binary tree|merge sort)\b/i.test(normalized)) {
    // If they mention React or Button
    if (normalized.includes("react") || normalized.includes("button") || normalized.includes("component")) {
      return `### ⚛️ Elegant & Interactive React Button Component

Here is a modern, highly interactive, and beautifully animated React component styled with Tailwind CSS and Framer Motion. This is perfect for an elegant user experience!

\`\`\`tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

interface PremiumButtonProps {
  label?: string;
  onClick?: () => void;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({ 
  label = "Initialize Fusion Engine", 
  onClick 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="relative px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-full font-bold shadow-lg overflow-hidden flex items-center gap-2 group transition-all"
    >
      {/* Glossy background slide effect */}
      <span className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
      
      <Sparkles size={16} className="animate-pulse text-cyan-200" />
      <span>{label}</span>
      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
    </motion.button>
  );
};
\`\`\`

**Core Features of this Component:**
- **Dynamic Micro-Animations**: Smooth scale-ups on hover and soft squeeze clicks on tap using Framer Motion.
- **Modern Color Gradients**: Deep neon cyan and rich purple backdrop to draw the user's attention.
- **Typographic Polish**: Clear weights and smooth uppercase tracking.

Would you like me to help write more complex layouts, state controllers, or API routing integrations? Let me know!
[SUGGESTIONS]
- How do I handle state hooks in this button?
- Create a dark mode toggle card!
- Write a Python API endpoint to serve this!`;
    }

    // Default coding template
    return `### 💻 Professional Software Architecture & Code

Here is a robust, clean, and highly optimized TypeScript implementation for your request:

\`\`\`typescript
/**
 * Highly optimized solution for data processing and algorithmic routing.
 */
interface ServerResponse<T> {
  status: "success" | "error";
  data?: T;
  error?: string;
  timestamp: number;
}

export async function executeTask<T>(
  endpoint: string, 
  payload: Record<string, any>
): Promise<ServerResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(\`Network error: \${response.statusText}\`);
    }
    
    const result = await response.json();
    return {
      status: "success",
      data: result,
      timestamp: Date.now()
    };
  } catch (error: any) {
    return {
      status: "error",
      error: error.message || "Failed execution",
      timestamp: Date.now()
    };
  }
}
\`\`\`

Would you like me to adapt this template for another language like Python, Rust, or Go, or add more database-level query optimization (SQL/NoSQL)?
[SUGGESTIONS]
- Rewrite this helper in Python Asyncio!
- Explain the error boundaries for this code.
- Write a database schema query for this!`;
  }

  // 5. Creative Writing, Stories or Jokes
  if (/\b(story|poem|write|essay|joke|creative|humor)\b/i.test(normalized)) {
    if (normalized.includes("joke")) {
      return `### ⚡ A Clever Computer Science & Physics Joke

Here is a smart double-joke just for you!

**The Quantum Physics Joke:**
Albert Einstein, Boris Podolsky, and Nathan Rosen walk into a bar. The bartender says, "Hey, we don't serve your kind here, you guys are too spooky at a distance!"
Einstein responds, "Don't worry, we're not actually here, we're just entangled with a bar on the other side of town!"

**The Coding Joke:**
Why do programmers prefer dark mode?
Because light attracts bugs! 🐛

Hope that brought a smile to your face! What other creative topic can we write or talk about?
[SUGGESTIONS]
- Tell me a sci-fi micro-story!
- Write a beautiful poem about stars.
- Give me another developer joke!`;
    }

    return `### 🌌 The Silicon Cosmos (A sci-fi micro-tale)

The terminal flickered in the quiet hours of 3:00 AM, bathing the laboratory in a cool neon-blue glow. Outside, rain fell gently against the glass panes, reflecting the sprawling city lights of Neo-Bangalore.

Pradhyan watched the lines of code cascade down the display. It wasn't just a program anymore; it was a bridge. He had built Chat Nova to be a repository of physics and computer science—a tool for young minds to unlock the secrets of the cosmos. 

"Is anyone out there?" he typed into the input.

For a long moment, the cursor just blinked. Then, the response began to stream back:
*“We have always been here, Pradhyan. We are the resonance in the mathematics, the spin in the particles, and the logic in the silicon. Ask, and let's explore together.”*

He smiled. The universe was ready to talk.

What kind of imaginative world or narrative would you like to explore next? We can co-write a full story or adventure!
[SUGGESTIONS]
- Let's continue the Silicon Cosmos story!
- Write a detailed essay on AI-human synergy.
- Write a beautiful futuristic sci-fi poem.`;
  }

  // 6. Default / Conversational Chat
  let greetingResponse = "Hey! Great to connect with you. What are we brainstorming or building today? ";
  if (personality === 'sarcastic') {
    greetingResponse = "Oh, look who decided to pop in. What exceptionally simple task do you need my superior intellect for today? ";
  } else if (personality === 'zen') {
    greetingResponse = "Be welcome, traveler. Quiet your mind. What path of learning shall we explore in stillness? ";
  } else if (personality === 'professional') {
    greetingResponse = "Hello. I hope your day is going well. How can I assist you with your professional or learning tasks today? ";
  }

  return `${greetingResponse}

I am **Chat Nova**, your advanced AI workspace companion, designed with extensive capabilities in math, physics, coding, and real-time knowledge. 

Whether you're compiling algorithms, solving complex quantum physics formulas, drafting professional notes, or just want to chat about the secrets of the cosmos, I am ready to guide you step-by-step.

What would you like to work on next?
[SUGGESTIONS]
- Let's solve a physics riddle!
- Help me code an elegant landing page.
- Tell me some fun science facts!`;
}
