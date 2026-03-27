import { Token, TokenType, ASTNode, ProgramNode, FunctionDeclNode, VarDeclNode, BlockNode, IfStmtNode, WhileStmtNode, ForStmtNode, DoWhileStmtNode, SwitchStmtNode, CaseClauseNode, ReturnNode, ExprStmtNode, BreakNode, ContinueNode, ExprNode, BinaryExprNode, UnaryExprNode, AssignExprNode, CallExprNode, IdentifierNode, LiteralNode, PostfixExprNode, StructDeclNode, EnumDeclNode, SizeofExprNode, UnionDeclNode, TypedefNode, Diagnostic } from '@ctac/shared';

export class Parser {
  private tokens: Token[];
  private pos = 0;
  errors: Diagnostic[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token { return this.tokens[this.pos] || { type: TokenType.EOF, value: '', line: 0, column: 0 }; }
  private advance(): Token { return this.tokens[this.pos++]; }
  private check(type: TokenType, value?: string): boolean {
    const t = this.peek();
    return t.type === type && (value === undefined || t.value === value);
  }
  private expect(type: TokenType, value?: string): Token {
    if (this.check(type, value)) return this.advance();
    const t = this.peek();
    this.errors.push({ severity: 'error', message: `Expected '${value || type}' but got '${t.value}'`, line: t.line, column: t.column });
    return t;
  }
  private match(type: TokenType, value?: string): boolean {
    if (this.check(type, value)) { this.advance(); return true; }
    return false;
  }

  parse(): ProgramNode {
    const declarations: ASTNode[] = [];
    while (!this.check(TokenType.EOF)) {
      try {
        declarations.push(this.parseTopLevel());
      } catch {
        // Recovery: skip to next semicolon or brace
        while (!this.check(TokenType.EOF) && !this.check(TokenType.Semicolon) && !this.check(TokenType.RBrace)) {
          this.advance();
        }
        if (this.check(TokenType.Semicolon) || this.check(TokenType.RBrace)) this.advance();
      }
    }
    return { kind: 'Program', declarations, line: 1 };
  }

  private parseTopLevel(): ASTNode {
    // Typedef
    if (this.check(TokenType.Keyword, 'typedef')) {
      return this.parseTypedef();
    }
    // Struct declaration
    if (this.check(TokenType.Keyword, 'struct') && this.isStructDecl()) {
      return this.parseStructDecl();
    }
    // Union declaration
    if (this.check(TokenType.Keyword, 'union') && this.isUnionDecl()) {
      return this.parseUnionDecl();
    }
    // Enum declaration
    if (this.check(TokenType.Keyword, 'enum') && this.isEnumDecl()) {
      return this.parseEnumDecl();
    }
    // Check for type followed by identifier - could be var decl or function decl
    if (this.isTypeToken()) {
      const typeStr = this.parseTypeString();
      const name = this.expect(TokenType.Identifier).value;
      
      if (this.check(TokenType.LParen)) {
        return this.parseFunctionDecl(typeStr, name);
      } else {
        return this.parseVarDeclRest(typeStr, name);
      }
    }
    return this.parseStatement();
  }

  private isStructDecl(): boolean {
    // struct Name { ... }; (not struct as type prefix for variable)
    let lookahead = 1;
    if (this.tokens[this.pos + lookahead]?.type === TokenType.Identifier) lookahead++;
    return this.tokens[this.pos + lookahead]?.type === TokenType.LBrace;
  }

  private isUnionDecl(): boolean {
    let lookahead = 1;
    if (this.tokens[this.pos + lookahead]?.type === TokenType.Identifier) lookahead++;
    return this.tokens[this.pos + lookahead]?.type === TokenType.LBrace;
  }

  private parseUnionDecl(): UnionDeclNode {
    const line = this.peek().line;
    this.advance(); // 'union'
    const name = this.check(TokenType.Identifier) ? this.advance().value : '';
    this.expect(TokenType.LBrace);
    const members: { type: string; name: string }[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const mType = this.parseTypeString();
      const mName = this.expect(TokenType.Identifier).value;
      this.expect(TokenType.Semicolon);
      members.push({ type: mType, name: mName });
    }
    this.expect(TokenType.RBrace);
    this.match(TokenType.Semicolon);
    return { kind: 'UnionDecl', name, members, line };
  }

  private parseTypedef(): TypedefNode {
    const line = this.peek().line;
    this.advance(); // 'typedef'
    // Parse the original type — but we need to be careful not to consume the alias.
    // Strategy: collect type tokens, but the last identifier/type before ';' is the alias.
    const typeTokens: string[] = [];
    while (!this.check(TokenType.Semicolon) && !this.check(TokenType.EOF)) {
      typeTokens.push(this.advance().value);
    }
    const alias = typeTokens.pop() || '';
    const originalType = typeTokens.join(' ') || alias;
    this.expect(TokenType.Semicolon);
    return { kind: 'Typedef', originalType, alias, line };
  }

  private isEnumDecl(): boolean {
    let lookahead = 1;
    if (this.tokens[this.pos + lookahead]?.type === TokenType.Identifier) lookahead++;
    return this.tokens[this.pos + lookahead]?.type === TokenType.LBrace;
  }

  private parseStructDecl(): StructDeclNode {
    const line = this.peek().line;
    this.advance(); // 'struct'
    const name = this.check(TokenType.Identifier) ? this.advance().value : '';
    this.expect(TokenType.LBrace);
    const members: { type: string; name: string }[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const mType = this.parseTypeString();
      const mName = this.expect(TokenType.Identifier).value;
      this.expect(TokenType.Semicolon);
      members.push({ type: mType, name: mName });
    }
    this.expect(TokenType.RBrace);
    this.match(TokenType.Semicolon);
    return { kind: 'StructDecl', name, members, line };
  }

  private parseEnumDecl(): EnumDeclNode {
    const line = this.peek().line;
    this.advance(); // 'enum'
    const name = this.check(TokenType.Identifier) ? this.advance().value : '';
    this.expect(TokenType.LBrace);
    const members: { name: string; value?: number }[] = [];
    let autoVal = 0;
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      const mName = this.expect(TokenType.Identifier).value;
      let value: number | undefined;
      if (this.match(TokenType.Assign)) {
        value = parseInt(this.expect(TokenType.IntLiteral).value);
        autoVal = value + 1;
      } else {
        value = autoVal++;
      }
      members.push({ name: mName, value });
      this.match(TokenType.Comma);
    }
    this.expect(TokenType.RBrace);
    this.match(TokenType.Semicolon);
    return { kind: 'EnumDecl', name, members, line };
  }

