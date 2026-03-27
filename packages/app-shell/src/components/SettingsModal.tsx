import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TACFormat } from '@ctac/core-compiler';

export interface AppSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  tacFormat: TACFormat;
  optimizationLevel: 'O0' | 'O1' | 'O2' | 'custom';
  enabledPasses: string[];
}

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 13,
  tabSize: 4,
  wordWrap: false,
  minimap: false,
  tacFormat: 'default',
  optimizationLevel: 'O2',
  enabledPasses: ['constantFolding', 'copyPropagation', 'deadCode', 'cse', 'algebraic', 'strengthReduction'],
};

export function loadSettings(): AppSettings {
  try {
    const saved = localStorage.getItem('ctac-settings');
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(s: AppSettings) {
  localStorage.setItem('ctac-settings', JSON.stringify(s));
}

const ALL_PASSES = [
  { id: 'constantFolding', name: 'Constant Folding', level: 'O1' },
  { id: 'algebraic', name: 'Algebraic Simplification', level: 'O1' },
  { id: 'copyPropagation', name: 'Copy Propagation', level: 'O1' },
  { id: 'deadCode', name: 'Dead Code Elimination', level: 'O1' },
  { id: 'cse', name: 'Common Subexpression Elimination', level: 'O2' },
  { id: 'strengthReduction', name: 'Strength Reduction', level: 'O2' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
}

export function SettingsModal({ open, onClose, settings, onSettingsChange }: Props) {
  const [local, setLocal] = useState<AppSettings>(settings);

  useEffect(() => { setLocal(settings); }, [settings]);

  if (!open) return null;

  const update = (partial: Partial<AppSettings>) => {
    const next = { ...local, ...partial };
    setLocal(next);
    saveSettings(next);
    onSettingsChange(next);
  };

  const setOptLevel = (level: AppSettings['optimizationLevel']) => {
    let passes: string[] = [];
    if (level === 'O1') passes = ALL_PASSES.filter(p => p.level === 'O1').map(p => p.id);
    if (level === 'O2') passes = ALL_PASSES.map(p => p.id);
    if (level === 'custom') passes = local.enabledPasses;
    update({ optimizationLevel: level, enabledPasses: passes });
  };

  const togglePass = (id: string) => {
    const next = local.enabledPasses.includes(id)
      ? local.enabledPasses.filter(p => p !== id)
      : [...local.enabledPasses, id];
    update({ optimizationLevel: 'custom', enabledPasses: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-[480px] max-h-[80vh] overflow-auto rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Editor */}
          <section>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Editor</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Font Size</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => update({ fontSize: Math.max(10, local.fontSize - 1) })} className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-secondary text-foreground">−</button>
                  <span className="text-xs font-code w-6 text-center">{local.fontSize}</span>
                  <button onClick={() => update({ fontSize: Math.min(24, local.fontSize + 1) })} className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-secondary text-foreground">+</button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Tab Size</span>
                <div className="flex items-center gap-1">
                  {[2, 4, 8].map(s => (
                    <button key={s} onClick={() => update({ tabSize: s })} className={`px-2 py-0.5 text-xs rounded ${local.tabSize === s ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground hover:text-foreground'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Word Wrap</span>
                <button onClick={() => update({ wordWrap: !local.wordWrap })} className={`px-3 py-0.5 text-xs rounded ${local.wordWrap ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {local.wordWrap ? 'On' : 'Off'}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground">Minimap</span>
                <button onClick={() => update({ minimap: !local.minimap })} className={`px-3 py-0.5 text-xs rounded ${local.minimap ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {local.minimap ? 'On' : 'Off'}
                </button>
              </div>
            </div>
          </section>

          {/* TAC Format */}
          <section>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">TAC Output Format</h3>
            <div className="flex flex-wrap gap-1">
              {([
                { id: 'default', label: 'Default' },
                { id: 'quadruples', label: 'Quadruples' },
                { id: 'triples', label: 'Triples' },
                { id: 'ssa', label: 'SSA Form' },
              ] as const).map(f => (
                <button
                  key={f.id}
                  onClick={() => update({ tacFormat: f.id })}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    local.tacFormat === f.id ? 'bg-primary/20 text-primary font-medium' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          {/* Optimization */}
          <section>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Optimization Level</h3>
            <div className="flex gap-1 mb-3">
              {(['O0', 'O1', 'O2', 'custom'] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setOptLevel(lvl)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    local.optimizationLevel === lvl ? 'bg-primary/20 text-primary font-medium' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lvl === 'custom' ? 'Custom' : lvl}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              {ALL_PASSES.map(pass => (
                <label key={pass.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={local.enabledPasses.includes(pass.id)}
                    onChange={() => togglePass(pass.id)}
                    className="rounded border-border accent-primary"
                  />
                  <span className="text-xs text-foreground group-hover:text-primary transition-colors">{pass.name}</span>
                  <span className="text-[10px] text-muted-foreground/50 ml-auto">{pass.level}+</span>
                </label>
              ))}
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Keyboard Shortcuts</h3>
            <div className="space-y-1 text-xs">
              {[
                { keys: 'Ctrl+Enter', action: 'Generate TAC' },
                { keys: 'Ctrl+Shift+X', action: 'Clear editor' },
                { keys: 'Ctrl+S', action: 'Download TAC' },
                { keys: 'Ctrl+Shift+C', action: 'Copy TAC' },
                { keys: 'F1', action: 'Open settings' },
              ].map(s => (
                <div key={s.keys} className="flex items-center justify-between py-0.5">
                  <span className="text-muted-foreground">{s.action}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-code text-[10px] text-foreground">{s.keys}</kbd>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
