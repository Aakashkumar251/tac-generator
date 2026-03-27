import { ASTNode, ExprNode, ProgramNode } from '@ctac/shared';

export interface SymbolEntry {
  name: string;
  type: string;
  category: 'variable' | 'function' | 'parameter' | 'struct' | 'enum' | 'enum_member';
  scope: string;
  scopeDepth: number;
  lineDeclared: number;
  usageCount: number;
  isUsed: boolean;
}

export interface SymbolTable {
  entries: SymbolEntry[];
  scopes: string[];
}

export function buildSymbolTable(ast: ProgramNode): SymbolTable {
  const entries: SymbolEntry[] = [];
  const scopes = new Set<string>();

  function addEntry(entry: SymbolEntry) {
    const existing = entries.find(e => e.name === entry.name && e.scope === entry.scope);
    if (!existing) {
      entries.push(entry);
      scopes.add(entry.scope);
    }
  }

  function countUses(node: ASTNode | ExprNode, name: string): number {
    let count = 0;
    if (node.kind === 'Identifier' && node.name === name) count++;
    if (node.kind === 'CallExpr' && node.callee === name) count++;
    
    const children = getChildNodes(node);
    for (const child of children) {
      count += countUses(child, name);
    }
    return count;
  }

  function getChildNodes(node: ASTNode | ExprNode): (ASTNode | ExprNode)[] {
    const children: (ASTNode | ExprNode)[] = [];
    switch (node.kind) {
      case 'Program': children.push(...node.declarations); break;
      case 'FunctionDecl': children.push(node.body); break;
      case 'Block': children.push(...node.statements); break;
      case 'VarDecl': if (node.init) children.push(node.init); break;
      case 'IfStmt':
        children.push(node.condition, node.thenBranch);
        if (node.elseBranch) children.push(node.elseBranch);
        break;
      case 'WhileStmt': children.push(node.condition, node.body); break;
      case 'ForStmt':
        if (node.init) children.push(node.init);
        if (node.condition) children.push(node.condition);
        if (node.update) children.push(node.update);
        children.push(node.body);
        break;
      case 'DoWhileStmt': children.push(node.body, node.condition); break;
      case 'Return': if (node.value) children.push(node.value); break;
      case 'ExprStmt': children.push(node.expr); break;
      case 'BinaryExpr': children.push(node.left, node.right); break;
      case 'UnaryExpr': children.push(node.operand); break;
      case 'PostfixExpr': children.push(node.operand); break;
      case 'AssignExpr': children.push(node.target, node.value); break;
      case 'CallExpr': children.push(...node.args); break;
      case 'ArrayAccess': children.push(node.array, node.index); break;
      case 'MemberAccess': children.push(node.object); break;
      case 'TernaryExpr': children.push(node.condition, node.consequent, node.alternate); break;
      case 'CastExpr': children.push(node.expr); break;
    }
    return children;
  }

  function walkNode(node: ASTNode, scope: string, depth: number) {
    switch (node.kind) {
      case 'Program':
        for (const decl of node.declarations) walkNode(decl, 'global', 0);
        break;
      case 'FunctionDecl': {
        addEntry({
          name: node.name,
          type: `${node.returnType}(${node.params.map(p => p.type).join(', ')})`,
          category: 'function',
          scope: 'global',
          scopeDepth: 0,
          lineDeclared: node.line,
          usageCount: countUses(ast, node.name),
          isUsed: countUses(ast, node.name) > 0,
        });
        for (const p of node.params) {
          addEntry({
            name: p.name,
            type: p.type,
            category: 'parameter',
            scope: node.name,
            scopeDepth: 1,
            lineDeclared: node.line,
            usageCount: countUses(node.body, p.name),
            isUsed: countUses(node.body, p.name) > 0,
          });
        }
        walkNode(node.body, node.name, 1);
        break;
      }
      case 'Block':
        for (const stmt of node.statements) walkNode(stmt, scope, depth);
        break;
      case 'VarDecl':
        addEntry({
          name: node.name,
          type: node.varType,
          category: 'variable',
          scope,
          scopeDepth: depth,
          lineDeclared: node.line,
          usageCount: countUses(ast, node.name),
          isUsed: countUses(ast, node.name) > 1, // >1 because declaration itself counts
        });
        break;
      case 'IfStmt':
        walkNode(node.thenBranch, scope, depth + 1);
        if (node.elseBranch) walkNode(node.elseBranch, scope, depth + 1);
        break;
      case 'WhileStmt':
      case 'DoWhileStmt':
        walkNode(node.body, scope, depth + 1);
        break;
      case 'ForStmt':
        if (node.init) walkNode(node.init, scope, depth + 1);
        walkNode(node.body, scope, depth + 1);
        break;
      case 'SwitchStmt':
        for (const c of node.cases) {
          for (const stmt of c.body) walkNode(stmt, scope, depth + 1);
        }
        break;
      case 'StructDecl':
        addEntry({
          name: node.name,
          type: `struct { ${node.members.map(m => m.type + ' ' + m.name).join('; ')} }`,
          category: 'struct',
          scope: 'global',
          scopeDepth: 0,
          lineDeclared: node.line,
          usageCount: 0,
          isUsed: false,
        });
        break;
      case 'EnumDecl':
        addEntry({
          name: node.name,
          type: 'enum',
          category: 'enum',
          scope: 'global',
          scopeDepth: 0,
          lineDeclared: node.line,
          usageCount: 0,
          isUsed: false,
        });
        for (const m of node.members) {
          addEntry({
            name: m.name,
            type: `enum ${node.name} = ${m.value}`,
            category: 'enum_member',
            scope: 'global',
            scopeDepth: 0,
            lineDeclared: node.line,
            usageCount: countUses(ast, m.name),
            isUsed: countUses(ast, m.name) > 0,
          });
        }
        break;
    }
  }

  walkNode(ast, 'global', 0);

  return { entries, scopes: [...scopes] };
}
