import { ProgramNode, ASTNode } from '@ctac/shared';

export interface MemoryVariable {
  name: string;
  type: string;
  size: number;
  offset: number;
  scope: string;
}

export interface StackFrame {
  functionName: string;
  variables: MemoryVariable[];
  totalSize: number;
  returnAddress: number;
  savedRegisters: number;
}

export interface MemoryLayout {
  frames: StackFrame[];
  globalVars: MemoryVariable[];
  typeInfo: Map<string, number>;
}

const BASE_TYPE_SIZES: Record<string, number> = {
  'char': 1,
  'short': 2,
  'int': 4,
  'float': 4,
  'double': 8,
  'long': 8,
  'void': 0,
  'bool': 1,
  '_Bool': 1,
  'size_t': 8,
  'unsigned int': 4,
  'unsigned char': 1,
  'unsigned short': 2,
  'unsigned long': 8,
  'signed int': 4,
  'signed char': 1,
};

function getTypeSize(type: string, structSizes: Map<string, number>): number {
  if (type.endsWith('*') || type.endsWith('[]')) return 8; // pointer
  const clean = type.replace(/\b(const|static|volatile|register)\b/g, '').trim();
  if (structSizes.has(clean)) return structSizes.get(clean)!;
  if (clean.startsWith('struct ')) {
    const name = clean.replace('struct ', '');
    return structSizes.get(name) || 4;
  }
  return BASE_TYPE_SIZES[clean] || 4;
}

function align(offset: number, alignment: number): number {
  return Math.ceil(offset / alignment) * alignment;
}

export function analyzeMemoryLayout(ast: ProgramNode): MemoryLayout {
  const frames: StackFrame[] = [];
  const globalVars: MemoryVariable[] = [];
  const structSizes = new Map<string, number>();
  const typeInfo = new Map<string, number>(Object.entries(BASE_TYPE_SIZES));

  // First pass: collect struct sizes
  for (const decl of ast.declarations) {
    if (decl.kind === 'StructDecl') {
      let size = 0;
      for (const m of decl.members) {
        const mSize = getTypeSize(m.type, structSizes);
        size = align(size, Math.min(mSize, 8));
        size += mSize;
      }
      size = align(size, 8); // struct alignment
      structSizes.set(decl.name, size);
      typeInfo.set(`struct ${decl.name}`, size);
    }
  }

  // Process declarations
  for (const decl of ast.declarations) {
    if (decl.kind === 'FunctionDecl') {
      const vars: MemoryVariable[] = [];
      let offset = 0;

      // Parameters
      for (const p of decl.params) {
        const size = getTypeSize(p.type, structSizes);
        offset = align(offset, Math.min(size, 8));
        vars.push({ name: p.name, type: p.type, size, offset, scope: 'param' });
        offset += size;
      }

      // Local variables
      collectLocals(decl.body, vars, offset, decl.name, structSizes);

      const totalLocals = vars.reduce((s, v) => Math.max(s, v.offset + v.size), 0);
      const savedRegisters = 8; // rbp
      const returnAddress = 8;

      frames.push({
        functionName: decl.name,
        variables: vars,
        totalSize: align(totalLocals + savedRegisters + returnAddress, 16),
        returnAddress,
        savedRegisters,
      });
    } else if (decl.kind === 'VarDecl') {
      const size = getTypeSize(decl.varType, structSizes);
      globalVars.push({
        name: decl.name,
        type: decl.varType,
        size,
        offset: globalVars.reduce((s, v) => s + v.size, 0),
        scope: 'global',
      });
    }
  }

  return { frames, globalVars, typeInfo };
}

function collectLocals(
  node: ASTNode,
  vars: MemoryVariable[],
  startOffset: number,
  scope: string,
  structSizes: Map<string, number>
): number {
  let offset = startOffset;

  if (node.kind === 'Block') {
    for (const stmt of node.statements) {
      offset = collectLocals(stmt, vars, offset, scope, structSizes);
    }
  } else if (node.kind === 'VarDecl') {
    const size = getTypeSize(node.varType, structSizes);
    offset = align(offset, Math.min(size, 8));
    vars.push({ name: node.name, type: node.varType, size, offset, scope: 'local' });
    offset += size;
  } else if (node.kind === 'IfStmt') {
    offset = collectLocals(node.thenBranch, vars, offset, scope, structSizes);
    if (node.elseBranch) offset = collectLocals(node.elseBranch, vars, offset, scope, structSizes);
  } else if (node.kind === 'WhileStmt' || node.kind === 'DoWhileStmt') {
    offset = collectLocals(node.body, vars, offset, scope, structSizes);
  } else if (node.kind === 'ForStmt') {
    if (node.init) offset = collectLocals(node.init, vars, offset, scope, structSizes);
    offset = collectLocals(node.body, vars, offset, scope, structSizes);
  } else if (node.kind === 'SwitchStmt') {
    for (const c of node.cases) {
      for (const stmt of c.body) {
        offset = collectLocals(stmt, vars, offset, scope, structSizes);
      }
    }
  }

  return offset;
}
