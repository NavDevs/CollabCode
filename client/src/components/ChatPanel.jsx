import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const PALETTE = ['#F3F4F6','#34D399','#FB7185','#FBBF24','#60A5FA','#F97316','#E879F9','#2DD4BF'];
const nameColor = name => {
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};
const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
const fmtDate = ts => {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month:'short', day:'numeric' });
};

export default function ChatPanel({ roomId, socket, user, users = [], onLeaveRoom }) {
  const [msgs,  setMsgs]  = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [typingUsers, setTypingUsers] = useState([]);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const bottom = useRef(null);
  const typingTimer = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    if (!roomId) return;
    api.get(`/rooms/${roomId}/messages`)
      .then(({ data }) => {
        setMsgs(data.messages.map(m => ({
          id: m._id,
          userId: m.userId,
          username: m.username,
          avatarColor: m.avatarColor,
          message: m.message,
          timestamp: new Date(m.timestamp).getTime(),
          type: 'message',
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleMsg = m => setMsgs(p => [...p, { ...m, type: 'message' }]);

    const handleSystem = m => {
      setMsgs(p => {
        // Prevent duplicate system messages within 2 seconds
        const isDupe = p.some(
          prev => prev.type === 'system' && prev.username === m.username
            && prev.message === m.message && Math.abs(prev.timestamp - m.timestamp) < 2000
        );
        if (isDupe) return p;
        return [...p, { ...m, type: 'system', id: `sys-${m.timestamp}-${m.userId}` }];
      });
    };

    const handleTyping = ({ username }) => {
      setTypingUsers(p => {
        if (p.includes(username)) return p;
        return [...p, username];
      });
      setTimeout(() => {
        setTypingUsers(p => p.filter(u => u !== username));
      }, 3000);
    };

    socket.on('chat-message', handleMsg);
    socket.on('chat-system', handleSystem);
    socket.on('user-typing', handleTyping);

    return () => {
      socket.off('chat-message', handleMsg);
      socket.off('chat-system', handleSystem);
      socket.off('user-typing', handleTyping);
    };
  }, [socket]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs]);

  const handleTyping = () => {
    if (!socket || !user) return;
    clearTimeout(typingTimer.current);
    socket.emit('user-typing', { roomId, username: user.username });
  };

  const send = () => {
    if (!input.trim() || !socket) return;
    socket.emit('chat-message', { roomId, message: input.trim() });
    setInput('');
    setTypingUsers(p => p.filter(u => u !== user?.username));
  };

  const getDateKey = (ts) => new Date(ts).toDateString();

  const tabBtn = (tab, icon, label) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        flex: 1, padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
        background: activeTab === tab ? 'rgba(255,255,255,.08)' : 'transparent',
        border: 'none', borderBottom: activeTab === tab ? '2px solid #8B5CF6' : '2px solid transparent',
        color: activeTab === tab ? '#E5E7EB' : '#6B7280', fontSize: 11, fontWeight: 600,
        cursor: 'pointer', transition: 'all .15s', letterSpacing: '.04em',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{icon}</span>
      {label}
      {tab === 'members' && <span style={{ fontSize: 10, padding: '0 5px', borderRadius: 999, background: 'rgba(139,92,246,.25)', color: '#A78BFA', fontWeight: 700 }}>{users.length}</span>}
    </button>
  );

  /* ── System message bubble ── */
  const SystemMsg = ({ msg }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '6px 0', margin: '4px 0',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 999,
        background: msg.type === 'system' && msg.message?.includes('joined')
          ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.06)',
        border: msg.message?.includes('joined')
          ? '1px solid rgba(34,197,94,.15)' : '1px solid rgba(239,68,68,.1)',
      }}>
        <span className="material-symbols-outlined" style={{
          fontSize: 13,
          color: msg.message?.includes('joined') ? '#22C55E' : '#EF4444',
        }}>
          {msg.message?.includes('joined') ? 'login' : 'logout'}
        </span>
        <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>
          <strong style={{ color: msg.avatarColor || '#D1D5DB' }}>{msg.username}</strong>
          {' '}{msg.message?.includes('joined') ? 'joined the room' : 'left the room'}
        </span>
        <span style={{ fontSize: 10, color: '#4B5563' }}>{fmtTime(msg.timestamp)}</span>
      </div>
    </div>
  );

  return (
    <aside
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#1E1E1E',
        borderLeft: '1px solid #3C3C3C',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 14px', flexShrink: 0,
        borderBottom: '1px solid #3C3C3C',
        background: '#1E1E1E',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8B5CF6' }}>forum</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#E5E7EB', letterSpacing: '.02em' }}>
            Team Chat
          </span>
          {msgs.filter(m => m.type === 'message').length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: 'rgba(139,92,246,.2)', color: '#A78BFA' }}>
              {msgs.filter(m => m.type === 'message').length}
            </span>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,.03)', borderRadius: 6, overflow: 'hidden' }}>
          {tabBtn('chat', 'chat', 'CHAT')}
          {tabBtn('members', 'group', 'MEMBERS')}
        </div>
      </div>

      {/* Content area */}
      {activeTab === 'chat' ? (
        <>
          {/* Messages */}
          <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {msgs.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '24px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#8B5CF6' }}>
                    {loading ? 'hourglass_empty' : 'chat'}
                  </span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#9CA3AF' }}>{loading ? 'Loading history…' : 'No messages yet'}</p>
                  {!loading && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Start a conversation with your team!</p>}
                </div>
              </div>
            ) : (
              <>
                {msgs.map((msg, i) => {
                  // System messages (join/leave)
                  if (msg.type === 'system') {
                    return <SystemMsg key={msg.id || `sys-${i}`} msg={msg} />;
                  }

                  const isMe = msg.username === user?.username;
                  const color = msg.avatarColor || nameColor(msg.username || 'U');
                  const showDate = i === 0 || getDateKey(msg.timestamp) !== getDateKey(msgs[i - 1]?.timestamp);
                  const prevMsg = msgs[i - 1];
                  const showAvatar = !prevMsg || prevMsg.type === 'system' || prevMsg.username !== msg.username || (msg.timestamp - prevMsg.timestamp > 120000);

                  return (
                    <div key={msg.id || i}>
                      {/* Date separator */}
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '12px 0', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(255,255,255,.06)' }} />
                          <span style={{ position: 'relative', fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#1E1E1E', padding: '0 10px', letterSpacing: '.05em' }}>
                            {fmtDate(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      <div
                        className="anim-msg"
                        style={{
                          display: 'flex', gap: 8, padding: '4px 6px', borderRadius: 8,
                          marginTop: showAvatar ? 8 : 0,
                          transition: 'background .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Avatar */}
                        {showAvatar ? (
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}88)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
                            boxShadow: `0 2px 8px ${color}40`,
                          }}>
                            {(msg.username || '?').charAt(0).toUpperCase()}
                          </div>
                        ) : (
                          <div style={{ width: 32, flexShrink: 0 }} />
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Username + time */}
                          {showAvatar && (
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color }}>{isMe ? 'You' : msg.username}</span>
                              <span style={{ fontSize: 10, color: '#4B5563' }}>{fmtTime(msg.timestamp)}</span>
                            </div>
                          )}

                          {/* Message */}
                          <div style={{
                            fontSize: 13, lineHeight: 1.5, color: '#D1D5DB', wordBreak: 'break-word',
                          }}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Typing indicator */}
            {typingUsers.filter(u => u !== user?.username).length > 0 && (
              <div style={{ padding: '4px 8px', fontSize: 11, color: '#8B5CF6', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'flex', gap: 2 }}>
                  <span className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#8B5CF6', animation: 'blink 1.4s infinite both', animationDelay: '0s' }} />
                  <span className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#8B5CF6', animation: 'blink 1.4s infinite both', animationDelay: '.2s' }} />
                  <span className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#8B5CF6', animation: 'blink 1.4s infinite both', animationDelay: '.4s' }} />
                </span>
                {typingUsers.filter(u => u !== user?.username).join(', ')} typing...
              </div>
            )}

            <div ref={bottom} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #3C3C3C', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); handleTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Type a message…"
                style={{
                  width: '100%', padding: '10px 42px 10px 14px', borderRadius: 10,
                  background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)',
                  fontSize: 13, color: '#E5E7EB', fontFamily: "'Inter', sans-serif", outline: 'none',
                  transition: 'border-color .2s, box-shadow .2s',
                }}
                onFocus={e => { e.target.style.borderColor = '#8B5CF6'; e.target.style.boxShadow = '0 0 0 3px rgba(139,92,246,.15)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.1)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: input.trim() ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'transparent',
                  border: 'none', cursor: input.trim() ? 'pointer' : 'default',
                  color: input.trim() ? '#fff' : '#4B5563', transition: 'all .15s', lineHeight: 0,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span>
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Members Tab */
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
          {/* Online Members */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                Online — {users.length}
              </span>
            </div>

            {users.map((u, i) => {
              const isMe = u.username === user?.username || u.userId === user?._id;
              const color = u.avatarColor || nameColor(u.username || 'U');
              return (
                <div
                  key={u.userId || i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                    borderRadius: 8, marginBottom: 2, transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Avatar with online dot */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${color}, ${color}88)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#fff',
                      boxShadow: `0 2px 8px ${color}30`,
                    }}>
                      {(u.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#22C55E', border: '2px solid #1E1E1E',
                    }} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#E5E7EB', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.username}
                      </span>
                      {isMe && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(139,92,246,.2)', color: '#A78BFA' }}>YOU</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#6B7280' }}>
                      {isMe ? 'That\'s you!' : 'Collaborating'}
                    </span>
                  </div>

                  {/* Role indicator */}
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#4B5563' }}>
                    {i === 0 ? 'shield_person' : 'code'}
                  </span>
                </div>
              );
            })}

            {users.length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#4B5563', marginBottom: 8, display: 'block' }}>person_off</span>
                <p style={{ fontSize: 13, color: '#6B7280' }}>No one is online</p>
              </div>
            )}
          </div>

          {/* Room Info */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>
              Room Info
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9CA3AF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>tag</span>
                Room ID: <span style={{ color: '#E5E7EB', fontFamily: 'JetBrains Mono, monospace' }}>{roomId}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9CA3AF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>group</span>
                {users.length} member{users.length !== 1 ? 's' : ''} online
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9CA3AF' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chat</span>
                {msgs.filter(m => m.type === 'message').length} message{msgs.filter(m => m.type === 'message').length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Leave Room Button */}
          {onLeaveRoom && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14, marginTop: 14 }}>
              {!leaveConfirm ? (
                <button
                  onClick={() => setLeaveConfirm(true)}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 8,
                    background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
                    color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.15)'; e.currentTarget.style.borderColor='rgba(239,68,68,.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,.08)'; e.currentTarget.style.borderColor='rgba(239,68,68,.2)'; }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                  Leave Room
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 600, textAlign: 'center' }}>
                    Leave this room? It will be removed from your dashboard.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setLeaveConfirm(false)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6,
                        background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
                        color: '#9CA3AF', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onLeaveRoom}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 6,
                        background: '#EF4444', border: 'none',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background='#DC2626'}
                      onMouseLeave={e => e.currentTarget.style.background='#EF4444'}
                    >
                      Confirm Leave
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
