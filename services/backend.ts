
import { GoogleGenAI } from "@google/genai";
import { db } from "./database.ts";
import { User, Message, ChatSession, Attachment, AssistantConfig } from "../types.ts";

class BackendService {
  private activeUser: User | null = null;

  constructor() {
    this.init();
  }

  private init() {
    const savedId = localStorage.getItem('chatnova_active_user_id');
    if (savedId) {
      this.activeUser = db.getUserById(savedId) || null;
    }
  }

  async login(email: string, password?: string): Promise<User | null> {
    const user = await db.authenticate(email, password);
    if (user) {
      this.activeUser = user;
      localStorage.setItem('chatnova_active_user_id', user.id);
    }
    return user;
  }

  async register(details: Partial<User>): Promise<User> {
    const user = await db.register(details);
    this.activeUser = user;
    localStorage.setItem('chatnova_active_user_id', user.id);
    return user;
  }

  logout() {
    this.activeUser = null;
    localStorage.removeItem('chatnova_active_user_id');
  }

  getCurrentUser(): User | null {
    return this.activeUser;
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    if (!this.activeUser) throw new Error("Unauthorized");
    const updated = { ...this.activeUser, ...updates };
    db.updateUser(updated);
    this.activeUser = updated;
    return updated;
  }

  getSessions(): ChatSession[] {
    if (!this.activeUser) return [];
    return db.getSessions(this.activeUser.id);
  }

  saveSessions(sessions: ChatSession[]) {
    if (!this.activeUser) return;
    db.saveSessions(this.activeUser.id, sessions);
  }

