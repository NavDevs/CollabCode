import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ICONS = {
  join: 'login',
  leave: 'logout',
  execute: 'play_arrow',
  commit: 'commit',
  settings: 'settings',
  system: 'info',
};

const COLORS = {
  join: '#10B981',
  leave: '#F59E0B',
  execute: '#3B82F6',
  commit: '#D1D5DB',
  settings: '#6366F1',
  system: '#6B7280',
};

export default function NotificationDropdown() {
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  // Load notifications on mount and when socket connects
  useEffect(() => {
    loadNotifications();
  }, [connected]);

  const loadNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Silently fail - user may not be authenticated yet
    }
  };

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNotification = (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      // Optional: pop a toast for high priority ones
      if (['execute', 'commit', 'join'].includes(notif.type)) {
        toast(notif.title, {
          icon: <span className="material-symbols-outlined" style={{ color: COLORS[notif.type] || '#fff', fontSize: 18 }}>{ICONS[notif.type] || 'info'}</span>,
          style: { background: '#111120', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        });
      }
    };

    socket.on('notification', handleNotification);
    return () => socket.off('notification', handleNotification);
  }, [socket, connected]);

  // Click outside to close
  useEffect(() => {
    const handleClick = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read locally and remotely
    if (!notif.read) {
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      api.put(`/notifications/${notif._id}/read`).catch(() => {});
    }

    setOpen(false);
    if (notif.roomId) {
      navigate(`/editor/${notif.roomId}`);
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        title="Notifications"
        onClick={() => { setOpen(!open); if(!open && unreadCount > 0) markAllRead(); }}
        style={{
          width: 32, height: 32, borderRadius: 7,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'rgba(255,255,255,.07)' : 'transparent', 
          border: 'none', position: 'relative',
          color: open ? '#F1F5F9' : '#4B5563', cursor: 'pointer',
          transition: 'background .15s, color .15s',
        }}
        onMouseEnter={e => { if(!open) { e.currentTarget.style.background='rgba(255,255,255,.07)'; e.currentTarget.style.color='#9CA3AF'; } }}
        onMouseLeave={e => { if(!open) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#4B5563'; } }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 19 }}>notifications_none</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 8, height: 8,
            background: '#EF4444', borderRadius: '50%',
            boxShadow: '0 0 0 2px rgba(5,5,12,.98)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          width: 340, maxHeight: 480, overflowY: 'auto',
          background: '#0A0A0A', borderRadius: 16,
          border: '1px solid rgba(255,255,255,.08)',
          boxShadow: '0 10px 40px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.02)',
          zIndex: 100, display: 'flex', flexDirection: 'column',
          animation: 'fade-up 0.2s ease-out',
        }} className="scroll">
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,.05)', position: 'sticky', top: 0, background: 'rgba(12,12,29,.95)', backdropFilter: 'blur(8px)', zIndex: 2 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9', margin: 0 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 600, color: '#D1D5DB', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.5, marginBottom: 8 }}>notifications_off</span>
                <p style={{ fontSize: 13, margin: 0 }}>You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif, idx) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    display: 'flex', gap: 14, padding: '16px 20px',
                    borderBottom: idx === notifications.length - 1 ? 'none' : '1px solid rgba(255,255,255,.03)',
                    background: notif.read ? 'transparent' : 'rgba(255,255,255,.04)',
                    cursor: 'pointer', transition: 'background 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = notif.read ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : 'rgba(255,255,255,.04)'}
                >
                  {!notif.read && (
                    <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB' }} />
                  )}
                  
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `${COLORS[notif.type] || COLORS.system}15`,
                    color: COLORS[notif.type] || COLORS.system,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ICONS[notif.type] || ICONS.system}</span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: notif.read ? 500 : 600, color: notif.read ? '#D1D5DB' : '#F1F5F9', margin: '0 0 4px 0', lineHeight: 1.4 }}>
                      {notif.title}
                    </p>
                    {notif.message && (
                      <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                        {notif.message}
                      </p>
                    )}
                    <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
