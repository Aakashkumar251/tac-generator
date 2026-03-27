import { useState } from 'react';
import { useCompilerStore } from './stores/compilerStore';
import { OptimizerPanel } from '../src/OptimizerPanel';
import { RegisterAllocViewer } from '../src/RegisterAllocViewer';
import { AssemblyViewer } from '../src/AssemblyViewer';
import { ComparisonView } from '../src/ComparisonView';
import { StepByStepPanel } from '../src/StepByStepPanel';

type TabId = 'optimizer' | 'registers' | 'assembly' | 'comparison' | 'stepper';

const TABS: { id: TabId; label: string }[] = [
  { id: 'optimizer', label: 'Optimizer' },
  { id: 'registers', label: 'Register Alloc' },
  { id: 'assembly', label: 'Assembly' },
  { id: 'comparison', label: 'Comparison' },
  { id: 'stepper', label: 'Step-by-Step' },
];

const VIEWER_MAP: Record<TabId, React.ComponentType> = {
  optimizer: OptimizerPanel,
  registers: RegisterAllocViewer,
  assembly: AssemblyViewer,
  comparison: ComparisonView,
  stepper: StepByStepPanel,
};

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('optimizer');
  const { compileTAC, status } = useCompilerStore();

  const ActiveViewer = VIEWER_MAP[activeTab];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="px-5 py-3 border-b border-border bg-card flex items-center gap-4">
        <h1 className="text-base font-bold" style={{ background: 'linear-gradient(135deg, #f472b6, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          @ctac/optimizers
        </h1>
        <span className="text-[11px] text-muted-foreground">Standalone Preview — Port 8083</span>

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
