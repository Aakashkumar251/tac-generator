import { Token, TokenType } from '@ctac/shared';

const KEYWORDS = new Set([
  'if', 'else', 'while', 'for', 'do', 'return', 'break', 'continue',
  'switch', 'case', 'default', 'goto', 'sizeof', 'typedef',
  'struct', 'union', 'enum', 'static', 'extern', 'const', 'volatile',
  'register', 'auto', 'signed', 'unsigned',
]);

const TYPES = new Set([
  'int', 'float', 'double', 'char', 'void', 'short', 'long', 'bool',
  '_Bool', 'size_t',
]);

export function lex(source: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  function peek(offset = 0): string {
    return source[pos + offset] || '\0';
  }

  function advance(): string {
    const ch = source[pos++];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    return ch;
  }

  function addToken(type: TokenType, value: string, startLine: number, startCol: number) {
    tokens.push({ type, value, line: startLine, column: startCol });
  }

  while (pos < source.length) {
    const startLine = line;
    const startCol = col;
    const ch = peek();

    // Whitespace
    if (/\s/.test(ch)) { advance(); continue; }

    // Line comments
    if (ch === '/' && peek(1) === '/') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // Block comments
    if (ch === '/' && peek(1) === '*') {
      advance(); advance();
      while (pos < source.length && !(peek() === '*' && peek(1) === '/')) advance();
      if (pos < source.length) { advance(); advance(); }
      continue;
    }

    // Preprocessor directives (skip)
    if (ch === '#') {
      while (pos < source.length && peek() !== '\n') advance();
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let num = '';
      let isFloat = false;
      while (pos < source.length && /[0-9]/.test(peek())) num += advance();
      if (peek() === '.' && /[0-9]/.test(peek(1))) {
        isFloat = true;
        num += advance();
        while (pos < source.length && /[0-9]/.test(peek())) num += advance();
      }
      addToken(isFloat ? TokenType.FloatLiteral : TokenType.IntLiteral, num, startLine, startCol);
      continue;
    }

    // Identifiers / keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (pos < source.length && /[a-zA-Z0-9_]/.test(peek())) id += advance();
      if (TYPES.has(id)) addToken(TokenType.Type, id, startLine, startCol);
      else if (KEYWORDS.has(id)) addToken(TokenType.Keyword, id, startLine, startCol);
      else addToken(TokenType.Identifier, id, startLine, startCol);
      continue;
    }

    // Char literals
    if (ch === "'") {
      let val = advance(); // opening '
      while (pos < source.length && peek() !== "'") val += advance();
      if (pos < source.length) val += advance(); // closing '
      addToken(TokenType.CharLiteral, val, startLine, startCol);
      continue;
    }

    // String literals
    if (ch === '"') {
      let val = advance();
      while (pos < source.length && peek() !== '"') {
        if (peek() === '\\') val += advance();
        val += advance();
      }
      if (pos < source.length) val += advance();
      addToken(TokenType.StringLiteral, val, startLine, startCol);
      continue;
    }

    // Two-char operators
    const twoChar = ch + peek(1);
    const twoCharOps: Record<string, TokenType> = {
      '==': TokenType.Equal, '!=': TokenType.NotEqual,
      '<=': TokenType.LessEqual, '>=': TokenType.GreaterEqual,
      '&&': TokenType.And, '||': TokenType.Or,
      '++': TokenType.PlusPlus, '--': TokenType.MinusMinus,
      '->': TokenType.Arrow, '<<': TokenType.LeftShift, '>>': TokenType.RightShift,
      '+=': TokenType.PlusAssign, '-=': TokenType.MinusAssign,
      '*=': TokenType.StarAssign, '/=': TokenType.SlashAssign,
    };
    if (twoCharOps[twoChar]) {
      advance(); advance();
      addToken(twoCharOps[twoChar], twoChar, startLine, startCol);
      continue;
    }

    // Single-char operators
    const singleOps: Record<string, TokenType> = {
      '+': TokenType.Plus, '-': TokenType.Minus, '*': TokenType.Star,
      '/': TokenType.Slash, '%': TokenType.Percent, '=': TokenType.Assign,
      '<': TokenType.Less, '>': TokenType.Greater,
      '!': TokenType.Bang, '&': TokenType.Ampersand, '|': TokenType.Pipe,
      '^': TokenType.Caret, '~': TokenType.Tilde,
      '(': TokenType.LParen, ')': TokenType.RParen,
      '{': TokenType.LBrace, '}': TokenType.RBrace,
      '[': TokenType.LBracket, ']': TokenType.RBracket,
      ';': TokenType.Semicolon, ',': TokenType.Comma, ':': TokenType.Colon,
      '?': TokenType.Question, '.': TokenType.Dot,
    };
    if (singleOps[ch]) {
      advance();
      addToken(singleOps[ch], ch, startLine, startCol);
      continue;
    }

    // Unknown
    advance();
    addToken(TokenType.Error, ch, startLine, startCol);
  }

  addToken(TokenType.EOF, '', line, col);
  return tokens;
}
