import { useState, useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useCompilerStore } from '@/stores/compilerStore';

function defineCustomThemes(monaco: Monaco) {
  monaco.editor.defineTheme('ctac-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '6DAAFF', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: '6DAAFF', fontStyle: 'bold' },
      { token: 'type', foreground: '5EC4D4' },
      { token: 'type.identifier', foreground: '5EC4D4' },
      { token: 'string', foreground: '70C57A' },
      { token: 'number', foreground: 'E8A84E' },
      { token: 'comment', foreground: '616D82', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'A0AABB' },
      { token: 'operator', foreground: 'D97AAF' },
      { token: 'identifier', foreground: 'D4D8E0' },
      { token: 'variable', foreground: 'D4D8E0' },
      { token: 'function', foreground: 'F0C95E' },
      { token: 'preprocessor', foreground: 'B28CE0' },
    ],
    colors: {
      'editor.background': '#10141D',
      'editor.foreground': '#D4D8E0',
      'editor.lineHighlightBackground': '#1A1F2E',
      'editor.selectionBackground': '#264F78',
      'editorCursor.foreground': '#20D68C',
      'editorLineNumber.foreground': '#3A4258',
      'editorLineNumber.activeForeground': '#6B7A94',
      'editor.selectionHighlightBackground': '#264F7844',
      'editorBracketMatch.background': '#264F7844',
      'editorBracketMatch.border': '#20D68C55',
      'editorIndentGuide.background': '#1E2333',
      'editorIndentGuide.activeBackground': '#2E3548',
      'editorWidget.background': '#151A26',
      'editorSuggestWidget.background': '#151A26',
      'editorSuggestWidget.border': '#1E2838',
    },
  });

  monaco.editor.defineTheme('ctac-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '1A5FB4', fontStyle: 'bold' },
      { token: 'keyword.control', foreground: '1A5FB4', fontStyle: 'bold' },
      { token: 'type', foreground: '1A7A7A' },
      { token: 'type.identifier', foreground: '1A7A7A' },
      { token: 'string', foreground: '2E7D32' },
      { token: 'number', foreground: 'B35900' },
      { token: 'comment', foreground: '7A8599', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '5A6575' },
      { token: 'operator', foreground: 'A83264' },
      { token: 'identifier', foreground: '2D3440' },
      { token: 'function', foreground: '8C6800' },
      { token: 'preprocessor', foreground: '7C4DBA' },
    ],
    colors: {
      'editor.background': '#F5F7FA',
      'editor.foreground': '#2D3440',
      'editor.lineHighlightBackground': '#EDF0F5',
      'editor.selectionBackground': '#C8DDF8',
      'editorCursor.foreground': '#18A068',
      'editorLineNumber.foreground': '#B8C0CC',
      'editorLineNumber.activeForeground': '#6B7A94',
      'editorBracketMatch.background': '#C8DDF855',
      'editorBracketMatch.border': '#18A06855',
      'editorIndentGuide.background': '#E8ECF0',
      'editorIndentGuide.activeBackground': '#D0D8E0',
    },
  });
}

export function CodeEditor() {
  const { sourceCode, setSource, result, settings } = useCompilerStore();
  const [editorTheme, setEditorTheme] = useState('ctac-dark');
  const monacoRef = useRef<Monaco | null>(null);

  const updateTheme = () => {
    const theme = document.documentElement.getAttribute('data-theme');
    setEditorTheme(theme === 'light' ? 'ctac-light' : 'ctac-dark');
  };

  useEffect(() => {
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    updateTheme();
    return () => observer.disconnect();
  }, []);

  const handleEditorMount = (_editor: unknown, monaco: Monaco) => {
    monacoRef.current = monaco;
    defineCustomThemes(monaco);
    updateTheme();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-surface-panel px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <span className="font-code text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Source (C)</span>
        </div>
        <span className="font-code text-[10px] text-muted-foreground">main.c</span>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language="c"
          theme={editorTheme}
          value={sourceCode}
          onChange={(val) => setSource(val || '')}
          onMount={handleEditorMount}
          beforeMount={defineCustomThemes}
          options={{
            fontSize: settings.fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: settings.minimap },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            padding: { top: 8, bottom: 8 },
            automaticLayout: true,
            tabSize: settings.tabSize,
            wordWrap: settings.wordWrap ? 'on' : 'off',
            renderLineHighlight: 'line',
            bracketPairColorization: { enabled: true },
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            fontLigatures: true,
          }}
        />
      </div>
    </div>
  );
}
