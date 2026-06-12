import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

// Use '/' so Vite's dev proxy forwards socket.io to the backend.
// In production, set VITE_SOCKET_URL to the actual server URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? '/' : 'http://localhost:5000');

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

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
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
      setConnected(false);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, isAuthenticated]);

  const joinRoom = useCallback((roomId) => {
    socketRef.current?.emit('join-room', roomId);
  }, []);

  const leaveRoom = useCallback((roomId) => {
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
