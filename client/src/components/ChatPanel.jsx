import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const PALETTE = ['#F3F4F6','#34D399','#FB7185','#FBBF24','#60A5FA','#F97316','#E879F9','#2DD4BF'];
const nameColor = name => {
  let h = 0; for (let c of name) h = c.charCodeAt(0) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};
const fmtTime = ts => new Date(ts).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

export default function ChatPanel({ roomId, socket, user }) {
  const [msgs,  setMsgs]  = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const bottom = useRef(null);

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
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    socket.on('chat-message', m => setMsgs(p => [...p, m]));
    return () => socket.off('chat-message');
  }, [socket]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior:'smooth' });
  }, [msgs]);

  const send = () => {
    if (!input.trim() || !socket) return;
    socket.emit('chat-message', { roomId, message: input.trim() });
    setInput('');
  };

  return (
    <aside
      style={{
        width: 280, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(5,5,12,.98)',
        borderLeft: '1px solid rgba(255,255,255,.05)',
      }}
    >
      {/* Header */}
      <div
        style={{
          height: 40, padding: '0 14px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,.05)',
          background: 'rgba(8,8,16,.98)',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span className="material-symbols-outlined" style={{ fontSize:15,color:'#D1D5DB' }}>forum</span>
          <span style={{ fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#4B5563' }}>
            Team Chat
          </span>
          {msgs.length > 0 && (
            <span style={{ fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:999,background:'rgba(255,255,255,.2)',color:'#F3F4F6' }}>
              {msgs.length}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="scroll" style={{ flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:12 }}>
        {msgs.length === 0 ? (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, textAlign:'center', padding:'24px 0' }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize:22,color:'#D1D5DB' }}>
                {loading ? 'hourglass_empty' : 'chat_bubble_outline'}
              </span>
            </div>
            <div>
              <p style={{ fontSize:13,fontWeight:600,color:'#6B7280' }}>{loading ? 'Loading history…' : 'No messages yet'}</p>
              {!loading && <p style={{ fontSize:12,color:'#374151',marginTop:3 }}>Say something!</p>}
            </div>
          </div>
        ) : msgs.map((msg, i) => {
          const isMe = msg.username === user?.username;
          const color = msg.avatarColor || nameColor(msg.username || 'U');
          return (
            <div key={msg.id||i} className="anim-msg" style={{ display:'flex', gap:8 }}>
              <div style={{ width:26,height:26,borderRadius:'50%',background:color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',flexShrink:0,marginTop:2 }}>
                {(msg.username||'?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:3 }}>
                  <span style={{ fontSize:12,fontWeight:700,color }}>{isMe?'You':msg.username}</span>
                  <span style={{ fontSize:10,color:'#374151',fontFamily:'JetBrains Mono,monospace' }}>{fmtTime(msg.timestamp)}</span>
                </div>
                <div style={{
                  fontSize:13, lineHeight:1.6, padding:'8px 12px', borderRadius:'10px 10px 10px 2px',
                  background: isMe ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${isMe?'rgba(255,255,255,.25)':'rgba(255,255,255,.05)'}`,
                  color:'#D1D5DB', wordBreak:'break-word',
                }}>
                  {msg.message}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid rgba(255,255,255,.05)', flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder="Send a message…"
            style={{
              width:'100%', padding:'9px 40px 9px 12px', borderRadius:9,
              background:'rgba(0,0,0,.45)', border:'1px solid rgba(255,255,255,.07)',
              fontSize:13, color:'#F1F5F9', fontFamily:"'Inter',sans-serif", outline:'none',
              transition:'border-color .2s, box-shadow .2s',
            }}
            onFocus={e=>{e.target.style.borderColor='rgba(255,255,255,.55)';e.target.style.boxShadow='0 0 0 3px rgba(255,255,255,.12)';}}
            onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.07)';e.target.style.boxShadow='none';}}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            style={{
              position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',
              background:'none',border:'none',cursor:input.trim()?'pointer':'default',
              color:input.trim()?'#D1D5DB':'#374151',transition:'color .15s',lineHeight:0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize:18 }}>send</span>
          </button>
        </div>
        <p style={{ fontSize:10,color:'#374151',marginTop:5,marginLeft:2,fontFamily:'JetBrains Mono,monospace' }}>↵ Enter to send</p>
      </div>
    </aside>
  );
}
