import MonacoEditor from '@monaco-editor/react';
import { useRef, forwardRef, useImperativeHandle } from 'react';
import { useSettings } from '../context/SettingsContext';

const LANG_MAP = {
  javascript: 'javascript', typescript: 'typescript', python: 'python',
  java: 'java', cpp: 'cpp', c: 'c', csharp: 'csharp', go: 'go',
  rust: 'rust', ruby: 'ruby', php: 'php', html: 'html', css: 'css',
  sql: 'sql', markdown: 'markdown', json: 'json', xml: 'xml',
  yaml: 'yaml', bash: 'shell', plaintext: 'plaintext',
};

// Theme definitions
const THEMES = {
  dark: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',    foreground: 'c084fc' },
      { token: 'string',     foreground: '86efac' },
      { token: 'number',     foreground: 'fbbf24' },
      { token: 'comment',    foreground: '4b5563', fontStyle: 'italic' },
      { token: 'type',       foreground: '93c5fd' },
      { token: 'function',   foreground: 'a78bfa' },
      { token: 'variable',   foreground: 'e2e8f0' },
      { token: 'delimiter',  foreground: 'cbd5e1' },
      { token: 'identifier', foreground: 'e2e8f0' },
    ],
    colors: {
      'editor.background':                 '#09090F',
      'editor.foreground':                 '#E2E8F0',
      'editor.lineHighlightBackground':    '#ffffff08',
      'editor.selectionBackground':        '#D1D5DB20',
      'editor.inactiveSelectionBackground':'#D1D5DB10',
      'editorCursor.foreground':           '#F3F4F6',
      'editorLineNumber.foreground':       '#374151',
      'editorLineNumber.activeForeground': '#6B7280',
      'editorGutter.background':           '#09090F',
      'editorWidget.background':           '#111120',
      'editorWidget.border':               '#1F2937',
      'editorSuggestWidget.background':    '#111120',
      'editorSuggestWidget.border':        '#1F2937',
      'editorSuggestWidget.selectedBackground': '#1F2937',
      'editorIndentGuide.background':      '#ffffff06',
      'editorIndentGuide.activeBackground':'#ffffff12',
      'scrollbarSlider.background':        '#ffffff10',
      'scrollbarSlider.hoverBackground':   '#ffffff1a',
      'editorBracketMatch.background':     '#D1D5DB25',
      'editorBracketMatch.border':         '#D1D5DB50',
    },
  },
  midnight: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',    foreground: '818CF8' },
      { token: 'string',     foreground: '34D399' },
      { token: 'number',     foreground: 'F59E0B' },
      { token: 'comment',    foreground: '475569', fontStyle: 'italic' },
      { token: 'type',       foreground: '7DD3FC' },
      { token: 'function',   foreground: 'A78BFA' },
      { token: 'variable',   foreground: 'CBD5E1' },
      { token: 'delimiter',  foreground: '94A3B8' },
      { token: 'identifier', foreground: 'CBD5E1' },
    ],
    colors: {
      'editor.background':                 '#0F172A',
      'editor.foreground':                 '#E2E8F0',
      'editor.lineHighlightBackground':    '#1E293B',
      'editor.selectionBackground':        '#334155',
      'editor.inactiveSelectionBackground':'#1E293B',
      'editorCursor.foreground':           '#E2E8F0',
      'editorLineNumber.foreground':       '#475569',
      'editorLineNumber.activeForeground': '#94A3B8',
      'editorGutter.background':           '#0F172A',
      'editorWidget.background':           '#1E293B',
      'editorWidget.border':               '#334155',
      'editorSuggestWidget.background':    '#1E293B',
      'editorSuggestWidget.border':        '#334155',
      'editorSuggestWidget.selectedBackground': '#334155',
      'editorIndentGuide.background':      '#1E293B',
      'editorIndentGuide.activeBackground':'#334155',
      'scrollbarSlider.background':        '#33415540',
      'scrollbarSlider.hoverBackground':   '#33415580',
      'editorBracketMatch.background':     '#33415550',
      'editorBracketMatch.border':         '#47556980',
    },
  },
  dracula: {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword',    foreground: 'FF79C6' },
      { token: 'string',     foreground: 'F1FA8C' },
      { token: 'number',     foreground: 'BD93F9' },
      { token: 'comment',    foreground: '6272A4', fontStyle: 'italic' },
      { token: 'type',       foreground: '8BE9FD' },
      { token: 'function',   foreground: '50FA7B' },
      { token: 'variable',   foreground: 'F8F8F2' },
      { token: 'delimiter',  foreground: 'F8F8F2' },
      { token: 'identifier', foreground: 'F8F8F2' },
    ],
    colors: {
      'editor.background':                 '#282A36',
      'editor.foreground':                 '#F8F8F2',
      'editor.lineHighlightBackground':    '#44475A',
      'editor.selectionBackground':        '#44475A',
      'editor.inactiveSelectionBackground':'#44475A80',
      'editorCursor.foreground':           '#F8F8F2',
      'editorLineNumber.foreground':       '#6272A4',
      'editorLineNumber.activeForeground': '#F8F8F2',
      'editorGutter.background':           '#282A36',
      'editorWidget.background':           '#21222C',
      'editorWidget.border':               '#44475A',
      'editorSuggestWidget.background':    '#21222C',
      'editorSuggestWidget.border':        '#44475A',
      'editorSuggestWidget.selectedBackground': '#44475A',
      'editorIndentGuide.background':      '#44475A50',
      'editorIndentGuide.activeBackground':'#44475A',
      'scrollbarSlider.background':        '#44475A80',
      'scrollbarSlider.hoverBackground':   '#44475A',
      'editorBracketMatch.background':     '#44475A',
      'editorBracketMatch.border':         '#F8F8F280',
    },
  },
};