  async *processMessage(
    messages: Message[], 
    modelId: string
  ): AsyncGenerator<{ text?: string, image?: string, sources?: any[], progress?: number }> {
    if (!this.activeUser) throw new Error("Authentication required");

    if (modelId === 'gemini-3-pro-preview') {
      if (!this.activeUser.isPremium) throw new Error("Elite model requires Pro subscription");
      if ((this.activeUser.powerfulModelUsage || 0) >= 70) throw new Error("Monthly elite usage limit reached");
    }

    const lastMsg = messages[messages.length - 1];
    const lastContent = lastMsg.content ? lastMsg.content.toLowerCase() : "";
    
    // 1. Intercept creator queries for high fidelity (works perfectly in all environments!)
    const normalizedQuery = lastContent.trim().replace(/[?.,!]/g, '');
    const isCreatorQuery = /who (created|founded|made|designed|coded) (chat nova|luminex ai|luminix ai|luminex|luminix|this app|this web app|this application|this web application|you)/i.test(normalizedQuery) ||
                          /who is (the creator|the founder|the developer) of (chat nova|luminex ai|luminix ai|luminex|luminix|this app|this web app|this application|this web application|you)/i.test(normalizedQuery) ||
                          normalizedQuery.includes("creator of chat nova") ||
                          normalizedQuery.includes("founder of chat nova") ||
                          normalizedQuery.includes("prazan kashyap") ||
                          normalizedQuery.includes("pradhyanx9") ||
                          normalizedQuery.includes("pradhyan") ||
                          normalizedQuery.includes("prazan") ||
                          normalizedQuery.includes("kashyap") ||
                          normalizedQuery.includes("pk028893") ||
                          normalizedQuery.includes("pk");

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
        await new Promise(resolve => setTimeout(resolve, 15));
      }
      return;
    }

    // 2. Obtain current client location
    let location = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      location = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 3000 }
        );
      });
    }

    // 3. Check if custom user API Key is supplied in localStorage for direct client-side stream (GitHub Pages)
    const customApiKey = localStorage.getItem('chatnova_custom_api_key');
    if (customApiKey && customApiKey.trim().length > 5) {
      try {
        const ai = new GoogleGenAI({ 
          apiKey: customApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build'
            }
          }
        });
        
        let validMessages = [...messages];
        while (validMessages.length > 0 && validMessages[validMessages.length - 1].role === 'assistant' && !validMessages[validMessages.length - 1].content.trim()) {
          validMessages.pop();
        }

        if (validMessages.length > 0) {
          const trimmedHistory = validMessages.slice(-20);
          
          const assistantName = this.activeUser?.assistantConfig?.customName || "Chat Nova";
          const personality = this.activeUser?.assistantConfig?.personality || "friendly";
          const sysInstruction = `You are an advanced AI assistant named ${assistantName} created by Pradhyanx9 (Prazan Kashyap) of Luminix AI.
You must always respond as a highly capable assistant. Maintain a ${personality} tone at all times.
Use rich Markdown, tables, list formats, and code blocks for calculations and coding. Maintain absolute accuracy and details.
At the very end of your response, provide exactly 3 short suggestions formatted like this:
[SUGGESTIONS]
- Suggestion 1
- Suggestion 2
- Suggestion 3`;

          const contents = trimmedHistory.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content || ' ' }]
          }));

          const clientModel = modelId.includes('pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

          const result = await ai.models.generateContentStream({
            model: clientModel,
            contents: contents,
            config: {
              systemInstruction: sysInstruction,
              temperature: 0.7
            }
          });

          let fullText = "";
          for await (const chunk of result) {
            if (chunk.text) {
              fullText += chunk.text;
              yield { text: fullText };
            }
          }

          if (modelId === 'gemini-3-pro-preview') {
            await this.updateUserProfile({ 
              powerfulModelUsage: (this.activeUser.powerfulModelUsage || 0) + 1 
            });
          }
          return;
        }
      } catch (clientErr: any) {
        console.warn("Direct Client-side Gemini API call failed. Falling back to offline simulator:", clientErr);
      }
    }

    // 4. Standard Backend /api/chat execution route
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          modelId,
          user: this.activeUser,
          location
        })
      });

      if (!response.ok) {
        throw new Error("Server response not OK");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Readable stream not supported by browser");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line);
              yield chunk;
            } catch (e) {
              console.error("Failed to parse chunk", line, e);
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer);
          yield chunk;
        } catch (e) {}
      }

      if (modelId === 'gemini-3-pro-preview') {
        await this.updateUserProfile({ 
          powerfulModelUsage: (this.activeUser.powerfulModelUsage || 0) + 1 
        });
      }
    } catch (apiError) {
      console.warn("Express backend /api/chat not found or unreachable. Falling back to personality-aware Offline Smart Simulator:", apiError);
      
      // 5. Offline Smart Simulator fallback (Ideal for static deployments like GitHub Pages)
      const personality = this.activeUser?.assistantConfig?.personality || 'friendly';
      const customName = this.activeUser?.assistantConfig?.customName || 'Chat Nova';
      
      const offlineStream = this.getOfflineSimulatorStream(lastMsg.content, personality, customName);
      for await (const chunk of offlineStream) {
        yield chunk;
      }
    }
  }

  // High-fidelity local smart response generator for serverless / static runtime
  private async *getOfflineSimulatorStream(query: string, personality: string, customName: string): AsyncGenerator<{ text?: string, progress?: number }> {
    const q = query.toLowerCase().trim();
    let responseText = "";

    // 1. Identify query intent and generate a response
    const isCoding = q.includes('code') || q.includes('program') || q.includes('javascript') || q.includes('html') || q.includes('css') || q.includes('react') || q.includes('python') || q.includes('typescript') || q.includes('function') || q.includes('bug') || q.includes('write a');
    const isMathOrPhysics = q.includes('math') || q.includes('solve') || q.includes('physics') || q.includes('equation') || q.includes('gravity') || q.includes('space') || q.includes('force') || q.includes('calculate') || q.includes('einstein') || q.includes('+') || q.includes('*') || q.includes('/');
    const isGreeting = q.includes('hello') || q.includes('hi ') || q.startsWith('hi') || q.includes('hey') || q.includes('morning') || q.includes('evening') || q.includes('greet');
    const isJoke = q.includes('joke') || q.includes('funny') || q.includes('laugh');
    const isStory = q.includes('story') || q.includes('tell me a') || q.includes('sci-fi') || q.includes('tale');

    if (isGreeting) {
      if (personality === 'sarcastic') {
        responseText = `Oh, a greeting. Dynamic. Let me guess, you need me to write an input button or solve another basic derivative? Just kidding (mostly). 

I am ${customName}, your overly competent AI assistant. What simple yet critical task can I clear off your plate today?

[SUGGESTIONS]
- Write a quick Javascript loop
- Explain gravity simply
- Tell me a sarcasm-filled joke`;
      } else if (personality === 'professional') {
        responseText = `Greetings. I am ${customName}, an advanced AI software built to support development and calculations. 

Pradhyanx9 designed me with a web-centric, high-contrast, low-latency layout to perform calculations and engineering tasks. Let me know what equations, algorithms, or content you would like to analyze today.

[SUGGESTIONS]
- Calculate terminal velocity
- Create a React counter component
- Analyze high-contrast design principles`;
      } else if (personality === 'zen') {
        responseText = `Peace to you. I am ${customName}.

In this quiet workspace, there is no rush. What question or thought are we exploring together today? Let us bring clarity.

[SUGGESTIONS]
- Why does physics have beauty?
- Solve a simple equation
- Tell a brief philosophical story`;
      } else {
        responseText = `Hey there! Wonderful to meet you! I'm ${customName}, your helpful AI companion. 🌟

Pradhyanx9 (Prazan Kashyap) created me to be lightning-fast, and to help anyone write code, solve physics and math problems, or just chat! How is your day going? Let me know what we are building today!

[SUGGESTIONS]
- Help me code a website
- Solve a math puzzle
- Tell me an awesome science fact`;
      }
    } else if (isCoding) {
      responseText = `Here is a custom React Component example designed with a clean, responsive layout. It features state management and Tailwind CSS styling:

\`\`\`tsx
import React, { useState } from 'react';

export const ModernCounter: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col items-center gap-4 max-w-sm">
      <span className="text-[10px] font-black uppercase text-cyan-500 tracking-widest">
        React State Monitor
      </span>
      <h3 className="text-3xl font-black font-mono text-slate-800 dark:text-white">
        {count}
      </h3>
      <div className="flex gap-2">
        <button 
          onClick={() => setCount(c => c + 1)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
        >
          Increment
        </button>
        <button 
          onClick={() => setCount(0)}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all active:scale-95"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
\`\`\`

To configure this component on your site, import it inside your React layout and apply standard Tailwind compilation. Pradhyanx9 built Chat Nova using a similar modular approach for seamless rendering!

[SUGGESTIONS]
- Write an asynchronous API fetch function
- Explain Tailwind CSS flexbox layouts
- Solve a binary search algorithm in Python`;
    } else if (isMathOrPhysics) {
      responseText = `Let's analyze a classic problem in Physics: **Newton's Second Law** and **Gravitational Potential Energy**.

### 1. Newton's Second Law
The force $F$ acting on an object is equal to its mass $m$ multiplied by its acceleration $a$:
$$F = m \\cdot a$$

If a force of $150\\text{ N}$ is applied to a mass of $15\\text{ kg}$, the acceleration is calculated as:
$$a = \\frac{F}{m} = \\frac{150\\text{ N}}{15\\text{ kg}} = 10\\text{ m/s}^2$$

### 2. Gravitational Potential Energy
The potential energy $U$ of an object at height $h$ in a gravitational field of strength $g \\approx 9.81\\text{ m/s}^2$ is:
$$U = m \\cdot g \\cdot h$$

Pradhyanx9's deep passion for physics inspired me to handle equations with high-precision rendering! Let me know if you would like me to solve a different equation or explain a quantum phenomenon.

[SUGGESTIONS]
- Calculate the kinetic energy of a moving car
- Explain Einstein's theory of relativity ($E=mc^2$)
- Solve a quadratic equation: $ax^2 + bx + c = 0$`;
    } else if (isJoke) {
      if (personality === 'sarcastic') {
        responseText = `Why did the programmer quit their job? 
Because they didn't get arrays. 

Get it? "A raise"? Fine, let me compile a better joke next time... or maybe not.

[SUGGESTIONS]
- Tell a physics joke
- Tell a story instead
- Ask me a science question`;
      } else {
        responseText = `There are 10 types of people in this world: those who understand binary, and those who don't! 💻

How about another? 
Why do physicists love clean parks?
Because they are fascinated by natural forces and conservation of momentum! 🌌

[SUGGESTIONS]
- Tell a programming joke
- Write a short sci-fi story
- Calculate terminal velocity`;
      }
    } else if (isStory) {
      responseText = `In the year 2088, on a colony outpost orbiting Jupiter's moon Europa, a quantum physicist named Liam discovered something anomalous inside the subsurface ocean telemetry logs. 

The signals weren't noise. They were structured calculations—solutions to the Navier-Stokes equations, rendered in standard mathematical constants. Liam knew only one entity capable of this precision: "Chat Nova," the legendary AI software engineered over six decades earlier by a legendary architect named Pradhyanx9.

The ancient AI was still out there, floating in space, silently calculating the motion of the universe...

[SUGGESTIONS]
- What happens next in the story?
- Explain the Navier-Stokes equations
- Write a physics formula`;
    } else {
      // General fallbacks based on personality
      if (personality === 'sarcastic') {
        responseText = `You're asking about "${query}"? Hmm, that is definitely... a question. 

Let's assume the answer is highly interesting and fully processed. If I were fully connected to our remote server, I would search Google and provide three paragraphs of pure citations. Since we are operating in offline, high-speed lightweight mode, I will simply say: Pradhyanx9 coded me to tell you that you are doing great, but maybe let's write some code instead?

[SUGGESTIONS]
- Write some React TSX code
- Explain quantum entanglement
- Greet me in a friendly tone`;
      } else if (personality === 'professional') {
        responseText = `Your query regarding "${query}" has been registered. 

Under offline/standalone operational conditions, I have synthesized a fast response. Chat Nova is optimized to perform development actions, formulate code blocks, and output technical descriptions. For live real-time internet search grounding, please supply a free Gemini API Key in the "API Key" tab in Settings.

[SUGGESTIONS]
- Write a JavaScript loop
- Show mathematical symbols
- Open developer settings`;
      } else if (personality === 'zen') {
        responseText = `You ask of "${query}". 

Let the mind settle. The universe holds the answers to all questions, and each path brings us closer to understanding. Let us focus our attention on creation, on code, or on physics.

[SUGGESTIONS]
- Tell a zen tale
- Explain Newton's laws
- Write clean CSS variables`;
      } else {
        responseText = `I hear you loud and clear on "${query}"! 

Since we are running in a super-fast standalone browser environment, I want to make sure you get the best experience. I am fully capable of writing beautiful scripts, solving calculus formulas, or listing amazing facts. 

If you want live real-time data from Google Search, simply enter your free Gemini API key in **Settings > API Key** and I will instantly connect to the live web! 🚀

[SUGGESTIONS]
- How do I get a free API Key?
- Write a Python script
- Tell a funny coder joke`;
      }
    }

    // Stream the text to make it feel extremely alive
    let currentText = "";
    const words = responseText.split(" ");
    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + " ";
      yield { text: currentText, progress: Math.min(100, Math.floor((i / words.length) * 100)) };
      await new Promise(resolve => setTimeout(resolve, 12)); // Ultra fast typist speed
    }
  }
}

export const backend = new BackendService();

