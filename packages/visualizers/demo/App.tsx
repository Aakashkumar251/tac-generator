import { useState } from 'react';
import { useCompilerStore } from './stores/compilerStore';
import { ASTViewer } from '../src/ASTViewer';
import { CFGViewer } from '../src/CFGViewer';
import { SymbolTableViewer } from '../src/SymbolTableViewer';
import { DataFlowViewer } from '../src/DataFlowViewer';
import { MemoryLayoutViewer } from '../src/MemoryLayoutViewer';

type TabId = 'ast' | 'cfg' | 'symbols' | 'dataflow' | 'memory';

const TABS: { id: TabId; label: string }[] = [
  { id: 'ast', label: 'AST Viewer' },
  { id: 'cfg', label: 'CFG Viewer' },
  { id: 'symbols', label: 'Symbol Table' },
  { id: 'dataflow', label: 'Data Flow' },
  { id: 'memory', label: 'Memory Layout' },
];

const VIEWER_MAP: Record<TabId, React.ComponentType> = {
  ast: ASTViewer,
  cfg: CFGViewer,
  symbols: SymbolTableViewer,
  dataflow: DataFlowViewer,
  memory: MemoryLayoutViewer,
};

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('ast');
  const { compileTAC, status } = useCompilerStore();

  const ActiveViewer = VIEWER_MAP[activeTab];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-5 py-3 border-b border-border bg-card flex items-center gap-4">
        <h1 className="text-base font-bold" style={{ background: 'linear-gradient(135deg, #818cf8, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          @ctac/visualizers
        </h1>
        <span className="text-[11px] text-muted-foreground">Standalone Preview — Port 8082</span>

        <button
          onClick={compileTAC}
          className="ml-auto px-4 py-1.5 text-xs font-semibold rounded-md text-primary-foreground"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          ↻ Re-compile
        </button>

        <span className="text-[10px] font-code text-muted-foreground">
          Status: <span className={status === 'done' ? 'text-primary' : 'text-destructive'}>{status}</span>
        </span>
      </header>

      {/* Tab Bar */}
      <div className="flex border-b border-border bg-surface-panel">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-primary border-primary bg-muted/30'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        <ActiveViewer />
      </div>
    </div>
  );
}
