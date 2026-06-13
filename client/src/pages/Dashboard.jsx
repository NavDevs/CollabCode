import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import SideNav from '../components/SideNav';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import confetti from 'canvas-confetti';

const LANG = {
  javascript: { color: '#F59E0B', bg: 'rgba(245,158,11,.12)', label: 'JavaScript' },
  typescript: { color: '#3B82F6', bg: 'rgba(59,130,246,.12)', label: 'TypeScript' },
  python:     { color: '#10B981', bg: 'rgba(16,185,129,.12)', label: 'Python'     },
  html:       { color: '#F97316', bg: 'rgba(249,115,22,.12)', label: 'HTML'       },
  css:        { color: '#F3F4F6', bg: 'rgba(255,255,255,.12)', label: 'CSS'       },
  bash:       { color: '#4ADE80', bg: 'rgba(74,222,128,.12)', label: 'Bash/Shell' },
};
const BARS = [32, 55, 28, 72, 48, 90, 65];

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

/* ── Shared input style ── */
const INP = {
  background: 'rgba(0,0,0,.4)',
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 9,
  padding: '9px 14px',
  fontSize: 13,
  color: '#F1F5F9',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  transition: 'border-color .2s, box-shadow .2s',
  width: '100%',
};
const fi = e => { e.target.style.borderColor='rgba(255,255,255,.55)'; e.target.style.boxShadow='0 0 0 3px rgba(255,255,255,.12)'; };
const bi = e => { e.target.style.borderColor='rgba(255,255,255,.07)'; e.target.style.boxShadow='none'; };

