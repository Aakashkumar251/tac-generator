import { create } from 'zustand';
import { compile } from '@ctac/core-compiler';
import type { CompileResult } from '@ctac/shared';

const SAMPLE_CODE = `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int x = 10;
    int y = 20;
    int sum = x + y;
    if (sum > 25) {
        sum = sum * 2;
    } else {
        sum = sum + 5;
    }
    int result = factorial(sum);
    return result;
}`;

interface CompilerState {
  sourceCode: string;
  result: CompileResult | null;
  status: 'idle' | 'compiling' | 'done' | 'error';
  activeTab: string;
  settings: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
    minimap: boolean;
    tacFormat: string;
    optimizationLevel: string;
    enabledPasses: string[];
  };
  settingsOpen: boolean;
  setSource: (code: string) => void;
  compileTAC: () => void;
  setActiveTab: (tab: string) => void;
  loadSample: (code: string) => void;
  setSettings: (s: CompilerState['settings']) => void;
  setSettingsOpen: (open: boolean) => void;
}

const precompiledResult = compile(SAMPLE_CODE);

export const useCompilerStore = create<CompilerState>((set, get) => ({
  sourceCode: SAMPLE_CODE,
  result: precompiledResult,
  status: 'done',
  activeTab: 'optimizer',
  settings: {
    fontSize: 13,
    tabSize: 4,
    wordWrap: false,
    minimap: false,
    tacFormat: 'default',
    optimizationLevel: 'O2',
    enabledPasses: ['constantFolding', 'copyPropagation', 'deadCode', 'cse', 'algebraic', 'strengthReduction'],
  },
  settingsOpen: false,

  setSource: (code) => set({ sourceCode: code }),
  compileTAC: () => {
    set({ status: 'compiling' });
    try {
      const result = compile(get().sourceCode);
      set({ result, status: result.errors.length > 0 ? 'error' : 'done' });
    } catch {
      set({ status: 'error' });
    }
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  loadSample: (code) => set({ sourceCode: code, result: null, status: 'idle' }),
  setSettings: (s) => set({ settings: s }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
