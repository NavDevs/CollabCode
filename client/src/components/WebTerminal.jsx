import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { spawnProcess } from '../services/webcontainer';

const PROMPT = '\r\n\x1b[1;32m❯\x1b[0m ';

export default function WebTerminal({ wc, onPreviewUrl, height = 260 }) {
  const termRef    = useRef(null);
  const xtermRef   = useRef(null);
  const fitRef     = useRef(null);
  const processRef = useRef(null);
  const inputBuf   = useRef('');

  const writePrompt = useCallback(() => {
    xtermRef.current?.write(PROMPT);
  }, []);

  // Kill current process and run a new command
  const runCommand = useCallback(async (cmdLine) => {
    if (!wc) return;
    const term = xtermRef.current;
    if (!term) return;

    const parts = cmdLine.trim().split(/\s+/);
    const cmd   = parts[0];
    const args  = parts.slice(1);

    if (!cmd) { writePrompt(); return; }

    // Kill any previous process
    if (processRef.current) {
      try { processRef.current.kill(); } catch {}
      processRef.current = null;
    }

    try {
      const proc = await spawnProcess(wc, cmd, args);
      processRef.current = proc;

      // Pipe stdout → terminal
      proc.output.pipeTo(
        new WritableStream({
          write(data) { term.write(data); },
        })
      );

      // Watch for dev-server port → auto preview
      wc.on('server-ready', (port, url) => {
        term.write(`\r\n\x1b[1;36m🌐 Server ready → ${url}\x1b[0m\r\n`);
        if (onPreviewUrl) onPreviewUrl(url);
      });

      const exit = await proc.exit;
      if (exit !== 0) {
        term.write(`\r\n\x1b[31mProcess exited with code ${exit}\x1b[0m`);
      }
    } catch (err) {
      term.write(`\r\n\x1b[31m✗ ${err.message}\x1b[0m`);
    }
    writePrompt();
  }, [wc, writePrompt, onPreviewUrl]);

  // Boot terminal UI
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

    const fit  = new FitAddon();
    const links = new WebLinksAddon();
    term.loadAddon(fit);
    term.loadAddon(links);
    term.open(termRef.current);
    fit.fit();

    xtermRef.current = term;
    fitRef.current   = fit;

    // Welcome banner
    term.writeln('\x1b[1;37m  CollabCode Terminal  \x1b[0m');
    term.writeln('\x1b[90m  Powered by WebContainers — Node.js runs in your browser\x1b[0m');
    term.writeln('');

    if (!wc) {
      term.writeln('\x1b[33m⏳ Booting WebContainer...\x1b[0m');
    } else {
      term.writeln('\x1b[32m✓ WebContainer ready. Type a command below.\x1b[0m');
      term.writeln('\x1b[90m  Try: npm install   npm run dev   node index.js\x1b[0m');
      writePrompt();
    }

    // Handle keyboard input
    term.onKey(({ key, domEvent }) => {
      const ev = domEvent;

      // Ctrl+C → kill process
      if (ev.ctrlKey && ev.key === 'c') {
        if (processRef.current) {
          try { processRef.current.kill(); } catch {}
          processRef.current = null;
        }
        term.write('^C');
        inputBuf.current = '';
        writePrompt();
        return;
      }

      if (ev.key === 'Enter') {
        term.write('\r\n');
        const cmd = inputBuf.current;
        inputBuf.current = '';
        runCommand(cmd);
      } else if (ev.key === 'Backspace') {
        if (inputBuf.current.length > 0) {
          inputBuf.current = inputBuf.current.slice(0, -1);
          term.write('\b \b');
        }
      } else if (!ev.ctrlKey && !ev.altKey && !ev.metaKey) {
        inputBuf.current += key;
        term.write(key);
      }
    });

    // Resize observer
    const ro = new ResizeObserver(() => { try { fit.fit(); } catch {} });
    ro.observe(termRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      xtermRef.current = null;
      fitRef.current   = null;
    };
  // eslint-disable-next-line
  }, []);

  // When wc becomes available after terminal is mounted, show ready msg
  useEffect(() => {
    if (!xtermRef.current || !wc) return;
    xtermRef.current.writeln('\x1b[32m✓ WebContainer ready!\x1b[0m');
    xtermRef.current.writeln('\x1b[90m  Try: npm install   npm run dev   node index.js\x1b[0m');
    writePrompt();
  // eslint-disable-next-line
  }, [wc]);

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
            Terminal {!wc && <span style={{ color: '#F59E0B' }}>— booting…</span>}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => {
              xtermRef.current?.clear();
              xtermRef.current?.writeln('\x1b[90m  Terminal cleared\x1b[0m');
              writePrompt();
            }}
            style={{ background:'none', border:'none', color:'#6B7280', cursor:'pointer', fontSize: 11, padding: '2px 6px' }}
            title="Clear terminal"
          >
            clear
          </button>
          {processRef.current && (
            <button
              onClick={() => {
                try { processRef.current?.kill(); } catch {}
                processRef.current = null;
                xtermRef.current?.write('\r\n\x1b[31m^C Process killed\x1b[0m');
                writePrompt();
              }}
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#EF4444', cursor:'pointer', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}
            >
              Kill
            </button>
          )}
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
