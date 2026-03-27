import { useState, useMemo } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { ASTNode, ExprNode } from '@ctac/shared';
import { ChevronRight, ChevronDown, TreePine, Search, Maximize2, Minimize2 } from 'lucide-react';

interface TreeNodeProps {
  node: ASTNode | ExprNode;
  depth: number;
  label?: string;
  searchTerm?: string;
}

const NODE_COLORS: Record<string, { text: string; bg: string; icon: string }> = {
  Program: { text: 'text-primary', bg: 'bg-primary/10', icon: '◆' },
  FunctionDecl: { text: 'text-syntax-function', bg: 'bg-syntax-function/10', icon: 'ƒ' },
  VarDecl: { text: 'text-syntax-type', bg: 'bg-syntax-type/10', icon: '▪' },
  Block: { text: 'text-muted-foreground', bg: 'bg-muted/30', icon: '{ }' },
  IfStmt: { text: 'text-syntax-keyword', bg: 'bg-syntax-keyword/10', icon: '?' },
  WhileStmt: { text: 'text-syntax-keyword', bg: 'bg-syntax-keyword/10', icon: '↻' },
  ForStmt: { text: 'text-syntax-keyword', bg: 'bg-syntax-keyword/10', icon: '↻' },
  DoWhileStmt: { text: 'text-syntax-keyword', bg: 'bg-syntax-keyword/10', icon: '↻' },
  Return: { text: 'text-syntax-keyword', bg: 'bg-syntax-keyword/10', icon: '←' },
  Break: { text: 'text-syntax-keyword', bg: 'bg-syntax-keyword/10', icon: '✕' },
  Continue: { text: 'text-syntax-keyword', bg: 'bg-syntax-keyword/10', icon: '→' },
  ExprStmt: { text: 'text-muted-foreground', bg: 'bg-muted/20', icon: '·' },
  BinaryExpr: { text: 'text-syntax-operator', bg: 'bg-syntax-operator/10', icon: '⊕' },
  UnaryExpr: { text: 'text-syntax-operator', bg: 'bg-syntax-operator/10', icon: '~' },
  PostfixExpr: { text: 'text-syntax-operator', bg: 'bg-syntax-operator/10', icon: '++' },
  AssignExpr: { text: 'text-syntax-operator', bg: 'bg-syntax-operator/10', icon: '=' },
  CallExpr: { text: 'text-syntax-function', bg: 'bg-syntax-function/10', icon: '( )' },
  Literal: { text: 'text-syntax-number', bg: 'bg-syntax-number/10', icon: '#' },
  Identifier: { text: 'text-primary', bg: 'bg-primary/10', icon: 'id' },
  ArrayAccess: { text: 'text-syntax-label', bg: 'bg-syntax-label/10', icon: '[ ]' },
  MemberAccess: { text: 'text-syntax-label', bg: 'bg-syntax-label/10', icon: '.' },
  TernaryExpr: { text: 'text-syntax-label', bg: 'bg-syntax-label/10', icon: '?:' },
  CastExpr: { text: 'text-syntax-type', bg: 'bg-syntax-type/10', icon: '⇒' },
};

function getNodeStyle(kind: string) {
  return NODE_COLORS[kind] || { text: 'text-foreground', bg: 'bg-muted/20', icon: '·' };
}

function getNodeSummary(node: ASTNode | ExprNode): string {
  switch (node.kind) {
    case 'FunctionDecl': return `${node.returnType} ${node.name}(${node.params.map(p => p.type + ' ' + p.name).join(', ')})`;
    case 'VarDecl': return `${node.varType} ${node.name}`;
    case 'BinaryExpr': return `op: ${node.op}`;
    case 'UnaryExpr': return `op: ${node.op}`;
    case 'AssignExpr': return `op: ${node.op}`;
    case 'PostfixExpr': return `op: ${node.op}`;
    case 'CallExpr': return `fn: ${node.callee}`;
    case 'Literal': return `${node.literalType}: ${node.value}`;
    case 'Identifier': return node.name;
    case 'CastExpr': return `to: ${node.targetType}`;
    case 'Block': return `${node.statements.length} stmts`;
    default: return '';
  }
}

