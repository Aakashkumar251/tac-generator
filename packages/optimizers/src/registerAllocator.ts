import { TACInstruction } from '@ctac/shared';

export interface LiveRange {
  variable: string;
  start: number;
  end: number;
  isTemp: boolean;
}

export interface InterferenceEdge {
  a: string;
  b: string;
}

export interface RegisterAssignment {
  variable: string;
  register: string | null; // null = spilled
  color: number;
  spillCost: number;
}

export interface RegisterAllocationResult {
  liveRanges: LiveRange[];
  interferenceEdges: InterferenceEdge[];
  assignments: RegisterAssignment[];
  registers: string[];
  spillCount: number;
  totalVars: number;
}

const X86_REGISTERS = ['rax', 'rbx', 'rcx', 'rdx', 'rsi', 'rdi', 'r8', 'r9', 'r10', 'r11', 'r12', 'r13', 'r14', 'r15'];

function computeLiveRanges(tac: TACInstruction[]): LiveRange[] {
  const ranges = new Map<string, { start: number; end: number }>();

  for (let i = 0; i < tac.length; i++) {
    const instr = tac[i];
    const vars: string[] = [];
    
    if (instr.arg1 && /^[a-zA-Z_]\w*$/.test(instr.arg1)) vars.push(instr.arg1);
    if (instr.arg2 && /^[a-zA-Z_]\w*$/.test(instr.arg2)) vars.push(instr.arg2);
    if (instr.arg1 && /^t\d+$/.test(instr.arg1)) vars.push(instr.arg1);
    if (instr.arg2 && /^t\d+$/.test(instr.arg2)) vars.push(instr.arg2);
    if (instr.result && (/^[a-zA-Z_]\w*$/.test(instr.result) || /^t\d+$/.test(instr.result)) 
        && instr.op !== 'label' && instr.op !== 'goto' && instr.op !== 'func_begin' && instr.op !== 'func_end'
        && instr.op !== 'iffalse' && instr.op !== 'iftrue') {
      vars.push(instr.result);
    }

    for (const v of vars) {
      if (!ranges.has(v)) {
        ranges.set(v, { start: i, end: i });
      } else {
        ranges.get(v)!.end = i;
      }
    }
  }

  return Array.from(ranges.entries()).map(([variable, { start, end }]) => ({
    variable,
    start,
    end,
    isTemp: /^t\d+$/.test(variable),
  }));
}

function buildInterferenceGraph(ranges: LiveRange[]): InterferenceEdge[] {
  const edges: InterferenceEdge[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const a = ranges[i], b = ranges[j];
      // Two ranges interfere if they overlap
      if (a.start <= b.end && b.start <= a.end) {
        edges.push({ a: a.variable, b: b.variable });
      }
    }
  }
  return edges;
}

function graphColoringAllocation(
  ranges: LiveRange[],
  edges: InterferenceEdge[],
  numRegisters: number
): RegisterAssignment[] {
  const vars = ranges.map(r => r.variable);
  const adj = new Map<string, Set<string>>();
  for (const v of vars) adj.set(v, new Set());
  for (const e of edges) {
    adj.get(e.a)?.add(e.b);
    adj.get(e.b)?.add(e.a);
  }

  // Compute spill costs (longer ranges = higher cost, temps are cheaper)
  const spillCosts = new Map<string, number>();
  for (const r of ranges) {
    const rangeLen = r.end - r.start + 1;
    spillCosts.set(r.variable, r.isTemp ? rangeLen * 0.5 : rangeLen * 2);
  }

  // Simplify: repeatedly remove nodes with degree < numRegisters
  const stack: string[] = [];
  const removed = new Set<string>();
  const remaining = new Set(vars);

  while (remaining.size > 0) {
    let found = false;
    for (const v of remaining) {
      const neighbors = [...(adj.get(v) || [])].filter(n => !removed.has(n));
      if (neighbors.length < numRegisters) {
        stack.push(v);
        removed.add(v);
        remaining.delete(v);
        found = true;
        break;
      }
    }
    if (!found) {
      // Spill: pick the one with lowest spill cost / degree
      let best: string | null = null;
      let bestRatio = Infinity;
      for (const v of remaining) {
        const neighbors = [...(adj.get(v) || [])].filter(n => !removed.has(n));
        const ratio = (spillCosts.get(v) || 1) / (neighbors.length || 1);
        if (ratio < bestRatio) {
          bestRatio = ratio;
          best = v;
        }
      }
      if (best) {
        stack.push(best);
        removed.add(best);
        remaining.delete(best);
      }
    }
  }

  // Select: pop from stack, assign colors
  const colors = new Map<string, number>();
  const spilled = new Set<string>();

  while (stack.length > 0) {
    const v = stack.pop()!;
    const neighborColors = new Set<number>();
    for (const n of adj.get(v) || []) {
      if (colors.has(n)) neighborColors.add(colors.get(n)!);
    }
    let color = -1;
    for (let c = 0; c < numRegisters; c++) {
      if (!neighborColors.has(c)) { color = c; break; }
    }
    if (color >= 0) {
      colors.set(v, color);
    } else {
      spilled.add(v);
      colors.set(v, -1);
    }
  }

  return ranges.map(r => ({
    variable: r.variable,
    register: spilled.has(r.variable) ? null : X86_REGISTERS[colors.get(r.variable) || 0],
    color: colors.get(r.variable) ?? -1,
    spillCost: spillCosts.get(r.variable) || 0,
  }));
}

export function allocateRegisters(tac: TACInstruction[], numRegisters = 8): RegisterAllocationResult {
  const liveRanges = computeLiveRanges(tac);
  const interferenceEdges = buildInterferenceGraph(liveRanges);
  const assignments = graphColoringAllocation(liveRanges, interferenceEdges, numRegisters);
  const spillCount = assignments.filter(a => a.register === null).length;

  return {
    liveRanges,
    interferenceEdges,
    assignments,
    registers: X86_REGISTERS.slice(0, numRegisters),
    spillCount,
    totalVars: liveRanges.length,
  };
}
