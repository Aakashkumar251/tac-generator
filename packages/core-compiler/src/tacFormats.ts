import { TACInstruction } from '@ctac/shared';

export type TACFormat = 'default' | 'quadruples' | 'triples' | 'ssa';

export interface QuadrupleEntry {
  index: number;
  op: string;
  arg1: string;
  arg2: string;
  result: string;
}

export interface TripleEntry {
  index: number;
  op: string;
  arg1: string;
  arg2: string;
}

export interface SSAInstruction extends TACInstruction {
  ssaResult?: string;
  ssaArg1?: string;
  ssaArg2?: string;
}

export function toQuadruples(tac: TACInstruction[]): QuadrupleEntry[] {
  return tac
    .filter(i => i.op !== 'func_end' && i.op !== 'decl')
    .map((instr, index) => ({
      index,
      op: instr.op === 'label' ? 'label' : instr.op === 'func_begin' ? 'func' : instr.op,
      arg1: instr.op === 'label' ? (instr.label || '') :
            instr.op === 'func_begin' ? (instr.result || '') :
            (instr.arg1 || '_'),
      arg2: instr.arg2 || '_',
      result: instr.op === 'label' ? '_' :
              instr.op === 'func_begin' ? '_' :
              (instr.result || '_'),
    }));
}

export function toTriples(tac: TACInstruction[]): TripleEntry[] {
  const filtered = tac.filter(i => i.op !== 'func_end' && i.op !== 'decl');
  const tempToTriple = new Map<string, number>();
  
  return filtered.map((instr, index) => {
    // Map temp references to triple indices
    let arg1 = instr.op === 'label' ? (instr.label || '') :
               instr.op === 'func_begin' ? (instr.result || '') :
               (instr.arg1 || '_');
    let arg2 = instr.arg2 || '_';

    if (arg1 && tempToTriple.has(arg1)) arg1 = `(${tempToTriple.get(arg1)})`;
    if (arg2 && tempToTriple.has(arg2)) arg2 = `(${tempToTriple.get(arg2)})`;

    if (instr.result && /^t\d+$/.test(instr.result)) {
      tempToTriple.set(instr.result, index);
    }

    return {
      index,
      op: instr.op === 'label' ? 'label' : instr.op === 'func_begin' ? 'func' : instr.op,
      arg1,
      arg2,
    };
  });
}

export function toSSA(tac: TACInstruction[]): SSAInstruction[] {
  const varVersions = new Map<string, number>();
  const result: SSAInstruction[] = [];

  function getVersion(name: string): string {
    if (!name || /^\d+/.test(name) || name === '_') return name;
    const ver = varVersions.get(name) || 0;
    return `${name}_${ver}`;
  }

  function newVersion(name: string): string {
    if (!name || /^\d+/.test(name) || name === '_') return name;
    const ver = (varVersions.get(name) || 0) + 1;
    varVersions.set(name, ver);
    return `${name}_${ver}`;
  }

  for (const instr of tac) {
    if (instr.op === 'label' || instr.op === 'func_begin' || instr.op === 'func_end' || instr.op === 'decl') {
      if (instr.op === 'func_begin') varVersions.clear();
      result.push({ ...instr });
      continue;
    }

    const ssaArg1 = instr.arg1 ? getVersion(instr.arg1) : undefined;
    const ssaArg2 = instr.arg2 ? getVersion(instr.arg2) : undefined;
    const ssaRes = instr.result ? newVersion(instr.result) : undefined;

    result.push({
      ...instr,
      ssaResult: ssaRes,
      ssaArg1,
      ssaArg2,
    });
  }

  return result;
}
