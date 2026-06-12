import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function GlobalSearchModal({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setRooms([]);
      return;
    }
    const delay = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/rooms');
        const q = query.toLowerCase();
        setRooms((data.rooms || []).filter(r => 
          r.title.toLowerCase().includes(q) || 
          r.language.toLowerCase().includes(q) ||
          r.roomId.toLowerCase().includes(q)
        ));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        background: 'rgba(0,0,0,.6)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          background: '#0F0F1A',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.15)',
          overflow: 'hidden',
          animation: 'fade-down .2s ease'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(255,255,255,.02)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#9CA3AF' }}>search</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search rooms by name, language, or ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, padding: '20px 16px', background: 'transparent', border: 'none',
              fontSize: 16, color: '#F1F5F9', outline: 'none'
            }}
          />
          <kbd style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.1)', fontSize: 11, fontFamily: 'inherit', fontWeight: 600, color: '#9CA3AF' }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto', padding: 8 }}>
          {!query.trim() ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
              Type to start searching across your workspace...
            </div>
          ) : loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
              Searching...
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
              No results found for "{query}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {rooms.map(room => (
                <div
                  key={room.roomId}
                  onClick={() => { navigate(`/editor/${room.roomId}`); onClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#F3F4F6' }}>meeting_room</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>{room.title}</span>
                      <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>ID: {room.roomId} • {room.language}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4B5563' }}>arrow_forward</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