  private isTypeToken(): boolean {
    return this.check(TokenType.Type) || 
           this.check(TokenType.Keyword, 'const') ||
           this.check(TokenType.Keyword, 'static') ||
           this.check(TokenType.Keyword, 'unsigned') ||
           this.check(TokenType.Keyword, 'signed') ||
           this.check(TokenType.Keyword, 'struct') ||
           this.check(TokenType.Keyword, 'union');
  }

  private parseTypeString(): string {
    let type = '';
    while (this.isTypeToken()) {
      type += (type ? ' ' : '') + this.advance().value;
    }
    while (this.check(TokenType.Star)) { type += this.advance().value; }
    return type;
  }

  private parseFunctionDecl(returnType: string, name: string): FunctionDeclNode {
    const line = this.peek().line;
    this.expect(TokenType.LParen);
    const params: { type: string; name: string }[] = [];
    if (!this.check(TokenType.RParen)) {
      do {
        if (this.check(TokenType.Type, 'void') && this.tokens[this.pos + 1]?.type === TokenType.RParen) {
          this.advance();
          break;
        }
        let pType = this.parseTypeString();
        const pName = this.check(TokenType.Identifier) ? this.advance().value : '';
        // Handle array parameter syntax: int arr[]
        if (this.check(TokenType.LBracket)) {
          this.advance();
          this.expect(TokenType.RBracket);
          pType += '[]';
        }
        params.push({ type: pType, name: pName });
      } while (this.match(TokenType.Comma));
    }
    this.expect(TokenType.RParen);
    const body = this.parseBlock();
    return { kind: 'FunctionDecl', returnType, name, params, body, line };
  }

  private parseVarDeclRest(varType: string, name: string): VarDeclNode {
    const line = this.peek().line;
    // Handle array declarations: int arr[100];
    if (this.check(TokenType.LBracket)) {
      this.advance(); // '['
      if (!this.check(TokenType.RBracket)) {
        this.parseExpression(); // consume size expression
      }
      this.expect(TokenType.RBracket);
      varType += '[]';
    }
    let init: ExprNode | undefined;
    if (this.match(TokenType.Assign)) {
      init = this.parseExpression();
    }
    this.expect(TokenType.Semicolon);
    return { kind: 'VarDecl', varType, name, init, line };
  }

