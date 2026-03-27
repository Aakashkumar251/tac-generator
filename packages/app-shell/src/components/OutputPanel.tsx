import { useCompilerStore } from '@/stores/compilerStore';
import { TACInstruction } from '@ctac/shared';
import { toQuadruples, toTriples, toSSA } from '@ctac/core-compiler';
import { FileCode2, AlertTriangle, BarChart3, List, TreePine, GitBranch, Footprints, Sparkles, Database, Activity, HardDrive, Cpu, Code, BookOpen, Columns3 } from 'lucide-react';
import { ASTViewer, CFGViewer, SymbolTableViewer, DataFlowViewer, MemoryLayoutViewer } from '@ctac/visualizers';
import { StepByStepPanel, OptimizerPanel, RegisterAllocViewer, AssemblyViewer, ComparisonView } from '@ctac/optimizers';
import { TutorialPanel } from './TutorialPanel';

function TACLine({ instr, index }: { instr: TACInstruction; index: number }) {
  const isLabel = instr.op === 'label' || instr.op === 'func_begin';
  const isComment = instr.op === 'decl' || instr.op === 'func_end';
  const isJump = instr.op === 'goto' || instr.op === 'iffalse' || instr.op === 'iftrue';
  const isCall = instr.op === 'call';
  const isReturn = instr.op === 'return';
  const isMemory = instr.op === '[]' || instr.op === '[]=' || instr.op === '->' || instr.op === '.';

  let formatted = '';
  if (instr.op === 'label') formatted = `${instr.label}:`;
  else if (instr.op === 'func_begin') formatted = `${instr.result}:`;
  else if (instr.op === 'func_end') formatted = `// end ${instr.result}`;
  else if (instr.op === 'decl') formatted = `// ${instr.comment}`;
  else if (instr.op === '=') formatted = `${instr.result} = ${instr.arg1}`;
  else if (instr.op === 'goto') formatted = `goto ${instr.result}`;
  else if (instr.op === 'iffalse') formatted = `iffalse ${instr.arg1} goto ${instr.result}`;
  else if (instr.op === 'iftrue') formatted = `iftrue ${instr.arg1} goto ${instr.result}`;
  else if (instr.op === 'return') formatted = instr.arg1 ? `return ${instr.arg1}` : `return`;
  else if (instr.op === 'param') formatted = `param ${instr.result}`;
  else if (instr.op === 'arg') formatted = `arg ${instr.arg1}`;
  else if (instr.op === 'call') formatted = `${instr.result} = call ${instr.arg1}, ${instr.arg2}`;
  else if (instr.op === '[]') formatted = `${instr.result} = ${instr.arg1}[${instr.arg2}]`;
  else if (instr.op === '[]=') formatted = instr.comment || `${instr.result}[${instr.arg2}] = ${instr.arg1}`;
  else if (instr.op === '->' || instr.op === '.') formatted = `${instr.result} = ${instr.arg1}${instr.op}${instr.arg2}`;
  else if (instr.op.startsWith('unary_')) formatted = `${instr.result} = ${instr.op.replace('unary_', '')}${instr.arg1}`;
  else if (instr.arg2) formatted = `${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
  else formatted = `${instr.op} ${instr.arg1 || ''} ${instr.result || ''}`.trim();

  const catColor = isLabel ? 'border-l-syntax-label' :
    isJump ? 'border-l-syntax-keyword' :
      isCall ? 'border-l-syntax-function' :
        isReturn ? 'border-l-syntax-keyword' :
          isMemory ? 'border-l-syntax-label' :
            isComment ? 'border-l-syntax-comment' :
              'border-l-transparent';

  return (
    <div className={`flex items-start gap-3 px-3 py-0.5 font-code text-xs leading-5 hover:bg-muted/30 transition-colors border-l-2 ${catColor} ${isLabel ? 'mt-1' : ''}`}>
      <span className="w-6 text-right text-muted-foreground/50 select-none shrink-0">
        {instr.op !== 'func_end' && instr.op !== 'func_begin' ? index + 1 : ''}
      </span>
      <span className={`${isLabel ? '' : 'pl-4'}`}>
        {isLabel && <span className="tac-label">{formatted}</span>}
        {isComment && <span className="tac-comment">{formatted}</span>}
        {isJump && renderJump(formatted)}
        {isCall && renderCall(formatted)}
        {isReturn && <span className="tac-keyword">{formatted}</span>}
        {isMemory && <span className="text-syntax-label">{formatted}</span>}
        {!isLabel && !isComment && !isJump && !isCall && !isReturn && !isMemory && instr.op === 'param' && <span className="tac-keyword">{formatted}</span>}
        {!isLabel && !isComment && !isJump && !isCall && !isReturn && !isMemory && instr.op === 'arg' && <span className="tac-keyword">{formatted}</span>}
        {!isLabel && !isComment && !isJump && !isCall && !isReturn && !isMemory && instr.op !== 'param' && instr.op !== 'arg' && renderAssignment(formatted)}
      </span>
      {instr.sourceLine && (
        <span className="ml-auto text-muted-foreground/30 select-none shrink-0">
          :{instr.sourceLine}
        </span>
      )}
    </div>
  );
}

function renderJump(text: string) {
  const parts = text.split(/(goto|iffalse|iftrue|L\d+)/);
  return (
    <span>
      {parts.map((p, i) =>
        /^(goto|iffalse|iftrue)$/.test(p) ? <span key={i} className="tac-keyword">{p}</span> :
          /^L\d+$/.test(p) ? <span key={i} className="tac-label">{p}</span> :
            /^t\d+$/.test(p) ? <span key={i} className="tac-temp">{p}</span> :
              <span key={i}>{p}</span>
      )}
    </span>
  );
}

function renderCall(text: string) {
  const parts = text.split(/(call|t\d+|\w+(?=,))/);
  return (
    <span>
      {parts.map((p, i) =>
        p === 'call' ? <span key={i} className="tac-keyword">{p}</span> :
          /^t\d+$/.test(p) ? <span key={i} className="tac-temp">{p}</span> :
            <span key={i}>{p}</span>
      )}
    </span>
  );
}

function renderAssignment(text: string) {
  const parts = text.split(/(t\d+|L\d+|\d+(?:\.\d+)?)/);
  return (
    <span>
      {parts.map((p, i) =>
        /^t\d+$/.test(p) ? <span key={i} className="tac-temp">{p}</span> :
          /^L\d+$/.test(p) ? <span key={i} className="tac-label">{p}</span> :
            /^\d+(?:\.\d+)?$/.test(p) ? <span key={i} className="tac-number">{p}</span> :
              /^[+\-*/%<>=!&|^~]+$/.test(p) ? <span key={i} className="tac-operator">{p}</span> :
                <span key={i}>{p}</span>
      )}
    </span>
  );
}

function QuadruplesView({ tac }: { tac: TACInstruction[] }) {
  const quads = toQuadruples(tac);
  return (
    <div className="p-3">
      <table className="w-full text-xs font-code">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-1.5 pr-3 w-8">#</th>
            <th className="pb-1.5 pr-3">Op</th>
            <th className="pb-1.5 pr-3">Arg1</th>
            <th className="pb-1.5 pr-3">Arg2</th>
            <th className="pb-1.5">Result</th>
          </tr>
        </thead>
        <tbody>
          {quads.map((q) => (
            <tr key={q.index} className="hover:bg-muted/30 transition-colors">
              <td className="py-0.5 pr-3 text-muted-foreground/50">{q.index}</td>
              <td className="py-0.5 pr-3 tac-keyword">{q.op}</td>
              <td className="py-0.5 pr-3">{renderValue(q.arg1)}</td>
              <td className="py-0.5 pr-3">{renderValue(q.arg2)}</td>
              <td className="py-0.5">{renderValue(q.result)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TriplesView({ tac }: { tac: TACInstruction[] }) {
  const triples = toTriples(tac);
  return (
    <div className="p-3">
      <table className="w-full text-xs font-code">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-1.5 pr-3 w-8">#</th>
            <th className="pb-1.5 pr-3">Op</th>
            <th className="pb-1.5 pr-3">Arg1</th>
            <th className="pb-1.5">Arg2</th>
          </tr>
        </thead>
        <tbody>
          {triples.map((t) => (
            <tr key={t.index} className="hover:bg-muted/30 transition-colors">
              <td className="py-0.5 pr-3 text-muted-foreground/50">({t.index})</td>
              <td className="py-0.5 pr-3 tac-keyword">{t.op}</td>
              <td className="py-0.5 pr-3">{renderValue(t.arg1)}</td>
              <td className="py-0.5">{renderValue(t.arg2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SSAView({ tac }: { tac: TACInstruction[] }) {
  const ssa = toSSA(tac);
  return (
    <div className="py-2">
      {ssa.map((instr, i) => {
        const isLabel = instr.op === 'label' || instr.op === 'func_begin';
        let text = '';
        if (instr.op === 'label') text = `${instr.label}:`;
        else if (instr.op === 'func_begin') text = `${instr.result}:`;
        else if (instr.op === 'func_end') text = `// end ${instr.result}`;
        else if (instr.op === 'decl') text = `// ${instr.comment}`;
        else if (instr.op === '=') text = `${instr.ssaResult || instr.result} = ${instr.ssaArg1 || instr.arg1}`;
        else if (instr.op === 'goto') text = `goto ${instr.result}`;
        else if (instr.op === 'iffalse') text = `iffalse ${instr.ssaArg1 || instr.arg1} goto ${instr.result}`;
        else if (instr.op === 'return') text = instr.arg1 ? `return ${instr.ssaArg1 || instr.arg1}` : 'return';
        else if (instr.op === 'arg') text = `arg ${instr.ssaArg1 || instr.arg1}`;
        else if (instr.op === 'param') text = `param ${instr.ssaResult || instr.result}`;
        else if (instr.op === 'call') text = `${instr.ssaResult || instr.result} = call ${instr.arg1}, ${instr.arg2}`;
        else if (instr.arg2) text = `${instr.ssaResult || instr.result} = ${instr.ssaArg1 || instr.arg1} ${instr.op} ${instr.ssaArg2 || instr.arg2}`;
        else text = `${instr.op} ${instr.ssaArg1 || instr.arg1 || ''} ${instr.ssaResult || instr.result || ''}`;

        return (
          <div key={i} className={`flex items-start gap-3 px-3 py-0.5 font-code text-xs leading-5 hover:bg-muted/30 transition-colors ${isLabel ? 'mt-1' : ''}`}>
            <span className="w-6 text-right text-muted-foreground/50 select-none shrink-0">{i + 1}</span>
            <span className={isLabel ? 'tac-label font-bold' : 'pl-4 text-foreground'}>{text}</span>
          </div>
        );
      })}
    </div>
  );
}

