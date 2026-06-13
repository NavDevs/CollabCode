import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export default function WebTerminal({ socket, roomId, height = 260, onResize }) {
  const termRef    = useRef(null);
  const xtermRef   = useRef(null);
  const fitRef     = useRef(null);
  const started    = useRef(false);
  const socketRef  = useRef(socket);
  const [activeTab, setActiveTab] = useState('terminal');
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const dragStart = useRef(null);

  // Keep socketRef in sync with the latest socket prop
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Boot terminal UI and connect to server
  useEffect(() => {
    if (!termRef.current || xtermRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#1E1E1E',
        foreground: '#CCCCCC',
        cursor:     '#AEAFAD',
        cursorAccent: '#1E1E1E',
        black:      '#000000',
        red:        '#CD3131',
        green:      '#0DBC79',
        yellow:     '#E5E510',
        blue:       '#2472C8',
        magenta:    '#BC3FBC',
        cyan:       '#11A8CD',
        white:      '#E5E5E5',
        brightBlack:'#666666',
        brightRed:  '#F14C4C',
        brightGreen:'#23D18B',
        brightYellow:'#F5F543',
        brightBlue: '#3B8EEA',
        brightMagenta:'#D670D6',
        brightCyan: '#29B8DB',
        brightWhite:'#E5E5E5',
        selectionBackground: 'rgba(38,79,120,0.5)',
        selectionForeground: '#FFFFFF',
      },
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Menlo', 'Consolas', monospace",
      fontSize: 13,
      lineHeight: 1.35,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowProposedApi: true,
      convertEol: true,
      drawBoldTextInBrightColors: true,
    });

    const fit   = new FitAddon();
    const links = new WebLinksAddon();
    term.loadAddon(fit);
    term.loadAddon(links);
    term.open(termRef.current);
    fit.fit();

    xtermRef.current = term;
    fitRef.current   = fit;

    // Forward keystrokes to server (use ref to avoid stale closure)
    term.onData((data) => {
      if (socketRef.current) {
        socketRef.current.emit('terminal-input', data);
      }
    });

    // Resize observer
    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
        if (socket && term.cols && term.rows) {
          socket.emit('terminal-resize', { cols: term.cols, rows: term.rows });
        }
      } catch {}
    });
    ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitRef.current   = null;
    };
  // eslint-disable-next-line
  }, []);

  // Connect socket events when socket becomes available
  useEffect(() => {
    if (!socket || !xtermRef.current || started.current) return;

    const term = xtermRef.current;

    // Listen for terminal output from server
    const onOutput = (data) => {
      term.write(data);
    };

    const onReady = () => {
      term.writeln('\x1b[38;2;35;209;139m✓ Shell ready\x1b[0m');
      term.writeln('');
    };

    // Listen for code execution output (from Run button)
    const onExecStart = ({ language, runner }) => {
      setIsRunning(true);
      term.writeln(`\r\n\x1b[1;38;2;36;166;247m▶ Running ${language}...\x1b[0m`);
    };

    const onExecOutput = ({ type, data }) => {
      if (type === 'stdout') {
        term.write(data);
      } else if (type === 'stderr') {
        term.write(`\x1b[38;2;241;76,76m${data}\x1b[0m`);
      }
    };

    const onExecDone = ({ exitCode, duration }) => {
      setIsRunning(false);
      const color = exitCode === 0 ? '38;2;35;209;139' : '38;2;241;76;76';
      const icon = exitCode === 0 ? '✓' : '✗';
      term.writeln(`\r\n\x1b[${color}m${icon} Process exited with code ${exitCode}\x1b[0m \x1b[90m(${duration}ms)\x1b[0m`);
    };

    socket.on('terminal-output', onOutput);
    socket.on('terminal-ready', onReady);
    socket.on('exec-start', onExecStart);
    socket.on('exec-output', onExecOutput);
    socket.on('exec-done', onExecDone);

    // Start the terminal session on the server
    if (roomId) {
      socket.emit('terminal-start', { roomId });
      started.current = true;
    }

    return () => {
      socket.off('terminal-output', onOutput);
      socket.off('terminal-ready', onReady);
      socket.off('exec-start', onExecStart);
      socket.off('exec-output', onExecOutput);
      socket.off('exec-done', onExecDone);
      socket.emit('terminal-kill');
      started.current = false;
    };
  }, [socket, roomId]);

  // Drag to resize
  const handleDragStart = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = e.clientY;
    
    const handleMove = (me) => {
      if (dragStart.current !== null && onResize) {
        const diff = dragStart.current - me.clientY;
        dragStart.current = me.clientY;
        onResize(diff);
      }
    };
    
    const handleUp = () => {
      setIsDragging(false);
      dragStart.current = null;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [onResize]);

  const tabStyle = (active) => ({
    padding: '0 16px',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: active ? 500 : 400,
    color: active ? '#CCCCCC' : '#858585',
    background: 'none',
    border: 'none',
    borderBottom: active ? '1px solid #CCCCCC' : '1px solid transparent',
    cursor: 'pointer',
    transition: 'color .15s',
    fontFamily: "'Inter', system-ui, sans-serif",
  });

  return (
    <div style={{
      height,
      background: '#1E1E1E',
      borderTop: '1px solid #3C3C3C',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* VS Code-style drag handle */}
      <div
        onMouseDown={onResize ? handleDragStart : undefined}
        style={{
          height: 4,
          cursor: onResize ? 'ns-resize' : 'default',
          background: isDragging ? '#007ACC' : 'transparent',
          flexShrink: 0,
          transition: 'background .15s',
        }}
        onMouseEnter={e => { if (onResize) e.currentTarget.style.background = '#007ACC'; }}
        onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background = 'transparent'; }}
      />

      {/* VS Code-style tab bar */}
      <div style={{
        height: 35,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        borderBottom: '1px solid #3C3C3C',
        background: '#1E1E1E',
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <button style={tabStyle(activeTab === 'terminal')} onClick={() => setActiveTab('terminal')}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>terminal</span>
            TERMINAL
          </button>
          <button style={tabStyle(activeTab === 'output')} onClick={() => setActiveTab('output')}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>output</span>
            OUTPUT
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingRight: 8 }}>
          <button
            onClick={() => {
              if (socketRef.current) {
                socketRef.current.emit('terminal-sync');
              }
            }}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#858585', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            title="Sync Files to Disk"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sync</span>
          </button>
          {isRunning && (
            <button
              onClick={() => {
                if (socketRef.current && roomId) {
                  socketRef.current.emit('exec-stop', { roomId });
                  setIsRunning(false);
                }
              }}
              style={{ height: 28, display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171', cursor: 'pointer', borderRadius: 4, fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif" }}
              title="Stop Running Process"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>stop_circle</span>
              Stop
            </button>
          )}
          <button
            onClick={() => {
              xtermRef.current?.clear();
            }}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#858585', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            title="Clear Terminal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete_sweep</span>
          </button>
          <button
            onClick={() => {
              if (socket) {
                socket.emit('terminal-kill');
                started.current = false;
                xtermRef.current?.writeln('\r\n\x1b[90m[Session ended]\x1b[0m');
                setTimeout(() => {
                  if (roomId && socket) {
                    socket.emit('terminal-start', { roomId });
                    started.current = true;
                  }
                }, 500);
              }
            }}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#858585', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            title="Restart Terminal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
          </button>
          <button
            onClick={() => {
              if (socket) {
                socket.emit('terminal-kill');
                started.current = false;
              }
            }}
            style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#858585', cursor: 'pointer', borderRadius: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
            title="Kill Terminal"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
          </button>
        </div>
      </div>

      {/* xterm.js mount point */}
      <div
        ref={termRef}
        style={{ flex: 1, padding: '4px 0 4px 12px', overflow: 'hidden' }}
      />
    </div>
  );
}