const Editor = forwardRef(function Editor({ value, language, onChange, onCursorChange, readOnly = false }, ref) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const { settings } = useSettings();

  // Expose getValue() to parent via ref
  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() ?? '',
  }));

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({ lineNumber: e.position.lineNumber, column: e.position.column });
      }
    });

    // Register all themes
    for (const [name, def] of Object.entries(THEMES)) {
      monaco.editor.defineTheme(`collabcode-${name}`, def);
    }

    // Apply the user's selected theme
    monaco.editor.setTheme(`collabcode-${settings.theme || 'dark'}`);
  };

  // Update editor options when settings change
  const prevSettings = useRef(settings);
  if (editorRef.current && monacoRef.current) {
    // Check if settings changed
    if (prevSettings.current !== settings) {
      prevSettings.current = settings;
      editorRef.current.updateOptions({
        fontSize: settings.fontSize || 14,
        fontFamily: `'${settings.fontFamily || 'JetBrains Mono'}', monospace`,
        tabSize: settings.tabSize || 2,
        wordWrap: settings.wordWrap ? 'on' : 'off',
        minimap: { enabled: !!settings.minimap },
        lineNumbers: settings.lineNumbers ? 'on' : 'off',
      });
      monacoRef.current.editor.setTheme(`collabcode-${settings.theme || 'dark'}`);
    }
  }

  return (
    <MonacoEditor
      height="100%"
      language={LANG_MAP[language] || 'javascript'}
      value={value}
      onChange={onChange}
      onMount={handleMount}
      options={{
        readOnly,
        fontSize: settings.fontSize || 14,
        fontFamily: `'${settings.fontFamily || 'JetBrains Mono'}', monospace`,
        fontLigatures: true,
        lineHeight: 22,
        minimap: { enabled: !!settings.minimap },
        scrollBeyondLastLine: false,
        padding: { top: 20, bottom: 20 },
        renderLineHighlight: 'line',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        automaticLayout: true,
        tabSize: settings.tabSize || 2,
        wordWrap: settings.wordWrap ? 'on' : 'off',
        lineNumbers: settings.lineNumbers ? 'on' : 'off',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderFinalNewline: 'on',
        scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
      }}
    />
  );
});

export default Editor;
