import { useEffect, useState } from 'react';

/**
 * Extension definitions with actual functionality.
 * Each extension hooks into the Monaco editor instance.
 */

// ─── Shared: read installed extensions from localStorage ───
export function getInstalledExtensions() {
  try {
    const saved = localStorage.getItem('collab_extensions');
    return saved ? JSON.parse(saved) : ['ext-prettier'];
  } catch { return ['ext-prettier']; }
}

// ─── React hook: returns installed list, auto-updates ───
export function useInstalledExtensions() {
  const [installed, setInstalled] = useState(getInstalledExtensions);
  useEffect(() => {
    const update = () => setInstalled(getInstalledExtensions());
    window.addEventListener('extensions-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('extensions-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return installed;
}

// ═══════════════════════════════════════════════════════════
// 1. PRETTIER — Format on Ctrl+Shift+F / Ctrl+S
// ═══════════════════════════════════════════════════════════
function applyPrettier(editor, monaco) {
  // Simple JS/TS/CSS formatter using Monaco's built-in formatter
  const formatAction = editor.addAction({
    id: 'prettier-format',
    label: 'Prettier: Format Document',
    keybindings: [
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
    ],
    run: (ed) => {
      ed.getAction('editor.action.formatDocument')?.run();
    },
  });

  // Format on Ctrl+S
  const saveFormat = editor.addCommand(
    monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
    () => {
      editor.getAction('editor.action.formatDocument')?.run();
    }
  );

  return () => {
    formatAction?.dispose();
  };
}

// ═══════════════════════════════════════════════════════════
// 2. ESLINT — Simple JS linting with markers
// ═══════════════════════════════════════════════════════════
function applyESLint(editor, monaco) {
  const model = editor.getModel();
  if (!model) return () => {};

  const lint = () => {
    const m = editor.getModel();
    if (!m) return;
    const lang = m.getLanguageId();
    if (!['javascript', 'typescript'].includes(lang)) {
      monaco.editor.setModelMarkers(m, 'eslint', []);
      return;
    }

    const text = m.getValue();
    const lines = text.split('\n');
    const markers = [];

    lines.forEach((line, idx) => {
      const ln = idx + 1;

      // Rule: prefer const/let over var
      const varMatch = line.match(/\bvar\s/);
      if (varMatch) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          message: 'eslint(no-var): Unexpected var, use let or const instead.',
          startLineNumber: ln, endLineNumber: ln,
          startColumn: varMatch.index + 1,
          endColumn: varMatch.index + 4,
        });
      }

      // Rule: no console.log
      const consoleMatch = line.match(/\bconsole\.log\b/);
      if (consoleMatch) {
        markers.push({
          severity: monaco.MarkerSeverity.Info,
          message: 'eslint(no-console): Unexpected console statement.',
          startLineNumber: ln, endLineNumber: ln,
          startColumn: consoleMatch.index + 1,
          endColumn: consoleMatch.index + 12,
        });
      }

      // Rule: prefer === over ==
      const eqMatch = line.match(/[^=!<>]==[^=]/);
      if (eqMatch) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          message: 'eslint(eqeqeq): Expected \'===\' and instead saw \'==\'.',
          startLineNumber: ln, endLineNumber: ln,
          startColumn: eqMatch.index + 2,
          endColumn: eqMatch.index + 4,
        });
      }

      // Rule: no alert
      const alertMatch = line.match(/\balert\s*\(/);
      if (alertMatch) {
        markers.push({
          severity: monaco.MarkerSeverity.Warning,
          message: 'eslint(no-alert): Unexpected alert.',
          startLineNumber: ln, endLineNumber: ln,
          startColumn: alertMatch.index + 1,
          endColumn: alertMatch.index + 6,
        });
      }
    });

    monaco.editor.setModelMarkers(m, 'eslint', markers);
  };

  lint();
  const disposable = editor.onDidChangeModelContent(() => lint());
  const langDisposable = editor.onDidChangeModel(() => lint());

  return () => {
    disposable.dispose();
    langDisposable.dispose();
    const m = editor.getModel();
    if (m) monaco.editor.setModelMarkers(m, 'eslint', []);
  };
}

