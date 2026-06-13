import { createContext, useContext, useState, useCallback } from 'react';

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

function load(key) {
  try {
    const val = localStorage.getItem(`cc_${key}`);
    return val !== null ? JSON.parse(val) : DEFAULTS[key];
  } catch {
    return DEFAULTS[key];
  }
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

  const updateSetting = useCallback((key, value) => {
    localStorage.setItem(`cc_${key}`, JSON.stringify(value));
    setSettingsState(prev => ({ ...prev, [key]: value }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, DEFAULTS }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Fallback if not wrapped in provider — return defaults
    return { settings: { ...DEFAULTS }, updateSetting: () => {} };
  }
  return ctx;
}
