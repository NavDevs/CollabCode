import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import SideNav from '../components/SideNav';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

const LANG = {
  javascript: { color: '#F59E0B', bg: 'rgba(245,158,11,.12)', label: 'JavaScript' },
  typescript: { color: '#3B82F6', bg: 'rgba(59,130,246,.12)', label: 'TypeScript' },
  python:     { color: '#10B981', bg: 'rgba(16,185,129,.12)', label: 'Python'     },
  go:         { color: '#22D3EE', bg: 'rgba(34,211,238,.12)', label: 'Go'         },
  html:       { color: '#F97316', bg: 'rgba(249,115,22,.12)', label: 'HTML'       },
  css:        { color: '#F3F4F6', bg: 'rgba(255,255,255,.12)', label: 'CSS'       },
  rust:       { color: '#FB7185', bg: 'rgba(251,113,133,.12)', label: 'Rust'      },
  java:       { color: '#FBBF24', bg: 'rgba(251,191,36,.12)', label: 'Java'       },
  cpp:        { color: '#34D399', bg: 'rgba(52,211,153,.12)', label: 'C++'        },
  ruby:       { color: '#F43F5E', bg: 'rgba(244,63,94,.12)',  label: 'Ruby'       },
  php:        { color: '#818CF8', bg: 'rgba(129,140,248,.12)', label: 'PHP'       },
  sql:        { color: '#60A5FA', bg: 'rgba(96,165,250,.12)', label: 'SQL'        },
};

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    try   { const { data } = await api.get('/rooms'); setRooms(data.rooms || []); }
    catch { toast.error('Could not load rooms.'); }
    finally { setLoading(false); }
  };

  const filtered = rooms.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.roomId.toLowerCase().includes(search.toLowerCase());
    const matchLang = filterLang === 'all' || r.language === filterLang;
    return matchSearch && matchLang;
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--cc-bg, #050505)' }}>
      <TopNav subtitle="All Rooms" />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <SideNav />

        <div className="scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding: '36px 32px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>Rooms Directory</h1>
                <p style={{ fontSize: 14, color: '#9CA3AF' }}>Manage and search through all your collaborative sessions.</p>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Search rooms..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.07)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#F1F5F9', outline: 'none', width: 200
                  }}
                />
                <select
                  value={filterLang}
                  onChange={e => setFilterLang(e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,.4)', border: '1px solid rgba(255,255,255,.07)',
                    borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#F1F5F9', outline: 'none', cursor: 'pointer'
                  }}
                >
                  <option value="all">All Languages</option>
                  {Object.entries(LANG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.02)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6B7280' }}>Room Details</span>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6B7280' }}>Language</span>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6B7280' }}>Participants</span>
                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#6B7280', textAlign: 'right' }}>Actions</span>
              </div>

              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '16px 20px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,.04)' : 'none', alignItems: 'center' }}>
                      <div className="skeleton" style={{ height: 16, width: '60%' }} />
                      <div className="skeleton" style={{ height: 16, width: '50%' }} />
                      <div className="skeleton" style={{ height: 24, width: 72, borderRadius: 12 }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div className="skeleton" style={{ height: 28, width: 80, borderRadius: 6 }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: '#6B7280' }}>No rooms found matching your criteria.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filtered.map((room, i) => {
                    const m = LANG[room.language] || { color: '#D1D5DB', bg: 'rgba(255,255,255,.12)', label: room.language };
                    return (
                      <div key={room.roomId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '16px 20px', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {room.title}
                            {room.isPrivate && <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#FBBF24' }}>lock</span>}
                          </span>
                          <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>ID: {room.roomId}</span>
                        </div>
                        
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: m.bg, color: m.color, border: `1px solid ${m.color}30` }}>
                            {m.label}
                          </span>
                        </div>

                        <div style={{ display: 'flex' }}>
                          {(room.participants || []).slice(0, 4).map((p, j) => (
                            <div key={j} title={p.username} style={{ width: 24, height: 24, borderRadius: '50%', background: p.avatarColor || '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', border: '2px solid #0A0A0A', marginLeft: j > 0 ? -8 : 0 }}>
                              {p.username?.charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => navigate(`/editor/${room.roomId}`)}
                            style={{ padding: '6px 14px', borderRadius: 6, background: 'linear-gradient(135deg,#D1D5DB,#6B7280)', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'box-shadow .15s' }}
                            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,255,255,.3)'}
                            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                          >
                            Open Room
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
