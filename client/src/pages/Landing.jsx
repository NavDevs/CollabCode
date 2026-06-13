import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandMark from '../components/BrandMark';

/* ─── Scroll Observer Component ────────────────────────────── */
function FadeSection({ children, delay = 0 }) {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setVisible(true);
          // Unobserve once visible
          observer.unobserve(entry.target);
        }
      });
    });
    if (domRef.current) observer.observe(domRef.current);
    return () => {
      if (domRef.current) observer.unobserve(domRef.current);
    };
  }, []);

  return (
    <div
      ref={domRef}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
        willChange: 'opacity, transform'
      }}
    >
      {children}
    </div>
  );
}

/* ─── Animated typing demo ─────────────────────────────────── */
const DEMO_LINES = [
  { code: 'const collab = new CollabSession();',  color: '#E5E5E5' },
  { code: 'collab.invite(["alice", "bob"]);',      color: '#D1D5DB' },
  { code: 'collab.onEdit((user, change) => {',     color: '#E5E5E5' },
  { code: '  sync.broadcast(change);',             color: '#9CA3AF' },
  { code: '  terminal.stream(output);',            color: '#F3F4F6' },
  { code: '});',                                   color: '#E5E5E5' },
  { code: '// Everyone sees this. Live. ✨',        color: '#6B7280' },
];

