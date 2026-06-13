import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const DEFAULTS = {
  fontSize: 14,
  fontFamily: 'JetBrains Mono',
  tabSize: 2,
  wordWrap: false,
  minimap: false,
  lineNumbers: true,
  autoSave: true,
  theme: 'dark',
  notifications: true,
  sound: false,
};

/* ── Theme CSS variable maps ── */
const THEME_VARS = {
  dark: {
    '--cc-bg':          '#050505',
    '--cc-bg-card':     'rgba(255,255,255,.025)',
    '--cc-bg-elevated': '#0A0A0F',
    '--cc-bg-panel':    'rgba(5,5,12,.98)',
    '--cc-bg-input':    'rgba(0,0,0,.4)',
    '--cc-border':      'rgba(255,255,255,.06)',
    '--cc-border-strong': 'rgba(255,255,255,.12)',
    '--cc-text':        '#F1F5F9',
    '--cc-text-secondary': '#9CA3AF',
    '--cc-text-muted':  '#4B5563',
    '--cc-text-dim':    '#374151',
    '--cc-accent':      '#D1D5DB',
    '--cc-accent-glow': 'rgba(209,213,219,.15)',
    '--cc-topnav':      'rgba(5,5,8,.85)',
    '--cc-sidenav':     '#07070D',
    '--cc-footer':      '#050508',
    '--cc-scrollbar':   'rgba(255,255,255,.08)',
  },
  midnight: {
    '--cc-bg':          '#0B1120',
    '--cc-bg-card':     'rgba(30,41,59,.4)',
    '--cc-bg-elevated': '#0F172A',
    '--cc-bg-panel':    'rgba(15,23,42,.98)',
    '--cc-bg-input':    'rgba(0,0,0,.35)',
    '--cc-border':      'rgba(71,85,105,.25)',
    '--cc-border-strong': 'rgba(100,116,139,.3)',
    '--cc-text':        '#E2E8F0',
    '--cc-text-secondary': '#94A3B8',
    '--cc-text-muted':  '#475569',
    '--cc-text-dim':    '#334155',
    '--cc-accent':      '#818CF8',
    '--cc-accent-glow': 'rgba(129,140,248,.15)',
    '--cc-topnav':      'rgba(15,23,42,.9)',
    '--cc-sidenav':     '#0B1120',
    '--cc-footer':      '#0B1120',
    '--cc-scrollbar':   'rgba(100,116,139,.2)',
  },
  dracula: {
    '--cc-bg':          '#1E1F29',
    '--cc-bg-card':     'rgba(68,71,90,.25)',
    '--cc-bg-elevated': '#282A36',
    '--cc-bg-panel':    'rgba(40,42,54,.98)',
    '--cc-bg-input':    'rgba(0,0,0,.3)',
    '--cc-border':      'rgba(98,114,164,.25)',
    '--cc-border-strong': 'rgba(98,114,164,.4)',
    '--cc-text':        '#F8F8F2',
    '--cc-text-secondary': '#BFC9DB',
    '--cc-text-muted':  '#6272A4',
    '--cc-text-dim':    '#44475A',
    '--cc-accent':      '#BD93F9',
    '--cc-accent-glow': 'rgba(189,147,249,.15)',
    '--cc-topnav':      'rgba(33,34,44,.9)',
    '--cc-sidenav':     '#21222C',
    '--cc-footer':      '#21222C',
    '--cc-scrollbar':   'rgba(98,114,164,.25)',
  },
};

function load(key) {
  try {
    const val = localStorage.getItem(`cc_${key}`);
    return val !== null ? JSON.parse(val) : DEFAULTS[key];
  } catch {
    return DEFAULTS[key];
  }
}

function applyThemeVars(themeName) {
  const vars = THEME_VARS[themeName] || THEME_VARS.dark;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(vars)) {
    root.style.setProperty(prop, value);
  }
  root.setAttribute('data-theme', themeName);
}

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(() => {
    const s = {};
    for (const key of Object.keys(DEFAULTS)) {
      s[key] = load(key);
    }
    return s;
  });

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyThemeVars(settings.theme);
  }, [settings.theme]);

  const updateSetting = useCallback((key, value) => {
    localStorage.setItem(`cc_${key}`, JSON.stringify(value));
    setSettingsState(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, DEFAULTS, THEME_VARS }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    return { settings: { ...DEFAULTS }, updateSetting: () => {}, THEME_VARS };
  }
  return ctx;
}
