import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import SideNav from '../components/SideNav';
import Footer from '../components/Footer';
import Editor from '../components/MonacoEditor';
import ChatPanel from '../components/ChatPanel';
import GithubPanel from '../components/GithubPanel';
import FileTree from '../components/FileTree';
import RoomSettingsModal from '../components/RoomSettingsModal';
import WebTerminal from '../components/WebTerminal';

const EXT   = { python:'py',typescript:'ts',javascript:'js',html:'html',css:'css',go:'go',rust:'rs',java:'java',cpp:'cpp',ruby:'rb',c:'c',php:'php',bash:'sh' };
const ICON  = { javascript:'javascript',typescript:'javascript',python:'database',go:'bolt',html:'html',css:'css',rust:'memory',java:'terminal',cpp:'terminal',c:'terminal',ruby:'diamond',php:'php',bash:'terminal' };

// Auto-detect language from file extension
const EXT_TO_LANG = {
  js:'javascript', jsx:'javascript', mjs:'javascript', cjs:'javascript',
  ts:'typescript', tsx:'typescript',
  py:'python', pyw:'python',
  java:'java',
  cpp:'cpp', cc:'cpp', cxx:'cpp', hpp:'cpp',
  c:'c', h:'c',
  go:'go',
  rs:'rust',
  rb:'ruby',
  php:'php',
  sh:'bash', bash:'bash',
  html:'html', htm:'html',
  css:'css', scss:'css', less:'css',
  json:'json', md:'markdown', sql:'sql', xml:'xml', yaml:'yaml', yml:'yaml',
};
const getLangFromPath = (p) => {
  if (!p) return 'javascript';
  const ext = p.split('.').pop()?.toLowerCase();
  return EXT_TO_LANG[ext] || 'plaintext';
};
const PCLR  = ['#F3F4F6','#34D399','#60A5FA','#FBBF24','#FB7185','#22D3EE','#F97316','#E879F9'];

/* ── Keybinding hint ── */
const isMac = navigator.platform.toUpperCase().includes('MAC');
const RUN_HINT = isMac ? '⌘↵' : 'Ctrl+↵';

