import { useCompilerStore } from '@/stores/compilerStore';
import { analyzeDataFlow, DataFlowResult } from '@ctac/visualizers';
import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';

export function DataFlowViewer() {
  const { result } = useCompilerStore();
  const [view, setView] = useState<'live' | 'reaching' | 'usedef'>('live');

  const analysis = useMemo<DataFlowResult | null>(() => {
    if (!result?.tac || result.tac.length === 0) return null;
    return analyzeDataFlow(result.tac);
  }, [result]);

  if (!analysis || analysis.blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Generate TAC first to see data flow analysis</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-border px-3 py-1.5 bg-surface-panel">
        {(['live', 'reaching', 'usedef'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {v === 'live' ? 'Live Variables' : v === 'reaching' ? 'Reaching Defs' : 'Use-Def Chains'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-3">
        {view === 'live' && <LiveVariablesView analysis={analysis} />}
        {view === 'reaching' && <ReachingDefsView analysis={analysis} />}
        {view === 'usedef' && <UseDefView analysis={analysis} />}
      </div>
    </div>
  );
}

function LiveVariablesView({ analysis }: { analysis: DataFlowResult }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground mb-2">
        Variables that may be used before being redefined at each block boundary.
      </div>
      <table className="w-full text-xs font-code">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-1.5 pr-3">Block</th>
            <th className="pb-1.5 pr-3">Live IN</th>
            <th className="pb-1.5">Live OUT</th>
          </tr>
        </thead>
        <tbody>
          {analysis.blocks.map(b => {
            const data = analysis.liveVariables.get(b.id);
            if (!data) return null;
            const inVars = [...data.in].filter(v => !/^t\d+$/.test(v));
            const outVars = [...data.out].filter(v => !/^t\d+$/.test(v));
            if (inVars.length === 0 && outVars.length === 0) return null;
            return (
              <tr key={b.id} className="hover:bg-muted/30 transition-colors border-b border-border/30">
                <td className="py-1.5 pr-3 text-syntax-label font-semibold whitespace-nowrap">{b.label}</td>
                <td className="py-1.5 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {inVars.map(v => (
                      <span key={v} className="rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[10px]">{v}</span>
                    ))}
                    {inVars.length === 0 && <span className="text-muted-foreground/40">∅</span>}
                  </div>
                </td>
                <td className="py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {outVars.map(v => (
                      <span key={v} className="rounded bg-syntax-function/10 text-syntax-function px-1.5 py-0.5 text-[10px]">{v}</span>
                    ))}
                    {outVars.length === 0 && <span className="text-muted-foreground/40">∅</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReachingDefsView({ analysis }: { analysis: DataFlowResult }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] text-muted-foreground mb-2">
        Definitions that reach each block without being killed by another definition.
      </div>
      <table className="w-full text-xs font-code">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-1.5 pr-3">Block</th>
            <th className="pb-1.5 pr-3">Reaching IN</th>
            <th className="pb-1.5">Reaching OUT</th>
          </tr>
        </thead>
        <tbody>
          {analysis.blocks.map(b => {
            const data = analysis.reachingDefs.get(b.id);
            if (!data) return null;
            const inDefs = [...data.in];
            const outDefs = [...data.out];
            if (inDefs.length === 0 && outDefs.length === 0) return null;
            return (
              <tr key={b.id} className="hover:bg-muted/30 transition-colors border-b border-border/30">
                <td className="py-1.5 pr-3 text-syntax-label font-semibold whitespace-nowrap">{b.label}</td>
                <td className="py-1.5 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {inDefs.map(d => (
                      <span key={d} className="rounded bg-syntax-keyword/10 text-syntax-keyword px-1.5 py-0.5 text-[10px]">{d}</span>
                    ))}
                    {inDefs.length === 0 && <span className="text-muted-foreground/40">∅</span>}
                  </div>
                </td>
                <td className="py-1.5">
                  <div className="flex flex-wrap gap-1">
                    {outDefs.map(d => (
                      <span key={d} className="rounded bg-syntax-string/10 text-syntax-string px-1.5 py-0.5 text-[10px]">{d}</span>
                    ))}
                    {outDefs.length === 0 && <span className="text-muted-foreground/40">∅</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UseDefView({ analysis }: { analysis: DataFlowResult }) {
  const chains = analysis.useDefChains.filter(c => !/^t\d+$/.test(c.variable));
  const grouped = new Map<string, typeof chains>();
  for (const c of chains) {
    if (!grouped.has(c.variable)) grouped.set(c.variable, []);
    grouped.get(c.variable)!.push(c);
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-muted-foreground mb-2">
        Links each variable use to the definition that produced its value.
      </div>
      {[...grouped.entries()].map(([varName, varChains]) => (
        <div key={varName} className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs font-semibold text-foreground mb-2 font-code">{varName}</div>
          <div className="space-y-1">
            {varChains.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] font-code">
                <span className="text-syntax-keyword">def@L{c.defLine}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="text-syntax-function">use@L{c.useLine}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {grouped.size === 0 && (
        <div className="text-xs text-muted-foreground text-center py-4">No use-def chains found</div>
      )}
    </div>
  );
}
