/**
 * useSocket Hook
 *
 * Manages Socket.io connection for real-time messaging
 * Handles reconnection, error states, and event subscriptions
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
}

export function useSocket(userId?: string): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!userId) {
      console.log('[useSocket] No userId provided, skipping connection');
      return;
    }

    console.log('[useSocket] Initializing connection for user:', userId);

    // Create Socket.io connection
    const socketInstance = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    // Connection successful
    socketInstance.on('connect', () => {
      console.log('[useSocket] ✅ Connected to server');
      setConnected(true);
      setError(null);
      reconnectAttempts.current = 0;

      // Join user-specific room
      socketInstance.emit('join:user', userId);
    });

    // Connection error
    socketInstance.on('connect_error', (err) => {
      console.error('[useSocket] ❌ Connection error:', err.message);
      setError(`Connection error: ${err.message}`);
      setConnected(false);
      reconnectAttempts.current += 1;
    });

    // Reconnection attempt
    socketInstance.on('reconnect_attempt', (attempt) => {
      console.log(`[useSocket] 🔄 Reconnection attempt ${attempt}...`);
    });

    // Reconnection successful
    socketInstance.on('reconnect', (attempt) => {
      console.log(`[useSocket] ✅ Reconnected after ${attempt} attempts`);
      setConnected(true);
      setError(null);
      reconnectAttempts.current = 0;

      // Rejoin user room
      socketInstance.emit('join:user', userId);
    });

    // Reconnection failed
    socketInstance.on('reconnect_failed', () => {
      console.error('[useSocket] ❌ Reconnection failed after all attempts');
      setError('Unable to connect to server. Please refresh the page.');
      setConnected(false);
    });

    // Disconnected
    socketInstance.on('disconnect', (reason) => {
      console.log('[useSocket] ⚠️ Disconnected:', reason);
      setConnected(false);

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, need to manually reconnect
        socketInstance.connect();
      }
    });

    // Confirmation of joining rooms
    socketInstance.on('joined', ({ room }) => {
      console.log('[useSocket] Joined room:', room);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('[useSocket] Cleaning up connection');
      socketInstance.disconnect();
    };
  }, [userId]);

  return { socket, connected, error };
}

// Type-safe event emitters
export const socketEvents = {
  joinConversation: (socket: Socket | null, phoneNumber: string) => {
    socket?.emit('join:conversation', phoneNumber);
  },

  leaveConversation: (socket: Socket | null, phoneNumber: string) => {
    socket?.emit('leave:conversation', phoneNumber);
  },

  startTyping: (socket: Socket | null, conversationId: string, userId: string) => {
    socket?.emit('typing:start', { conversationId, userId });
  },

  stopTyping: (socket: Socket | null, conversationId: string, userId: string) => {
    socket?.emit('typing:stop', { conversationId, userId });
  },
};
