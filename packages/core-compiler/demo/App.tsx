import { useState, useCallback } from 'react';
import { compile, lex, samples } from '../src/index';
import type { CompileResult, Token } from '@ctac/shared';

const DEMO_CODE = `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int result = factorial(5);
    return result;
}`;

type TabId = 'tokens' | 'ast' | 'tac' | 'errors';

export function App() {
  const [source, setSource] = useState(DEMO_CODE);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('tac');
  const [selectedSample, setSelectedSample] = useState('');

  const handleCompile = useCallback(() => {
    const res = compile(source);
    setResult(res);
  }, [source]);

  const handleSampleChange = (name: string) => {
    const sample = samples.find(s => s.name === name);
    if (sample) {
      setSource(sample.code);
      setSelectedSample(name);
      setResult(null);
    }
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'tac', label: 'TAC Output', count: result?.tac.length },
    { id: 'tokens', label: 'Tokens', count: result?.tokens.length },
    { id: 'ast', label: 'AST' },
    { id: 'errors', label: 'Errors', count: result?.errors.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0f', color: '#e2e8f0' }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid #1e293b',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          @ctac/core-compiler
        </h1>
        <span style={{ fontSize: '11px', color: '#64748b' }}>Standalone Preview — Port 8081</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={selectedSample}
            onChange={e => handleSampleChange(e.target.value)}
            style={{ fontSize: '12px', padding: '4px 8px', background: '#1e293b', border: '1px solid #334155', borderRadius: '6px', color: '#e2e8f0', cursor: 'pointer' }}
          >
            <option value="">Load Sample...</option>
            {samples.map(s => (
              <option key={s.name} value={s.name}>{s.category} — {s.name}</option>
            ))}
          </select>
          <button
            onClick={handleCompile}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseOut={e => (e.currentTarget.style.opacity = '1')}
          >
            ▶ Compile
          </button>
        </div>
      </header>

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Editor Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b' }}>
          <div style={{ padding: '6px 12px', fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
            C Source Code
          </div>
          <textarea
            value={source}
            onChange={e => setSource(e.target.value)}
            spellCheck={false}
            style={{
              flex: 1,
              padding: '12px',
              background: '#020617',
              color: '#e2e8f0',
              border: 'none',
              resize: 'none',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: '13px',
              lineHeight: 1.6,
              outline: 'none',
              tabSize: 4,
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleCompile();
              }
            }}
          />
        </div>

        {/* Output Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #1e293b', background: '#0f172a' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 14px',
                  fontSize: '11px',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  color: activeTab === tab.id ? '#818cf8' : '#64748b',
                  background: activeTab === tab.id ? '#1e293b' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #818cf8' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '8px', background: tab.id === 'errors' ? '#7f1d1d' : '#1e293b', color: tab.id === 'errors' ? '#fca5a5' : '#94a3b8' }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}

            {result && (
              <div style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: '10px', color: '#64748b', display: 'flex', gap: '12px' }}>
                <span>Tokens: <strong style={{ color: '#818cf8' }}>{result.metrics.tokenCount}</strong></span>
                <span>TAC: <strong style={{ color: '#818cf8' }}>{result.metrics.tacInstructionCount}</strong></span>
                <span>Temps: <strong style={{ color: '#818cf8' }}>{result.metrics.tempCount}</strong></span>
                <span>Labels: <strong style={{ color: '#818cf8' }}>{result.metrics.labelCount}</strong></span>
              </div>
            )}
          </div>

          {/* Output Content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", fontSize: '12px', lineHeight: 1.6 }}>
            {!result ? (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px', opacity: 0.3 }}>⚡</div>
                  <p style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px' }}>Press <kbd style={{ padding: '2px 6px', background: '#1e293b', borderRadius: '4px', border: '1px solid #334155', fontSize: '11px' }}>Ctrl + Enter</kbd> or click <strong>Compile</strong></p>
                </div>
              </div>
            ) : activeTab === 'tac' ? (
              <TACView tac={result.tac} />
            ) : activeTab === 'tokens' ? (
              <TokenView tokens={result.tokens} />
            ) : activeTab === 'ast' ? (
              <pre style={{ color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(result.ast, null, 2)}
              </pre>
            ) : activeTab === 'errors' ? (
              <ErrorView errors={result.errors} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TACView({ tac }: { tac: CompileResult['tac'] }) {
  if (tac.length === 0) {
    return <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '40px' }}>No TAC generated</div>;
  }
  return (
    <div>
      {tac.map((instr, i) => {
        const isLabel = instr.op === 'label' || instr.op === 'func_begin' || instr.op === 'func_end';
        const line = formatTAC(instr);
        return (
          <div key={i} style={{
            padding: '1px 0',
            color: isLabel ? '#818cf8' : instr.op === 'decl' ? '#475569' : '#cbd5e1',
            fontWeight: isLabel ? 700 : 400,
            paddingLeft: isLabel ? '0' : '16px',
          }}>
            <span style={{ color: '#334155', fontSize: '10px', display: 'inline-block', width: '30px', textAlign: 'right', marginRight: '8px' }}>{i}</span>
            {line}
          </div>
        );
      })}
    </div>
  );
}

function formatTAC(instr: CompileResult['tac'][0]): string {
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

function TokenView({ tokens }: { tokens: Token[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
          <th style={{ padding: '4px 8px' }}>#</th>
          <th style={{ padding: '4px 8px' }}>Type</th>
          <th style={{ padding: '4px 8px' }}>Value</th>
          <th style={{ padding: '4px 8px' }}>Line</th>
          <th style={{ padding: '4px 8px' }}>Col</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((tok, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
            <td style={{ padding: '2px 8px', color: '#334155' }}>{i}</td>
            <td style={{ padding: '2px 8px', color: '#818cf8' }}>{tok.type}</td>
            <td style={{ padding: '2px 8px', color: '#e2e8f0' }}>{tok.value}</td>
            <td style={{ padding: '2px 8px', color: '#64748b' }}>{tok.line}</td>
            <td style={{ padding: '2px 8px', color: '#64748b' }}>{tok.column}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ErrorView({ errors }: { errors: CompileResult['errors'] }) {
  if (errors.length === 0) {
    return <div style={{ color: '#22c55e', textAlign: 'center', paddingTop: '40px' }}>✓ No errors</div>;
  }
  return (
    <div>
      {errors.map((err, i) => (
        <div key={i} style={{
          padding: '8px 12px',
          marginBottom: '4px',
          borderRadius: '6px',
          background: err.severity === 'error' ? '#7f1d1d20' : '#78350f20',
          border: `1px solid ${err.severity === 'error' ? '#991b1b' : '#92400e'}`,
          color: err.severity === 'error' ? '#fca5a5' : '#fcd34d',
          fontSize: '12px',
        }}>
          <strong>L{err.line}</strong>: {err.message}
        </div>
      ))}
    </div>
  );
}
