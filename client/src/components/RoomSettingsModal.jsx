import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function RoomSettingsModal({ room, onClose, onUpdate }) {
  const [isPrivate, setIsPrivate] = useState(room.isPrivate || false);
  const [password, setPassword] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(room.isReadOnly || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        isPrivate,
        isReadOnly,
      };
      
      // Only send password if it's private and a new password was typed
      if (isPrivate && password) {
        payload.password = password;
      } else if (!isPrivate) {
        // If they disable private mode, explicitly pass false to remove password in backend
        payload.isPrivate = false;
      }

      const { data } = await api.put(`/rooms/${room.roomId}/settings`, payload);
      toast.success('Room settings updated!');
      onUpdate(data.room);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(6px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 440, borderRadius: 20, padding: 28,
          background: '#0A0A0A', border: '1px solid rgba(255,255,255,.25)',
          boxShadow: '0 40px 100px rgba(0,0,0,.7)', animation: 'fade-up .22s ease'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#F1F5F9' }}>Room Settings</h2>
            <p style={{ fontSize: 13, color: '#4B5563', marginTop: 3 }}>Manage access and permissions for your room.</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.05)', border: 'none', cursor: 'pointer', color: '#6B7280' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>close</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Read-Only Mode */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,.05)' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>Read-Only Mode</p>
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Only you can type. Others can only view.</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
              <input type="checkbox" checked={isReadOnly} onChange={(e) => setIsReadOnly(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isReadOnly ? '#D1D5DB' : 'rgba(255,255,255,.1)', borderRadius: 24, transition: '.2s' }}>
                <span style={{ position: 'absolute', content: '""', height: 18, width: 18, left: isReadOnly ? 22 : 3, bottom: 3, backgroundColor: 'white', borderRadius: '50%', transition: '.2s' }} />
              </span>
            </label>
          </div>

          {/* Private Room */}
          <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#F1F5F9' }}>Private Room</p>
                <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>Require a password to join.</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isPrivate ? '#D1D5DB' : 'rgba(255,255,255,.1)', borderRadius: 24, transition: '.2s' }}>
                  <span style={{ position: 'absolute', content: '""', height: 18, width: 18, left: isPrivate ? 22 : 3, bottom: 3, backgroundColor: 'white', borderRadius: '50%', transition: '.2s' }} />
                </span>
              </label>
            </div>

            {isPrivate && (
              <div style={{ marginTop: 16, animation: 'fade-up .2s' }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>Set Password</label>
                <input
                  type="password"
                  placeholder="Enter a secure password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 8,
                    background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.07)',
                    fontSize: 13, color: '#F1F5F9', outline: 'none', transition: 'border-color .15s'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#D1D5DB'}
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'}
                />
                <p style={{ fontSize: 11, color: '#6B7280', marginTop: 6 }}>
                  {room.isPrivate && !password ? 'Leave empty to keep the existing password.' : 'Anyone with the link will need this password.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 16px', borderRadius: 8, background: 'rgba(255,255,255,.05)', border: 'none', color: '#E2E8F0', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (isPrivate && !room.isPrivate && !password)}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #D1D5DB 0%, #6B7280 100%)',
              color: '#fff', fontSize: 13, fontWeight: 600,
              boxShadow: '0 4px 14px rgba(255,255,255,.3)',
              opacity: (isPrivate && !room.isPrivate && !password) ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
