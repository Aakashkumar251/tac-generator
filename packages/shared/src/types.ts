// ===== Token Types =====
export enum TokenType {
  // Literals
  IntLiteral = 'IntLiteral',
  FloatLiteral = 'FloatLiteral',
  CharLiteral = 'CharLiteral',
  StringLiteral = 'StringLiteral',

  // Identifiers & Keywords
  Identifier = 'Identifier',
  Keyword = 'Keyword',
  Type = 'Type',

  // Operators
  Plus = '+', Minus = '-', Star = '*', Slash = '/', Percent = '%',
  Ampersand = '&', Pipe = '|', Caret = '^', Tilde = '~',
  Bang = '!', Assign = '=',
  PlusAssign = '+=', MinusAssign = '-=', StarAssign = '*=', SlashAssign = '/=',
  Equal = '==', NotEqual = '!=',
  Less = '<', Greater = '>', LessEqual = '<=', GreaterEqual = '>=',
  And = '&&', Or = '||',
  PlusPlus = '++', MinusMinus = '--',
  Arrow = '->', Dot = '.',
  LeftShift = '<<', RightShift = '>>',

  // Delimiters
  LParen = '(', RParen = ')',
  LBrace = '{', RBrace = '}',
  LBracket = '[', RBracket = ']',
  Semicolon = ';', Comma = ',', Colon = ':',
  Question = '?',

  // Special
  EOF = 'EOF',
  Error = 'Error',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// ===== AST Types =====
export type ASTNode =
  | ProgramNode
  | FunctionDeclNode
  | VarDeclNode
  | BlockNode
  | IfStmtNode
  | WhileStmtNode
  | ForStmtNode
  | DoWhileStmtNode
  | SwitchStmtNode
  | CaseClauseNode
  | ReturnNode
  | ExprStmtNode
  | BreakNode
  | ContinueNode
  | StructDeclNode
  | EnumDeclNode
  | UnionDeclNode
  | TypedefNode
  | ExprNode;

export interface ProgramNode {
  kind: 'Program';
  declarations: ASTNode[];
  line: number;
}

export interface FunctionDeclNode {
  kind: 'FunctionDecl';
  returnType: string;
  name: string;
  params: { type: string; name: string }[];
  body: BlockNode;
  line: number;
}

export interface VarDeclNode {
  kind: 'VarDecl';
  varType: string;
  name: string;
  init?: ExprNode;
  line: number;
}

export interface BlockNode {
  kind: 'Block';
  statements: ASTNode[];
  line: number;
}

export interface IfStmtNode {
  kind: 'IfStmt';
  condition: ExprNode;
  thenBranch: ASTNode;
  elseBranch?: ASTNode;
  line: number;
}

export interface WhileStmtNode {
  kind: 'WhileStmt';
  condition: ExprNode;
  body: ASTNode;
  line: number;
}

export interface ForStmtNode {
  kind: 'ForStmt';
  init?: ASTNode;
  condition?: ExprNode;
  update?: ExprNode;
  body: ASTNode;
  line: number;
}

export interface DoWhileStmtNode {
  kind: 'DoWhileStmt';
  body: ASTNode;
  condition: ExprNode;
  line: number;
}

export interface ReturnNode {
  kind: 'Return';
  value?: ExprNode;
  line: number;
}

export interface ExprStmtNode {
  kind: 'ExprStmt';
  expr: ExprNode;
  line: number;
}

export interface BreakNode {
  kind: 'Break';
  line: number;
}

export interface ContinueNode {
  kind: 'Continue';
  line: number;
}

export interface SwitchStmtNode {
  kind: 'SwitchStmt';
  expr: ExprNode;
  cases: CaseClauseNode[];
  line: number;
}

export interface CaseClauseNode {
  kind: 'CaseClause';
  test?: ExprNode; // undefined = default
  body: ASTNode[];
  line: number;
}

export interface StructDeclNode {
  kind: 'StructDecl';
  name: string;
  members: { type: string; name: string }[];
  line: number;
}

export interface EnumDeclNode {
  kind: 'EnumDecl';
  name: string;
  members: { name: string; value?: number }[];
  line: number;
}

export interface UnionDeclNode {
  kind: 'UnionDecl';
  name: string;
  members: { type: string; name: string }[];
  line: number;
}

export interface TypedefNode {
  kind: 'Typedef';
  originalType: string;
  alias: string;
  line: number;
}

export interface SizeofExprNode {
  kind: 'SizeofExpr';
  targetType?: string;
  expr?: ExprNode;
  line: number;
}

export type ExprNode =
  | BinaryExprNode
  | UnaryExprNode
  | AssignExprNode
  | CallExprNode
  | IdentifierNode
  | LiteralNode
  | ArrayAccessNode
  | MemberAccessNode
  | CastExprNode
  | TernaryExprNode
  | PostfixExprNode
  | SizeofExprNode;

export interface BinaryExprNode {
  kind: 'BinaryExpr';
  op: string;
  left: ExprNode;
  right: ExprNode;
  line: number;
}

export interface UnaryExprNode {
  kind: 'UnaryExpr';
  op: string;
  operand: ExprNode;
  line: number;
}

export interface AssignExprNode {
  kind: 'AssignExpr';
  op: string;
  target: ExprNode;
  value: ExprNode;
  line: number;
}

export interface CallExprNode {
  kind: 'CallExpr';
  callee: string;
  args: ExprNode[];
  line: number;
}

export interface IdentifierNode {
  kind: 'Identifier';
  name: string;
  line: number;
}

export interface LiteralNode {
  kind: 'Literal';
  value: string;
  literalType: 'int' | 'float' | 'char' | 'string';
  line: number;
}

export interface ArrayAccessNode {
  kind: 'ArrayAccess';
  array: ExprNode;
  index: ExprNode;
  line: number;
}

export interface MemberAccessNode {
  kind: 'MemberAccess';
  object: ExprNode;
  member: string;
  isArrow: boolean;
  line: number;
}

export interface CastExprNode {
  kind: 'CastExpr';
  targetType: string;
  expr: ExprNode;
  line: number;
}

export interface TernaryExprNode {
  kind: 'TernaryExpr';
  condition: ExprNode;
  consequent: ExprNode;
  alternate: ExprNode;
  line: number;
}

export interface PostfixExprNode {
  kind: 'PostfixExpr';
  op: string;
  operand: ExprNode;
  line: number;
}

// ===== TAC Types =====
export interface TACInstruction {
  op: string;
  arg1?: string;
  arg2?: string;
  result?: string;
  label?: string;
  sourceLine?: number;
  comment?: string;
}

export interface Diagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column?: number;
}

export interface CompileResult {
  tokens: Token[];
  ast?: ProgramNode;
  tac: TACInstruction[];
  errors: Diagnostic[];
  warnings: Diagnostic[];
  metrics: {
    tokenCount: number;
    tacInstructionCount: number;
    tempCount: number;
    labelCount: number;
  };
}
