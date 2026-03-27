import { useState, useMemo } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { lex } from '@ctac/core-compiler';
import { Parser } from '@ctac/core-compiler';
import { TACGenerator } from '@ctac/core-compiler';
import { Token, ProgramNode, TACInstruction } from '@ctac/shared';
import { Play, SkipForward, RotateCcw, Footprints } from 'lucide-react';

type Phase = 'idle' | 'lexing' | 'parsing' | 'tac' | 'done';

interface StepState {
  phase: Phase;
  tokens: Token[];
  tokenIndex: number;
  ast: ProgramNode | null;
  tac: TACInstruction[];
  tacIndex: number;
  error: string | null;
}

export function StepByStepPanel() {
  const { sourceCode } = useCompilerStore();
  const [state, setState] = useState<StepState>({
    phase: 'idle',
    tokens: [],
    tokenIndex: 0,
    ast: null,
    tac: [],
    tacIndex: 0,
    error: null,
  });

  const fullTokens = useMemo(() => {
    try { return lex(sourceCode); } catch { return []; }
  }, [sourceCode]);

  const fullAST = useMemo(() => {
    try {
      const parser = new Parser(fullTokens);
      return parser.parse();
    } catch { return null; }
  }, [fullTokens]);

  const fullTAC = useMemo(() => {
    if (!fullAST) return [];
    try {
      const gen = new TACGenerator();
      return gen.generate(fullAST);
    } catch { return []; }
  }, [fullAST]);

  const startStepping = () => {
    setState({
      phase: 'lexing',
      tokens: [],
      tokenIndex: 0,
      ast: null,
      tac: [],
      tacIndex: 0,
      error: null,
    });
  };

  const stepForward = () => {
    setState(prev => {
      if (prev.phase === 'lexing') {
        if (prev.tokenIndex < fullTokens.length) {
          const newTokens = [...prev.tokens, fullTokens[prev.tokenIndex]];
          const nextIndex = prev.tokenIndex + 1;
          if (nextIndex >= fullTokens.length) {
            return { ...prev, tokens: newTokens, tokenIndex: nextIndex, phase: 'parsing' };
          }
          return { ...prev, tokens: newTokens, tokenIndex: nextIndex };
        }
        return { ...prev, phase: 'parsing' };
      }
      if (prev.phase === 'parsing') {
        // Parsing happens in one step since it's recursive
        return { ...prev, ast: fullAST, phase: 'tac' };
      }
      if (prev.phase === 'tac') {
        if (prev.tacIndex < fullTAC.length) {
          const newTac = [...prev.tac, fullTAC[prev.tacIndex]];
          const nextIndex = prev.tacIndex + 1;
          if (nextIndex >= fullTAC.length) {
            return { ...prev, tac: newTac, tacIndex: nextIndex, phase: 'done' };
          }
          return { ...prev, tac: newTac, tacIndex: nextIndex };
        }
        return { ...prev, phase: 'done' };
      }
      return prev;
    });
  };

  const skipPhase = () => {
    setState(prev => {
      if (prev.phase === 'lexing') {
        return { ...prev, tokens: fullTokens, tokenIndex: fullTokens.length, phase: 'parsing' };
      }
      if (prev.phase === 'parsing') {
        return { ...prev, ast: fullAST, phase: 'tac' };
      }
      if (prev.phase === 'tac') {
        return { ...prev, tac: fullTAC, tacIndex: fullTAC.length, phase: 'done' };
      }
      return prev;
    });
  };

  const reset = () => {
    setState({ phase: 'idle', tokens: [], tokenIndex: 0, ast: null, tac: [], tacIndex: 0, error: null });
  };

  const phaseColors: Record<Phase, string> = {
    idle: 'text-muted-foreground',
    lexing: 'text-syntax-string',
    parsing: 'text-syntax-function',
    tac: 'text-primary',
    done: 'text-primary',
  };

  const phaseLabels: Record<Phase, string> = {
    idle: 'Ready',
    lexing: `Lexing (${state.tokenIndex}/${fullTokens.length})`,
    parsing: 'Parsing → AST',
    tac: `TAC Gen (${state.tacIndex}/${fullTAC.length})`,
    done: 'Complete',
  };

  if (state.phase === 'idle') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Footprints className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">Step-by-Step Mode</p>
          <p className="mt-1 text-xs opacity-60 mb-4">Walk through each compilation phase</p>
          <button
            onClick={startStepping}
            className="flex items-center gap-1.5 mx-auto rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110 active:scale-95 glow-primary"
          >
            <Play className="h-3.5 w-3.5" />
            Start Stepping
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 bg-surface-panel">
        <div className="flex items-center gap-1.5">
          {['lexing', 'parsing', 'tac', 'done'].map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              {i > 0 && <div className="w-4 h-px bg-border" />}
              <div className={`px-2 py-0.5 rounded text-[10px] font-code font-medium ${
                state.phase === p ? `${phaseColors[p as Phase]} bg-muted border border-border` :
                (['lexing', 'parsing', 'tac', 'done'].indexOf(state.phase) > i || state.phase === 'done')
                  ? 'text-primary/50 bg-primary/5'
                  : 'text-muted-foreground/40'
              }`}>
                {p === 'tac' ? 'TAC' : p.charAt(0).toUpperCase() + p.slice(1)}
              </div>
            </div>
          ))}
        </div>
        <span className={`ml-2 text-[10px] font-code ${phaseColors[state.phase]}`}>{phaseLabels[state.phase]}</span>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={stepForward}
            disabled={state.phase === 'done'}
            className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-30"
          >
            <Play className="h-3 w-3" /> Step
          </button>
          <button
            onClick={skipPhase}
            disabled={state.phase === 'done'}
            className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground hover:bg-muted disabled:opacity-30"
          >
            <SkipForward className="h-3 w-3" /> Skip Phase
          </button>
          <button
            onClick={reset}
            className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {/* Tokens */}
        {state.tokens.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-syntax-string uppercase tracking-wider mb-1">Tokens ({state.tokens.length})</div>
            <div className="flex flex-wrap gap-1">
              {state.tokens.map((t, i) => (
                <span
                  key={i}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-code border ${
                    i === state.tokens.length - 1 && state.phase === 'lexing'
                      ? 'border-syntax-string/50 bg-syntax-string/10 text-syntax-string'
                      : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  <span className="text-syntax-type">{t.type}</span>
                  {t.value && <span className="ml-1 text-foreground">"{t.value}"</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* AST */}
        {state.ast && (
          <div>
            <div className="text-[10px] font-bold text-syntax-function uppercase tracking-wider mb-1">AST Generated</div>
            <div className="rounded border border-border bg-card p-2 text-[10px] font-code text-muted-foreground">
              <div className="text-syntax-function font-semibold">Program</div>
              {state.ast.declarations.map((d, i) => (
                <div key={i} className="ml-3">
                  <span className="text-syntax-keyword">{d.kind}</span>
                  {'name' in d && <span className="text-foreground ml-1">{(d as { name: string }).name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAC */}
        {state.tac.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">TAC Instructions ({state.tac.length})</div>
            <div className="rounded border border-border bg-card p-2 space-y-0.5">
              {state.tac.map((instr, i) => {
                const isLabel = instr.op === 'label' || instr.op === 'func_begin';
                const isNew = i === state.tac.length - 1 && state.phase === 'tac';
                let text = '';
                if (instr.op === 'label') text = `${instr.label}:`;
                else if (instr.op === 'func_begin') text = `${instr.result}:`;
                else if (instr.op === 'func_end') text = `// end ${instr.result}`;
                else if (instr.op === '=') text = `  ${instr.result} = ${instr.arg1}`;
                else if (instr.op === 'goto') text = `  goto ${instr.result}`;
                else if (instr.op === 'iffalse') text = `  iffalse ${instr.arg1} goto ${instr.result}`;
                else if (instr.op === 'return') text = instr.arg1 ? `  return ${instr.arg1}` : '  return';
                else if (instr.op === 'arg') text = `  arg ${instr.arg1}`;
                else if (instr.op === 'call') text = `  ${instr.result} = call ${instr.arg1}, ${instr.arg2}`;
                else if (instr.op === 'param') text = `  param ${instr.result}`;
                else if (instr.op === 'decl') text = `  // ${instr.comment}`;
                else if (instr.arg2) text = `  ${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
                else text = `  ${instr.op} ${instr.arg1 || ''} ${instr.result || ''}`;

                return (
                  <div key={i} className={`text-[10px] font-code ${isNew ? 'text-primary bg-primary/5 rounded px-1' : isLabel ? 'text-syntax-label font-bold' : 'text-muted-foreground'}`}>
                    {text}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {state.phase === 'done' && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
            <div className="text-xs font-medium text-primary">✓ Compilation Complete</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {state.tokens.length} tokens → AST → {state.tac.length} TAC instructions
            </div>
          </div>
        )}
      </div>
    </div>
  );
}