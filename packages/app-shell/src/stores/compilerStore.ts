import { create } from 'zustand';
import { compile } from '@ctac/core-compiler';
import { CompileResult } from '@ctac/shared';
import { AppSettings, loadSettings } from '@/components/SettingsModal';
import { TACFormat } from '@ctac/core-compiler';

interface CompilerState {
  sourceCode: string;
  result: CompileResult | null;
  status: 'idle' | 'compiling' | 'done' | 'error';
  activeTab: string;
  settings: AppSettings;
  settingsOpen: boolean;
  setSource: (code: string) => void;
  compileTAC: () => void;
  setActiveTab: (tab: string) => void;
  loadSample: (code: string) => void;
  setSettings: (s: AppSettings) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useCompilerStore = create<CompilerState>((set, get) => ({
  sourceCode: `// Welcome to C-TAC Generator Pro
// Write C code and generate Three-Address Code!

int factorial(int n) {
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
}`,
  result: null,
  status: 'idle',
  activeTab: 'tac',
  settings: loadSettings(),
  settingsOpen: false,
  
  setSource: (code) => set({ sourceCode: code }),
  
  compileTAC: () => {
    set({ status: 'compiling' });
    try {
      const result = compile(get().sourceCode);
      set({
        result,
        status: result.errors.length > 0 ? 'error' : 'done',
      });
    } catch {
      set({ status: 'error' });
    }
  },
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  loadSample: (code) => set({ sourceCode: code, result: null, status: 'idle' }),
  setSettings: (s) => set({ settings: s }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
}));