export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [rooms,   setRooms]   = useState([]);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [title,   setTitle]   = useState('');
  const [desc,    setDesc]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [joinModal, setJoinModal] = useState(false);
  const [joinId,    setJoinId]    = useState('');
  const [joinBusy,  setJoinBusy]  = useState(false);
  const [joinPwd,   setJoinPwd]   = useState('');
  const [needsPwd,  setNeedsPwd]  = useState(false);
  const [viewMode,  setViewMode]  = useState('grid');

  const deleteRoom = async (roomId) => {
    if (!window.confirm('Are you sure you want to permanently delete this room? All files and messages will be lost.')) return;
    try {
      await api.delete(`/rooms/${roomId}`);
      setRooms(prev => prev.filter(r => r.roomId !== roomId));
      toast.success('Room deleted.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete room.');
    }
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    try   { const { data } = await api.get('/rooms'); setRooms(data.rooms || []); }
    catch { toast.error('Could not load rooms.'); }
    finally { setLoading(false); }
  };

  const create = async e => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post('/rooms', { title: title.trim(), language: 'javascript', description: desc.trim() });
      toast.success('Room created!');
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', '#A3A3A3', '#4B5563']
      });
      setModal(false); setTitle('');
      navigate(`/editor/${data.room.roomId}`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setBusy(false); }
  };

  const closeJoinModal = () => {
    setJoinModal(false); setJoinId(''); setJoinPwd(''); setNeedsPwd(false);
  };

  const joinRoom = async e => {
    e.preventDefault();
    const id = joinId.trim();
    if (!id) return;
    setJoinBusy(true);
    try {
      const body = needsPwd ? { password: joinPwd } : {};
      await api.post(`/rooms/${id}/join`, body);
      toast.success('Joined room!');
      closeJoinModal();
      navigate(`/editor/${id}`);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'PASSWORD_REQUIRED') {
        setNeedsPwd(true);
        toast('This room requires a password.', { icon: '🔒' });
      } else {
        toast.error(err.response?.data?.error || 'Could not join room. Check the ID.');
      }
    } finally { setJoinBusy(false); }
  };

  const filtered = rooms.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.language.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#050505' }}>
      <TopNav showNav />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <SideNav />

        {/* ── Main scroll area ── */}
        <div className="scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          <div style={{ maxWidth: 1100, margin:'0 auto', padding:'36px 32px 48px' }}>

            {/* ── Hero ── */}
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, marginBottom:36, flexWrap:'wrap' }}>
              <div>
                <p style={{ fontSize:11, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#4B5563', marginBottom:8 }}>
                  {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
                </p>
                <h1 style={{ fontSize:30, fontWeight:800, lineHeight:1.15, letterSpacing:'-0.02em' }}>
                  <span style={{ color:'#F1F5F9' }}>Welcome back, </span>
                  <span className="gtext">{user?.username || 'Developer'}</span>
                </h1>
                <p style={{ marginTop:8, fontSize:14, color:'#4B5563' }}>
                  {rooms.length > 0
                    ? `${rooms.length} active session${rooms.length!==1?'s':''} in your workspace`
                    : 'Create your first room to start collaborating.'}
                </p>
              </div>

              {/* Controls */}
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ position:'relative' }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:17,color:'#374151',pointerEvents:'none' }}
                  >
                    search
                  </span>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search rooms…"
                    style={{ ...INP, width:220, paddingLeft:38 }}
                    onFocus={fi} onBlur={bi}
                  />
                </div>
                <button
                  id="dash-join"
                  onClick={() => setJoinModal(true)}
                  style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'9px 18px', borderRadius:9,
                    background:'rgba(255,255,255,.05)',
                    border:'1px solid rgba(255,255,255,.1)',
                    color:'#9CA3AF', fontSize:13, fontWeight:600,
                    cursor:'pointer', whiteSpace:'nowrap',
                    transition:'all .15s', transform: 'scale(1)'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'}
                  onMouseUp={e => e.currentTarget.style.transform='scale(1)'}
                  onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.12)'; e.currentTarget.style.borderColor='rgba(255,255,255,.3)'; e.currentTarget.style.color='#F3F4F6'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.borderColor='rgba(255,255,255,.1)'; e.currentTarget.style.color='#9CA3AF'; e.currentTarget.style.transform='scale(1)'; }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize:18 }}>login</span>
                  Join Room
                </button>
                <button
                  id="dash-create"
                  onClick={() => setModal(true)}
                  style={{
                    display:'flex', alignItems:'center', gap:6,
                    padding:'9px 18px', borderRadius:9,
                    background:'linear-gradient(135deg,#D1D5DB 0%,#6B7280 100%)',
                    boxShadow:'0 4px 20px rgba(255,255,255,.35)',
                    color:'#fff', fontSize:13, fontWeight:600,
                    border:'none', cursor:'pointer', whiteSpace:'nowrap',
                    transition:'transform .15s, box-shadow .15s', transform: 'scale(1)'
                  }}
                  onMouseDown={e => e.currentTarget.style.transform='scale(0.97)'}
                  onMouseUp={e => e.currentTarget.style.transform='translateY(-1px)'}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(255,255,255,.45)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(255,255,255,.35)'; }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize:18 }}>add</span>
                  Create Room
                </button>
              </div>
            </div>

            {/* ── Room grid ── */}
            <div style={{ marginBottom: 6 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                <span style={{ fontSize:11, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#4B5563' }}>
                  Recent Rooms
                </span>
                <div style={{ display:'flex', gap:4 }}>
                  {['view_module','view_list'].map(ic => (
                    <button 
                      key={ic} 
                      onClick={() => setViewMode(ic === 'view_module' ? 'grid' : 'list')}
                      style={{ 
                        width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', 
                        background: viewMode === (ic === 'view_module' ? 'grid' : 'list') ? 'rgba(255,255,255,.15)' : 'transparent', 
                        border:'none', 
                        color: viewMode === (ic === 'view_module' ? 'grid' : 'list') ? '#F3F4F6' : '#374151', 
                        cursor:'pointer', transition: 'all .15s' 
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize:17 }}>{ic}</span>
                    </button>
                  ))}
                </div>
              </div>

              {loading ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ borderRadius:16, padding:20, border:'1px solid rgba(255,255,255,.05)', background:'rgba(255,255,255,.02)' }}>
                      <div className="skeleton" style={{ height:16, width:'60%', marginBottom:10 }} />
                      <div className="skeleton" style={{ height:11, width:'35%', marginBottom:24 }} />
                      <div className="skeleton" style={{ height:28, width:80 }} />
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'72px 0', gap:16 }}>
                  <div style={{ width:56,height:56,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.1)',border:'1px solid rgba(255,255,255,.2)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize:26,color:'#D1D5DB' }}>meeting_room</span>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontWeight:600, color:'#E5E7EB' }}>No rooms found</p>
                    <p style={{ marginTop:4, fontSize:13, color:'#4B5563' }}>
                      {search ? `No results for "${search}"` : 'Create your first collaborative room'}
                    </p>
                  </div>
                  {!search && (
                    <button onClick={() => setModal(true)}
                      style={{ marginTop:4,display:'flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,background:'linear-gradient(135deg,#D1D5DB,#6B7280)',boxShadow:'0 4px 20px rgba(255,255,255,.35)',color:'#fff',fontSize:13,fontWeight:600,border:'none',cursor:'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize:18 }}>add</span> Create Room
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ 
                  display: viewMode === 'grid' ? 'grid' : 'flex', 
                  gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill,minmax(280px,1fr))' : 'none', 
                  flexDirection: viewMode === 'list' ? 'column' : 'row',
                  gap: 16 
                }}>
                  {filtered.map((room, idx) => {
                    const colors = [
                      { color:'#8B5CF6', bg:'rgba(139,92,246,.12)' },
                      { color:'#06B6D4', bg:'rgba(6,182,212,.12)' },
                      { color:'#F59E0B', bg:'rgba(245,158,11,.12)' },
                      { color:'#10B981', bg:'rgba(16,185,129,.12)' },
                      { color:'#EC4899', bg:'rgba(236,72,153,.12)' },
                      { color:'#3B82F6', bg:'rgba(59,130,246,.12)' },
                      { color:'#F97316', bg:'rgba(249,115,22,.12)' },
                      { color:'#14B8A6', bg:'rgba(20,184,166,.12)' },
                    ];
                    const c = colors[idx % colors.length];
                    const m = { ...c, label:'Full Stack' };
                    return <RoomCard key={room.roomId} room={room} meta={m} viewMode={viewMode} currentUserId={user?._id} onDelete={deleteRoom} onClick={() => navigate(`/editor/${room.roomId}`)} />;
                  })}
                </div>
              )}
            </div>

            {/* ── Activity bento ── */}
            <div style={{ marginTop: 44 }}>
              <p style={{ fontSize:11,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#4B5563',marginBottom:16 }}>
                Activity Snapshot
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gridTemplateRows:'160px 160px', gap:16 }}>
                {/* Chart – spans both rows */}
                <div
                  style={{ gridRow:'1 / 3', borderRadius:16, padding:24, border:'1px solid rgba(255,255,255,.06)',
                    background:'rgba(255,255,255,.025)', display:'flex', flexDirection:'column', justifyContent:'space-between', position:'relative', overflow:'hidden' }}
                >
                  <div>
                    <h3 style={{ fontSize:16,fontWeight:700,color:'#E5E7EB',marginBottom:4 }}>Weekly Contribution</h3>
                    <p style={{ fontSize:13,color:'#4B5563',maxWidth:320,lineHeight:1.6 }}>
                      {rooms.length > 0 ? `Active across ${rooms.length} session${rooms.length!==1?'s':''}. Keep the momentum.`
                        : 'Start coding to see your activity here.'}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:6, height:100, alignItems:'flex-end' }}>
                    {BARS.map((h, i) => (
                      <div
                        key={i}
                        style={{
                          flex:1, height:`${h}%`,
                          borderRadius:'4px 4px 0 0',
                          background: i===6
                            ? 'linear-gradient(180deg,#F3F4F6 0%,#D1D5DB 100%)'
                            : 'rgba(255,255,255,.18)',
                          boxShadow: i===6 ? '0 0 20px rgba(255,255,255,.4)' : 'none',
                          transition: 'filter .2s',
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => e.currentTarget.style.filter='brightness(1.5)'}
                        onMouseLeave={e => e.currentTarget.style.filter=''}
                      />
                    ))}
                  </div>
                  {/* BG watermark */}
                  <span
                    className="material-symbols-outlined"
                    style={{ position:'absolute',right:-10,top:-10,fontSize:160,color:'rgba(255,255,255,.025)',pointerEvents:'none',fontVariationSettings:"'wght' 100" }}
                  >
                    monitoring
                  </span>
                </div>

                {/* Stat card */}
                <div
                  style={{ borderRadius:16, padding:24, border:'1px solid rgba(255,255,255,.06)',
                    background:'rgba(255,255,255,.025)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}
                >
                  <span className="gtext-green" style={{ fontSize:52, fontWeight:800, lineHeight:1 }}>{rooms.length}</span>
                  <span style={{ fontSize:10,fontWeight:600,letterSpacing:'.08em',textTransform:'uppercase',color:'#4B5563',marginTop:8 }}>Active Rooms</span>
                  <span style={{ fontSize:12,color:'#374151',marginTop:4 }}>in workspace</span>
                </div>

                {/* Tip card */}
                <div
                  style={{ borderRadius:16, padding:20, border:'1px solid rgba(255,255,255,.2)',
                    background:'rgba(255,255,255,.06)', display:'flex', flexDirection:'column', justifyContent:'space-between' }}
                >
                  <div>
                    <div style={{ width:32,height:32,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:12 }}>
                      <span className="material-symbols-outlined" style={{ fontSize:18,color:'#F3F4F6' }}>tips_and_updates</span>
                    </div>
                    <p style={{ fontSize:13,fontWeight:600,color:'#E5E7EB',marginBottom:4 }}>Quick Tip</p>
                    <p style={{ fontSize:12,color:'#4B5563',lineHeight:1.6 }}>
                      Share the room link with teammates for instant real-time collaboration.
                    </p>
                  </div>
                  <button
                    onClick={() => setModal(true)}
                    style={{ marginTop:12,fontSize:12,fontWeight:600,color:'#F3F4F6',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4,padding:0 }}
                  >
                    Create a room <span className="material-symbols-outlined" style={{ fontSize:14 }}>arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />

      {/* ── Create Modal ── */}
      {modal && (
        <div
          style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16,
            background:'rgba(0,0,0,.75)',backdropFilter:'blur(6px)' }}
          onClick={() => setModal(false)}
        >
          <div
            style={{
              width:'100%',maxWidth:420,borderRadius:20,padding:28,
              background:'#0A0A0A',
              border:'1px solid rgba(255,255,255,.25)',
              boxShadow:'0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.1)',
              animation:'fade-up .22s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:17,fontWeight:700,color:'#F1F5F9' }}>New Room</h2>
                <p style={{ fontSize:13,color:'#4B5563',marginTop:2 }}>Create any files — JS, Python, HTML & more</p>
              </div>
              <button onClick={() => setModal(false)} style={{ width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.05)',border:'none',cursor:'pointer',color:'#6B7280' }}>
                <span className="material-symbols-outlined" style={{ fontSize:17 }}>close</span>
              </button>
            </div>

            <form onSubmit={create} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block',fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#4B5563',marginBottom:8 }}>Room Title</label>
                <input id="modal-title" value={title} onChange={e=>setTitle(e.target.value)}
                  placeholder="my-awesome-project" style={INP} onFocus={fi} onBlur={bi} autoFocus/>
              </div>
              <div>
                <label style={{ display:'block',fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#4B5563',marginBottom:8 }}>Description <span style={{color:'#374151',fontWeight:400}}>(optional)</span></label>
                <input id="modal-desc" value={desc} onChange={e=>setDesc(e.target.value)}
                  placeholder="e.g. Full-stack todo app" style={INP} onFocus={fi} onBlur={bi}/>
              </div>
              <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                <button id="modal-create" type="submit" disabled={busy||!title.trim()}
                  style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 0',borderRadius:9,
                    background:'linear-gradient(135deg,#D1D5DB,#6B7280)',
                    boxShadow:'0 4px 20px rgba(255,255,255,.35)',
                    color:'#fff',fontSize:13,fontWeight:600,border:'none',
                    cursor:busy||!title.trim()?'not-allowed':'pointer',opacity:busy||!title.trim()?0.6:1 }}>
                  {busy ? <><span className="material-symbols-outlined anim-spin" style={{fontSize:15}}>sync</span> Creating…</> : 'Create Room'}
                </button>
                <button type="button" onClick={() => setModal(false)}
                  style={{ padding:'10px 20px',borderRadius:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'#6B7280',fontSize:13,fontWeight:600,cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Join Room Modal ── */}
      {joinModal && (
        <div
          style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16,
            background:'rgba(0,0,0,.75)',backdropFilter:'blur(6px)' }}
          onClick={closeJoinModal}
        >
          <div
            style={{
              width:'100%',maxWidth:420,borderRadius:20,padding:28,
              background:'#0A0A0A',
              border:`1px solid ${needsPwd ? 'rgba(251,191,36,.25)' : 'rgba(52,211,153,.25)'}`,
              boxShadow:`0 40px 100px rgba(0,0,0,.7),0 0 0 1px ${needsPwd ? 'rgba(251,191,36,.1)' : 'rgba(52,211,153,.1)'}`,
              animation:'fade-up .22s ease',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:17,fontWeight:700,color:'#F1F5F9' }}>{needsPwd ? '🔒 Room Password' : 'Join Room'}</h2>
                <p style={{ fontSize:13,color:'#4B5563',marginTop:2 }}>{needsPwd ? 'This room is private — enter the password to join' : 'Enter the Room ID shared by your teammate'}</p>
              </div>
              <button onClick={closeJoinModal} style={{ width:28,height:28,borderRadius:7,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.05)',border:'none',cursor:'pointer',color:'#6B7280' }}>
                <span className="material-symbols-outlined" style={{ fontSize:17 }}>close</span>
              </button>
            </div>

            <form onSubmit={joinRoom} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div>
                <label style={{ display:'block',fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#4B5563',marginBottom:8 }}>Room ID</label>
                <input
                  id="modal-join-id"
                  value={joinId}
                  onChange={e => { setJoinId(e.target.value); setNeedsPwd(false); setJoinPwd(''); }}
                  placeholder="e.g. aB3kx9Lm"
                  style={{ ...INP, fontFamily:'JetBrains Mono, monospace', letterSpacing:'.05em' }}
                  onFocus={fi} onBlur={bi} autoFocus={!needsPwd}
                />
              </div>
              {needsPwd && (
                <div>
                  <label style={{ display:'block',fontSize:11,fontWeight:600,letterSpacing:'.07em',textTransform:'uppercase',color:'#FBBF24',marginBottom:8 }}>Room Password</label>
                  <input
                    id="modal-join-pwd"
                    type="password"
                    value={joinPwd}
                    onChange={e => setJoinPwd(e.target.value)}
                    placeholder="Enter room password"
                    style={INP}
                    onFocus={fi} onBlur={bi} autoFocus
                  />
                </div>
              )}
              <div style={{ display:'flex', gap:10, paddingTop:4 }}>
                <button id="modal-join-btn" type="submit" disabled={joinBusy||!joinId.trim()||(needsPwd&&!joinPwd)}
                  style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:6,padding:'10px 0',borderRadius:9,
                    background: needsPwd ? 'linear-gradient(135deg,#D97706,#F59E0B)' : 'linear-gradient(135deg,#059669,#10B981)',
                    boxShadow: needsPwd ? '0 4px 20px rgba(217,119,6,.35)' : '0 4px 20px rgba(16,185,129,.35)',
                    color:'#fff',fontSize:13,fontWeight:600,border:'none',
                    cursor:joinBusy||!joinId.trim()||(needsPwd&&!joinPwd)?'not-allowed':'pointer',
                    opacity:joinBusy||!joinId.trim()||(needsPwd&&!joinPwd)?0.6:1 }}>
                  {joinBusy ? <><span className="material-symbols-outlined anim-spin" style={{fontSize:15}}>sync</span> Joining…</> : <><span className="material-symbols-outlined" style={{fontSize:15}}>{needsPwd ? 'lock_open' : 'login'}</span> {needsPwd ? 'Unlock & Join' : 'Join Room'}</>}
                </button>
                <button type="button" onClick={closeJoinModal}
                  style={{ padding:'10px 20px',borderRadius:9,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.08)',color:'#6B7280',fontSize:13,fontWeight:600,cursor:'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Room Card ── */
function RoomCard({ room, meta, onClick, onDelete, currentUserId, viewMode = 'grid' }) {
  const isOwner = room.ownerId === currentUserId || room.ownerId?._id === currentUserId || (currentUserId && room.ownerId?.toString?.() === currentUserId?.toString?.());
  return (
    <div
      id={`room-${room.roomId}`}
      onClick={onClick}
      style={{
        borderRadius: 16, padding: 20, cursor: 'pointer',
        background: 'rgba(255,255,255,.025)',
        border: '1px solid rgba(255,255,255,.06)',
        position: 'relative', overflow: 'hidden',
        transition: 'transform .22s, box-shadow .22s, border-color .22s, background .22s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform='translateY(-3px)';
        e.currentTarget.style.borderColor=`${meta.color}50`;
        e.currentTarget.style.boxShadow=`0 12px 36px rgba(0,0,0,.4),0 0 0 1px ${meta.color}30`;
        e.currentTarget.style.background='rgba(255,255,255,.04)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform='';
        e.currentTarget.style.borderColor='rgba(255,255,255,.06)';
        e.currentTarget.style.boxShadow='none';
        e.currentTarget.style.background='rgba(255,255,255,.025)';
      }}
    >
      {/* Top accent */}
      <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:meta.color,opacity:.7,borderRadius:'16px 16px 0 0' }} />

      {/* Card body */}
      <div style={{ display:'flex', alignItems: viewMode === 'grid' ? 'flex-start' : 'center', justifyContent:'space-between', gap:12 }}>
        <div style={{ minWidth:0, flex:1, display: viewMode === 'list' ? 'flex' : 'block', alignItems: 'center', gap: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: viewMode === 'grid' ? 5 : 0, flexWrap:'wrap' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#F1F5F9', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {room.title}
            </span>
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999, background:meta.bg, color:meta.color, border:`1px solid ${meta.color}40`, letterSpacing:'.04em' }}>
              {meta.label}
            </span>
            {room.isPrivate && (
              <span className="material-symbols-outlined" style={{ fontSize:14, color:'#FBBF24' }} title="Private Room">lock</span>
            )}
          </div>
          <p style={{ fontSize:11, color:'#374151', fontFamily:'JetBrains Mono, monospace' }}>
            Updated {timeAgo(room.createdAt)}
          </p>
        </div>

        {/* Avatar stack */}
        <div style={{ display:'flex', flexShrink:0, alignItems:'center' }}>
          {(room.participants || []).slice(0, 3).map((p, i) => (
            <div
              key={i}
              title={p.username || 'User'}
              style={{
                width:30, height:30, borderRadius:'50%',
                border:'2px solid #0A0A0F',
                background: `linear-gradient(135deg, ${p.avatarColor||'#6B7280'}, ${p.avatarColor||'#6B7280'}99)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:11, fontWeight:700, color:'#fff',
                marginLeft: i > 0 ? -10 : 0,
                zIndex: 10 - i,
                position:'relative',
                outline: `2px solid ${p.avatarColor||'#6B7280'}30`,
                outlineOffset: 1,
                cursor: 'default',
                textShadow: '0 1px 2px rgba(0,0,0,.4)',
              }}
            >
              {p.username?.charAt(0).toUpperCase() || '?'}
            </div>
          ))}
          {(room.participants || []).length > 3 && (
            <div style={{
              width:30, height:30, borderRadius:'50%',
              border:'2px solid #0A0A0F', marginLeft:-10,
              background:'rgba(255,255,255,.08)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:10, fontWeight:700, color:'#6B7280',
              zIndex: 7, position:'relative',
            }}>
              +{(room.participants || []).length - 3}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action row */}
      <div style={{ marginTop:14,paddingTop:12,borderTop:'1px solid rgba(255,255,255,.05)',display: viewMode === 'list' ? 'none' : 'flex',alignItems:'center',justifyContent:'space-between' }}>
        <button
          onClick={e => {
            e.stopPropagation();
            navigator.clipboard.writeText(room.roomId).then(() => toast.success('Room ID copied!'));
          }}
          style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:7,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',fontSize:12,color:'#4B5563',cursor:'pointer',transition:'all .15s',fontFamily:"'Inter',sans-serif" }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,.1)';e.currentTarget.style.borderColor='rgba(255,255,255,.25)';e.currentTarget.style.color='#F3F4F6';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.04)';e.currentTarget.style.borderColor='rgba(255,255,255,.07)';e.currentTarget.style.color='#4B5563';}}
        >
          <span className="material-symbols-outlined" style={{ fontSize:14 }}>content_copy</span>
          Copy ID
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:11,color:'#374151',fontFamily:'JetBrains Mono,monospace',letterSpacing:'.03em' }}>
            {room.roomId}
          </span>
          {isOwner && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(room.roomId); }}
              title="Delete room"
              style={{ display:'flex',alignItems:'center',padding:'4px 6px',borderRadius:7,background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',color:'#F87171',cursor:'pointer',transition:'all .15s',lineHeight:0 }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.2)';e.currentTarget.style.borderColor='rgba(239,68,68,.5)';e.currentTarget.style.color='#FCA5A5';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,.08)';e.currentTarget.style.borderColor='rgba(239,68,68,.2)';e.currentTarget.style.color='#F87171';}}
            >
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>delete</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

