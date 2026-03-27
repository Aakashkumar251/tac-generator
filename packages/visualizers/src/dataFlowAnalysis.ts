import { TACInstruction } from '@ctac/shared';

export interface BasicBlock {
  id: number;
  label: string;
  instructions: TACInstruction[];
  successors: number[];
  predecessors: number[];
}

export interface DataFlowResult {
  blocks: BasicBlock[];
  liveVariables: Map<number, { in: Set<string>; out: Set<string> }>;
  reachingDefs: Map<number, { in: Set<string>; out: Set<string> }>;
  useDefChains: { variable: string; useLine: number; defLine: number }[];
}

function getVarsUsed(instr: TACInstruction): string[] {
  const vars: string[] = [];
  const isVar = (s?: string) => s && /^[a-zA-Z_]\w*$/.test(s) && !/^(L\d+|t\d+)$/.test(s);
  const isTemp = (s?: string) => s && /^t\d+$/.test(s);
  if (isVar(instr.arg1) || isTemp(instr.arg1)) vars.push(instr.arg1!);
  if (isVar(instr.arg2) || isTemp(instr.arg2)) vars.push(instr.arg2!);
  if ((instr.op === 'iffalse' || instr.op === 'iftrue') && instr.arg1) vars.push(instr.arg1);
  if (instr.op === 'return' && instr.arg1 && (isVar(instr.arg1) || isTemp(instr.arg1))) {
    // already added
  }
  if (instr.op === 'arg' && instr.arg1 && (isVar(instr.arg1) || isTemp(instr.arg1))) {
    // already added
  }
  return [...new Set(vars)];
}

function getVarDefined(instr: TACInstruction): string | null {
  if (!instr.result) return null;
  if (instr.op === 'label' || instr.op === 'goto' || instr.op === 'func_end' || 
      instr.op === 'iffalse' || instr.op === 'iftrue' || instr.op === 'arg') return null;
  if (/^[a-zA-Z_]\w*$/.test(instr.result) || /^t\d+$/.test(instr.result)) return instr.result;
  return null;
}

function buildBasicBlocks(tac: TACInstruction[]): BasicBlock[] {
  if (tac.length === 0) return [];
  
  // Find leaders
  const leaders = new Set<number>([0]);
  const labelMap = new Map<string, number>();
  
  for (let i = 0; i < tac.length; i++) {
    if (tac[i].op === 'label' || tac[i].op === 'func_begin') {
      leaders.add(i);
      const lbl = tac[i].label || tac[i].result;
      if (lbl) labelMap.set(lbl, i);
    }
    if (tac[i].op === 'goto' || tac[i].op === 'iffalse' || tac[i].op === 'iftrue') {
      if (i + 1 < tac.length) leaders.add(i + 1);
    }
    if (tac[i].op === 'func_end') {
      if (i + 1 < tac.length) leaders.add(i + 1);
    }
  }

  const sortedLeaders = [...leaders].sort((a, b) => a - b);
  const blocks: BasicBlock[] = [];

  for (let i = 0; i < sortedLeaders.length; i++) {
    const start = sortedLeaders[i];
    const end = i + 1 < sortedLeaders.length ? sortedLeaders[i + 1] : tac.length;
    const instructions = tac.slice(start, end);
    const label = tac[start].label || tac[start].result || `B${blocks.length}`;
    blocks.push({ id: blocks.length, label, instructions, successors: [], predecessors: [] });
  }

  // Build edges
  for (let i = 0; i < blocks.length; i++) {
    const lastInstr = blocks[i].instructions[blocks[i].instructions.length - 1];
    if (lastInstr.op === 'goto') {
      const target = lastInstr.result;
      const targetBlock = blocks.findIndex(b => {
        const first = b.instructions[0];
        return (first.label === target || first.result === target);
      });
      if (targetBlock >= 0) {
        blocks[i].successors.push(targetBlock);
        blocks[targetBlock].predecessors.push(i);
      }
    } else if (lastInstr.op === 'iffalse' || lastInstr.op === 'iftrue') {
      // Fall-through
      if (i + 1 < blocks.length) {
        blocks[i].successors.push(i + 1);
        blocks[i + 1].predecessors.push(i);
      }
      // Jump target
      const target = lastInstr.result;
      const targetBlock = blocks.findIndex(b => {
        const first = b.instructions[0];
        return (first.label === target || first.result === target);
      });
      if (targetBlock >= 0 && !blocks[i].successors.includes(targetBlock)) {
        blocks[i].successors.push(targetBlock);
        blocks[targetBlock].predecessors.push(i);
      }
    } else if (lastInstr.op !== 'return' && lastInstr.op !== 'func_end') {
      if (i + 1 < blocks.length) {
        blocks[i].successors.push(i + 1);
        blocks[i + 1].predecessors.push(i);
      }
    }
  }

  return blocks;
}