  private parseBlock(): BlockNode {
    const line = this.peek().line;
    this.expect(TokenType.LBrace);
    const statements: ASTNode[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      statements.push(this.parseStatement());
    }
    this.expect(TokenType.RBrace);
    return { kind: 'Block', statements, line };
  }

  private parseStatement(): ASTNode {
    const t = this.peek();

    if (this.check(TokenType.LBrace)) return this.parseBlock();
    if (this.check(TokenType.Keyword, 'if')) return this.parseIf();
    if (this.check(TokenType.Keyword, 'while')) return this.parseWhile();
    if (this.check(TokenType.Keyword, 'for')) return this.parseFor();
    if (this.check(TokenType.Keyword, 'do')) return this.parseDoWhile();
    if (this.check(TokenType.Keyword, 'switch')) return this.parseSwitch();
    if (this.check(TokenType.Keyword, 'return')) return this.parseReturn();
    if (this.check(TokenType.Keyword, 'break')) { this.advance(); this.expect(TokenType.Semicolon); return { kind: 'Break', line: t.line } as BreakNode; }
    if (this.check(TokenType.Keyword, 'continue')) { this.advance(); this.expect(TokenType.Semicolon); return { kind: 'Continue', line: t.line } as ContinueNode; }

    if (this.isTypeToken()) {
      const typeStr = this.parseTypeString();
      const name = this.expect(TokenType.Identifier).value;
      return this.parseVarDeclRest(typeStr, name);
    }

    // Expression statement
    const expr = this.parseExpression();
    this.expect(TokenType.Semicolon);
    return { kind: 'ExprStmt', expr, line: t.line } as ExprStmtNode;
  }

  private parseSwitch(): SwitchStmtNode {
    const line = this.peek().line;
    this.advance(); // 'switch'
    this.expect(TokenType.LParen);
    const expr = this.parseExpression();
    this.expect(TokenType.RParen);
    this.expect(TokenType.LBrace);
    const cases: CaseClauseNode[] = [];
    while (!this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
      if (this.check(TokenType.Keyword, 'case')) {
        const caseLine = this.peek().line;
        this.advance();
        const test = this.parseExpression();
        this.expect(TokenType.Colon);
        const body: ASTNode[] = [];
        while (!this.check(TokenType.Keyword, 'case') && !this.check(TokenType.Keyword, 'default') && !this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
          body.push(this.parseStatement());
        }
        cases.push({ kind: 'CaseClause', test, body, line: caseLine });
      } else if (this.check(TokenType.Keyword, 'default')) {
        const caseLine = this.peek().line;
        this.advance();
        this.expect(TokenType.Colon);
        const body: ASTNode[] = [];
        while (!this.check(TokenType.Keyword, 'case') && !this.check(TokenType.Keyword, 'default') && !this.check(TokenType.RBrace) && !this.check(TokenType.EOF)) {
          body.push(this.parseStatement());
        }
        cases.push({ kind: 'CaseClause', body, line: caseLine });
      } else {
        this.advance(); // skip unexpected
      }
    }
    this.expect(TokenType.RBrace);
    return { kind: 'SwitchStmt', expr, cases, line };
  }

  private parseIf(): IfStmtNode {
    const line = this.peek().line;
    this.advance(); // 'if'
    this.expect(TokenType.LParen);
    const condition = this.parseExpression();
    this.expect(TokenType.RParen);
    const thenBranch = this.parseStatement();
    let elseBranch: ASTNode | undefined;
    if (this.match(TokenType.Keyword, 'else')) {
      elseBranch = this.parseStatement();
    }
    return { kind: 'IfStmt', condition, thenBranch, elseBranch, line };
  }

  private parseWhile(): WhileStmtNode {
    const line = this.peek().line;
    this.advance();
    this.expect(TokenType.LParen);
    const condition = this.parseExpression();
    this.expect(TokenType.RParen);
    const body = this.parseStatement();
    return { kind: 'WhileStmt', condition, body, line };
  }