function renderValue(val: string) {
  if (val === '_') return <span className="text-muted-foreground/30">_</span>;
  if (/^t\d+$/.test(val)) return <span className="tac-temp">{val}</span>;
  if (/^L\d+$/.test(val)) return <span className="tac-label">{val}</span>;
  if (/^\(\d+\)$/.test(val)) return <span className="text-syntax-number">{val}</span>;
  if (/^\d+/.test(val)) return <span className="tac-number">{val}</span>;
  return <span className="text-foreground">{val}</span>;
}

export function OutputPanel() {
  const { result, status, activeTab, setActiveTab, settings } = useCompilerStore();

  const tabs = [
    { id: 'tac', label: 'TAC', icon: FileCode2 },
    { id: 'ast', label: 'AST', icon: TreePine },
    { id: 'cfg', label: 'CFG', icon: GitBranch },
    { id: 'symbols', label: 'Symbols', icon: Database },
    { id: 'dataflow', label: 'Data Flow', icon: Activity },
    { id: 'memory', label: 'Memory', icon: HardDrive },
    { id: 'regalloc', label: 'Registers', icon: Cpu },
    { id: 'assembly', label: 'Assembly', icon: Code },
    { id: 'compare', label: 'Compare', icon: Columns3 },
    { id: 'optimizer', label: 'Optimize', icon: Sparkles },
    { id: 'stepper', label: 'Step', icon: Footprints },
    { id: 'tutorial', label: 'Learn', icon: BookOpen },
    { id: 'tokens', label: 'Tokens', icon: List },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'errors', label: 'Errors', icon: AlertTriangle },
  ];

  const formatLabel = settings.tacFormat !== 'default' ? ` (${settings.tacFormat})` : '';

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border bg-surface-panel overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const errorCount = tab.id === 'errors' && result ? result.errors.length : 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-colors border-b-2 whitespace-nowrap ${isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.id === 'tac' && formatLabel && <span className="text-[9px] text-primary/60">{formatLabel}</span>}
              {errorCount > 0 && (
                <span className="ml-0.5 rounded-full bg-destructive px-1.5 py-0 text-[10px] text-destructive-foreground">
                  {errorCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto bg-surface-editor">
        {status === 'idle' && !result && activeTab !== 'stepper' && activeTab !== 'tutorial' && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <FileCode2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No output yet</p>
              <p className="mt-1 text-xs opacity-60">Click "Generate TAC" or press Ctrl+Enter</p>
            </div>
          </div>
        )}

        {activeTab === 'tac' && result && (
          <>
            {result.tac.length === 0 && result.errors.length > 0 ? (
              <div className="px-4 py-3 text-xs text-destructive">
                Compilation failed. Check the Errors tab.
              </div>
            ) : settings.tacFormat === 'quadruples' ? (
              <QuadruplesView tac={result.tac} />
            ) : settings.tacFormat === 'triples' ? (
              <TriplesView tac={result.tac} />
            ) : settings.tacFormat === 'ssa' ? (
              <SSAView tac={result.tac} />
            ) : (
              <div className="py-2">
                {result.tac.map((instr, i) => (
                  <TACLine key={i} instr={instr} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'ast' && <ASTViewer />}
        {activeTab === 'cfg' && <CFGViewer />}
        {activeTab === 'symbols' && <SymbolTableViewer />}
        {activeTab === 'dataflow' && <DataFlowViewer />}
        {activeTab === 'memory' && <MemoryLayoutViewer />}
        {activeTab === 'regalloc' && <RegisterAllocViewer />}
        {activeTab === 'assembly' && <AssemblyViewer />}
        {activeTab === 'compare' && <ComparisonView />}
        {activeTab === 'stepper' && <StepByStepPanel />}
        {activeTab === 'tutorial' && <TutorialPanel />}
        {activeTab === 'optimizer' && <OptimizerPanel />}

        {activeTab === 'tokens' && result && (
          <div className="p-3">
            <table className="w-full text-xs font-code">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Value</th>
                  <th className="pb-2">Loc</th>
                </tr>
              </thead>
              <tbody>
                {result.tokens.slice(0, 200).map((t, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    <td className="py-0.5 pr-4 text-muted-foreground/50">{i + 1}</td>
                    <td className="py-0.5 pr-4 tac-type">{t.type}</td>
                    <td className="py-0.5 pr-4 text-foreground">{t.value || '(empty)'}</td>
                    <td className="py-0.5 text-muted-foreground">{t.line}:{t.column}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'metrics' && result && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Tokens', value: result.metrics.tokenCount, color: 'text-syntax-type' },
                { label: 'TAC Instructions', value: result.metrics.tacInstructionCount, color: 'text-primary' },
                { label: 'Temporaries', value: result.metrics.tempCount, color: 'text-syntax-function' },
                { label: 'Labels', value: result.metrics.labelCount, color: 'text-syntax-label' },
              ].map((m) => (
                <div key={m.label} className="rounded-lg border border-border bg-card p-3">
                  <div className={`text-2xl font-bold font-code ${m.color}`}>{m.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{m.label}</div>
                </div>
              ))}
            </div>
            {result.errors.length === 0 && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">Compilation Status</div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
                  <span className="text-xs font-medium text-primary">Success</span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'errors' && result && (
          <div className="p-3 space-y-1">
            {result.errors.length === 0 && result.warnings.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4 text-center">No diagnostics</div>
            ) : (
              result.errors.map((e, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
                  <div>
                    <span className="font-code text-xs text-destructive">[Line {e.line}]</span>
                    <span className="ml-2 text-xs text-foreground">{e.message}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
