import MonacoEditor from '@monaco-editor/react';
import { useRef, forwardRef, useImperativeHandle } from 'react';

const LANG_MAP = {
  javascript: 'javascript', typescript: 'typescript', python: 'python',
  java: 'java', cpp: 'cpp', c: 'c', csharp: 'csharp', go: 'go',
  rust: 'rust', ruby: 'ruby', php: 'php', html: 'html', css: 'css',
  sql: 'sql', markdown: 'markdown', json: 'json', xml: 'xml',
  yaml: 'yaml', bash: 'shell', plaintext: 'plaintext',
};

const Editor = forwardRef(function Editor({ value, language, onChange, onCursorChange, readOnly = false }, ref) {
  const editorRef = useRef(null);

  // Expose getValue() to parent via ref
  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() ?? '',
  }));

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      if (onCursorChange) {
        onCursorChange({ lineNumber: e.position.lineNumber, column: e.position.column });
      }
    });

    monaco.editor.defineTheme('collabcode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword',    foreground: 'c084fc' },   // violet keywords
        { token: 'string',     foreground: '86efac' },   // green strings
        { token: 'number',     foreground: 'fbbf24' },   // amber numbers
        { token: 'comment',    foreground: '4b5563', fontStyle: 'italic' },
        { token: 'type',       foreground: '93c5fd' },   // blue types
        { token: 'function',   foreground: 'a78bfa' },   // violet functions
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
    });
    monaco.editor.setTheme('collabcode-dark');
  };

  return (
    <MonacoEditor
      height="100%"
      language={LANG_MAP[language] || 'javascript'}
      value={value}
      onChange={onChange}
      onMount={handleMount}
      options={{
        readOnly,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        fontLigatures: true,
        lineHeight: 22,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 20, bottom: 20 },
        renderLineHighlight: 'line',
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'off',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderFinalNewline: 'on',
        scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
      }}
    />
  );
});

export default Editor;
