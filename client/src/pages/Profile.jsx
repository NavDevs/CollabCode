import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import SideNav from '../components/SideNav';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

const AVATAR_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7',
  '#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9',
  '#F0B27A','#82E0AA','#F1948A','#85929E','#73C6B6',
  '#F3F4F6','#818CF8','#F472B6','#22D3EE','#FBBF24',
];

const INP = {
  background: 'rgba(0,0,0,.4)',
  border: '1px solid rgba(255,255,255,.07)',
  borderRadius: 9,
  padding: '10px 14px',
  fontSize: 13,
  color: '#F1F5F9',
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
  transition: 'border-color .2s, box-shadow .2s',
  width: '100%',
};
const fi = e => { e.target.style.borderColor='rgba(255,255,255,.55)'; e.target.style.boxShadow='0 0 0 3px rgba(255,255,255,.12)'; };
const bi = e => { e.target.style.borderColor='rgba(255,255,255,.07)'; e.target.style.boxShadow='none'; };

function Card({ children, style = {} }) {
  return (
    <div style={{
      borderRadius: 18, padding: 28,
      background: 'rgba(255,255,255,.025)',
      border: '1px solid rgba(255,255,255,.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: 4 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize:17, color:'#F3F4F6' }}>{icon}</span>
        </div>
        <h2 style={{ fontSize:16, fontWeight:700, color:'#F1F5F9' }}>{title}</h2>
      </div>
      {sub && <p style={{ fontSize:12, color:'#4B5563', marginLeft:42 }}>{sub}</p>}
    </div>
  );
}

function SaveBtn({ onClick, busy, label='Save Changes' }) {
  return (
    <button onClick={onClick} disabled={busy}
      style={{
        display:'flex', alignItems:'center', gap:6,
        padding:'9px 20px', borderRadius:9,
        background:'linear-gradient(135deg,#D1D5DB,#6B7280)',
        boxShadow:'0 4px 20px rgba(255,255,255,.35)',
        color:'#fff', fontSize:13, fontWeight:600,
        border:'none', cursor: busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.6 : 1,
        transition:'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { if(!busy) { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(255,255,255,.45)'; }}}
      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 20px rgba(255,255,255,.35)'; }}
    >
      {busy ? <><span className="material-symbols-outlined anim-spin" style={{fontSize:15}}>sync</span> Saving…</> : label}
    </button>
  );
}

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [selectedColor, setSelectedColor] = useState(user?.avatarColor || AVATAR_COLORS[0]);
  const [savingProfile, setSavingProfile] = useState(false);

  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [stats, setStats] = useState({ rooms: 0, joined: 'N/A' });

  useEffect(() => {
    // Load stats
    (async () => {
      try {
        const { data } = await api.get('/rooms');
        const rooms = data.rooms || [];
        setStats({
          rooms: rooms.length,
          joined: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month:'long', year:'numeric' }) : 'N/A',
        });
      } catch {}
    })();
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await api.put('/users/profile', {
        username: username.trim(),
        email: email.trim(),
        avatarColor: selectedColor,
      });
      toast.success(data.message || 'Profile updated!');
      // Update auth context so the whole app reflects changes
      if (data.user) {
        const updated = data.user;
        localStorage.setItem('collabcode_user', JSON.stringify(updated));
        if (setUser) setUser(updated);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update profile.');
    } finally { setSavingProfile(false); }
  };

  const changePassword = async () => {
    if (!curPwd || !newPwd) return toast.error('Fill in all password fields.');
    if (newPwd.length < 6) return toast.error('New password must be at least 6 characters.');
    if (newPwd !== confirmPwd) return toast.error('Passwords do not match.');
    setSavingPwd(true);
    try {
      const { data } = await api.put('/users/password', {
        currentPassword: curPwd,
        newPassword: newPwd,
      });
      toast.success(data.message || 'Password changed!');
      setCurPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password.');
    } finally { setSavingPwd(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--cc-bg, #050505)' }}>
      <TopNav showNav />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <SideNav />

        <div className="scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          <div style={{ maxWidth: 780, margin:'0 auto', padding:'36px 32px 64px' }}>

            {/* ── Page Header ── */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize:11, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'#4B5563', marginBottom:8 }}>Settings</p>
              <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.02em' }}>
                <span style={{ color:'#F1F5F9' }}>Your </span>
                <span className="gtext">Profile</span>
              </h1>
              <p style={{ marginTop:6, fontSize:14, color:'#4B5563' }}>
                Manage your account details and preferences.
              </p>
            </div>

            {/* ── Avatar & Quick Stats ── */}
            <Card style={{ marginBottom:20, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
              <div style={{
                width:72, height:72, borderRadius:'50%',
                background: selectedColor,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:28, fontWeight:800, color:'#fff',
                outline: `3px solid ${selectedColor}50`,
                outlineOffset: 4,
                flexShrink:0,
              }}>
                {username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div style={{ flex:1, minWidth:200 }}>
                <p style={{ fontSize:20, fontWeight:700, color:'#F1F5F9' }}>{username || 'User'}</p>
                <p style={{ fontSize:13, color:'#4B5563', marginTop:2 }}>{email}</p>
                <div style={{ display:'flex', gap:20, marginTop:12 }}>
                  <div>
                    <span className="gtext" style={{ fontSize:22, fontWeight:800 }}>{stats.rooms}</span>
                    <p style={{ fontSize:10, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'#4B5563', marginTop:2 }}>Active Rooms</p>
                  </div>
                  <div>
                    <span style={{ fontSize:14, fontWeight:600, color:'#9CA3AF' }}>{stats.joined}</span>
                    <p style={{ fontSize:10, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'#4B5563', marginTop:2 }}>Member Since</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Profile Info ── */}
            <Card style={{ marginBottom:20 }}>
              <SectionTitle icon="person" title="Personal Info" sub="Update your display name and email" />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'#4B5563', marginBottom:8 }}>Username</label>
                  <input value={username} onChange={e => setUsername(e.target.value)}
                    placeholder="Your username" style={INP} onFocus={fi} onBlur={bi} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'#4B5563', marginBottom:8 }}>Email</label>
                  <input value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com" style={INP} onFocus={fi} onBlur={bi} />
                </div>
              </div>

              <div style={{ marginTop:20 }}>
                <SaveBtn onClick={saveProfile} busy={savingProfile} />
              </div>
            </Card>

            {/* ── Avatar Color ── */}
            <Card style={{ marginBottom:20 }}>
              <SectionTitle icon="palette" title="Avatar Color" sub="Choose a color that represents you" />

              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setSelectedColor(c); }}
                    style={{
                      width:38, height:38, borderRadius:10, border:'none', cursor:'pointer',
                      background: c,
                      outline: selectedColor === c ? `2px solid ${c}` : '2px solid transparent',
                      outlineOffset: 3,
                      transform: selectedColor === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all .15s',
                      boxShadow: selectedColor === c ? `0 0 16px ${c}60` : 'none',
                    }}
                    onMouseEnter={e => { if (selectedColor !== c) e.currentTarget.style.transform='scale(1.1)'; }}
                    onMouseLeave={e => { if (selectedColor !== c) e.currentTarget.style.transform='scale(1)'; }}
                  />
                ))}
              </div>

              <div style={{ marginTop:16 }}>
                <SaveBtn onClick={saveProfile} busy={savingProfile} label="Save Color" />
              </div>
            </Card>

            {/* ── Change Password ── */}
            <Card style={{ marginBottom:20 }}>
              <SectionTitle icon="lock" title="Change Password" sub="Secure your account with a new password" />

              <div style={{ display:'flex', flexDirection:'column', gap:14, maxWidth:380 }}>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'#4B5563', marginBottom:8 }}>Current Password</label>
                  <input type="password" value={curPwd} onChange={e => setCurPwd(e.target.value)}
                    placeholder="••••••••" style={INP} onFocus={fi} onBlur={bi} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'#4B5563', marginBottom:8 }}>New Password</label>
                  <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                    placeholder="Min 6 characters" style={INP} onFocus={fi} onBlur={bi} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'.07em', textTransform:'uppercase', color:'#4B5563', marginBottom:8 }}>Confirm New Password</label>
                  <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                    placeholder="Repeat new password" style={INP} onFocus={fi} onBlur={bi} />
                </div>
                <div style={{ marginTop:4 }}>
                  <SaveBtn onClick={changePassword} busy={savingPwd} label="Change Password" />
                </div>
              </div>
            </Card>

            {/* ── Danger Zone ── */}
            <Card style={{ borderColor:'rgba(239,68,68,.2)' }}>
              <SectionTitle icon="warning" title="Danger Zone" sub="Irreversible actions" />
              <button
                onClick={async () => { 
                  if (window.confirm('Are you sure? This will log you out.')) { 
                    await logout();
                    toast.success('Logged out.'); 
                    navigate('/login'); 
                  }
                }}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'9px 18px', borderRadius:9,
                  background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)',
                  color:'#F87171', fontSize:13, fontWeight:600,
                  cursor:'pointer', transition:'all .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,.1)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize:16 }}>logout</span>
                Sign out of all devices
              </button>
            </Card>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
