import { useCompilerStore } from '@/stores/compilerStore';
import { analyzeMemoryLayout, StackFrame } from '@ctac/visualizers';
import { useMemo } from 'react';
import { Layers, HardDrive } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  'int': 'bg-primary/20 border-primary/40 text-primary',
  'float': 'bg-syntax-number/20 border-syntax-number/40 text-syntax-number',
  'double': 'bg-syntax-number/20 border-syntax-number/40 text-syntax-number',
  'char': 'bg-syntax-string/20 border-syntax-string/40 text-syntax-string',
  'void': 'bg-muted border-border text-muted-foreground',
};

function getColorForType(type: string): string {
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (type.includes(key)) return color;
  }
  if (type.includes('*') || type.includes('[]')) return 'bg-syntax-label/20 border-syntax-label/40 text-syntax-label';
  return 'bg-syntax-keyword/20 border-syntax-keyword/40 text-syntax-keyword';
}

function FrameView({ frame }: { frame: StackFrame }) {
  const maxOffset = frame.totalSize;
  const scale = Math.min(1, 300 / maxOffset);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground font-code">{frame.functionName}()</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{frame.totalSize} bytes</span>
      </div>

      {/* Stack visualization */}
      <div className="relative border border-border rounded overflow-hidden bg-background mb-3">
        {/* Return address */}
        <div className="flex items-center border-b border-border/50 px-2 py-1.5 bg-destructive/5">
          <span className="text-[10px] font-code text-destructive/70 flex-1">Return Address</span>
          <span className="text-[10px] font-code text-muted-foreground">{frame.returnAddress}B</span>
        </div>
        {/* Saved registers */}
        <div className="flex items-center border-b border-border/50 px-2 py-1.5 bg-syntax-keyword/5">
          <span className="text-[10px] font-code text-syntax-keyword/70 flex-1">Saved RBP</span>
          <span className="text-[10px] font-code text-muted-foreground">{frame.savedRegisters}B</span>
        </div>
        {/* Variables */}
        {frame.variables.map((v, i) => (
          <div
            key={i}
            className={`flex items-center border-b border-border/30 px-2 py-1.5 ${getColorForType(v.type)}`}
            style={{ minHeight: `${Math.max(24, v.size * scale * 6)}px` }}
          >
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-code font-medium">{v.name}</span>
              <span className="text-[9px] ml-1.5 opacity-60">({v.type})</span>
            </div>
            <div className="text-right shrink-0 ml-2">
              <div className="text-[10px] font-code opacity-70">+{v.offset}</div>
              <div className="text-[9px] font-code opacity-50">{v.size}B</div>
            </div>
          </div>
        ))}
        {frame.variables.length === 0 && (
          <div className="px-2 py-3 text-[10px] text-muted-foreground text-center">No local variables</div>
        )}
      </div>

      {/* Variable table */}
      <table className="w-full text-[10px] font-code">
        <thead>
          <tr className="text-muted-foreground">
            <th className="text-left pb-1 pr-2">Name</th>
            <th className="text-left pb-1 pr-2">Type</th>
            <th className="text-right pb-1 pr-2">Size</th>
            <th className="text-right pb-1 pr-2">Offset</th>
            <th className="text-left pb-1">Scope</th>
          </tr>
        </thead>
        <tbody>
          {frame.variables.map((v, i) => (
            <tr key={i} className="hover:bg-muted/30">
              <td className="py-0.5 pr-2 text-foreground">{v.name}</td>
              <td className="py-0.5 pr-2 text-syntax-type">{v.type}</td>
              <td className="py-0.5 pr-2 text-right text-syntax-number">{v.size}</td>
              <td className="py-0.5 pr-2 text-right text-muted-foreground">+{v.offset}</td>
              <td className="py-0.5 text-muted-foreground">{v.scope}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MemoryLayoutViewer() {
  const { result } = useCompilerStore();

  const layout = useMemo(() => {
    if (!result?.ast) return null;
    return analyzeMemoryLayout(result.ast);
  }, [result]);

  if (!layout) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Generate TAC first to see memory layout</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3 overflow-auto">
      {/* Type sizes reference */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <HardDrive className="h-3.5 w-3.5 text-syntax-type" />
          <span className="text-xs font-semibold text-foreground">Type Sizes</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...layout.typeInfo.entries()].filter(([, s]) => s > 0).map(([type, size]) => (
            <span key={type} className={`rounded px-2 py-0.5 text-[10px] font-code border ${getColorForType(type)}`}>
              {type}: {size}B
            </span>
          ))}
        </div>
      </div>

      {/* Global variables */}
      {layout.globalVars.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs font-semibold text-foreground mb-2">Global Variables</div>
          <div className="space-y-1">
            {layout.globalVars.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-code">
                <span className="text-foreground">{v.name}</span>
                <span className="text-syntax-type">{v.type}</span>
                <span className="text-muted-foreground ml-auto">{v.size}B @ +{v.offset}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stack frames */}
      {layout.frames.map((frame, i) => (
        <FrameView key={i} frame={frame} />
      ))}

      {layout.frames.length === 0 && layout.globalVars.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">No memory allocations found</div>
      )}
    </div>
  );
}
