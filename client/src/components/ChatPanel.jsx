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

export default function ChatPanel({ room, roomId, socket, user, users = [], onLeaveRoom, onNavigateToFile }) {
  const [msgs,  setMsgs]  = useState([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('chat');
  const [typingUsers, setTypingUsers] = useState([]);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [mentionState, setMentionState] = useState(null);
  const [files, setFiles] = useState([]);
  const bottom = useRef(null);
  const typingTimer = useRef(null);

  // Load chat history
  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomId}/messages`);
      setMsgs(data.messages.map(m => ({
        id: m._id,
        userId: m.userId,
        username: m.username,
        avatarColor: m.avatarColor,
        message: m.message,
        imageUrl: m.imageUrl,
        timestamp: new Date(m.timestamp).getTime(),
        type: m.type || 'message',
      })));
      setTimeout(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) loadMessages();
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const handleMsg = m => setMsgs(p => [...p, { ...m, type: 'message' }]);

    const handleSystem = m => {
      setMsgs(p => {
        // Prevent duplicate system messages within 2 seconds
        const msgType = m.type || 'system';
        const isDupe = p.some(
          prev => prev.type === msgType && prev.username === m.username
            && prev.message === m.message && Math.abs(prev.timestamp - m.timestamp) < 2000
        );
        if (isDupe) return p;
        return [...p, { ...m, type: msgType, id: `sys-${m.timestamp}-${m.userId}` }];
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

  const handleTypingLocal = () => {
    if (!socket || !user) return;
    clearTimeout(typingTimer.current);
    socket.emit('user-typing', { roomId, username: user.username });
  };

  useEffect(() => {
    if (mentionState?.type === '#' && files.length === 0) {
      api.get(`/workspaces/${roomId}/files`).then(res => {
        setFiles((res.data?.files || []).map(f => f.path.replace(/^\//, '')));
      }).catch(() => {});
    }
  }, [mentionState?.type, files.length, roomId]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    handleTypingLocal();
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const match = textBeforeCursor.match(/(^|\s)([@#])([\w.-]*)$/);
    if (match) {
      setMentionState({
        type: match[2],
        query: match[3].toLowerCase(),
        startIdx: match.index + match[1].length
      });
    } else {
      setMentionState(null);
    }
  };

  const insertMention = (replacement) => {
    if (!mentionState) return;
    const before = input.substring(0, mentionState.startIdx);
    const after = input.substring(mentionState.startIdx + mentionState.type.length + mentionState.query.length);
    const newText = before + mentionState.type + replacement + ' ' + after;
    setInput(newText);
    setMentionState(null);
    const ta = document.getElementById('chat-textarea');
    if (ta) {
      ta.focus();
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = before.length + mentionState.type.length + replacement.length + 1; }, 0);
    }
  };

  const mentionOptions = (() => {
    if (!mentionState) return [];
    if (mentionState.type === '@') {
      const activeUsernames = Array.from(new Set(users.map(u => u.username).filter(Boolean)));
      return activeUsernames.filter(u => u.toLowerCase().includes(mentionState.query));
    } else if (mentionState.type === '#') {
      return files.filter(f => f.toLowerCase().includes(mentionState.query));
    }
    return [];
  })();

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Simple resize to avoid massive base64 strings
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        setImage(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    // Reset input
    e.target.value = '';
  };

  const send = () => {
    if ((!input.trim() && !image) || !socket) return;
    socket.emit('chat-message', { roomId, message: input.trim(), imageUrl: image });
    setInput('');
    setImage(null);
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
  const SystemMsg = ({ msg }) => {
    if (msg.type === 'permission_request') {
      const isHolder = room?.writeAccessUserId ? room.writeAccessUserId === user?._id : room?.ownerId === user?._id;
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '6px 0' }}>
          <div style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)', padding: '8px 14px', borderRadius: 12, textAlign: 'center', maxWidth: '90%' }}>
            <div style={{ fontSize: 12, color: '#E5E7EB', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#A78BFA' }}>vpn_key</span>
              {msg.message}
            </div>
            {isHolder && msg.userId !== user?._id && (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
                <button
                  onClick={() => socket.emit('grant-write-access', { roomId, targetUserId: msg.userId, targetUsername: msg.username })}
                  style={{ background: '#22C55E', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600, transition: '.15s' }}
                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  Approve
                </button>
                <button
                  onClick={() => socket.emit('reject-write-access', { roomId, targetUsername: msg.username })}
                  style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#FCA5A5', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 600, transition: '.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,.1)'}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (msg.type === 'permission_granted' || msg.type === 'permission_rejected') {
      const isGranted = msg.type === 'permission_granted';
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
          <div style={{ background: isGranted ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)', border: `1px solid ${isGranted ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)'}`, padding: '4px 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13, color: isGranted ? '#22C55E' : '#EF4444' }}>
              {isGranted ? 'check_circle' : 'cancel'}
            </span>
            <span style={{ fontSize: 11, color: isGranted ? '#4ADE80' : '#FCA5A5', fontWeight: 500 }}>{msg.message}</span>
          </div>
        </div>
      );
    }

    return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '6px 0', margin: '4px 0',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 999,
        background: msg.message?.includes('joined')
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
  )};

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
                  // System messages
                  if (['system', 'permission_request', 'permission_granted', 'permission_rejected'].includes(msg.type)) {
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
                            {msg.imageUrl && (
                              <div style={{ marginBottom: msg.message ? 8 : 0 }}>
                                <img src={msg.imageUrl} alt="attached" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
                              </div>
                            )}
                            {msg.message && (
                              <div>
                                {(() => {
                                  // Parse @username and #filename:line
                                  const tokenRegex = /(@[\w.-]+|#[\w.-]+:\d+)/g;
                                  const parts = (msg.message && typeof msg.message === 'string') ? msg.message.split(tokenRegex) : [msg.message || ''];
                                  return parts.map((part, idx) => {
                                    if (part.startsWith('@')) {
                                      return <span key={idx} style={{ color: '#A78BFA', fontWeight: 600, background: 'rgba(167,139,250,.1)', padding: '0 4px', borderRadius: 4 }}>{part}</span>;
                                    } else if (part.startsWith('#')) {
                                      const [file, line] = part.substring(1).split(':');
                                      return (
                                        <span
                                          key={idx}
                                          onClick={() => onNavigateToFile?.(file, parseInt(line, 10))}
                                          style={{ color: '#34D399', fontWeight: 600, background: 'rgba(52,211,153,.1)', padding: '0 4px', borderRadius: 4, cursor: onNavigateToFile ? 'pointer' : 'default', textDecoration: onNavigateToFile ? 'underline' : 'none' }}
                                        >
                                          {part}
                                        </span>
                                      );
                                    }
                                    return <span key={idx}>{part}</span>;
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            <div ref={bottom} />
          </div>

          {/* Typing indicator (Outside scroll area) */}
          <div style={{ height: typingUsers.filter(u => u !== user?.username).length > 0 ? 24 : 0, transition: 'height 0.2s', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
            {typingUsers.filter(u => u !== user?.username).length > 0 && (
              <div style={{ fontSize: 11, color: '#A78BFA', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'flex', gap: 2 }}>
                  <span className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#A78BFA', animation: 'blink 1.4s infinite both', animationDelay: '0s' }} />
                  <span className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#A78BFA', animation: 'blink 1.4s infinite both', animationDelay: '.2s' }} />
                  <span className="typing-dot" style={{ width: 4, height: 4, borderRadius: '50%', background: '#A78BFA', animation: 'blink 1.4s infinite both', animationDelay: '.4s' }} />
                </span>
                {typingUsers.filter(u => u !== user?.username).join(', ')} {typingUsers.filter(u => u !== user?.username).length > 1 ? 'are' : 'is'} typing...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #3C3C3C', flexShrink: 0 }}>
            {image && (
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                <img src={image} alt="Upload preview" style={{ height: 60, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                <button
                  onClick={() => setImage(null)}
                  style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#EF4444', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                </button>
              </div>
            )}

            {/* Autocomplete Popup */}
            {mentionState && mentionOptions.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '100%', left: 12, right: 12, marginBottom: 8,
                background: '#1F2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
                maxHeight: 160, overflowY: 'auto', zIndex: 10, boxShadow: '0 -4px 12px rgba(0,0,0,0.5)'
              }} className="scroll">
                {mentionOptions.map((opt, i) => (
                  <div
                    key={i}
                    onClick={() => insertMention(opt)}
                    style={{
                      padding: '8px 12px', fontSize: 13, color: '#E5E7EB', cursor: 'pointer',
                      borderBottom: i < mentionOptions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                      transition: 'background 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ color: mentionState.type === '@' ? '#A78BFA' : '#34D399', marginRight: 6, fontWeight: 600 }}>{mentionState.type}</span>
                    {opt}
                  </div>
                ))}
              </div>
            )}

            <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '4px 8px', transition: 'border-color .2s, box-shadow .2s' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, color: '#9CA3AF', transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>image</span>
              </label>
              <textarea
                id="chat-textarea"
                value={input}
                onChange={handleInputChange}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                    e.target.style.height = 'auto';
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                style={{
                  flex: 1, padding: '6px 0', minHeight: 32, maxHeight: 120,
                  background: 'transparent', border: 'none', resize: 'none',
                  fontSize: 13, color: '#E5E7EB', fontFamily: "'Inter', sans-serif", outline: 'none',
                  lineHeight: '20px'
                }}
                onFocus={e => { e.target.parentElement.style.borderColor = '#8B5CF6'; e.target.parentElement.style.boxShadow = '0 0 0 3px rgba(139,92,246,.15)'; }}
                onBlur={e => { e.target.parentElement.style.borderColor = 'rgba(255,255,255,.1)'; e.target.parentElement.style.boxShadow = 'none'; }}
              />
              <button
                onClick={() => {
                  send();
                  const ta = document.querySelector('textarea');
                  if (ta) ta.style.height = 'auto';
                }}
                disabled={!input.trim() && !image}
                style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: (input.trim() || image) ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'transparent',
                  border: 'none', cursor: (input.trim() || image) ? 'pointer' : 'default',
                  color: (input.trim() || image) ? '#fff' : '#4B5563', transition: 'all .15s', flexShrink: 0
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
