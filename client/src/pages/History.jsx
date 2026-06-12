import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import SideNav from '../components/SideNav';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';

function timeAgo(d) {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

export default function History() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await api.get('/rooms');
      const rooms = data.rooms || [];
      
      // Derive activity feed from rooms (created and updated)
      let feed = [];
      rooms.forEach(r => {
        feed.push({
          id: `create-${r.roomId}`,
          type: 'create',
          icon: 'add_circle',
          color: '#34D399',
          bg: 'rgba(52,211,153,.15)',
          title: `Created room ${r.title}`,
          desc: `You started a new ${r.language} collaborative session.`,
          time: new Date(r.createdAt),
          roomId: r.roomId
        });
        
        // If it was updated significantly after creation
        if (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() > 60000) {
          feed.push({
            id: `update-${r.roomId}`,
            type: 'edit',
            icon: 'edit_document',
            color: '#F3F4F6',
            bg: 'rgba(255,255,255,.15)',
            title: `Edited ${r.title}`,
            desc: `You made changes to the files in this workspace.`,
            time: new Date(r.updatedAt),
            roomId: r.roomId
          });
        }
      });
      
      feed.sort((a, b) => b.time.getTime() - a.time.getTime());
      setActivities(feed);
    }
    catch { toast.error('Could not load history.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'#050505' }}>
      <TopNav subtitle="History" />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <SideNav />

        <div className="scroll" style={{ flex:1, overflowY:'auto', overflowX:'hidden', padding: '36px 32px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 40 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>Activity History</h1>
              <p style={{ fontSize: 14, color: '#9CA3AF' }}>Review your past actions, room creations, and edits.</p>
            </div>

            {loading ? (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 35, width: 2, background: 'rgba(255,255,255,.05)' }} />
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', gap: 24, marginBottom: i === 3 ? 0 : 32, position: 'relative' }}>
                    <div className="skeleton" style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, zIndex: 2, border: '4px solid #050505' }} />
                    <div style={{ flex: 1, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 12, padding: 16 }}>
                      <div className="skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
                      <div className="skeleton" style={{ height: 14, width: '70%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', background: 'rgba(255,255,255,.02)', borderRadius: 16, border: '1px dashed rgba(255,255,255,.1)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#6B7280', marginBottom: 12 }}>history</span>
                <p style={{ color: '#9CA3AF' }}>No activity recorded yet.</p>
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 24 }}>
                {/* Timeline Line */}
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 35, width: 2, background: 'rgba(255,255,255,.05)' }} />

                {activities.map((act, i) => (
                  <div key={act.id} style={{ display: 'flex', gap: 24, marginBottom: i === activities.length - 1 ? 0 : 32, position: 'relative' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: act.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 2, border: '4px solid #050505' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12, color: act.color }}>{act.icon}</span>
                    </div>

                    <div style={{ flex: 1, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 12, padding: 16, transition: 'transform .15s', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = 'rgba(255,255,255,.02)'; }}
                      onClick={() => navigate(`/editor/${act.roomId}`)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#E2E8F0' }}>{act.title}</h3>
                        <span style={{ fontSize: 11, color: '#6B7280', fontFamily: 'JetBrains Mono, monospace' }}>{timeAgo(act.time)}</span>
                      </div>
                      <p style={{ fontSize: 13, color: '#9CA3AF' }}>{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