function getChildren(node: ASTNode | ExprNode): { label: string; node: ASTNode | ExprNode }[] {
  const children: { label: string; node: ASTNode | ExprNode }[] = [];
  switch (node.kind) {
    case 'Program': node.declarations.forEach((d, i) => children.push({ label: `decl[${i}]`, node: d })); break;
    case 'FunctionDecl': children.push({ label: 'body', node: node.body }); break;
    case 'VarDecl': if (node.init) children.push({ label: 'init', node: node.init }); break;
    case 'Block': node.statements.forEach((s, i) => children.push({ label: `[${i}]`, node: s })); break;
    case 'IfStmt':
      children.push({ label: 'cond', node: node.condition }, { label: 'then', node: node.thenBranch });
      if (node.elseBranch) children.push({ label: 'else', node: node.elseBranch });
      break;
    case 'WhileStmt': children.push({ label: 'cond', node: node.condition }, { label: 'body', node: node.body }); break;
    case 'ForStmt':
      if (node.init) children.push({ label: 'init', node: node.init });
      if (node.condition) children.push({ label: 'cond', node: node.condition });
      if (node.update) children.push({ label: 'update', node: node.update });
      children.push({ label: 'body', node: node.body });
      break;
    case 'DoWhileStmt': children.push({ label: 'body', node: node.body }, { label: 'cond', node: node.condition }); break;
    case 'Return': if (node.value) children.push({ label: 'value', node: node.value }); break;
    case 'ExprStmt': children.push({ label: 'expr', node: node.expr }); break;
    case 'BinaryExpr': children.push({ label: 'left', node: node.left }, { label: 'right', node: node.right }); break;
    case 'UnaryExpr': children.push({ label: 'operand', node: node.operand }); break;
    case 'PostfixExpr': children.push({ label: 'operand', node: node.operand }); break;
    case 'AssignExpr': children.push({ label: 'target', node: node.target }, { label: 'value', node: node.value }); break;
    case 'CallExpr': node.args.forEach((a, i) => children.push({ label: `arg[${i}]`, node: a })); break;
    case 'ArrayAccess': children.push({ label: 'array', node: node.array }, { label: 'index', node: node.index }); break;
    case 'MemberAccess': children.push({ label: 'object', node: node.object }); break;
    case 'TernaryExpr': children.push({ label: 'cond', node: node.condition }, { label: 'then', node: node.consequent }, { label: 'else', node: node.alternate }); break;
    case 'CastExpr': children.push({ label: 'expr', node: node.expr }); break;
  }
  return children;
}

function nodeMatchesSearch(node: ASTNode | ExprNode, term: string): boolean {
  const summary = getNodeSummary(node).toLowerCase();
  const kind = node.kind.toLowerCase();
  return kind.includes(term) || summary.includes(term);
}

function TreeNode({ node, depth, label, searchTerm }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 3);
  const children = getChildren(node);
  const hasChildren = children.length > 0;
  const summary = getNodeSummary(node);
  const style = getNodeStyle(node.kind);
  const matches = searchTerm ? nodeMatchesSearch(node, searchTerm) : false;

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 px-2 py-[3px] hover:bg-muted/40 cursor-pointer transition-all text-xs font-code group ${
          matches ? 'bg-primary/10 ring-1 ring-primary/30 rounded' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <span className="w-3 shrink-0" />
        )}
        {label && <span className="text-muted-foreground/50 text-[10px]">{label}:</span>}
        <span className={`px-1 py-0 rounded text-[10px] ${style.bg} ${style.text} font-medium`}>
          {style.icon}
        </span>
        <span className={`font-semibold ${style.text}`}>{node.kind}</span>
        {summary && <span className="text-muted-foreground/70 ml-0.5 text-[11px]">{summary}</span>}
        {'line' in node && (
          <span className="ml-auto text-muted-foreground/25 shrink-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
            L{(node as { line: number }).line}
          </span>
        )}
      </div>
      {expanded && children.map((child, i) => (
        <TreeNode key={`${child.label}-${i}`} node={child.node} depth={depth + 1} label={child.label} searchTerm={searchTerm} />
      ))}
    </div>
  );
}

function countNodes(node: ASTNode | ExprNode): number {
  const children = getChildren(node);
  return 1 + children.reduce((sum, c) => sum + countNodes(c.node), 0);
}

export function ASTViewer() {
  const { result } = useCompilerStore();
  const [search, setSearch] = useState('');
  const [expandAll, setExpandAll] = useState(false);

  const nodeCount = useMemo(() => {
    if (!result?.ast) return 0;
    return countNodes(result.ast);
  }, [result?.ast]);

  if (!result?.ast) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <TreePine className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No AST available</p>
          <p className="mt-1 text-xs opacity-60">Compile code to view the syntax tree</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-panel">
        <div className="relative flex-1 max-w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-7 pr-2 py-1 text-[11px] rounded bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-[10px] font-code text-muted-foreground">{nodeCount} nodes</span>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-1.5 text-[9px]">
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-syntax-function/40" /> Fn</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-syntax-keyword/40" /> Stmt</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-syntax-operator/40" /> Expr</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-sm bg-syntax-number/40" /> Lit</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-1">
        <TreeNode node={result.ast} depth={0} searchTerm={search.toLowerCase()} />
      </div>
    </div>
  );
}