// ═══════════════════════════════════════════════════════════
// 3. PYTHON INTELLISENSE — Python autocomplete suggestions
// ═══════════════════════════════════════════════════════════
function applyPythonIntelliSense(editor, monaco) {
  const PYTHON_BUILTINS = [
    { label: 'print', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'print(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Print objects to the text stream.' },
    { label: 'range', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'range(${1:stop})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return a sequence of numbers.' },
    { label: 'len', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'len(${1:obj})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return the number of items.' },
    { label: 'input', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'input(${1:prompt})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Read a line of input.' },
    { label: 'int', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'int(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert to integer.' },
    { label: 'str', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'str(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert to string.' },
    { label: 'float', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'float(${1:value})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Convert to float.' },
    { label: 'list', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'list(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a list.' },
    { label: 'dict', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'dict(${1:})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Create a dictionary.' },
    { label: 'enumerate', kind: monaco.languages.CompletionItemKind.Function, detail: 'Built-in', insertText: 'enumerate(${1:iterable})', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Return an enumerate object.' },
    { label: 'def', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Snippet', insertText: 'def ${1:function_name}(${2:params}):\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a function.' },
    { label: 'class', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Snippet', insertText: 'class ${1:ClassName}:\n\tdef __init__(self${2:, params}):\n\t\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Define a class.' },
    { label: 'for', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Snippet', insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'For loop.' },
    { label: 'if __name__', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Snippet', insertText: 'if __name__ == "__main__":\n\t${1:main()}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Main guard.' },
    { label: 'try', kind: monaco.languages.CompletionItemKind.Snippet, detail: 'Snippet', insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:print(e)}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Try/except block.' },
    { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Keyword', insertText: 'import ${1:module}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import a module.' },
    { label: 'from', kind: monaco.languages.CompletionItemKind.Keyword, detail: 'Keyword', insertText: 'from ${1:module} import ${2:name}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, documentation: 'Import from module.' },
  ];

  const provider = monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model, position) => ({
      suggestions: PYTHON_BUILTINS.map(s => ({ ...s, range: undefined })),
    }),
  });

  return () => provider.dispose();
}

// ═══════════════════════════════════════════════════════════
// 4. GITLENS — Inline blame decorations
// ═══════════════════════════════════════════════════════════
function applyGitLens(editor, monaco) {
  let decorations = [];

  const update = () => {
    const pos = editor.getPosition();
    if (!pos) return;
    const line = pos.lineNumber;
    // Remove old decorations, add new one on current line
    decorations = editor.deltaDecorations(decorations, [{
      range: new monaco.Range(line, 1, line, 1),
      options: {
        after: {
          content: `    ‎ ‎ ‎ ‎ 👤 You, just now — via CollabCode`,
          inlineClassName: 'gitlens-inline-blame',
        },
        isWholeLine: true,
      },
    }]);
  };

  update();
  const cursorDisp = editor.onDidChangeCursorPosition(() => update());

  return () => {
    cursorDisp.dispose();
    editor.deltaDecorations(decorations, []);
  };
}

// ═══════════════════════════════════════════════════════════
// 5. DRACULA THEME — Automatically apply when installed
// ═══════════════════════════════════════════════════════════
function applyDracula(editor, monaco) {
  // Save the current theme so we can restore on uninstall
  const prevTheme = localStorage.getItem('cc_settings');
  let restored = false;

  // Apply Dracula theme (already defined in MonacoEditor.jsx)
  monaco.editor.setTheme('collabcode-dracula');

  return () => {
    if (!restored) {
      restored = true;
      // Restore previous theme
      try {
        const s = prevTheme ? JSON.parse(prevTheme) : {};
        monaco.editor.setTheme(`collabcode-${s.theme || 'dark'}`);
      } catch {
        monaco.editor.setTheme('collabcode-dark');
      }
    }
  };
}

// ═══════════════════════════════════════════════════════════
// 6. COLLAB COPILOT — Inline ghost-text suggestions
// ═══════════════════════════════════════════════════════════
function applyCopilot(editor, monaco) {
  const SUGGESTIONS = {
    'function ':    'functionName() {\n\t// your code here\n}',
    'const ':       'name = ',
    'console.':     'log()',
    'for (let ':    'i = 0; i < array.length; i++) {\n\t\n}',
    'if (':         'condition) {\n\t\n}',
    'import ':      'React from \'react\';',
    'export ':      'default function Component() {\n\treturn <div></div>;\n}',
    'useState(':    ')',
    'useEffect(':   '() => {\n\t\n}, []);',
    'fetch(':       '\'https://api.example.com\')\n\t.then(res => res.json())\n\t.then(data => console.log(data));',
    'async ':       'function fetchData() {\n\tconst response = await fetch(\'/api\');\n\treturn response.json();\n}',
    'def ':         'function_name():\n\tpass',
    'print(':       ')',
    'class ':       'MyClass:\n\tdef __init__(self):\n\t\tpass',
    'app.':         'get(\'/\', (req, res) => {\n\tres.send(\'Hello World\');\n});',
  };

  const provider = monaco.languages.registerInlineCompletionsProvider(
    { pattern: '**' },
    {
      provideInlineCompletions: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1).trimStart();

        const items = [];
        for (const [trigger, completion] of Object.entries(SUGGESTIONS)) {
          if (textBeforeCursor.endsWith(trigger)) {
            items.push({
              insertText: completion,
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column
              ),
            });
            break;
          }
        }
        return { items };
      },
      freeInlineCompletions: () => {},
    }
  );

  return () => provider.dispose();
}

// ═══════════════════════════════════════════════════════════
// MAIN HOOK: Apply all installed extensions to the editor
// ═══════════════════════════════════════════════════════════
const EXTENSION_APPLIERS = {
  'ext-prettier': applyPrettier,
  'ext-eslint':   applyESLint,
  'ext-python':   applyPythonIntelliSense,
  'ext-gitlens':  applyGitLens,
  'ext-dracula':  applyDracula,
  'ext-copilot':  applyCopilot,
};

export function applyExtensions(editor, monaco, installedIds) {
  const cleanups = [];
  for (const id of installedIds) {
    const applier = EXTENSION_APPLIERS[id];
    if (applier) {
      try {
        const cleanup = applier(editor, monaco);
        if (cleanup) cleanups.push(cleanup);
      } catch (err) {
        console.warn(`Extension ${id} failed to apply:`, err);
      }
    }
  }
  return () => cleanups.forEach(fn => fn());
}
