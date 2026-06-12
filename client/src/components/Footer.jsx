import { useSocket } from '../context/SocketContext';

function Seg({ children, style }) {
  return (
    <div
      className="flex items-center gap-1"
      style={{
        height: '100%', padding: '0 10px', cursor: 'default',
        transition: 'background .12s', fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        color: 'rgba(255,255,255,.75)',
        ...style,
      }}
      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,.12)'}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}
    >
      {children}
    </div>
  );
}

function Icon({ name }) {
  return <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{name}</span>;
}

export default function Footer({ language = 'JavaScript', line, col }) {
  const { connected } = useSocket();

  return (
    <footer
      style={{
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(90deg, #374151 0%, #D1D5DB 50%, #6B7280 100%)',
        flexShrink: 0,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Left segments */}
      <div className="flex items-center h-full">
        <Seg><Icon name="account_tree" /> main</Seg>
        <Seg><Icon name="sync" /> 0↓ 0↑</Seg>
        <Seg style={{ fontWeight: 600 }}>CollabCode</Seg>
      </div>

      {/* Right segments */}
      <div className="flex items-center h-full">
        <Seg>Ln {line || 1}, Col {col || 1}</Seg>
        <Seg>Spaces: 2</Seg>
        <Seg>UTF-8</Seg>
        <Seg style={{ fontWeight: 600 }}>{language}</Seg>
        <Seg><Icon name="check_circle" /> Prettier</Seg>
        <Seg>
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: connected ? '#86EFAC' : '#FCA5A5' }}
          />
          {connected ? 'Connected' : 'Disconnected'}
        </Seg>
        <Seg><Icon name="notifications" /></Seg>
      </div>
    </footer>
  );
}
