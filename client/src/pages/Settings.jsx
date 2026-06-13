import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import SideNav from '../components/SideNav';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

const THEMES = [
  { id: 'dark', label: 'Dark', bg: '#09090F', fg: '#E2E8F0', accent: '#C084FC' },
  { id: 'midnight', label: 'Midnight', bg: '#0F172A', fg: '#E2E8F0', accent: '#818CF8' },
  { id: 'dracula', label: 'Dracula', bg: '#282A36', fg: '#F8F8F2', accent: '#BD93F9' },
];

const FONT_SIZES = [12, 13, 14, 15, 16, 18];
const FONT_FAMILIES = [
  'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Cascadia Code', 'Consolas', 'Monaco',
];
const TAB_SIZES = [2, 4, 8];

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

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none',
        background: checked ? '#818CF8' : 'rgba(255,255,255,.1)',
        cursor: 'pointer', position: 'relative', transition: 'background .2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: checked ? 21 : 3,
        transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.3)',
      }} />
    </button>
  );
}

function SettingRow({ label, sub, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,.04)',
      gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();

  const selectStyle = {
    background: 'rgba(0,0,0,.4)',
    border: '1px solid rgba(255,255,255,.07)',
    borderRadius: 9,
    padding: '10px 14px',
    fontSize: 13,
    color: '#F1F5F9',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' fill='none' stroke='%236B7280' stroke-width='1.5'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 32,
    cursor: 'pointer',
    width: 'auto',
    minWidth: 150,
  };

  const set = (key, val) => {
    updateSetting(key, val);
    toast.success('Setting updated — applied instantly');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--cc-bg, #050505)' }}>
      <TopNav showNav />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <SideNav />

        <div className="scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          <div style={{ maxWidth: 780, margin:'0 auto', padding:'36px 32px 64px' }}>

            {/* Breadcrumb — quick switch */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20 }}>
              <button onClick={() => navigate(-1)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', color:'var(--cc-text-muted, #4B5563)', fontSize:12, fontWeight:500, cursor:'pointer', padding:'4px 8px', borderRadius:6, transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.06)'; e.currentTarget.style.color='var(--cc-text-secondary, #9CA3AF)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='var(--cc-text-muted, #4B5563)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize:14 }}>arrow_back</span>
                Back
              </button>
              <span style={{ color:'var(--cc-text-dim, #374151)', fontSize:11 }}>│</span>
              <button onClick={() => navigate('/dashboard')} style={{ background:'none', border:'none', color:'var(--cc-text-muted, #4B5563)', fontSize:12, cursor:'pointer', padding:'4px 8px', borderRadius:6, transition:'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color='var(--cc-text-secondary, #9CA3AF)'}
                onMouseLeave={e => e.currentTarget.style.color='var(--cc-text-muted, #4B5563)'}
              >Dashboard</button>
              <span style={{ color:'var(--cc-text-dim, #374151)', fontSize:11 }}>│</span>
              <span style={{ fontSize:12, color:'var(--cc-text-secondary, #9CA3AF)', fontWeight:600 }}>Settings</span>
            </div>

            {/* Page Header */}
            <div style={{ marginBottom: 36 }}>
              <p style={{ fontSize:11, fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--cc-text-muted, #4B5563)', marginBottom:8 }}>Configuration</p>
              <h1 style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.02em' }}>
                <span style={{ color:'var(--cc-text, #F1F5F9)' }}>App </span>
                <span className="gtext">Settings</span>
              </h1>
              <p style={{ marginTop:6, fontSize:14, color:'#4B5563' }}>
                Customize your editor experience. All changes apply <strong style={{ color:'#818CF8' }}>instantly</strong> across every room.
              </p>
            </div>

            {/* ── Editor Settings ── */}
            <Card style={{ marginBottom: 20 }}>
              <SectionTitle icon="code" title="Editor" sub="Customize your coding environment" />

              <SettingRow label="Font Size" sub="Size of text in the code editor">
                <select value={settings.fontSize} onChange={e => set('fontSize', +e.target.value)} style={selectStyle}>
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
              </SettingRow>

              <SettingRow label="Font Family" sub="Monospace font for code">
                <select value={settings.fontFamily} onChange={e => set('fontFamily', e.target.value)} style={selectStyle}>
                  {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </SettingRow>

              <SettingRow label="Tab Size" sub="Number of spaces per tab">
                <select value={settings.tabSize} onChange={e => set('tabSize', +e.target.value)} style={selectStyle}>
                  {TAB_SIZES.map(s => <option key={s} value={s}>{s} spaces</option>)}
                </select>
              </SettingRow>

              <SettingRow label="Word Wrap" sub="Wrap long lines instead of horizontal scroll">
                <Toggle checked={settings.wordWrap} onChange={v => set('wordWrap', v)} />
              </SettingRow>

              <SettingRow label="Minimap" sub="Show code minimap on the right side">
                <Toggle checked={settings.minimap} onChange={v => set('minimap', v)} />
              </SettingRow>

              <SettingRow label="Line Numbers" sub="Show line numbers in the gutter">
                <Toggle checked={settings.lineNumbers} onChange={v => set('lineNumbers', v)} />
              </SettingRow>
            </Card>

            {/* ── Theme ── */}
            <Card style={{ marginBottom: 20 }}>
              <SectionTitle icon="palette" title="Appearance" sub="Choose your editor theme — applied instantly" />

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => set('theme', t.id)}
                    style={{
                      flex: '1 1 140px', maxWidth: 200,
                      padding: 16, borderRadius: 12, cursor: 'pointer',
                      background: t.bg,
                      border: settings.theme === t.id ? `2px solid ${t.accent}` : '2px solid rgba(255,255,255,.08)',
                      transition: 'all .2s',
                      outline: settings.theme === t.id ? `2px solid ${t.accent}40` : 'none',
                      outlineOffset: 2,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: t.accent }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: t.fg }}>{t.label}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.accent, opacity: 0.7 }} />
                      <div style={{ flex: 2, height: 4, borderRadius: 2, background: t.fg, opacity: 0.2 }} />
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: t.fg, opacity: 0.1 }} />
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* ── General ── */}
            <Card style={{ marginBottom: 20 }}>
              <SectionTitle icon="tune" title="General" sub="App-wide preferences" />

              <SettingRow label="Auto Save" sub="Automatically save changes as you type">
                <Toggle checked={settings.autoSave} onChange={v => set('autoSave', v)} />
              </SettingRow>

              <SettingRow label="Notifications" sub="Show desktop notifications for collaborator actions">
                <Toggle checked={settings.notifications} onChange={v => set('notifications', v)} />
              </SettingRow>

              <SettingRow label="Sound Effects" sub="Play sounds for events like join/leave">
                <Toggle checked={settings.sound} onChange={v => set('sound', v)} />
              </SettingRow>
            </Card>

            {/* ── Keyboard Shortcuts ── */}
            <Card style={{ marginBottom: 20 }}>
              <SectionTitle icon="keyboard" title="Keyboard Shortcuts" sub="Quick reference for power users" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Run Code', 'Ctrl + Enter'],
                  ['Save File', 'Ctrl + S'],
                  ['Toggle Terminal', 'Ctrl + `'],
                  ['Toggle Sidebar', 'Ctrl + B'],
                  ['Search Files', 'Ctrl + P'],
                  ['Format Code', 'Shift + Alt + F'],
                ].map(([action, keys]) => (
                  <div key={action} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(255,255,255,.02)',
                    border: '1px solid rgba(255,255,255,.04)',
                  }}>
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>{action}</span>
                    <kbd style={{
                      fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                      padding: '2px 8px', borderRadius: 5,
                      background: 'rgba(255,255,255,.06)',
                      border: '1px solid rgba(255,255,255,.1)',
                      color: '#D1D5DB',
                    }}>{keys}</kbd>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Danger Zone ── */}
            <Card style={{ borderColor: 'rgba(239,68,68,.2)' }}>
              <SectionTitle icon="warning" title="Danger Zone" sub="Irreversible account actions" />
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
                Sign Out
              </button>
            </Card>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
