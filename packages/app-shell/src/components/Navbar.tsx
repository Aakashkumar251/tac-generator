import { useEffect, useCallback, useState, useRef } from 'react';
import { Play, Trash2, Download, Copy, BookOpen, Settings, Zap, Share2, Sun, Moon, ChevronRight } from 'lucide-react';
import { useCompilerStore } from '@/stores/compilerStore';
import { samples } from '@ctac/core-compiler';
import { TACInstruction } from '@ctac/shared';
import { SettingsModal } from './SettingsModal';
import { ShareModal } from './ShareModal';

function formatTAC(tac: TACInstruction[]): string {
  return tac.map(instr => {
    if (instr.op === 'label') return `${instr.label}:`;
    if (instr.op === 'func_begin') return `\n// ${instr.comment}\n${instr.result}:`;
    if (instr.op === 'func_end') return `// end ${instr.result}\n`;
    if (instr.op === 'decl') return `  // ${instr.comment}`;
    if (instr.op === '=') return `  ${instr.result} = ${instr.arg1}`;
    if (instr.op === 'goto') return `  goto ${instr.result}`;
    if (instr.op === 'iffalse') return `  iffalse ${instr.arg1} goto ${instr.result}`;
    if (instr.op === 'iftrue') return `  iftrue ${instr.arg1} goto ${instr.result}`;
    if (instr.op === 'return') return instr.arg1 ? `  return ${instr.arg1}` : `  return`;
    if (instr.op === 'param') return `  param ${instr.result}`;
    if (instr.op === 'arg') return `  arg ${instr.arg1}`;
    if (instr.op === 'call') return `  ${instr.result} = call ${instr.arg1}, ${instr.arg2}`;
    if (instr.op === '[]') return `  ${instr.result} = ${instr.arg1}[${instr.arg2}]`;
    if (instr.op === '[]=') return `  ${instr.comment || `${instr.result}[${instr.arg2}] = ${instr.arg1}`}`;
    if (instr.op === '->' || instr.op === '.') return `  ${instr.result} = ${instr.arg1}${instr.op}${instr.arg2}`;
    if (instr.op.startsWith('unary_')) return `  ${instr.result} = ${instr.op.replace('unary_', '')}${instr.arg1}`;
    if (instr.arg2) return `  ${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
    return `  ${instr.op} ${instr.arg1 || ''} ${instr.result || ''}`.trim();
  }).join('\n');
}

const ARCHITECTURES = ['x86-64', 'ARM64', 'RISC-V'] as const;

export function Navbar() {
  const { compileTAC, status, loadSample, setSource, result, settingsOpen, setSettingsOpen, settings, setSettings, sourceCode } = useCompilerStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [arch, setArch] = useState<typeof ARCHITECTURES[number]>('x86-64');
  const samplesRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ctac-theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ctac-theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      try {
        const decoded = decodeURIComponent(escape(atob(code)));
        setSource(decoded);
        window.history.replaceState({}, '', window.location.pathname);
      } catch {}
    }
  }, [setSource]);

  const handleCopy = useCallback(() => {
    if (result?.tac) {
      navigator.clipboard.writeText(formatTAC(result.tac));
    }
  }, [result]);

  const handleDownload = useCallback((format: string) => {
    if (!result?.tac) return;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(result.tac, null, 2);
      filename = 'output.json';
      mimeType = 'application/json';
    } else if (format === 'csv') {
      content = 'Index,Op,Arg1,Arg2,Result,Line\n' +
        result.tac.map((t, i) => `${i},"${t.op}","${t.arg1 || ''}","${t.arg2 || ''}","${t.result || ''}",${t.sourceLine || ''}`).join('\n');
      filename = 'output.csv';
      mimeType = 'text/csv';
    } else if (format === 'md') {
      content = `# TAC Output\n\n| # | Op | Arg1 | Arg2 | Result |\n|---|---|---|---|---|\n` +
        result.tac.map((t, i) => `| ${i} | ${t.op} | ${t.arg1 || ''} | ${t.arg2 || ''} | ${t.result || ''} |`).join('\n');
      filename = 'output.md';
      mimeType = 'text/markdown';
    } else {
      content = formatTAC(result.tac);
      filename = 'output.tac';
      mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }, [result]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (samplesRef.current && !samplesRef.current.contains(e.target as Node)) {
        setSamplesOpen(false);
        setExpandedCategory(null);
      }
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const sampleCategories = samples.reduce<Record<string, typeof samples>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  const categoryOrder = [
    'Functions', 'Control Flow', 'Expressions', 'Arrays', 'Pointers',
    'Algorithms', 'Data Structures', 'Structs', 'Enums', 'Unions', 'Typedefs',
    'Tree Algorithms',
  ];
  const sortedCategories = categoryOrder.filter(c => sampleCategories[c]);
  Object.keys(sampleCategories).forEach(c => {
    if (!sortedCategories.includes(c)) sortedCategories.push(c);
  });

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-surface-panel px-4 py-2">
        {/* Left: Brand + Arch selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h1 className="font-ui text-sm font-bold text-foreground tracking-tight">
              C-TAC <span className="text-primary italic">Pro</span>
            </h1>
          </div>

          {/* Architecture selector pills */}
          <div className="hidden sm:flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
            {ARCHITECTURES.map((a) => (
              <button
                key={a}
                onClick={() => setArch(a)}
                className={`px-3 py-1 text-[11px] font-semibold font-code rounded-md transition-all ${
                  arch === a
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Samples */}
          <div className="relative" ref={samplesRef}>
            <button
              onClick={() => { setSamplesOpen(!samplesOpen); setDownloadOpen(false); }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Samples
            </button>
            {samplesOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 w-72 rounded-lg border border-border bg-card shadow-2xl animate-fade-in max-h-[70vh] overflow-auto">
                {sortedCategories.map((category) => (
                  <div key={category}>
                    <button
                      onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors uppercase tracking-wider"
                    >
                      <span>{category}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-normal text-muted-foreground/60">{sampleCategories[category].length}</span>
                        <ChevronRight className={`h-3 w-3 transition-transform ${expandedCategory === category ? 'rotate-90' : ''}`} />
                      </div>
                    </button>
                    {expandedCategory === category && sampleCategories[category].map((s) => (
                      <button
                        key={s.name}
                        onClick={() => { loadSample(s.code); setSamplesOpen(false); setExpandedCategory(null); }}
                        className="block w-full text-left px-4 py-2 text-xs hover:bg-muted transition-colors border-l-2 border-primary/20 ml-1"
                      >
                        <div className="font-medium text-foreground">{s.name}</div>
                        <div className="text-muted-foreground text-[10px]">{s.description}</div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-border" />

          <button
            onClick={compileTAC}
            disabled={status === 'compiling'}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.97] glow-primary disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />
            Compile
          </button>

          <button
            onClick={() => setSource('')}
            className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted"
            title="Clear (Ctrl+Shift+X)"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={downloadRef}>
            <button
              onClick={() => { setDownloadOpen(!downloadOpen); setSamplesOpen(false); }}
              className="flex items-center gap-1.5 rounded-md bg-primary/15 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/25"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            {downloadOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-border bg-card shadow-2xl animate-fade-in">
                {[
                  { fmt: 'txt', label: 'TAC (.txt)' },
                  { fmt: 'json', label: 'JSON (.json)' },
                  { fmt: 'csv', label: 'CSV (.csv)' },
                  { fmt: 'md', label: 'Markdown (.md)' },
                ].map(d => (
                  <button key={d.fmt} onClick={() => { handleDownload(d.fmt); setDownloadOpen(false); }} className="block w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg text-foreground font-code">
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Utility icons */}
        <div className="flex items-center gap-0.5">
          <button onClick={handleCopy} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Copy TAC">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={() => setShareOpen(true)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Share">
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => setSettingsOpen(true)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" title="Settings">
            <Settings className="h-4 w-4" />
          </button>
          {/* Avatar placeholder */}
          <div className="ml-1 h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center">
            <span className="text-[10px] font-bold text-muted-foreground">U</span>
          </div>
        </div>
      </header>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        sourceCode={sourceCode}
      />
    </>
  );
}