/* ── Share / Invite Modal ── */
function ShareModal({ roomId, onClose }) {
  const url = `${window.location.origin}/editor/${roomId}`;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16, background:'rgba(0,0,0,.75)',backdropFilter:'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ width:'100%',maxWidth:440,borderRadius:20,padding:28, background:'#0A0A0A',border:'1px solid rgba(255,255,255,.25)',boxShadow:'0 40px 100px rgba(0,0,0,.7)', animation:'fade-up .22s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:17,fontWeight:700,color:'#F1F5F9' }}>Invite teammates</h2>
            <p style={{ fontSize:13,color:'#4B5563',marginTop:3 }}>Share this link — anyone with it can join the room.</p>
          </div>
          <button onClick={onClose} style={{ width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.05)',border:'none',cursor:'pointer',color:'#6B7280' }}>
            <span className="material-symbols-outlined" style={{ fontSize:17 }}>close</span>
          </button>
        </div>

        {/* Presence strip */}
        <div style={{ marginBottom:20,padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}>
          <p style={{ fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#374151',marginBottom:8 }}>How to invite</p>
          <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
            {[
              { n:'1', t:'Copy the link below' },
              { n:'2', t:'Send it to your teammates via chat, email, or Slack' },
              { n:'3', t:'They open the link — that\'s it. No install needed.' },
            ].map(s => (
              <div key={s.n} style={{ display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:20,height:20,borderRadius:'50%',background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#F3F4F6',flexShrink:0 }}>{s.n}</div>
                <span style={{ fontSize:13,color:'#6B7280' }}>{s.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* URL row */}
        <div style={{ display:'flex',gap:8 }}>
          <div style={{ flex:1,padding:'10px 14px',borderRadius:9,background:'rgba(0,0,0,.45)',border:'1px solid rgba(255,255,255,.07)',fontSize:12,color:'#6B7280',fontFamily:'JetBrains Mono,monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
            {url}
          </div>
          <button
            onClick={copy}
            style={{ display:'flex',alignItems:'center',gap:6,padding:'10px 16px',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all .15s',
              background: copied ? 'rgba(16,185,129,.2)' : 'linear-gradient(135deg,#D1D5DB,#6B7280)',
              color: copied ? '#34D399' : '#fff',
              boxShadow: copied ? 'none' : '0 3px 14px rgba(255,255,255,.35)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize:16 }}>{copied ? 'check_circle' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function EditorPage() {
  const { roomId } = useParams();
  const { user }   = useAuth();
  const { socket, connected, joinRoom, leaveRoom } = useSocket();
  const navigate   = useNavigate();

  // Remember last active editor for cross-page navigation
  useEffect(() => {
    if (roomId) {
      localStorage.setItem('cc_lastRoom', JSON.stringify({ roomId, ts: Date.now() }));
    }
    return () => {};
  }, [roomId]);

  const [room,        setRoom]        = useState(null);
  const [code,        setCode]        = useState('');
  const [loading,     setLoading]     = useState(true);
  const [users,       setUsers]       = useState([]);
  const [cursors,     setCursors]     = useState({});
  const [pos,         setPos]         = useState({ line:1, col:1 });
  const [running,     setRunning]     = useState(false);
  const [showTerminal,setShowTerminal]= useState(false);

  const [fileTreeRefresh, setFileTreeRefresh] = useState(0);
  const [termHeight,  setTermHeight]  = useState(220);
  const [showShare,   setShowShare]   = useState(false);
  const [showSettings,setShowSettings]= useState(false);
  const [activeTab,   setActiveTab]   = useState('explorer');
  const [passwordReq, setPasswordReq] = useState(false);
  const [roomPwd,     setRoomPwd]     = useState('');
  const [joining,     setJoining]     = useState(false);

   // File system state
  const [activePath,  setActivePath]  = useState(null);
  const [openPaths,   setOpenPaths]   = useState([]);

  // Panel visibility & sizing
  const [showExplorer, setShowExplorer] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [chatWidth, setChatWidth] = useState(280);

  // Drag utility for resizable panels
  const startDrag = useCallback((e, onDrag) => {
    e.preventDefault();
    let last = e.clientX;
    const el = e.currentTarget;
    el.style.background = '#007ACC';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (ev) => {
      const dx = ev.clientX - last;
      last = ev.clientX;
      if (dx !== 0) onDrag(dx);
    };
    const up = () => {
      el.style.background = 'transparent';
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, []);


  const editorRef    = useRef(null);   // exposes getValue()
  const ydocRef      = useRef(null);   // local Y.Doc
  const isRemoteRef  = useRef(false);  // flag to skip re-emitting remote changes
  const activePathRef = useRef(null);  // tracks activePath for closures
  const isSwitchingRef = useRef(false); // blocks onChange during file switch

  /* ── Load room ── */
  useEffect(() => {
    load();
    return () => { if (socket && roomId) leaveRoom(roomId); };
  }, [roomId]);



  /* ── File content cache to avoid blank flash on switch ── */
  const fileCacheRef = useRef({});

  /* ── Socket setup for Yjs (runs on activePath change) ── */
  useEffect(() => {
    if (!socket || !connected || !roomId || !activePath) return;

    // Show cached content instantly (zero latency)
    isSwitchingRef.current = true;
    activePathRef.current = activePath;
    if (fileCacheRef.current[activePath] !== undefined) {
      setCode(fileCacheRef.current[activePath]);
    } else {
      setCode('');
    }
    // Allow onChange after a tick (prevents stale closure from firing)
    setTimeout(() => { isSwitchingRef.current = false; }, 50);

    // Create Yjs doc for this file
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText('monaco');
    let cancelled = false;

    // Request Yjs state from server (fast, ~50ms via WebSocket)
    socket.emit('yjs-sync-request', { roomId, path: activePath });

    const handleSyncInit = ({ roomId: r, path: p, state }) => {
      if (r !== roomId || p !== activePath || cancelled) return;
      if (state && state.length > 0) {
        isRemoteRef.current = true;
        Y.applyUpdate(ydoc, new Uint8Array(state));
        const content = ytext.toString();
        setCode(content);
        fileCacheRef.current[activePath] = content;
        isRemoteRef.current = false;
      } else if (!fileCacheRef.current[activePath]) {
        // No Yjs state and no cache — load from DB as fallback
        api.get(`/workspaces/${roomId}/files`).then(({ data }) => {
          if (cancelled) return;
          const file = (data.files || []).find(f => f.path === activePath);
          if (file && file.content) {
            setCode(file.content);
            fileCacheRef.current[activePath] = file.content;
          }
        }).catch(() => {});
      }
    };

    const handleUpdate = ({ roomId: r, path: p, update }) => {
      if (r !== roomId || p !== activePath || cancelled) return;
      if (update) {
        isRemoteRef.current = true;
        Y.applyUpdate(ydoc, new Uint8Array(update));
        const content = ytext.toString();
        setCode(content);
        fileCacheRef.current[activePath] = content;
        isRemoteRef.current = false;
      }
    };

    socket.on('yjs-sync-init', handleSyncInit);
    socket.on('yjs-update', handleUpdate);

    return () => {
      cancelled = true;
      // Cache current content before leaving
      const currentContent = editorRef.current?.getValue?.();
      if (currentContent) {
        fileCacheRef.current[activePath] = currentContent;
      }
      socket.off('yjs-sync-init', handleSyncInit);
      socket.off('yjs-update', handleUpdate);
      ydoc.destroy();
      ydocRef.current = null;
    };
  }, [socket, connected, roomId, activePath]);

  /* ── Global Socket Setup ── */
  useEffect(() => {
    if (!socket || !connected || !roomId) return;
    joinRoom(roomId);

    // Authoritative full list — server sends this on every join/leave/disconnect
    socket.on('room-users', list => {
      // Deduplicate by userId (in case of reconnects)
      const unique = [];
      const seen = new Set();
      for (const u of list) {
        if (!seen.has(u.userId)) {
          seen.add(u.userId);
          unique.push(u);
        }
      }
      setUsers(unique);
    });

    // Individual join — show toast (server also sends room-users after this)
    socket.on('user-joined', u => {
      if (u.userId !== user?._id) {
        toast.success(`${u.username} joined`, { id: `join-${u.userId}` });
      }
    });

    // Individual leave — cleanup cursors, show toast (server also sends room-users after this)
    socket.on('user-left', u => {
      setCursors(prev => {
        const next = { ...prev };
        delete next[u.userId];
        return next;
      });
      if (u.userId !== user?._id) {
        toast(`${u.username} left`, { icon: '👋', id: `leave-${u.userId}` });
      }
    });

    socket.on('cursor-updated', ({ userId, username, avatarColor, cursor }) =>
      setCursors(p => ({ ...p, [userId]: { username, avatarColor, cursor } }))
    );

    /* Execution events */
    socket.on('exec-start', () => { setRunning(true); setShowTerminal(true); });
    socket.on('exec-done',  () => setRunning(false));

    return () => {
      ['room-users','user-joined','user-left','cursor-updated','exec-start','exec-done']
        .forEach(e => socket.off(e));
    };
  }, [socket, connected, roomId]);

  const load = async (pwd = '') => {
    try {
      setJoining(true);
      const { data } = await api.post(`/rooms/${roomId}/join`, pwd ? { password: pwd } : {});
      setRoom(data.room);
      setPasswordReq(false);
      try { const r2 = await api.get(`/rooms/${roomId}`); if (r2.data.room) setRoom(r2.data.room); } catch {}
    } catch (err) {
      if (err.response?.status === 401 && err.response?.data?.code === 'PASSWORD_REQUIRED') {
        setPasswordReq(true);
      } else if (err.response?.status === 401) {
        toast.error('Incorrect password.');
        setPasswordReq(true);
      } else {
        toast.error('Room not found.');
        navigate('/dashboard');
      }
    }
    finally { setLoading(false); setJoining(false); }
  };

  /* ── Cursor broadcast ── */
  const onCursor = useCallback(p => {
    setPos({ line:p.lineNumber, col:p.column });
    if (socket && connected)
      socket.emit('cursor-change', { roomId, cursor:{line:p.lineNumber,col:p.column} });
  }, [socket, connected, roomId]);

  /* ── Run code ── */
  const runCode = useCallback(() => {
    if (running || !socket || !connected || !activePath) return;
    const code = editorRef.current?.getValue() ?? '';
    if (!code.trim()) { toast.error('Nothing to run.'); return; }
    setShowTerminal(true);
    // Sync latest files to disk before running
    socket.emit('terminal-sync');
    setTimeout(() => {
      socket.emit('code-execute', { roomId, path: activePath, language: getLangFromPath(activePath) });
    }, 300);
  }, [running, socket, connected, roomId, room, activePath]);

  /* ── Keyboard shortcut: Ctrl+Enter / Cmd+Enter ── */
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runCode(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [runCode]);

  const ext  = EXT[room?.language]  || 'js';
  const icon = ICON[room?.language] || 'terminal';

  /* ── Loading screen ── */
  if (loading) return (
    <div style={{ display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'var(--cc-bg, #050505)' }}>
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:14 }}>
        <div style={{ width:52,height:52,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.25)' }}>
          <span className="material-symbols-outlined anim-spin" style={{ fontSize:26,color:'#F3F4F6' }}>sync</span>
        </div>
        <p style={{ fontSize:13,color:'#4B5563' }}>Loading workspace…</p>
      </div>
    </div>
  );

  if (passwordReq) return (
    <div style={{ display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',background:'var(--cc-bg, #050505)' }}>
      <div style={{ width: '100%', maxWidth: 360, padding: 32, background: '#0A0A0A', borderRadius: 20, border: '1px solid rgba(255,255,255,.25)', boxShadow: '0 40px 100px rgba(0,0,0,.7)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, border: '1px solid rgba(255,255,255,.2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: '#F3F4F6' }}>lock</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#F1F5F9', marginBottom: 6 }}>Private Room</h2>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>This room requires a password to join.</p>
        <form onSubmit={e => { e.preventDefault(); load(roomPwd); }}>
          <input
            type="password"
            placeholder="Enter password..."
            value={roomPwd}
            onChange={e => setRoomPwd(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.07)', color: '#fff', fontSize: 13, outline: 'none', marginBottom: 20, transition: '.15s' }}
            onFocus={e => e.currentTarget.style.borderColor = '#D1D5DB'}
            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'}
            autoFocus
          />
          <button type="submit" disabled={joining || !roomPwd} style={{ width: '100%', padding: '12px', borderRadius: 10, background: 'linear-gradient(135deg, #D1D5DB 0%, #6B7280 100%)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: (joining || !roomPwd) ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(255,255,255,.3)' }}>
            {joining ? 'Joining...' : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  );

  const isReadOnly = room?.isReadOnly && user?._id !== room?.ownerId;

  return (
    <div style={{ display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'var(--cc-bg, #050505)' }}>

      {/* ══════════════════════ TOP BAR ══════════════════════ */}
      <header style={{
        height:48,flexShrink:0,zIndex:50,
        display:'flex',alignItems:'center',
        padding:'0 12px 0 16px',gap:0,
        background:'var(--cc-topnav, rgba(5,5,12,.98))',
        borderBottom:'1px solid rgba(255,255,255,.05)',
        backdropFilter:'blur(10px)',
        overflow:'hidden',
      }}>
        {/* Left section */}
        <div style={{ display:'flex',alignItems:'center',gap:10,height:'100%',flexShrink:1,minWidth:0,overflow:'hidden' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background:'linear-gradient(135deg,#F3F4F6 0%,#818CF8 100%)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
              fontSize:17,fontWeight:800,letterSpacing:'-0.02em',border:'none',cursor:'pointer',padding:0,
            }}
          >
            CollabCode
          </button>
          <span style={{ width:1,height:14,background:'rgba(255,255,255,.1)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize:13,fontWeight:600,color:'#F3F4F6',lineHeight:1.2 }}>{room?.title||'Untitled'}</span>
            {room?.githubRepo && (
              <span style={{ fontSize:11,fontWeight:500,color:'#9CA3AF',lineHeight:1.2,display:'flex',alignItems:'center',gap:4 }}>
                <span className="material-symbols-outlined" style={{ fontSize:12 }}>source</span>
                {room.githubRepo}
              </span>
            )}
          </div>

          {/* Language pill */}
          <div style={{
            display:'flex',alignItems:'center',gap:5,
            padding:'4px 10px',borderRadius:7,cursor:'pointer',
            background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)',
            color:'#F3F4F6',fontSize:11,fontWeight:600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize:13 }}>{icon}</span>
            {room?.language||'javascript'}
          </div>
        </div>

        {/* Center: Run button */}
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',minWidth:0,padding:'0 8px' }}>
          {!isReadOnly && (
            <button
              onClick={runCode}
              disabled={running}
              title={`Run  ${RUN_HINT}`}
              style={{
                display:'flex',alignItems:'center',gap:6,
                padding:'7px 20px',borderRadius:9,border:'none',
                background: running
                  ? 'rgba(255,255,255,.06)'
                  : 'linear-gradient(135deg,#059669 0%,#047857 100%)',
                color: running ? '#374151' : '#fff',
                fontSize:13,fontWeight:700,cursor:running?'not-allowed':'pointer',
                boxShadow: running?'none':'0 4px 20px rgba(5,150,105,.3),inset 0 1px 0 rgba(255,255,255,.15)',
                transition:'all .15s',letterSpacing:'0.01em',
              }}
              onMouseEnter={e=>{ if(!running){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(5,150,105,.4),inset 0 1px 0 rgba(255,255,255,.15)'; }}}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=running?'none':'0 4px 20px rgba(5,150,105,.3),inset 0 1px 0 rgba(255,255,255,.15)'; }}
            >
              {running ? (
                <><span className="material-symbols-outlined anim-spin" style={{ fontSize:15 }}>sync</span> Running…</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize:16 }}>play_arrow</span> Run &nbsp;<span style={{ opacity:.55,fontWeight:500,fontSize:11 }}>{RUN_HINT}</span></>
              )}
            </button>
          )}

        </div>

        {/* Right section */}
        <div style={{ display:'flex',alignItems:'center',gap:6,flexShrink:0 }}>
          {/* Presence avatars */}
          <div style={{ display:'flex',alignItems:'center' }}>
            {users.slice(0,5).map((u,i) => (
              <div
                key={u.userId}
                title={u.username}
                style={{
                  width:30,height:30,borderRadius:'50%',
                  border:'2px solid #050505',
                  background: u.avatarColor||PCLR[i%PCLR.length],
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:10,fontWeight:700,color:'#fff',
                  marginLeft:i>0?-8:0,zIndex:10-i,position:'relative',
                  outline:`2px solid ${u.avatarColor||PCLR[i%PCLR.length]}40`,outlineOffset:1,
                  cursor:'default',transition:'transform .15s',
                }}
                onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.15) translateY(-2px)';e.currentTarget.style.zIndex=30;}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.zIndex=10-i;}}
              >
                {u.username?.charAt(0).toUpperCase()}
              </div>
            ))}
            {users.length>5 && (
              <div style={{ width:30,height:30,borderRadius:'50%',border:'2px solid #050505',marginLeft:-8,background:'rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#6B7280' }}>
                +{users.length-5}
              </div>
            )}
          </div>

          <span style={{ width:1,height:14,background:'rgba(255,255,255,.08)' }} />

          {/* Share */}
          <NavBtn icon="share" title="Invite teammates" onClick={() => setShowShare(true)} />

          {/* Settings */}
          {user?._id === room?.ownerId && (
            <NavBtn icon="settings" title="Room Settings" onClick={() => setShowSettings(true)} />
          )}

          {/* Terminal toggle */}
          <NavBtn
            icon="terminal"
            title="Toggle terminal"
            active={showTerminal}
            onClick={() => setShowTerminal(!showTerminal)}
          />

          {/* Dashboard */}
          <NavBtn icon="dashboard" title="Dashboard" onClick={() => navigate('/dashboard')} />

          {/* App Settings */}
          <NavBtn icon="tune" title="App Settings" onClick={() => navigate('/settings')} />

          {/* Chat toggle */}
          <NavBtn
            icon="chat"
            title="Toggle chat"
            active={showChat}
            onClick={() => setShowChat(!showChat)}
          />

          {/* Self avatar */}
          <div
            title={user?.username}
            style={{ width:30,height:30,borderRadius:'50%',background:user?.avatarColor||'#D1D5DB',border:'2px solid #050505',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',outline:`2px solid ${user?.avatarColor||'#D1D5DB'}50`,outlineOffset:1 }}
          >
            {user?.username?.charAt(0).toUpperCase()||'U'}
          </div>
        </div>
      </header>

      {/* ══════════════════════ BODY ══════════════════════ */}
      <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
        <SideNav activeTab={activeTab} setActiveTab={(tab) => {
          if (tab === activeTab) {
            setShowExplorer(v => !v);
          } else {
            setActiveTab(tab);
            setShowExplorer(true);
          }
        }} showChat={showChat} setShowChat={setShowChat} />

        <main style={{ display:'flex',flex:1,overflow:'hidden',height:'100%',minWidth:0 }}>

          {showExplorer && (
              <div style={{ width: explorerWidth, minWidth: 160, maxWidth: 500, flexShrink:0, position:'relative', display:'flex' }}>
                <aside style={{ flex:1, display:'flex', flexDirection:'column', background:'var(--cc-bg-panel, rgba(5,5,12,.98))', overflow:'hidden' }}>
                  {activeTab === 'explorer' && (
                    <FileTree
                      roomId={roomId}
                      isOwner={user?._id === room?.ownerId}
                      activePath={activePath}
                      setActivePath={setActivePath}
                      openPaths={openPaths}
                      setOpenPaths={setOpenPaths}
                      refreshKey={fileTreeRefresh}
                    />
                  )}
                  {activeTab === 'github' && (
                    <GithubPanel 
                      roomId={roomId} 
                      onImportComplete={() => setFileTreeRefresh(r => r + 1)} 
                    />
                  )}
                </aside>
                {/* Drag handle — sits on the right edge of the wrapper, on top of everything */}
                <div
                  onMouseDown={e => startDrag(e, (dx) => setExplorerWidth(w => Math.max(160, Math.min(500, w + dx))))}
                  style={{
                    position:'absolute', top:0, bottom:0, right:-3, width:6,
                    cursor:'col-resize', zIndex:50,
                    background:'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='#007ACC'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                />
              </div>
          )}

          {/* ── Editor + Terminal column ── */}
          <div style={{ display:'flex',flexDirection:'column',flex:1,minWidth:0,overflow:'hidden' }}>

            {/* Tab bar */}
            <div style={{ height:36,flexShrink:0,display:'flex',alignItems:'center',background:'rgba(5,5,12,.95)',borderBottom:'1px solid rgba(255,255,255,.05)', overflowX:'auto' }} className="scroll">
            {openPaths.map(p => {
                const isActive = activePath === p;
                // Show folder/file for nested files, just filename for root
                const parts = p.split('/').filter(Boolean);
                const tabLabel = parts.length > 1 ? parts.slice(-2).join('/') : parts[parts.length - 1];
                return (
                  <div
                    key={p}
                    onClick={() => setActivePath(p)}
                    style={{
                      display:'flex',alignItems:'center',gap:6,padding:'0 16px',height:'100%',
                      borderRight:'1px solid rgba(255,255,255,.05)',
                      background: isActive ? 'rgba(255,255,255,.06)' : 'transparent',
                      color: isActive ? '#F3F4F6' : '#6B7280',
                      fontSize:13,fontWeight:500,cursor:'pointer',borderBottom: isActive ? '2px solid #F3F4F6' : '2px solid transparent',
                      whiteSpace:'nowrap',
                    }}
                  >
                    {parts.length > 1 && (
                      <span style={{ color: '#4B5563', fontSize: 12 }}>{parts.slice(0, -1).join('/') + '/'}</span>
                    )}
                    <span>{parts[parts.length - 1]}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = openPaths.filter(x => x !== p);
                        setOpenPaths(next);
                        if (isActive) setActivePath(next.length > 0 ? next[0] : null);
                      }}
                      style={{ marginLeft:4,width:18,height:18,borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',color:'#374151',cursor:'pointer' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize:12 }}>close</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Monaco editor + Preview */}
            <div style={{ flex:1,position:'relative',overflow:'hidden', display: 'flex' }}>
              
              <div style={{ flex:1, position:'relative' }}>
                <Editor
                  ref={editorRef}
                  language={getLangFromPath(activePath)}
                  readOnly={isReadOnly}
                  value={code}
                  onChange={val => {
                    // GUARD: Don't process changes during file switch
                    if (isSwitchingRef.current || isRemoteRef.current) return;
                    
                    const currentPath = activePathRef.current;
                    if (!currentPath) return;
                    
                    setCode(val || '');
                    fileCacheRef.current[currentPath] = val || '';
                    
                    // Broadcast change via Yjs
                    if (ydocRef.current && socket && connected) {
                      const ydoc = ydocRef.current;
                      const ytext = ydoc.getText('monaco');
                      ydoc.transact(() => {
                        ytext.delete(0, ytext.length);
                        ytext.insert(0, val || '');
                      });
                      const update = Y.encodeStateAsUpdate(ydoc);
                      socket.emit('yjs-update', { roomId, path: currentPath, update: Array.from(update) });
                    }
                    // Debounced save to DB
                    if (currentPath && roomId) {
                      clearTimeout(window.__saveTimer);
                      window.__saveTimer = setTimeout(() => {
                        api.put(`/workspaces/${roomId}/files/content`, {
                          path: currentPath,
                          content: val || '',
                        }).catch(() => {});
                      }, 1500);
                    }
                  }}
                  onCursorChange={onCursor}
                />

                {/* Remote cursors overlay */}
                {Object.entries(cursors).map(([uid,d]) => (
                  <div
                    key={uid}
                    className="pointer-events-none"
                    style={{ position:'absolute',top:`${(d.cursor.line-1)*22+20}px`,left:`${(d.cursor.col-1)*8.4+56}px`,zIndex:10 }}
                  >
                    <div style={{ width:2,height:20,background:d.avatarColor }} />
                    <div style={{ padding:'1px 6px',borderRadius:'0 4px 4px 4px',fontSize:10,fontWeight:700,color:'#fff',background:d.avatarColor,whiteSpace:'nowrap',boxShadow:'0 2px 8px rgba(0,0,0,.4)' }}>
                      {d.username}
                    </div>
                  </div>
                ))}
              </div>



            </div>

            {/* WebContainer Terminal */}
            {showTerminal && (
              <WebTerminal
                socket={socket}
                roomId={roomId}
                height={termHeight}
                onResize={(diff) => setTermHeight(h => Math.max(120, Math.min(600, h + diff)))}
              />
            )}
          </div>

          {/* Chat panel with resize */}
          {showChat && (
              <div style={{ width: chatWidth, flexShrink: 0, height: '100%', overflow: 'hidden', position:'relative' }}>
                {/* Left-edge drag handle */}
                <div
                  onMouseDown={e => startDrag(e, (dx) => setChatWidth(w => Math.max(220, Math.min(450, w - dx))))}
                  style={{
                    position:'absolute', top:0, bottom:0, left:0, width:6,
                    cursor:'col-resize', zIndex:30,
                    background:'transparent',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='#007ACC'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                />
                <ChatPanel roomId={roomId} socket={socket} user={user} users={users} />
              </div>
          )}
        </main>
      </div>

      <Footer language={room?.language||'JavaScript'} line={pos.line} col={pos.col} />

      {/* Share modal */}
      {showShare && <ShareModal roomId={roomId} onClose={() => setShowShare(false)} />}

      {/* Settings modal */}
      {showSettings && <RoomSettingsModal room={room} onClose={() => setShowSettings(false)} onUpdate={setRoom} />}
    </div>
  );
}

/* ── Small icon nav button ── */
function NavBtn({ icon, title, onClick, active }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width:32,height:32,borderRadius:7,
        display:'flex',alignItems:'center',justifyContent:'center',
        background: active ? 'rgba(255,255,255,.15)' : 'transparent',
        border:'none',
        color: active ? '#F3F4F6' : '#374151',
        cursor:'pointer',transition:'all .15s',
      }}
      onMouseEnter={e=>{ if(!active){e.currentTarget.style.background='rgba(255,255,255,.07)';e.currentTarget.style.color='#9CA3AF';}}}
      onMouseLeave={e=>{ if(!active){e.currentTarget.style.background='transparent';e.currentTarget.style.color='#374151';}}}
    >
      <span className="material-symbols-outlined" style={{ fontSize:18 }}>{icon}</span>
    </button>
  );
}

/* ── Explorer item ── */
function ExItem({ icon, label, color, active, indent=0 }) {
  return (
    <div
      style={{
        display:'flex',alignItems:'center',gap:6,
        padding:`5px 8px 5px ${8+indent}px`,borderRadius:6,marginBottom:1,cursor:'pointer',
        background: active ? 'rgba(255,255,255,.1)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,.15)' : '1px solid transparent',
        transition:'background .15s',
      }}
      onMouseEnter={e=>{ if(!active) e.currentTarget.style.background='rgba(255,255,255,.04)'; }}
      onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent'; }}
    >
      <span className="material-symbols-outlined" style={{ fontSize:15,color,flexShrink:0 }}>{icon}</span>
      <span style={{ fontSize:13,color:active?'#F3F4F6':'#6B7280',fontWeight:active?600:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
        {label}
      </span>
    </div>
  );
}
