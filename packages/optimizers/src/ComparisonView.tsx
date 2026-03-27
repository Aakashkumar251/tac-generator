import { useMemo, useState } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { generateAssembly } from '@ctac/optimizers';
import { allocateRegisters } from '@ctac/optimizers';
import { TACInstruction } from '@ctac/shared';
import { Columns3, Eye, EyeOff } from 'lucide-react';

function formatTACInstr(instr: TACInstruction): string {
  if (instr.op === 'label') return `${instr.label}:`;
  if (instr.op === 'func_begin') return `${instr.result}:`;
  if (instr.op === 'func_end') return `// end ${instr.result}`;
  if (instr.op === 'decl') return `// ${instr.comment}`;
  if (instr.op === '=') return `  ${instr.result} = ${instr.arg1}`;
  if (instr.op === 'goto') return `  goto ${instr.result}`;
  if (instr.op === 'iffalse') return `  iffalse ${instr.arg1} goto ${instr.result}`;
  if (instr.op === 'iftrue') return `  iftrue ${instr.arg1} goto ${instr.result}`;
  if (instr.op === 'return') return instr.arg1 ? `  return ${instr.arg1}` : `  return`;
  if (instr.op === 'param') return `  param ${instr.result}`;
  if (instr.op === 'arg') return `  arg ${instr.arg1}`;
  if (instr.op === 'call') return `  ${instr.result} = call ${instr.arg1}, ${instr.arg2}`;
  if (instr.arg2) return `  ${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
  if (instr.op.startsWith('unary_')) return `  ${instr.result} = ${instr.op.replace('unary_', '')}${instr.arg1}`;
  return `  ${instr.op} ${instr.arg1 || ''} ${instr.result || ''}`.trim();
}

export function ComparisonView() {
  const { result, sourceCode } = useCompilerStore();
  const [showSource, setShowSource] = useState(true);
  const [showTAC, setShowTAC] = useState(true);
  const [showAsm, setShowAsm] = useState(true);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);

  const tacLines = useMemo(() => {
    if (!result?.tac) return [];
    return result.tac.map((instr, i) => ({
      text: formatTACInstr(instr),
      sourceLine: instr.sourceLine || null,
      index: i,
    }));
  }, [result?.tac]);

  const asmData = useMemo(() => {
    if (!result?.tac || result.tac.length === 0) return null;
    const regAlloc = allocateRegisters(result.tac, 8);
    return generateAssembly(result.tac, 'x86-64', regAlloc);
  }, [result?.tac]);

  const sourceLines = sourceCode.split('\n');

  // Find related lines
  const highlightedSourceLines = useMemo(() => {
    if (hoveredLine === null) return new Set<number>();
    return new Set([hoveredLine]);
  }, [hoveredLine]);

  const highlightedTACLines = useMemo(() => {
    if (hoveredLine === null || !result?.tac) return new Set<number>();
    const lines = new Set<number>();
    result.tac.forEach((instr, i) => {
      if (instr.sourceLine === hoveredLine) lines.add(i);
    });
    return lines;
  }, [hoveredLine, result?.tac]);

  const highlightedAsmLines = useMemo(() => {
    if (hoveredLine === null || !asmData) return new Set<number>();
    const lines = new Set<number>();
    asmData.lines.forEach((line, i) => {
      if (line.sourceLine === hoveredLine) lines.add(i);
    });
    return lines;
  }, [hoveredLine, asmData]);

  if (!result?.tac || result.tac.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Columns3 className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No compilation data</p>
          <p className="mt-1 text-xs opacity-60">Compile code first to see the comparison view</p>
        </div>
      </div>
    );
  }

  const visiblePanels = [showSource, showTAC, showAsm].filter(Boolean).length;

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-border bg-surface-panel px-3 py-1.5">
        <Columns3 className="h-3.5 w-3.5 text-primary" />
        <span className="text-[10px] font-semibold text-foreground">Side-by-Side Comparison</span>
        <span className="text-[10px] text-muted-foreground ml-1">Hover a source line to highlight across views</span>
        <div className="ml-auto flex items-center gap-1">
          {[
            { label: 'Source', state: showSource, toggle: () => setShowSource(!showSource) },
            { label: 'TAC', state: showTAC, toggle: () => setShowTAC(!showTAC) },
            { label: 'Assembly', state: showAsm, toggle: () => setShowAsm(!showAsm) },
          ].map(p => (
            <button
              key={p.label}
              onClick={p.toggle}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded transition-colors ${
                p.state ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              }`}
            >
              {p.state ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panels */}
      <div className="flex-1 flex overflow-hidden">
        {showSource && (
          <div className={`flex flex-col border-r border-border overflow-hidden`} style={{ width: `${100 / visiblePanels}%` }}>
            <div className="bg-surface-panel px-3 py-1 border-b border-border">
              <span className="text-[10px] font-bold text-syntax-string uppercase tracking-wider">Source (C)</span>
            </div>
            <div className="flex-1 overflow-auto py-1">
              {sourceLines.map((line, i) => (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredLine(i + 1)}
                  onMouseLeave={() => setHoveredLine(null)}
                  className={`flex gap-2 px-2 py-px font-code text-[11px] leading-5 transition-colors cursor-default ${
                    highlightedSourceLines.has(i + 1) ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent hover:bg-muted/30'
                  }`}
                >
                  <span className="w-5 text-right text-muted-foreground/40 select-none shrink-0">{i + 1}</span>
                  <span className="text-foreground whitespace-pre">{line}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showTAC && (
          <div className={`flex flex-col border-r border-border overflow-hidden`} style={{ width: `${100 / visiblePanels}%` }}>
            <div className="bg-surface-panel px-3 py-1 border-b border-border">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">TAC</span>
            </div>
            <div className="flex-1 overflow-auto py-1">
              {tacLines.map((line, i) => (
                <div
                  key={i}
                  onMouseEnter={() => line.sourceLine && setHoveredLine(line.sourceLine)}
                  onMouseLeave={() => setHoveredLine(null)}
                  className={`flex gap-2 px-2 py-px font-code text-[11px] leading-5 transition-colors cursor-default ${
                    highlightedTACLines.has(i) ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent hover:bg-muted/30'
                  }`}
                >
                  <span className="w-5 text-right text-muted-foreground/40 select-none shrink-0">{i + 1}</span>
                  <span className="text-foreground whitespace-pre">{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAsm && (
          <div className="flex flex-col overflow-hidden" style={{ width: `${100 / visiblePanels}%` }}>
            <div className="bg-surface-panel px-3 py-1 border-b border-border">
              <span className="text-[10px] font-bold text-syntax-function uppercase tracking-wider">Assembly (x86-64)</span>
            </div>
            <div className="flex-1 overflow-auto py-1">
              {asmData?.lines.map((line, i) => (
                <div
                  key={i}
                  onMouseEnter={() => line.sourceLine && setHoveredLine(line.sourceLine)}
                  onMouseLeave={() => setHoveredLine(null)}
                  className={`flex gap-2 px-2 py-px font-code text-[11px] leading-5 transition-colors cursor-default ${
                    highlightedAsmLines.has(i) ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent hover:bg-muted/30'
                  }`}
                >
                  <span className="w-5 text-right text-muted-foreground/40 select-none shrink-0">
                    {line.kind === 'instruction' ? i + 1 : ''}
                  </span>
                  <span className={`whitespace-pre ${
                    line.kind === 'comment' ? 'text-syntax-comment italic' :
                    line.kind === 'directive' ? 'text-syntax-type' :
                    line.kind === 'label' ? 'text-syntax-label font-bold' :
                    'text-foreground'
                  }`}>{line.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
