import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

// In production (single-service deploy), socket connects to same origin.
// In dev, Vite proxy handles forwarding.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Track the active roomId so we can re-join after reconnection
  const activeRoomRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      // ─── Aggressive reconnection to keep user connected ───
      reconnection: true,
      reconnectionAttempts: Infinity,   // Never stop trying
      reconnectionDelay: 1000,          // Start with 1s
      reconnectionDelayMax: 10000,      // Cap at 10s between retries
      randomizationFactor: 0.3,         // Add jitter to prevent thundering herd
      timeout: 30000,                   // 30s to establish initial connection
    });

    socket.on('connect', () => {
      setConnected(true);

      // Re-join the room automatically after reconnection
      if (activeRoomRef.current) {
        socket.emit('join-room', activeRoomRef.current);
      }
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      // If server disconnected us (e.g. deploy), force reconnect
      if (reason === 'io server disconnect') {
        socket.connect();
      }
      // For all other reasons (transport close, ping timeout),
      // Socket.IO auto-reconnects because reconnection: true
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setConnected(false);
      // Don't disconnect — Socket.IO will auto-retry with backoff
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, isAuthenticated]);

  const joinRoom = useCallback((roomId) => {
    activeRoomRef.current = roomId;
    socketRef.current?.emit('join-room', roomId);
  }, []);

  const leaveRoom = useCallback((roomId) => {
    activeRoomRef.current = null;
    socketRef.current?.emit('leave-room', roomId);
  }, []);

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, connected, joinRoom, leaveRoom }}
    >
      {children}
    </SocketContext.Provider>
  );
}
