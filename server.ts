import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = typeof import.meta !== 'undefined' && import.meta.url ? fileURLToPath(import.meta.url) : '';
const __dirname = __filename ? path.dirname(__filename) : process.cwd();

// In-memory store for sessions (for real-time collaboration)
const sessionsStore = new Map();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_session', (sessionId) => {
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined session ${sessionId}`);
      
      // Send current session state if it exists
      if (sessionsStore.has(sessionId)) {
        socket.emit('session_state', sessionsStore.get(sessionId));
      }
    });

    socket.on('leave_session', (sessionId) => {
      socket.leave(sessionId);
      console.log(`Socket ${socket.id} left session ${sessionId}`);
    });

    socket.on('update_session', (data) => {
      const { sessionId, session } = data;
      sessionsStore.set(sessionId, session);
      // Broadcast to everyone else in the room
      socket.to(sessionId).emit('session_updated', session);
    });

    socket.on('typing', (data) => {
      const { sessionId, user } = data;
      socket.to(sessionId).emit('user_typing', user);
    });

    socket.on('stop_typing', (data) => {
      const { sessionId, user } = data;
      socket.to(sessionId).emit('user_stopped_typing', user);
    });

    socket.on('ai_chunk', (data) => {
      const { sessionId, messageId, chunk } = data;
      socket.to(sessionId).emit('ai_chunk_received', { messageId, chunk });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages, modelId, user, location } = req.body;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      
      const { getChatStream } = await import('./services/gemini.ts');
      const stream = getChatStream(messages, modelId, user, location);
      
      for await (const chunk of stream) {
        res.write(JSON.stringify(chunk) + '\n');
      }
      res.end();
    } catch (error: any) {
      console.error("Server API Chat Error:", error);
      // If we already wrote some data, we should end the response
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Internal server error" });
      } else {
        res.end();
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    
    // Fallback route to serve index.html with Vite transformations in development
    app.use(async (req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
      try {
        const fs = await import('fs');
        let template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== 'GET') {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
