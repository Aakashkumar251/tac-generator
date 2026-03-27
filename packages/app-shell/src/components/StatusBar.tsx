import { useCompilerStore } from '@/stores/compilerStore';
import { Clock, Timer } from 'lucide-react';

export function StatusBar() {
  const { status, result } = useCompilerStore();

  const statusLabel = status === 'done' ? 'Compilation Successful' :
    status === 'error' ? 'Compilation Failed' :
    status === 'compiling' ? 'Compiling...' : 'Ready';

  const statusColor = status === 'done' ? 'bg-primary' :
    status === 'error' ? 'bg-destructive' :
    status === 'compiling' ? 'bg-syntax-function animate-pulse' : 'bg-muted-foreground/50';

  return (
    <footer className="flex items-center justify-between border-t border-border bg-surface-panel px-4 py-1">
      {/* Left side: Status + compile time */}
      <div className="flex items-center gap-4 text-[10px] font-code text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${statusColor}`} />
          <span className={`font-semibold uppercase tracking-wider ${
            status === 'done' ? 'text-primary' : 
            status === 'error' ? 'text-destructive' : ''
          }`}>
            {statusLabel}
          </span>
        </div>
        {result && (
          <div className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            <span>{result.metrics.tacInstructionCount} instr</span>
          </div>
        )}
      </div>

      {/* Right side: Editor info */}
      <div className="flex items-center gap-3 text-[10px] font-code text-muted-foreground">
        {result && (
          <>
            <span>Lines: {result.metrics.tokenCount}</span>
          </>
        )}
        <span>UTF-8</span>
        <span className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="text-primary font-semibold">x86-64 Target</span>
        </span>
      </div>
    </footer>
  );
}
