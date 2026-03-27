import { useMemo, useState } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { runOptimizations, OptimizationResult } from '@ctac/optimizers';
import { TACInstruction } from '@ctac/shared';
import { Sparkles, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react';

function formatInstr(instr: TACInstruction): string {
  if (instr.op === 'label') return `${instr.label}:`;
  if (instr.op === 'func_begin') return `${instr.result}:`;
  if (instr.op === 'func_end') return `end ${instr.result}`;
  if (instr.op === 'decl') return `// ${instr.comment}`;
  if (instr.op === '=') return `${instr.result} = ${instr.arg1}`;
  if (instr.op === 'goto') return `goto ${instr.result}`;
  if (instr.op === 'iffalse') return `iffalse ${instr.arg1} goto ${instr.result}`;
  if (instr.op === 'iftrue') return `iftrue ${instr.arg1} goto ${instr.result}`;
  if (instr.op === 'return') return instr.arg1 ? `return ${instr.arg1}` : 'return';
  if (instr.op === 'param') return `param ${instr.result}`;
  if (instr.op === 'arg') return `arg ${instr.arg1}`;
  if (instr.op === 'call') return `${instr.result} = call ${instr.arg1}, ${instr.arg2}`;
  if (instr.arg2) return `${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
  if (instr.op.startsWith('unary_')) return `${instr.result} = ${instr.op.replace('unary_', '')}${instr.arg1}`;
  return `${instr.op} ${instr.arg1 || ''} ${instr.result || ''}`.trim();
}

function PassCard({ result, index }: { result: OptimizationResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = result.removedCount > 0 || result.modifiedCount > 0;

  return (
    <div className={`rounded-lg border ${hasChanges ? 'border-primary/30' : 'border-border'} bg-card overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        <span className="text-xs font-bold text-foreground">Pass {index + 1}: {result.name}</span>
        <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline">{result.description}</span>
        <div className="ml-auto flex items-center gap-2">
          {result.modifiedCount > 0 && (
            <span className="text-[10px] font-code px-1.5 py-0.5 rounded bg-syntax-function/10 text-syntax-function">
              {result.modifiedCount} mod
            </span>
          )}
          {result.removedCount > 0 && (
            <span className="text-[10px] font-code px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
              {result.removedCount} elim
            </span>
          )}
          {!hasChanges && (
            <span className="text-[10px] font-code px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              no change
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border grid grid-cols-2 divide-x divide-border">
          <div className="p-2">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 px-1">Before ({result.before.length})</div>
            <div className="space-y-0.5 max-h-60 overflow-auto">
              {result.before.map((instr, i) => {
                const isLabel = instr.op === 'label' || instr.op === 'func_begin';
                return (
                  <div key={i} className={`text-[10px] font-code px-1 ${isLabel ? 'text-syntax-label font-bold' : 'text-muted-foreground'}`}>
                    {!isLabel && '  '}{formatInstr(instr)}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-2">
            <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 px-1">After ({result.after.length})</div>
            <div className="space-y-0.5 max-h-60 overflow-auto">
              {result.after.map((instr, i) => {
                const isLabel = instr.op === 'label' || instr.op === 'func_begin';
                const isModified = !!instr.comment;
                return (
                  <div key={i} className={`text-[10px] font-code px-1 ${isModified ? 'text-primary bg-primary/5 rounded' : isLabel ? 'text-syntax-label font-bold' : 'text-muted-foreground'}`}>
                    {!isLabel && '  '}{formatInstr(instr)}
                    {isModified && <span className="ml-2 text-primary/40 text-[9px]">// {instr.comment}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OptimizerPanel() {
  const { result, settings } = useCompilerStore();

  const optimizations = useMemo(() => {
    if (!result?.tac || result.tac.length === 0) return null;
    if (settings.optimizationLevel === 'O0') return [];
    return runOptimizations(result.tac, settings.enabledPasses);
  }, [result?.tac, settings.enabledPasses, settings.optimizationLevel]);

  if (!optimizations) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No TAC to optimize</p>
          <p className="mt-1 text-xs opacity-60">Compile code first to run optimization passes</p>
        </div>
      </div>
    );
  }

  if (optimizations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Optimization Level: O0</p>
          <p className="mt-1 text-xs opacity-60">No optimizations enabled. Change level in Settings.</p>
        </div>
      </div>
    );
  }

  const totalRemoved = optimizations.reduce((s, r) => s + r.removedCount, 0);
  const totalModified = optimizations.reduce((s, r) => s + r.modifiedCount, 0);
  const originalCount = result?.tac.length || 0;
  const finalCount = optimizations[optimizations.length - 1]?.after.length || 0;
  const reduction = originalCount > 0 ? Math.round((1 - finalCount / originalCount) * 100) : 0;

  return (
    <div className="p-3 space-y-3 overflow-auto h-full">
      {/* Summary */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: 'Original', value: originalCount, color: 'text-foreground' },
          { label: 'Optimized', value: finalCount, color: 'text-primary' },
          { label: 'Modified', value: totalModified, color: 'text-syntax-function' },
          { label: 'Eliminated', value: totalRemoved, color: 'text-destructive' },
          { label: 'Reduction', value: `${reduction}%`, color: reduction > 0 ? 'text-primary' : 'text-muted-foreground' },
        ].map(m => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-2 text-center">
            <div className={`text-lg font-bold font-code ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Level indicator */}
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-muted-foreground">Level:</span>
        <span className="font-code font-bold text-primary">{settings.optimizationLevel}</span>
        <span className="text-muted-foreground">({optimizations.length} passes)</span>
      </div>

      {/* Passes */}
      {optimizations.map((opt, i) => (
        <PassCard key={i} result={opt} index={i} />
      ))}
    </div>
  );
}
