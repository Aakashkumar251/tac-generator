import { TACInstruction } from '@ctac/shared';

export interface OptimizationResult {
  name: string;
  description: string;
  before: TACInstruction[];
  after: TACInstruction[];
  removedCount: number;
  modifiedCount: number;
}

// Constant Folding: evaluate expressions with constant operands at compile time
function constantFolding(tac: TACInstruction[]): OptimizationResult {
  const before = [...tac];
  const after: TACInstruction[] = [];
  let modifiedCount = 0;

  const ops: Record<string, (a: number, b: number) => number> = {
    '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b,
    '/': (a, b) => b !== 0 ? Math.trunc(a / b) : NaN, '%': (a, b) => b !== 0 ? a % b : NaN,
    '<': (a, b) => a < b ? 1 : 0, '>': (a, b) => a > b ? 1 : 0,
    '<=': (a, b) => a <= b ? 1 : 0, '>=': (a, b) => a >= b ? 1 : 0,
    '==': (a, b) => a === b ? 1 : 0, '!=': (a, b) => a !== b ? 1 : 0,
    '<<': (a, b) => a << b, '>>': (a, b) => a >> b,
    '&': (a, b) => a & b, '|': (a, b) => a | b, '^': (a, b) => a ^ b,
  };

  for (const instr of tac) {
    if (instr.arg1 && instr.arg2 && instr.result && ops[instr.op]) {
      const a = Number(instr.arg1);
      const b = Number(instr.arg2);
      if (!isNaN(a) && !isNaN(b)) {
        const result = ops[instr.op](a, b);
        if (!isNaN(result) && isFinite(result)) {
          after.push({ ...instr, op: '=', arg1: String(result), arg2: undefined, comment: `folded: ${instr.arg1} ${instr.op} ${instr.arg2}` });
          modifiedCount++;
          continue;
        }
      }
    }
    after.push({ ...instr });
  }

  return { name: 'Constant Folding', description: 'Evaluates constant expressions at compile time', before, after, removedCount: 0, modifiedCount };
}

// Algebraic Simplification: x*1→x, x+0→x, x*0→0, x-x→0, x/1→x
function algebraicSimplification(tac: TACInstruction[]): OptimizationResult {
  const before = [...tac];
  const after: TACInstruction[] = [];
  let modifiedCount = 0;

  for (const instr of tac) {
    if (instr.arg1 && instr.arg2 && instr.result) {
      // x * 1 → x, 1 * x → x
      if (instr.op === '*' && instr.arg2 === '1') {
        after.push({ ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: `simplified: ${instr.arg1} * 1` }); modifiedCount++; continue;
      }
      if (instr.op === '*' && instr.arg1 === '1') {
        after.push({ ...instr, op: '=', arg1: instr.arg2, arg2: undefined, comment: `simplified: 1 * ${instr.arg2}` }); modifiedCount++; continue;
      }
      // x * 0 → 0, 0 * x → 0
      if (instr.op === '*' && (instr.arg2 === '0' || instr.arg1 === '0')) {
        after.push({ ...instr, op: '=', arg1: '0', arg2: undefined, comment: `simplified: ${instr.arg1} * ${instr.arg2}` }); modifiedCount++; continue;
      }
      // x + 0 → x, 0 + x → x
      if (instr.op === '+' && instr.arg2 === '0') {
        after.push({ ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: `simplified: ${instr.arg1} + 0` }); modifiedCount++; continue;
      }
      if (instr.op === '+' && instr.arg1 === '0') {
        after.push({ ...instr, op: '=', arg1: instr.arg2, arg2: undefined, comment: `simplified: 0 + ${instr.arg2}` }); modifiedCount++; continue;
      }
      // x - 0 → x
      if (instr.op === '-' && instr.arg2 === '0') {
        after.push({ ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: `simplified: ${instr.arg1} - 0` }); modifiedCount++; continue;
      }
      // x - x → 0
      if (instr.op === '-' && instr.arg1 === instr.arg2) {
        after.push({ ...instr, op: '=', arg1: '0', arg2: undefined, comment: `simplified: ${instr.arg1} - ${instr.arg1}` }); modifiedCount++; continue;
      }
      // x / 1 → x
      if (instr.op === '/' && instr.arg2 === '1') {
        after.push({ ...instr, op: '=', arg1: instr.arg1, arg2: undefined, comment: `simplified: ${instr.arg1} / 1` }); modifiedCount++; continue;
      }
    }
    after.push({ ...instr });
  }

  return { name: 'Algebraic Simplification', description: 'Simplifies identity/annihilator operations (x*1→x, x+0→x, x*0→0)', before, after, removedCount: 0, modifiedCount };
}

// Strength Reduction: x*2→x<<1, x*4→x<<2, x/2→x>>1
function strengthReduction(tac: TACInstruction[]): OptimizationResult {
  const before = [...tac];
  const after: TACInstruction[] = [];
  let modifiedCount = 0;

  for (const instr of tac) {
    if (instr.op === '*' && instr.arg2 && instr.result) {
      const val = Number(instr.arg2);
      if (!isNaN(val) && val > 0 && (val & (val - 1)) === 0) {
        const shift = Math.log2(val);
        after.push({ ...instr, op: '<<', arg2: String(shift), comment: `strength: ${instr.arg1} * ${val} → ${instr.arg1} << ${shift}` });
        modifiedCount++;
        continue;
      }
    }
    if (instr.op === '/' && instr.arg2 && instr.result) {
      const val = Number(instr.arg2);
      if (!isNaN(val) && val > 0 && (val & (val - 1)) === 0) {
        const shift = Math.log2(val);
        after.push({ ...instr, op: '>>', arg2: String(shift), comment: `strength: ${instr.arg1} / ${val} → ${instr.arg1} >> ${shift}` });
        modifiedCount++;
        continue;
      }
    }
    after.push({ ...instr });
  }

  return { name: 'Strength Reduction', description: 'Replaces expensive ops with cheaper ones (x*2→x<<1)', before, after, removedCount: 0, modifiedCount };
}

