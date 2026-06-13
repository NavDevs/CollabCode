import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function GithubPanel({ roomId, onImportComplete }) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState('');
  
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [search, setSearch] = useState('');
  
  const [selectedRepo, setSelectedRepo] = useState('');
  const [branch, setBranch] = useState('main');
  
  const [commitMessage, setCommitMessage] = useState('Update workspace via CollabCode');
  const [isPushing, setIsPushing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [mode, setMode] = useState('push'); // 'push' or 'import'

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (connected) {
      fetchRepos();
    }
  }, [connected]);

  const checkStatus = async () => {
    try {
      setLoadingStatus(true);
      const { data } = await api.get('/github/status');
      setConnected(data.connected);
      setUsername(data.username || '');
    } catch (err) {
      console.error('Error checking github status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const fetchRepos = async () => {
    try {
      setLoadingRepos(true);
      const { data } = await api.get('/github/repos');
      setRepos(data.repos || []);
    } catch (err) {
      toast.error('Failed to load GitHub repositories.');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleConnect = async () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api';
    const apiOrigin = baseUrl.replace('/api', '');
    // Get current Clerk token to pass as query param (full-page redirect can't send Bearer header)
    try {
      const { data } = await api.get('/github/auth-url');
      window.location.href = data.url;
    } catch {
      // Fallback: redirect directly with token from api interceptor
      const token = api.defaults.headers?.common?.['Authorization']?.replace('Bearer ', '') || '';
      const authUrl = `${apiOrigin}/api/github/auth?token=${token}`;
      window.location.href = authUrl;
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your GitHub account?')) return;
    try {
      await api.post('/github/disconnect');
      setConnected(false);
      setUsername('');
      setRepos([]);
      setSelectedRepo('');
      toast.success('GitHub account disconnected.');
    } catch (err) {
      toast.error('Failed to disconnect GitHub account.');
    }
  };

  const handlePush = async (e) => {
    e.preventDefault();
    if (!selectedRepo) return toast.error('Please select a repository.');

    try {
      setIsPushing(true);
      const loadToast = toast.loading('Pushing workspace to GitHub...');
      
      await api.post(`/github/room/${roomId}/push-all`, {
        repoFullName: selectedRepo,
        commitMessage,
        branch,
      });
      
      toast.dismiss(loadToast);
      toast.success('Workspace pushed to GitHub successfully!');
      setCommitMessage('Update workspace via CollabCode');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to push workspace to GitHub.');
    } finally {
      setIsPushing(false);
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!selectedRepo) return toast.error('Please select a repository.');
    if (!window.confirm(`This will OVERWRITE your current workspace files with the contents of ${selectedRepo}. Are you sure?`)) return;

    try {
      setIsImporting(true);
      const loadToast = toast.loading('Importing repository into workspace...');
      
      const { data } = await api.post(`/github/room/${roomId}/import`, {
        repoFullName: selectedRepo,
        branch,
      });
      
      toast.dismiss(loadToast);
      toast.success(`Imported ${data.result?.imported || 0} files!`);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to import repository.');
    } finally {
      setIsImporting(false);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingStatus) {
    return (
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', padding: 20 }}>
        <span className="material-symbols-outlined anim-spin" style={{ fontSize: 24, color: '#F3F4F6' }}>sync</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'transparent' }}>
      
      {/* Panel Title */}
      <div style={{ height: 36, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6B7280' }}>
          GitHub Integration
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }} className="scroll">
        {!connected ? (
          /* NOT CONNECTED STATE */
          <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifySelf: 'center', alignSelf: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#F3F4F6' }}>account_tree</span>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Connect to GitHub</h4>
              <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: '1.4' }}>
                Import repositories into your workspace and push your changes back.
              </p>
            </div>

            <button
              onClick={handleConnect}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #D1D5DB 0%, #6B7280 100%)',
                color: '#fff', fontSize: 12, fontWeight: 600,
                boxShadow: '0 4px 14px rgba(255,255,255,.15)', transition: 'all .15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>
              Link GitHub Account
            </button>
          </div>
        ) : (
          /* CONNECTED STATE */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Account Info Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,.05)', border: '1px solid rgba(16,185,129,.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#10B981' }}>check_circle</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>{username}</span>
                  <span style={{ fontSize: 10, color: '#10B981' }}>Connected</span>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                title="Disconnect Account"
                style={{ width: 26, height: 26, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.03)', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,.1)'; e.currentTarget.style.color = '#F43F5E'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.03)'; e.currentTarget.style.color = '#9CA3AF'; }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>logout</span>
              </button>
            </div>

            {/* Mode Toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,.05)', borderRadius: 8, padding: 4 }}>
              <button
                onClick={() => setMode('push')}
                style={{ flex: 1, padding: '6px 0', border: 'none', background: mode === 'push' ? '#D1D5DB' : 'transparent', color: mode === 'push' ? '#000' : '#9CA3AF', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
              >
                Push
              </button>
              <button
                onClick={() => setMode('import')}
                style={{ flex: 1, padding: '6px 0', border: 'none', background: mode === 'import' ? '#D1D5DB' : 'transparent', color: mode === 'import' ? '#000' : '#9CA3AF', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .2s' }}
              >
                Import
              </button>
            </div>

            {/* Repository Form */}
            <form onSubmit={mode === 'push' ? handlePush : handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              
              {/* Select Repository */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>Repository</label>
                
                {/* Search repository */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      width: '100%', padding: '7px 8px 7px 28px', borderRadius: 8,
                      background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.07)',
                      fontSize: 12, color: '#F1F5F9', outline: 'none'
                    }}
                  />
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: 8, fontSize: 14, color: '#4B5563' }}>search</span>
                </div>

                {/* Repo list select */}
                <div style={{
                  maxHeight: 120, overflowY: 'auto', border: '1px solid rgba(255,255,255,.05)',
                  borderRadius: 8, background: 'rgba(0,0,0,.2)', display: 'flex', flexDirection: 'column'
                }} className="scroll">
                  {loadingRepos ? (
                    <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
                      <span className="material-symbols-outlined anim-spin" style={{ fontSize: 16, color: '#F3F4F6' }}>sync</span>
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div style={{ padding: 12, fontSize: 11, color: '#4B5563', textAlign: 'center' }}>No repositories found</div>
                  ) : (
                    filteredRepos.map(r => (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRepo(r.full_name)}
                        style={{
                          padding: '6px 10px', fontSize: 11, cursor: 'pointer',
                          background: selectedRepo === r.full_name ? 'rgba(255,255,255,.15)' : 'transparent',
                          color: selectedRepo === r.full_name ? '#F3F4F6' : '#9CA3AF',
                          borderBottom: '1px solid rgba(255,255,255,.02)',
                          display: 'flex', alignItems: 'center', gap: 6
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12, opacity: .7 }}>{r.private ? 'lock' : 'public'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Branch */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>Branch</label>
                <input
                  type="text"
                  placeholder="e.g. main"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                  style={{
                    width: '100%', padding: '7px 8px', borderRadius: 8,
                    background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.07)',
                    fontSize: 12, color: '#F1F5F9', outline: 'none'
                  }}
                />
              </div>

              {/* Commit Message (Push Only) */}
              {mode === 'push' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF' }}>Commit Message</label>
                  <textarea
                    placeholder="What does this update contain?"
                    value={commitMessage}
                    onChange={e => setCommitMessage(e.target.value)}
                    rows={2}
                    style={{
                      width: '100%', padding: '7px 8px', borderRadius: 8,
                      background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.07)',
                      fontSize: 12, color: '#F1F5F9', outline: 'none', resize: 'none', fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={(mode === 'push' ? isPushing : isImporting) || !selectedRepo}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 14px', borderRadius: 8, border: 'none',
                  cursor: (mode === 'push' ? isPushing : isImporting) || !selectedRepo ? 'not-allowed' : 'pointer',
                  background: (mode === 'push' ? isPushing : isImporting) || !selectedRepo
                    ? 'rgba(255,255,255,.04)'
                    : 'linear-gradient(135deg, #D1D5DB 0%, #6B7280 100%)',
                  color: (mode === 'push' ? isPushing : isImporting) || !selectedRepo ? '#4B5563' : '#fff',
                  fontSize: 12, fontWeight: 600,
                  boxShadow: (mode === 'push' ? isPushing : isImporting) || !selectedRepo ? 'none' : '0 4px 14px rgba(255,255,255,.15)',
                  transition: 'all .15s', marginTop: 4
                }}
                onMouseEnter={e => { if (!((mode === 'push' ? isPushing : isImporting)) && selectedRepo) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { if (!((mode === 'push' ? isPushing : isImporting)) && selectedRepo) e.currentTarget.style.transform = ''; }}
              >
                {mode === 'push' ? (
                  isPushing ? (
                    <><span className="material-symbols-outlined anim-spin" style={{ fontSize: 16 }}>sync</span> Pushing...</>
                  ) : (
                    <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span> Push Workspace</>
                  )
                ) : (
                  isImporting ? (
                    <><span className="material-symbols-outlined anim-spin" style={{ fontSize: 16 }}>sync</span> Importing...</>
                  ) : (
                    <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span> Import to Workspace</>
                  )
                )}
              </button>

            </form>
          </div>
        )}
      </div>

    </div>
  );
}