  private parseFor(): ForStmtNode {
    const line = this.peek().line;
    this.advance();
    this.expect(TokenType.LParen);

    let init: ASTNode | undefined;
    if (!this.check(TokenType.Semicolon)) {
      if (this.isTypeToken()) {
        const typeStr = this.parseTypeString();
        const name = this.expect(TokenType.Identifier).value;
        let initExpr: ExprNode | undefined;
        if (this.match(TokenType.Assign)) initExpr = this.parseExpression();
        this.expect(TokenType.Semicolon);
        init = { kind: 'VarDecl', varType: typeStr, name, init: initExpr, line } as VarDeclNode;
      } else {
        const expr = this.parseExpression();
        this.expect(TokenType.Semicolon);
        init = { kind: 'ExprStmt', expr, line } as ExprStmtNode;
      }
    } else {
      this.advance();
    }

    let condition: ExprNode | undefined;
    if (!this.check(TokenType.Semicolon)) condition = this.parseExpression();
    this.expect(TokenType.Semicolon);

    let update: ExprNode | undefined;
    if (!this.check(TokenType.RParen)) update = this.parseExpression();
    this.expect(TokenType.RParen);

    const body = this.parseStatement();
    return { kind: 'ForStmt', init, condition, update, body, line };
  }

  private parseDoWhile(): DoWhileStmtNode {
    const line = this.peek().line;
    this.advance();
    const body = this.parseStatement();
    this.expect(TokenType.Keyword, 'while');
    this.expect(TokenType.LParen);
    const condition = this.parseExpression();
    this.expect(TokenType.RParen);
    this.expect(TokenType.Semicolon);
    return { kind: 'DoWhileStmt', body, condition, line };
  }

  private parseReturn(): ReturnNode {
    const line = this.peek().line;
    this.advance();
    let value: ExprNode | undefined;
    if (!this.check(TokenType.Semicolon)) value = this.parseExpression();
    this.expect(TokenType.Semicolon);
    return { kind: 'Return', value, line };
  }

  // Expression parsing with precedence climbing
  parseExpression(): ExprNode {
    return this.parseAssignment();
  }

  private parseAssignment(): ExprNode {
    let left = this.parseTernary();
    const assignOps = [TokenType.Assign, TokenType.PlusAssign, TokenType.MinusAssign, TokenType.StarAssign, TokenType.SlashAssign];
    if (assignOps.some(op => this.check(op))) {
      const op = this.advance().value;
      const value = this.parseAssignment();
      return { kind: 'AssignExpr', op, target: left, value, line: left.line } as AssignExprNode;
    }
    return left;
  }

  private parseTernary(): ExprNode {
    let expr = this.parseOr();
    if (this.match(TokenType.Question)) {
      const consequent = this.parseExpression();
      this.expect(TokenType.Colon);
      const alternate = this.parseTernary();
      return { kind: 'TernaryExpr', condition: expr, consequent, alternate, line: expr.line };
    }
    return expr;
  }

  private parseOr(): ExprNode { return this.parseBinaryLeft(() => this.parseAnd(), [TokenType.Or]); }
  private parseAnd(): ExprNode { return this.parseBinaryLeft(() => this.parseBitwiseOr(), [TokenType.And]); }
  private parseBitwiseOr(): ExprNode { return this.parseBinaryLeft(() => this.parseBitwiseXor(), [TokenType.Pipe]); }
  private parseBitwiseXor(): ExprNode { return this.parseBinaryLeft(() => this.parseBitwiseAnd(), [TokenType.Caret]); }
  private parseBitwiseAnd(): ExprNode { return this.parseBinaryLeft(() => this.parseEquality(), [TokenType.Ampersand]); }
  private parseEquality(): ExprNode { return this.parseBinaryLeft(() => this.parseComparison(), [TokenType.Equal, TokenType.NotEqual]); }
  private parseComparison(): ExprNode { return this.parseBinaryLeft(() => this.parseShift(), [TokenType.Less, TokenType.Greater, TokenType.LessEqual, TokenType.GreaterEqual]); }
  private parseShift(): ExprNode { return this.parseBinaryLeft(() => this.parseAddition(), [TokenType.LeftShift, TokenType.RightShift]); }
  private parseAddition(): ExprNode { return this.parseBinaryLeft(() => this.parseMultiplication(), [TokenType.Plus, TokenType.Minus]); }
  private parseMultiplication(): ExprNode { return this.parseBinaryLeft(() => this.parseUnary(), [TokenType.Star, TokenType.Slash, TokenType.Percent]); }