function computeLiveVariables(blocks: BasicBlock[]): Map<number, { in: Set<string>; out: Set<string> }> {
  const result = new Map<number, { in: Set<string>; out: Set<string> }>();
  for (const b of blocks) {
    result.set(b.id, { in: new Set(), out: new Set() });
  }

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 100) {
    changed = false;
    iterations++;
    // Backward analysis
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i];
      const entry = result.get(b.id)!;
      
      // OUT = union of IN of successors
      const newOut = new Set<string>();
      for (const succ of b.successors) {
        for (const v of result.get(succ)!.in) newOut.add(v);
      }

      // IN = USE ∪ (OUT - DEF)
      const use = new Set<string>();
      const def = new Set<string>();
      for (const instr of b.instructions) {
        for (const v of getVarsUsed(instr)) {
          if (!def.has(v)) use.add(v);
        }
        const d = getVarDefined(instr);
        if (d) def.add(d);
      }

      const newIn = new Set(use);
      for (const v of newOut) {
        if (!def.has(v)) newIn.add(v);
      }

      if (!setsEqual(newIn, entry.in) || !setsEqual(newOut, entry.out)) {
        changed = true;
        entry.in = newIn;
        entry.out = newOut;
      }
    }
  }

  return result;
}

function computeReachingDefs(blocks: BasicBlock[]): Map<number, { in: Set<string>; out: Set<string> }> {
  const result = new Map<number, { in: Set<string>; out: Set<string> }>();
  for (const b of blocks) {
    result.set(b.id, { in: new Set(), out: new Set() });
  }

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 100) {
    changed = false;
    iterations++;
    for (const b of blocks) {
      const entry = result.get(b.id)!;
      
      // IN = union of OUT of predecessors
      const newIn = new Set<string>();
      for (const pred of b.predecessors) {
        for (const v of result.get(pred)!.out) newIn.add(v);
      }

      // OUT = GEN ∪ (IN - KILL)
      const gen = new Set<string>();
      const kill = new Set<string>();
      for (const instr of b.instructions) {
        const d = getVarDefined(instr);
        if (d) {
          const defStr = `${d}@L${instr.sourceLine || '?'}`;
          gen.add(defStr);
          // Kill other defs of same variable
          for (const existing of newIn) {
            if (existing.startsWith(d + '@')) kill.add(existing);
          }
        }
      }

      const newOut = new Set(gen);
      for (const v of newIn) {
        if (!kill.has(v)) newOut.add(v);
      }

      if (!setsEqual(newIn, entry.in) || !setsEqual(newOut, entry.out)) {
        changed = true;
        entry.in = newIn;
        entry.out = newOut;
      }
    }
  }

  return result;
}

function computeUseDefChains(blocks: BasicBlock[]): { variable: string; useLine: number; defLine: number }[] {
  const chains: { variable: string; useLine: number; defLine: number }[] = [];
  const defs = new Map<string, number[]>(); // var -> lines where defined

  for (const b of blocks) {
    for (const instr of b.instructions) {
      const d = getVarDefined(instr);
      if (d && instr.sourceLine) {
        if (!defs.has(d)) defs.set(d, []);
        defs.get(d)!.push(instr.sourceLine);
      }
    }
  }

  for (const b of blocks) {
    for (const instr of b.instructions) {
      for (const v of getVarsUsed(instr)) {
        const defLines = defs.get(v);
        if (defLines && instr.sourceLine) {
          // Find most recent def before this use
          const recentDef = defLines.filter(d => d <= instr.sourceLine!).pop();
          if (recentDef !== undefined) {
            chains.push({ variable: v, useLine: instr.sourceLine, defLine: recentDef });
          }
        }
      }
    }
  }

  return chains;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function analyzeDataFlow(tac: TACInstruction[]): DataFlowResult {
  const blocks = buildBasicBlocks(tac);
  const liveVariables = computeLiveVariables(blocks);
  const reachingDefs = computeReachingDefs(blocks);
  const useDefChains = computeUseDefChains(blocks);
  return { blocks, liveVariables, reachingDefs, useDefChains };
}
