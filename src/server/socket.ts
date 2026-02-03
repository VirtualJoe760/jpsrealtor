/**
 * Socket.io Server
 *
 * Provides real-time messaging capabilities
 * Eliminates need for client-side polling
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer) {
  if (io) {
    console.log('[Socket.io] Already initialized');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      // Allow all origins in development (localhost, ngrok, etc.)
      // In production, this should be restricted to your domain
      origin: (origin, callback) => {
        // Allow all origins (for dev with ngrok)
        // TODO: In production, restrict to your domain only
        callback(null, true);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
  });

  // Store globally so API routes can access it
  (global as any).io = io;

  io.on('connection', (socket: Socket) => {
    console.log('[Socket.io] ✅ Client connected:', socket.id);

    // Join user-specific room for personalized notifications
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[Socket.io] User ${userId} joined their room`);
      socket.emit('joined', { room: `user:${userId}` });
    });

    // Join conversation room for message updates
    socket.on('join:conversation', (phoneNumber: string) => {
      socket.join(`conversation:${phoneNumber}`);
      console.log(`[Socket.io] Joined conversation: ${phoneNumber}`);
      socket.emit('joined', { room: `conversation:${phoneNumber}` });
    });

    // Leave conversation room
    socket.on('leave:conversation', (phoneNumber: string) => {
      socket.leave(`conversation:${phoneNumber}`);
      console.log(`[Socket.io] Left conversation: ${phoneNumber}`);
    });

    // Typing indicators
    socket.on('typing:start', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:start', { userId });
    });

    socket.on('typing:stop', ({ conversationId, userId }) => {
      socket.to(`conversation:${conversationId}`).emit('typing:stop', { userId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('[Socket.io] ❌ Client disconnected:', socket.id);
    });
  });

  console.log('[Socket.io] 🚀 Server initialized');
  return io;
}

export function getIO(): SocketIOServer {
  // Try to get from module scope first, then from global
  if (io) return io;
  if ((global as any).io) {
    io = (global as any).io;
    return io;
  }
  throw new Error('[Socket.io] Not initialized. Call initSocket() first.');
}

// ============================================================================
// Event Emitters - Used by API routes to push updates to clients
// ============================================================================

/**
 * Emit new message to user
 */
export function emitNewMessage(userId: string, message: any) {
  try {
    // Get io instance (checks global if not in module scope)
    const ioInstance = io || (global as any).io;
    if (ioInstance) {
      const room = `user:${userId}`;
      const clientsInRoom = ioInstance.sockets.adapter.rooms.get(room);
      console.log(`[Socket.io] 📤 Emitting to room: ${room}, clients in room: ${clientsInRoom?.size || 0}`);
      console.log(`[Socket.io] Message data:`, {
        _id: message._id,
        from: message.from,
        to: message.to,
        direction: message.direction,
      });

      ioInstance.to(room).emit('message:new', message);
      console.log(`[Socket.io] ✅ Emitted 'message:new' event`);
    }
  } catch (error) {
    console.error('[Socket.io] Error emitting new message:', error);
  }
}

/**
 * Emit message status update
 */
export function emitStatusUpdate(userId: string, messageId: string, status: string) {
  try {
    const ioInstance = io || (global as any).io;
    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit('message:status', { messageId, status });
      console.log(`[Socket.io] 📤 Emitted status update to user:${userId}`, { messageId, status });
    }
  } catch (error) {
    console.error('[Socket.io] Error emitting status update:', error);
  }
}

/**
 * Emit conversation update (new conversation or metadata change)
 */
export function emitConversationUpdate(userId: string, conversation: any) {
  try {
    const ioInstance = io || (global as any).io;
    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit('conversation:update', conversation);
      console.log(`[Socket.io] 📤 Emitted conversation update to user:${userId}`);
    }
  } catch (error) {
    console.error('[Socket.io] Error emitting conversation update:', error);
  }
}

/**
 * Emit typing indicator
 */
export function emitTyping(conversationId: string, userId: string, isTyping: boolean) {
  try {
    const ioInstance = io || (global as any).io;
    if (ioInstance) {
      const event = isTyping ? 'typing:start' : 'typing:stop';
      ioInstance.to(`conversation:${conversationId}`).emit(event, { userId });
    }
  } catch (error) {
    console.error('[Socket.io] Error emitting typing indicator:', error);
  }
}

export default { initSocket, getIO, emitNewMessage, emitStatusUpdate, emitConversationUpdate, emitTyping };
