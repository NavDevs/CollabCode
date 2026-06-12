import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export default function WebTerminal({ socket, roomId, height = 260 }) {
  const termRef    = useRef(null);
  const xtermRef   = useRef(null);
  const fitRef     = useRef(null);
  const started    = useRef(false);
  const socketRef  = useRef(socket);

  // Keep socketRef in sync with the latest socket prop
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Boot terminal UI and connect to server
  useEffect(() => {
    if (!termRef.current || xtermRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#0A0A0A',
        foreground: '#D1D5DB',
        cursor:     '#9CA3AF',
        black:      '#1F2937',
        green:      '#10B981',
        cyan:       '#06B6D4',
        red:        '#EF4444',
        yellow:     '#F59E0B',
        white:      '#F9FAFB',
        brightBlack:'#374151',
        selectionBackground: 'rgba(255,255,255,0.15)',
      },
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 2000,
      allowProposedApi: true,
    });

    const fit   = new FitAddon();
    const links = new WebLinksAddon();
    term.loadAddon(fit);
    term.loadAddon(links);
    term.open(termRef.current);
    fit.fit();

    xtermRef.current = term;
    fitRef.current   = fit;

    // Welcome banner
    term.writeln('\x1b[1;37m  CollabCode Terminal  \x1b[0m');
    term.writeln('\x1b[90m  Connected to server — Full shell access\x1b[0m');
    term.writeln('');

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
      term.writeln('\x1b[32m✓ Terminal ready!\x1b[0m');
      term.writeln('\x1b[90m  Try: ls, node --version, python3 --version, npm init\x1b[0m');
      term.writeln('');
    };

    // Listen for code execution output (from Run button)
    const onExecStart = ({ language, runner }) => {
      term.writeln(`\r\n\x1b[1;36m▶ ${runner} is running ${language}...\x1b[0m`);
    };

    const onExecOutput = ({ type, data }) => {
      if (type === 'stdout') {
        term.write(data);
      } else if (type === 'stderr') {
        term.write(`\x1b[31m${data}\x1b[0m`);
      }
    };

    const onExecDone = ({ exitCode, duration, language, runner }) => {
      const color = exitCode === 0 ? '32' : '31';
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

  return (
    <div style={{
      height,
      background: '#0A0A0A',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Terminal header */}
      <div style={{
        height: 32,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#10B981' }}>terminal</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            Terminal {!socket && <span style={{ color: '#F59E0B' }}>— connecting…</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              xtermRef.current?.clear();
              xtermRef.current?.writeln('\x1b[90m  Terminal cleared\x1b[0m');
            }}
            style={{ background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize: 11, padding: '2px 6px' }}
            title="Clear terminal"
          >
            clear
          </button>
          <button
            onClick={() => {
              if (socket) {
                socket.emit('terminal-kill');
                started.current = false;
                xtermRef.current?.writeln('\r\n\x1b[90m[Session ended]\x1b[0m');
                // Restart after a brief pause
                setTimeout(() => {
                  if (roomId && socket) {
                    socket.emit('terminal-start', { roomId });
                    started.current = true;
                  }
                }, 500);
              }
            }}
            style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', cursor:'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}
          >
            Restart
          </button>
        </div>
      </div>

      {/* xterm.js mount point */}
      <div
        ref={termRef}
        style={{ flex: 1, padding: '6px 4px', overflow: 'hidden' }}
      />
    </div>
  );
}
