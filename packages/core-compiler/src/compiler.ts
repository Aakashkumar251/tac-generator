import { lex } from './lexer';
import { Parser } from './parser';
import { TACGenerator } from './tacGenerator';
import { CompileResult } from '@ctac/shared';

export function compile(source: string): CompileResult {
  const tokens = lex(source);
  const parser = new Parser(tokens);
  
  try {
    const ast = parser.parse();
    const errors = parser.errors;
    
    if (errors.some(e => e.severity === 'error')) {
      return {
        tokens,
        ast,
        tac: [],
        errors,
        warnings: [],
        metrics: {
          tokenCount: tokens.length,
          tacInstructionCount: 0,
          tempCount: 0,
          labelCount: 0,
        },
      };
    }

    const gen = new TACGenerator();
    const tac = gen.generate(ast);

    return {
      tokens,
      ast,
      tac,
      errors,
      warnings: [],
      metrics: {
        tokenCount: tokens.length,
        tacInstructionCount: tac.length,
        tempCount: gen.stats.tempCount,
        labelCount: gen.stats.labelCount,
      },
    };
  } catch (e) {
    return {
      tokens,
      tac: [],
      errors: [{ severity: 'error', message: String(e), line: 1 }],
      warnings: [],
      metrics: {
        tokenCount: tokens.length,
        tacInstructionCount: 0,
        tempCount: 0,
        labelCount: 0,
      },
    };
  }
}
