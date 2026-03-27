import { useMemo } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { allocateRegisters } from '@ctac/optimizers';
import { Cpu } from 'lucide-react';

const COLORS = [
  'bg-primary/20 text-primary border-primary/40',
  'bg-syntax-function/20 text-syntax-function border-syntax-function/40',
  'bg-syntax-string/20 text-syntax-string border-syntax-string/40',
  'bg-syntax-number/20 text-syntax-number border-syntax-number/40',
  'bg-syntax-label/20 text-syntax-label border-syntax-label/40',
  'bg-syntax-keyword/20 text-syntax-keyword border-syntax-keyword/40',
  'bg-syntax-operator/20 text-syntax-operator border-syntax-operator/40',
  'bg-syntax-type/20 text-syntax-type border-syntax-type/40',
];

export function RegisterAllocViewer() {
  const { result } = useCompilerStore();

  const allocation = useMemo(() => {
    if (!result?.tac || result.tac.length === 0) return null;
    return allocateRegisters(result.tac, 8);
  }, [result?.tac]);

  if (!allocation) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Cpu className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No TAC to allocate</p>
          <p className="mt-1 text-xs opacity-60">Compile code first to see register allocation</p>
        </div>
      </div>
    );
  }

  const maxEnd = Math.max(...allocation.liveRanges.map(r => r.end), 1);

  return (
    <div className="p-3 space-y-4 overflow-auto h-full">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Variables', value: allocation.totalVars, color: 'text-foreground' },
          { label: 'Registers', value: allocation.registers.length, color: 'text-primary' },
          { label: 'Allocated', value: allocation.totalVars - allocation.spillCount, color: 'text-syntax-string' },
          { label: 'Spilled', value: allocation.spillCount, color: allocation.spillCount > 0 ? 'text-destructive' : 'text-muted-foreground' },
        ].map(m => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-2 text-center">
            <div className={`text-lg font-bold font-code ${m.color}`}>{m.value}</div>
            <div className="text-[10px] text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Register Assignment Table */}
      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Register Assignments</h3>
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-xs font-code">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border bg-muted/30">
                <th className="px-3 py-1.5">Variable</th>
                <th className="px-3 py-1.5">Register</th>
                <th className="px-3 py-1.5">Live Range</th>
                <th className="px-3 py-1.5">Spill Cost</th>
              </tr>
            </thead>
            <tbody>
              {allocation.assignments.map((a, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors border-b border-border/50 last:border-0">
                  <td className="px-3 py-1">
                    <span className={a.register ? COLORS[a.color % COLORS.length] : 'bg-destructive/20 text-destructive border-destructive/40'}>
                      {a.variable}
                    </span>
                  </td>
                  <td className="px-3 py-1">
                    {a.register ? (
                      <span className={`px-1.5 py-0.5 rounded border text-[10px] ${COLORS[a.color % COLORS.length]}`}>
                        {a.register}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded border bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                        SPILLED
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1 text-muted-foreground">
                    [{allocation.liveRanges[i]?.start}, {allocation.liveRanges[i]?.end}]
                  </td>
                  <td className="px-3 py-1 text-muted-foreground">{a.spillCost.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Range Visualization */}
      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Live Ranges</h3>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="space-y-1">
            {allocation.liveRanges.map((r, i) => {
              const a = allocation.assignments[i];
              const colorClass = a?.register ? COLORS[a.color % COLORS.length] : 'bg-destructive/20 text-destructive border-destructive/40';
              const leftPct = (r.start / maxEnd) * 100;
              const widthPct = Math.max(((r.end - r.start + 1) / maxEnd) * 100, 2);
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-16 text-[10px] font-code text-right text-muted-foreground truncate">{r.variable}</span>
                  <div className="flex-1 h-4 bg-muted/30 rounded relative">
                    <div
                      className={`absolute top-0 h-full rounded border ${colorClass} flex items-center justify-center`}
                      style={{ left: `${leftPct}%`, width: `${widthPct}%`, minWidth: '8px' }}
                    >
                      <span className="text-[8px] font-code truncate px-0.5">{a?.register || 'stk'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-muted-foreground/50 font-code">
            <span>0</span>
            <span>TAC Instructions →</span>
            <span>{maxEnd}</span>
          </div>
        </div>
      </div>

      {/* Interference Graph (text representation) */}
      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Interference Graph ({allocation.interferenceEdges.length} edges)
        </h3>
        <div className="rounded-lg border border-border bg-card p-3 max-h-48 overflow-auto">
          {allocation.interferenceEdges.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">No interferences</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {allocation.interferenceEdges.slice(0, 50).map((e, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-muted text-[9px] font-code text-muted-foreground border border-border">
                  {e.a} ↔ {e.b}
                </span>
              ))}
              {allocation.interferenceEdges.length > 50 && (
                <span className="text-[9px] text-muted-foreground/50">+{allocation.interferenceEdges.length - 50} more</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