function TypedCode() {
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (visibleLines >= DEMO_LINES.length) return;
    const t = setTimeout(() => setVisibleLines(v => v + 1), 600);
    return () => clearTimeout(t);
  }, [visibleLines]);

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, lineHeight: 2 }}>
      {DEMO_LINES.slice(0, visibleLines).map((l, i) => (
        <div key={i} style={{ color: l.color, opacity: 0, animation: 'fade-up .4s ease forwards' }}>
          <span style={{ color: '#4B5563', marginRight: 24, userSelect: 'none' }}>{String(i + 1).padStart(2, ' ')}</span>
          {l.code}
          {i === visibleLines - 1 && (
            <span style={{ display: 'inline-block', width: 2, height: 14, background: '#F3F4F6', marginLeft: 2, verticalAlign: 'middle', animation: 'pulse-dot 1s ease-in-out infinite' }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Feature card ─────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, accent }) {
  return (
    <div
      style={{
        padding: 28,
        borderRadius: 20,
        background: 'rgba(255,255,255,.02)',
        border: '1px solid rgba(255,255,255,.08)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform .22s, border-color .22s, box-shadow .22s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)';
        e.currentTarget.style.boxShadow = `0 16px 48px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.05)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Glow top-left */}
      <div style={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, rgba(255,255,255,.08) 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(255,255,255,.05)`, border: `1px solid rgba(255,255,255,.1)`, marginBottom: 16 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 22, color: accent }}>{icon}</span>
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F9FAFB', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#9CA3AF', lineHeight: 1.7 }}>{desc}</p>
    </div>
  );
}

/* ─── Stat pill ─────────────────────────────────────────────── */
function Stat({ value, label }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 32px' }}>
      <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', background: 'linear-gradient(135deg,#FFFFFF,#9CA3AF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ─── Presence avatar strip ─────────────────────────────────── */
const AVATARS = [
  { name: 'Alice',  color: '#4B5563' },
  { name: 'Bob',    color: '#6B7280' },
  { name: 'Carlos', color: '#374151' },
  { name: 'Diana',  color: '#1F2937' },
  { name: 'Eve',    color: '#111827' },
];

import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  return (
    <div style={{ background: '#050505', color: '#F9FAFB', height: '100%', overflowY: 'auto', overflowX: 'hidden', fontFamily: "'Inter', sans-serif" }}>

      {/* ══════ NAV ══════ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: '1px solid rgba(255,255,255,.05)', backdropFilter: 'blur(16px)', background: 'rgba(5,5,5,.85)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BrandMark />
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg,#FFFFFF,#9CA3AF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            CollabCode
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '8px 18px', borderRadius: 9, background: 'transparent', border: '1px solid rgba(255,255,255,.1)', color: '#D1D5DB', fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.3)'; e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#D1D5DB'; }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{ padding: '8px 18px', borderRadius: 9, background: '#FFFFFF', color: '#000000', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none', boxShadow: '0 4px 16px rgba(255,255,255,.15)', transition: 'all .15s', transform: 'scale(1)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,255,255,.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,255,255,.15)'; }}
          >
            Get started free
          </button>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <FadeSection>
      <section style={{ position: 'relative', padding: '100px 40px 80px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 24 }}>

        {/* Ambient orbs (Grey/White variations) */}
        <div style={{ position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)', width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(255,255,255,.05) 0%, transparent 65%)', pointerEvents: 'none', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: 0, left: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,255,255,.03) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb-drift 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: 100, right: -80, width: 300, height: 300, background: 'radial-gradient(circle, rgba(200,200,200,.02) 0%, transparent 70%)', pointerEvents: 'none', animation: 'orb-drift 11s ease-in-out infinite reverse' }} />

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', fontSize: 12, fontWeight: 600, color: '#E5E5E5', letterSpacing: '.04em' }}>
          <span className="anim-dot inline-block w-1.5 h-1.5 rounded-full" style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFFFFF', display: 'inline-block', flexShrink: 0 }} />
          NOW IN BETA — REAL-TIME COLLABORATION
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 68px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.08, maxWidth: 900, position: 'relative', zIndex: 1 }}>
          <span style={{ color: '#F9FAFB' }}>Code together,</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg,#FFFFFF 0%,#D1D5DB 50%,#6B7280 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ship faster.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: '#9CA3AF', maxWidth: 560, lineHeight: 1.7, position: 'relative', zIndex: 1 }}>
          Build full-stack applications together in real-time — with a VS Code-style terminal, 11 languages, live preview, team chat, and GitHub integration. All from your browser.
        </p>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => navigate('/register')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, background: '#FFFFFF', color: '#000000', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', boxShadow: '0 6px 28px rgba(255,255,255,.15)', transition: 'all .2s', letterSpacing: '0.01em', transform: 'scale(1)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(255,255,255,.15)'; }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
            Start Coding Free
          </button>
          <button
            onClick={() => navigate('/register')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 12, background: 'rgba(255,255,255,.05)', color: '#D1D5DB', fontSize: 15, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,.1)', transition: 'all .15s', transform: 'scale(1)' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#FFFFFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = '#D1D5DB'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            Sign in
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </button>
        </div>

        {/* Presence strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex' }}>
            {AVATARS.map((a, i) => (
              <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #050505', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', marginLeft: i > 0 ? -10 : 0, zIndex: 10 - i, position: 'relative' }}>
                {a.name[0]}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Join <strong style={{ color: '#D1D5DB' }}>developers</strong> already collaborating</span>
        </div>
      </section>
      </FadeSection>

      {/* ══════ EDITOR DEMO ══════ */}
      <FadeSection delay={200}>
      <section style={{ padding: '0 40px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div
          style={{
            borderRadius: 20,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.1)',
            boxShadow: '0 40px 100px rgba(0,0,0,.8), 0 0 0 1px rgba(255,255,255,.05)',
          }}
        >
          {/* Window chrome */}
          <div style={{ height: 42, background: 'rgba(15,15,15,.98)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#374151' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#4B5563' }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#6B7280' }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '3px 16px', borderRadius: 6, background: 'rgba(255,255,255,.08)', fontSize: 11, color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace' }}>
                🔒 collabcode.app/editor/live-demo
              </div>
            </div>
            {/* Presence in demo */}
            <div style={{ display: 'flex' }}>
              {AVATARS.slice(0, 3).map((a, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #0F0F0F', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', marginLeft: i > 0 ? -6 : 0 }}>
                  {a.name[0]}
                </div>
              ))}
            </div>
          </div>

          {/* Editor body */}
          <div style={{ display: 'flex', background: '#0A0A0A', minHeight: 280 }}>
            {/* Activity rail */}
            <div style={{ width: 44, background: 'rgba(10,10,10,.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10, gap: 8, borderRight: '1px solid rgba(255,255,255,.05)' }}>
              {['grid_view', 'search', 'account_tree'].map(ic => (
                <div key={ic} style={{ width: 34, height: 34, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{ic}</span>
                </div>
              ))}
            </div>

            {/* Explorer */}
            <div style={{ width: 160, background: 'rgba(15,15,15,.9)', padding: '12px 8px', borderRight: '1px solid rgba(255,255,255,.05)' }}>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 8, paddingLeft: 8 }}>Explorer</p>
              {[{ f: 'expand_more', n: 'my-project', c: '#9CA3AF', i: 0 }, { f: 'javascript', n: 'main.js', c: '#F3F4F6', i: 14, a: true }, { f: 'chevron_right', n: 'assets', c: '#6B7280', i: 0 }].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: `3px 6px 3px ${6 + item.i}px`, borderRadius: 5, marginBottom: 1, background: item.a ? 'rgba(255,255,255,.1)' : 'transparent', border: item.a ? '1px solid rgba(255,255,255,.15)' : '1px solid transparent' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: item.c }}>{item.f}</span>
                  <span style={{ fontSize: 11, color: item.a ? '#F3F4F6' : '#9CA3AF', fontWeight: item.a ? 600 : 400 }}>{item.n}</span>
                </div>
              ))}
            </div>

            {/* Code area */}
            <div style={{ flex: 1, padding: '20px 24px', position: 'relative' }}>
              <TypedCode />

              {/* Cursor tag */}
              <div style={{ position: 'absolute', top: 68, right: 60, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ width: 2, height: 20, background: '#D1D5DB', borderRadius: 1 }} />
                <div style={{ padding: '1px 8px', borderRadius: '0 4px 4px 4px', fontSize: 10, fontWeight: 700, color: '#000', background: '#D1D5DB', whiteSpace: 'nowrap' }}>
                  Bob
                </div>
              </div>
            </div>

            {/* Chat preview */}
            <div style={{ width: 200, background: 'rgba(15,15,15,.95)', borderLeft: '1px solid rgba(255,255,255,.05)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6B7280' }}>Team Chat</p>
              {[
                { name: 'Alice', color: '#D1D5DB', msg: 'Check line 4! 🚀' },
                { name: 'Bob',   color: '#9CA3AF', msg: 'Nice, running it now' },
                { name: 'Alice', color: '#D1D5DB', msg: '✓ Tests pass!' },
              ].map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: m.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#000' }}>{m.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: m.color }}>{m.name}</span>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{m.msg}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status bar */}
          <div style={{ height: 22, background: 'linear-gradient(90deg,#111827,#374151)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', fontSize: 10, color: 'rgba(255,255,255,.8)', fontFamily: 'JetBrains Mono, monospace' }}>
            <span>⎇ main  CollabCode v2.0</span>
            <div style={{ display: 'flex', gap: 2 }}>
              <span className="anim-dot inline-block" style={{ width: 6, height: 6, borderRadius: '50%', background: '#D1D5DB', display: 'inline-block', marginRight: 5 }} />
              3 users connected
            </div>
          </div>
        </div>
      </section>
      </FadeSection>

      {/* ══════ STATS ══════ */}
      <FadeSection>
      <section style={{ padding: '40px 40px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, flexWrap: 'wrap', borderRadius: 20, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.08)', padding: '32px 0' }}>
          {[
            { value: '< 50ms', label: 'Sync latency' },
            { value: '11', label: 'Languages supported' },
            { value: 'Live',   label: 'Terminal + preview' },
            { value: '∞',      label: 'Collaborators per room' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <Stat value={s.value} label={s.label} />
              {i < 3 && <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,.08)' }} />}
            </div>
          ))}
        </div>
      </section>
      </FadeSection>

      {/* ══════ FEATURES ══════ */}
      <FadeSection>
      <section style={{ padding: '0 40px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6B7280', marginBottom: 12 }}>Everything you need</p>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', color: '#F9FAFB' }}>
            Built for real collaboration
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {[
            { icon: 'electric_bolt',  accent: '#F3F4F6', title: 'Real-time sync',        desc: 'Y.js powered CRDT sync keeps every keystroke in sync for all collaborators with sub-50ms latency.' },
            { icon: 'play_circle',    accent: '#D1D5DB', title: '11 language execution',  desc: 'Run JS, TS, Python, C++, Java, Go, Rust, Ruby, PHP, Bash — with live preview for full-stack web servers.' },
            { icon: 'terminal',       accent: '#9CA3AF', title: 'VS Code terminal',      desc: 'Full Linux shell with tabs, drag-to-resize, file sync, npm install, and auto port detection for live preview.' },
            { icon: 'forum',          accent: '#E5E5E5', title: 'Team chat & presence',  desc: 'Built-in chat with avatars, typing indicators, member list, and real-time cursor tracking.' },
            { icon: 'share',          accent: '#F9FAFB', title: 'Instant room sharing',  desc: 'One click to copy the invite link. Share with your team and they can join immediately.' },
            { icon: 'save',           accent: '#D1D5DB', title: 'Auto-save everywhere',  desc: 'Code auto-saves to database every 1.5s. Switch files instantly, refresh the page — nothing is ever lost.' },
          ].map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </section>
      </FadeSection>

      {/* ══════ CTA BANNER ══════ */}
      <FadeSection>
      <section style={{ padding: '0 40px 100px', maxWidth: 900, margin: '0 auto' }}>
        <div
          style={{
            borderRadius: 24,
            padding: '56px 48px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(255,255,255,.05) 0%, rgba(255,255,255,.02) 50%, rgba(255,255,255,.04) 100%)',
            border: '1px solid rgba(255,255,255,.1)',
            boxShadow: '0 0 80px rgba(0,0,0,.5) inset',
          }}
        >
          {/* BG grid */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.03em', color: '#F9FAFB', marginBottom: 14 }}>
              Ready to build together?
            </h2>
            <p style={{ fontSize: 16, color: '#9CA3AF', marginBottom: 32, maxWidth: 440, margin: '0 auto 32px' }}>
              Create your free workspace in seconds. No credit card required.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/register')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 12, background: '#FFFFFF', color: '#000000', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(255,255,255,.1)', transition: 'all .2s', transform: 'scale(1)' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(255,255,255,.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,.1)'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
                Get started — it's free
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{ padding: '13px 24px', borderRadius: 12, background: 'rgba(255,255,255,.05)', color: '#D1D5DB', fontSize: 15, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,255,255,.1)', transition: 'all .15s', transform: 'scale(1)' }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.color = '#FFFFFF'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.color = '#D1D5DB'; e.currentTarget.style.transform = 'scale(1)'; }}
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </section>
      </FadeSection>

      {/* ══════ FOOTER ══════ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.05)', padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BrandMark size={24} />
          <span style={{ fontSize: 14, fontWeight: 700, background: 'linear-gradient(135deg,#FFFFFF,#9CA3AF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>CollabCode</span>
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>
          Built with ❤️ by NavDevs · v2.0
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="https://github.com/NavDevs/CollabCode" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#9CA3AF', cursor: 'pointer', transition: 'color .15s', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
            onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}
          >GitHub</a>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>NavDevs</span>
        </div>
      </footer>
    </div>
  );
}

