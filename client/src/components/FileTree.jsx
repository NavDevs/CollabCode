import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function FileTree({ roomId, activePath, setActivePath, openPaths, setOpenPaths, isOwner, refreshKey = 0 }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New file/folder state
  const [creating, setCreating] = useState(false); // false | 'file' | 'folder'
  const [newFileName, setNewFileName] = useState('');
  const [createTarget, setCreateTarget] = useState('/'); // folder path to create inside

  // Rename state
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Folder expanded state
  const [expandedFolders, setExpandedFolders] = useState(new Set(['/']));

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);

  // Cache for preloaded file contents
  const contentCacheRef = useRef({});

  useEffect(() => {
    setLoading(true);
    loadFiles();
    // eslint-disable-next-line
  }, [roomId, refreshKey]);

  useEffect(() => {
    if (activePath) {
      const parts = activePath.split('/').filter(Boolean);
      let current = '';
      setExpandedFolders(prev => {
        const next = new Set(prev);
        let changed = false;
        for (let i = 0; i < parts.length - 1; i++) {
          current += `/${parts[i]}`;
          if (!next.has(current)) {
            next.add(current);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [activePath]);

  const loadFiles = async () => {
    try {
      const { data } = await api.get(`/workspaces/${roomId}/files`);
      const fileList = data?.files || [];
      setFiles(fileList);

      // Preload content cache for instant switching
      fileList.forEach(f => {
        if (f.content !== undefined) {
          contentCacheRef.current[f.path] = f.content;
        }
      });
      
      if (fileList.length > 0 && openPaths.length === 0) {
        const defaultFile = fileList.find(f => f.path === '/main.js') || fileList[0];
        setOpenPaths([defaultFile.path]);
        setActivePath(defaultFile.path);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load workspace files');
    } finally {
      setLoading(false);
    }
  };

  const getExt = (name) => name.split('.').pop().toLowerCase();
  
  const getIcon = (name) => {
    const ext = getExt(name);
    if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') return { icon: 'javascript', color: '#F7DF1E' };
    if (ext === 'ts' || ext === 'tsx') return { icon: 'typescript', color: '#3178C6' };
    if (ext === 'py' || ext === 'pyw') return { icon: 'terminal', color: '#3776AB' };
    if (ext === 'java') return { icon: 'coffee', color: '#ED8B00' };
    if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'hpp') return { icon: 'memory', color: '#00599C' };
    if (ext === 'c' || ext === 'h') return { icon: 'memory', color: '#A8B9CC' };
    if (ext === 'go') return { icon: 'bolt', color: '#00ADD8' };
    if (ext === 'rs') return { icon: 'settings', color: '#DEA584' };
    if (ext === 'rb') return { icon: 'diamond', color: '#CC342D' };
    if (ext === 'php') return { icon: 'php', color: '#777BB4' };
    if (ext === 'sh' || ext === 'bash') return { icon: 'terminal', color: '#4EAA25' };
    if (ext === 'html' || ext === 'htm') return { icon: 'html', color: '#E34F26' };
    if (ext === 'css' || ext === 'scss' || ext === 'less') return { icon: 'css', color: '#1572B6' };
    if (ext === 'json') return { icon: 'data_object', color: '#CBCB41' };
    if (ext === 'md') return { icon: 'markdown', color: '#ffffff' };
    if (ext === 'sql') return { icon: 'database', color: '#336791' };
    if (ext === 'xml') return { icon: 'code', color: '#F96702' };
    if (ext === 'yaml' || ext === 'yml') return { icon: 'settings', color: '#CB171E' };
    if (ext === 'txt') return { icon: 'description', color: '#D1D5DB' };
    return { icon: 'description', color: '#9CA3AF' };
  };

  const handleCreate = async (e) => {
    if (e.key === 'Enter') {
      if (!newFileName.trim()) { setCreating(false); return; }

      const isFolder = creating === 'folder';
      let path = newFileName.trim();

      // Prefix with target folder
      if (createTarget !== '/' && !path.startsWith('/')) {
        path = `${createTarget}/${path}`;
      }
      if (!path.startsWith('/')) path = `/${path}`;

      if (isFolder) {
        // Create folder by creating a .gitkeep inside it
        const keepPath = `${path}/.gitkeep`;
        try {
          const { data } = await api.post(`/workspaces/${roomId}/files`, {
            path: keepPath,
            name: '.gitkeep',
            language: 'plaintext',
          });
          setFiles(prev => [...prev, data.file].sort((a, b) => a.path.localeCompare(b.path)));
          setExpandedFolders(prev => new Set([...prev, path]));
          toast.success(`Folder ${path} created`);
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to create folder');
        }
      } else {
        try {
          const { data } = await api.post(`/workspaces/${roomId}/files`, {
            path,
            name: path.split('/').pop(),
            language: getLanguageFromExt(path),
          });
          setFiles(prev => [...prev, data.file].sort((a, b) => a.path.localeCompare(b.path)));
          if (!openPaths.includes(data.file.path)) {
            setOpenPaths(prev => [...prev, data.file.path]);
          }
          setActivePath(data.file.path);
        } catch (err) {
          toast.error(err.response?.data?.error || 'Failed to create file');
        }
      }
      setCreating(false);
      setNewFileName('');
      setCreateTarget('/');
    } else if (e.key === 'Escape') {
      setCreating(false);
      setNewFileName('');
      setCreateTarget('/');
    }
  };

  const getLanguageFromExt = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    const map = {
      js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
      ts: 'typescript', tsx: 'typescript',
      py: 'python', pyw: 'python',
      java: 'java',
      cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp',
      c: 'c', h: 'c',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      php: 'php',
      sh: 'bash', bash: 'bash',
      html: 'html', htm: 'html',
      css: 'css', scss: 'css', less: 'css',
      json: 'json', md: 'markdown', sql: 'sql', xml: 'xml',
      yaml: 'yaml', yml: 'yaml', txt: 'plaintext',
    };
    return map[ext] || 'plaintext';
  };

  const handleDelete = async (e, path) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${path}?`)) return;
    try {
      await api.delete(`/workspaces/${roomId}/files`, { data: { path } });
      setFiles(prev => prev.filter(f => f.path !== path));
      
      if (openPaths.includes(path)) {
        const newPaths = openPaths.filter(p => p !== path);
        setOpenPaths(newPaths);
        if (activePath === path) {
          setActivePath(newPaths.length > 0 ? newPaths[0] : null);
        }
      }
    } catch (err) {
      toast.error('Failed to delete file');
    }
  };

  // Delete all files inside a folder
  const handleDeleteFolder = async (folderPath) => {
    const folderFiles = files.filter(f => f.path.startsWith(folderPath + '/'));
    if (folderFiles.length === 0) return;
    if (!window.confirm(`Delete folder ${folderPath} and ${folderFiles.length} file(s)?`)) return;
    
    try {
      for (const f of folderFiles) {
        await api.delete(`/workspaces/${roomId}/files`, { data: { path: f.path } });
      }
      setFiles(prev => prev.filter(f => !f.path.startsWith(folderPath + '/')));
      const deletedPaths = new Set(folderFiles.map(f => f.path));
      const newOpen = openPaths.filter(p => !deletedPaths.has(p));
      setOpenPaths(newOpen);
      if (deletedPaths.has(activePath)) {
        setActivePath(newOpen.length > 0 ? newOpen[0] : null);
      }
      toast.success(`Deleted folder ${folderPath}`);
    } catch (err) {
      toast.error('Failed to delete folder');
    }
  };

  const handleRenameSubmit = async (e, oldPath) => {
    if (e.key === 'Enter') {
      if (!renameValue.trim() || renameValue === oldPath) return setRenaming(null);
      try {
        const newPath = renameValue.startsWith('/') ? renameValue : `/${renameValue}`;
        const { data } = await api.put(`/workspaces/${roomId}/files/rename`, {
          oldPath,
          newPath,
          newName: newPath.split('/').pop()
        });
        
        setFiles(prev => prev.map(f => f.path === oldPath ? data.file : f).sort((a,b) => a.path.localeCompare(b.path)));
        setRenaming(null);
        
        const updateTab = (p) => p === oldPath ? newPath : p;
        if (openPaths.includes(oldPath)) setOpenPaths(prev => prev.map(updateTab));
        if (activePath === oldPath) setActivePath(newPath);
        
      } catch (err) {
        toast.error(err.response?.data?.error || 'Failed to rename');
      }
    } else if (e.key === 'Escape') {
      setRenaming(null);
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // Build the hierarchical tree
  const fileTree = useMemo(() => {
    const root = { path: '/', name: '', type: 'folder', children: {} };
    
    files.forEach(file => {
      const parts = file.path.split('/').filter(Boolean);
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current.children[part] = { ...file, type: 'file', label: part };
        } else {
          if (!current.children[part]) {
            const folderPath = current.path === '/' ? `/${part}` : `${current.path}/${part}`;
            current.children[part] = { path: folderPath, name: part, type: 'folder', children: {}, label: part };
          }
          current = current.children[part];
        }
      }
    });
    return root;
  }, [files]);

  // Recursive renderer
  const renderTree = (node, level = 0) => {
    const sortedChildren = Object.values(node.children).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

    return sortedChildren.map(child => {
      if (child.type === 'folder') {
        const isExpanded = expandedFolders.has(child.path);
        return (
          <div key={child.path}>
            <div 
              onClick={() => toggleFolder(child.path)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', path: child.path });
              }}
              style={{
                padding: `4px 16px 4px ${level * 14 + 16}px`,
                display: 'flex', alignItems: 'center', cursor: 'pointer',
                color: '#9CA3AF',
                userSelect: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>
                {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
              </span>
              <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 6, color: '#D1D5DB' }}>
                {isExpanded ? 'folder_open' : 'folder'}
              </span>
              <span style={{ fontSize: 13, flex: 1 }}>{child.label}</span>
              {/* Folder action buttons */}
              <div style={{ display: 'flex', gap: 2, opacity: 0.5 }} onClick={e => e.stopPropagation()}>
                <button 
                  onClick={() => { setCreating('file'); setCreateTarget(child.path); setNewFileName(''); }}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                  title="New File"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>note_add</span>
                </button>
                <button 
                  onClick={() => { setCreating('folder'); setCreateTarget(child.path); setNewFileName(''); }}
                  style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                  title="New Folder"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>create_new_folder</span>
                </button>
                <button 
                  onClick={() => handleDeleteFolder(child.path)}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}
                  title="Delete Folder"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                </button>
              </div>
            </div>
            {/* Inline create input inside this folder */}
            {creating && createTarget === child.path && isExpanded && (
              <div style={{ padding: `4px 16px 4px ${(level + 1) * 14 + 16 + 20}px`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: creating === 'folder' ? '#D1D5DB' : '#6B7280' }}>
                  {creating === 'folder' ? 'create_new_folder' : 'draft'}
                </span>
                <input
                  autoFocus
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onKeyDown={handleCreate}
                  onBlur={() => { setCreating(false); setNewFileName(''); setCreateTarget('/'); }}
                  placeholder={creating === 'folder' ? 'folder-name' : 'filename.js'}
                  style={{ flex: 1, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.5)', color: '#fff', fontSize: 12, padding: '2px 6px', outline: 'none', borderRadius: 4 }}
                />
              </div>
            )}
            {isExpanded && renderTree(child, level + 1)}
          </div>
        );
      } else {
        // Hide .gitkeep files
        if (child.label === '.gitkeep') return null;

        const { icon, color } = getIcon(child.name);
        const isActive = activePath === child.path;
        const isRenaming = renaming === child.path;

        return (
          <div
            key={child.path}
            onClick={() => {
              if (!openPaths.includes(child.path)) setOpenPaths(prev => [...prev, child.path]);
              setActivePath(child.path);
            }}
            style={{
              padding: `4px 16px 4px ${level * 14 + 16 + 20}px`,
              display: 'flex', alignItems: 'center', gap: 8,
              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderLeft: `2px solid ${isActive ? '#D1D5DB' : 'transparent'}`,
              cursor: 'pointer',
              color: isActive ? '#F1F5F9' : '#9CA3AF',
              userSelect: 'none'
            }}
            onMouseEnter={e => { if(!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { if(!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: isActive ? color : '#6B7280' }}>
              {icon}
            </span>
            
            {isRenaming ? (
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={(e) => handleRenameSubmit(e, child.path)}
                onBlur={() => setRenaming(null)}
                style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', fontSize: 13, padding: '0 4px', outline: 'none', borderRadius: 2 }}
              />
            ) : (
              <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {child.label}
              </span>
            )}

            {!isRenaming && (
              <div style={{ display: 'flex', gap: 4, opacity: isActive ? 1 : 0.4 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => { setRenaming(child.path); setRenameValue(child.path); }} style={{ background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', padding:0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                </button>
                <button onClick={(e) => handleDelete(e, child.path)} style={{ background:'none', border:'none', color:'#EF4444', cursor:'pointer', padding:0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                </button>
              </div>
            )}
          </div>
        );
      }
    });
  };

  if (loading) {
    return <div style={{ padding: 20, color: '#6B7280', fontSize: 13 }}>Loading workspace...</div>;
  }

  return (
    <div 
      style={{ background: '#0A0A0A', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
      onClick={() => { if (contextMenu) setContextMenu(null); }}
    >
      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#9CA3AF', textTransform: 'uppercase' }}>Explorer</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => { setCreating('file'); setCreateTarget('/'); setNewFileName(''); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, display: 'flex' }} title="New File">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>note_add</span>
          </button>
          <button onClick={() => { setCreating('folder'); setCreateTarget('/'); setNewFileName(''); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0, display: 'flex' }} title="New Folder">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>create_new_folder</span>
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }} className="scroll">
        {/* Root-level create input */}
        {creating && createTarget === '/' && (
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: creating === 'folder' ? '#D1D5DB' : '#6B7280' }}>
              {creating === 'folder' ? 'create_new_folder' : 'draft'}
            </span>
            <input
              autoFocus
              value={newFileName}
              onChange={e => setNewFileName(e.target.value)}
              onKeyDown={handleCreate}
              onBlur={() => { setCreating(false); setNewFileName(''); setCreateTarget('/'); }}
              placeholder={creating === 'folder' ? 'folder-name' : 'e.g. src/new.js'}
              style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.5)', color: '#fff', fontSize: 13, padding: '2px 6px', outline: 'none', borderRadius: 4, width: '100%' }}
            />
          </div>
        )}

        <div style={{ paddingBottom: 16 }}>
          {renderTree(fileTree)}
        </div>
      </div>
    </div>
  );
}