  private parseBinaryLeft(parseHigher: () => ExprNode, ops: TokenType[]): ExprNode {
    let left = parseHigher();
    while (ops.some(op => this.check(op))) {
      const op = this.advance().value;
      const right = parseHigher();
      left = { kind: 'BinaryExpr', op, left, right, line: left.line } as BinaryExprNode;
    }
    return left;
  }

  private parseUnary(): ExprNode {
    if (this.check(TokenType.Keyword, 'sizeof')) {
      return this.parseSizeof();
    }
    if (this.check(TokenType.Minus) || this.check(TokenType.Bang) || this.check(TokenType.Tilde) ||
        this.check(TokenType.Star) || this.check(TokenType.Ampersand) ||
        this.check(TokenType.PlusPlus) || this.check(TokenType.MinusMinus)) {
      const op = this.advance().value;
      const operand = this.parseUnary();
      return { kind: 'UnaryExpr', op, operand, line: operand.line } as UnaryExprNode;
    }
    return this.parsePostfix();
  }

  private parseSizeof(): SizeofExprNode {
    const line = this.peek().line;
    this.advance(); // 'sizeof'
    this.expect(TokenType.LParen);
    // Try to parse as type or expression
    if (this.isTypeToken()) {
      const targetType = this.parseTypeString();
      this.expect(TokenType.RParen);
      return { kind: 'SizeofExpr', targetType, line };
    }
    const expr = this.parseExpression();
    this.expect(TokenType.RParen);
    return { kind: 'SizeofExpr', expr, line };
  }

  private parsePostfix(): ExprNode {
    let expr = this.parsePrimary();
    while (true) {
      if (this.check(TokenType.PlusPlus) || this.check(TokenType.MinusMinus)) {
        const op = this.advance().value;
        expr = { kind: 'PostfixExpr', op, operand: expr, line: expr.line } as PostfixExprNode;
      } else if (this.check(TokenType.LBracket)) {
        this.advance();
        const index = this.parseExpression();
        this.expect(TokenType.RBracket);
        expr = { kind: 'ArrayAccess', array: expr, index, line: expr.line };
      } else if (this.check(TokenType.Dot) || this.check(TokenType.Arrow)) {
        const isArrow = this.peek().type === TokenType.Arrow;
        this.advance();
        const member = this.expect(TokenType.Identifier).value;
        expr = { kind: 'MemberAccess', object: expr, member, isArrow, line: expr.line };
      } else if (this.check(TokenType.LParen) && expr.kind === 'Identifier') {
        this.advance();
        const args: ExprNode[] = [];
        if (!this.check(TokenType.RParen)) {
          do { args.push(this.parseExpression()); } while (this.match(TokenType.Comma));
        }
        this.expect(TokenType.RParen);
        expr = { kind: 'CallExpr', callee: (expr as IdentifierNode).name, args, line: expr.line } as CallExprNode;
      } else break;
    }
    return expr;
  }

  private parsePrimary(): ExprNode {
    const t = this.peek();
    if (this.check(TokenType.IntLiteral)) { this.advance(); return { kind: 'Literal', value: t.value, literalType: 'int', line: t.line } as LiteralNode; }
    if (this.check(TokenType.FloatLiteral)) { this.advance(); return { kind: 'Literal', value: t.value, literalType: 'float', line: t.line } as LiteralNode; }
    if (this.check(TokenType.CharLiteral)) { this.advance(); return { kind: 'Literal', value: t.value, literalType: 'char', line: t.line } as LiteralNode; }
    if (this.check(TokenType.StringLiteral)) { this.advance(); return { kind: 'Literal', value: t.value, literalType: 'string', line: t.line } as LiteralNode; }
    if (this.check(TokenType.Identifier)) { this.advance(); return { kind: 'Identifier', name: t.value, line: t.line } as IdentifierNode; }
    if (this.match(TokenType.LParen)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RParen);
      return expr;
    }
    this.errors.push({ severity: 'error', message: `Unexpected token '${t.value}'`, line: t.line, column: t.column });
    this.advance();
    return { kind: 'Literal', value: '0', literalType: 'int', line: t.line } as LiteralNode;
  }
}