// Common Subexpression Elimination
function commonSubexprElimination(tac: TACInstruction[]): OptimizationResult {
  const before = [...tac];
  const after: TACInstruction[] = [];
  let modifiedCount = 0;
  // Map "op|arg1|arg2" → result temp
  const exprMap = new Map<string, string>();

  const binOps = new Set(['+', '-', '*', '/', '%', '<<', '>>', '&', '|', '^', '<', '>', '<=', '>=', '==', '!=']);

  for (const instr of tac) {
    if (binOps.has(instr.op) && instr.arg1 && instr.arg2 && instr.result) {
      const key = `${instr.op}|${instr.arg1}|${instr.arg2}`;
      if (exprMap.has(key)) {
        after.push({ ...instr, op: '=', arg1: exprMap.get(key)!, arg2: undefined, comment: `CSE: reused ${key}` });
        modifiedCount++;
        continue;
      }
      exprMap.set(key, instr.result);
    }
    // Invalidate on labels/jumps (conservative)
    if (instr.op === 'label' || instr.op === 'func_begin' || instr.op === 'goto' || instr.op === 'call') {
      exprMap.clear();
    }
    // Invalidate expressions using the result as operand
    if (instr.result) {
      for (const [k, v] of exprMap) {
        const parts = k.split('|');
        if (parts[1] === instr.result || parts[2] === instr.result) {
          exprMap.delete(k);
        }
      }
    }
    after.push({ ...instr });
  }

  return { name: 'Common Subexpression Elimination', description: 'Reuses previously computed expressions', before, after, removedCount: 0, modifiedCount };
}

// Copy Propagation
function copyPropagation(tac: TACInstruction[]): OptimizationResult {
  const before = [...tac];
  const copies = new Map<string, string>();
  const after: TACInstruction[] = [];
  let modifiedCount = 0;

  function resolve(name: string): string {
    let current = name;
    const visited = new Set<string>();
    while (copies.has(current) && !visited.has(current)) {
      visited.add(current);
      current = copies.get(current)!;
    }
    return current;
  }

  for (const instr of tac) {
    const newInstr = { ...instr };
    if (newInstr.arg1 && copies.has(newInstr.arg1) && newInstr.op !== 'label' && newInstr.op !== 'func_begin' && newInstr.op !== 'func_end') {
      const resolved = resolve(newInstr.arg1);
      if (resolved !== newInstr.arg1) { newInstr.arg1 = resolved; modifiedCount++; }
    }
    if (newInstr.arg2 && copies.has(newInstr.arg2)) {
      const resolved = resolve(newInstr.arg2);
      if (resolved !== newInstr.arg2) { newInstr.arg2 = resolved; modifiedCount++; }
    }
    if (newInstr.op === '=' && newInstr.result && newInstr.arg1) {
      copies.set(newInstr.result, newInstr.arg1);
    } else if (newInstr.result) {
      copies.delete(newInstr.result);
    }
    if (newInstr.op === 'label' || newInstr.op === 'func_begin') copies.clear();
    after.push(newInstr);
  }

  return { name: 'Copy Propagation', description: 'Replaces variable copies with their original values', before, after, removedCount: 0, modifiedCount };
}

// Dead Code Elimination
function deadCodeElimination(tac: TACInstruction[]): OptimizationResult {
  const before = [...tac];
  const used = new Set<string>();
  for (const instr of tac) {
    if (instr.arg1 && instr.op !== 'label' && instr.op !== 'func_begin' && instr.op !== 'func_end' && instr.op !== 'decl') used.add(instr.arg1);
    if (instr.arg2) used.add(instr.arg2);
    if (instr.op === 'return' && instr.arg1) used.add(instr.arg1);
  }

  const after: TACInstruction[] = [];
  let removedCount = 0;
  for (const instr of tac) {
    if (instr.result && /^t\d+$/.test(instr.result) && !used.has(instr.result)
        && instr.op !== 'call' && instr.op !== 'label' && instr.op !== 'func_begin'
        && instr.op !== 'func_end' && instr.op !== 'return' && instr.op !== 'goto'
        && instr.op !== 'iffalse' && instr.op !== 'iftrue' && instr.op !== 'param'
        && instr.op !== 'arg' && instr.op !== 'decl') {
      removedCount++;
      continue;
    }
    after.push({ ...instr });
  }

  return { name: 'Dead Code Elimination', description: 'Removes assignments to unused temporaries', before, after, removedCount, modifiedCount: 0 };
}

const PASS_MAP: Record<string, (tac: TACInstruction[]) => OptimizationResult> = {
  constantFolding,
  algebraic: algebraicSimplification,
  copyPropagation,
  deadCode: deadCodeElimination,
  cse: commonSubexprElimination,
  strengthReduction,
};

export function runOptimizations(tac: TACInstruction[], enabledPasses?: string[]): OptimizationResult[] {
  const passOrder = enabledPasses || ['constantFolding', 'algebraic', 'copyPropagation', 'cse', 'strengthReduction', 'deadCode'];
  const results: OptimizationResult[] = [];
  let current = [...tac];

  for (const passId of passOrder) {
    const fn = PASS_MAP[passId];
    if (!fn) continue;
    const result = fn(current);
    results.push(result);
    current = result.after;
  }

  return results;
}
