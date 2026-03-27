import { TACInstruction } from '@ctac/shared';
import { RegisterAllocationResult } from './registerAllocator';

export type Architecture = 'x86-64' | 'arm64' | 'riscv' | 'pseudo';

export interface AssemblyLine {
  text: string;
  kind: 'directive' | 'label' | 'instruction' | 'comment' | 'blank';
  tacIndex?: number;
  sourceLine?: number;
}

export interface AssemblyResult {
  lines: AssemblyLine[];
  architecture: Architecture;
  instructionCount: number;
  registerUsed: string[];
}

function getReg(name: string, regAlloc: RegisterAllocationResult | null): string {
  if (!regAlloc) {
    if (/^t\d+$/.test(name)) return name;
    if (/^\d+/.test(name)) return `$${name}`;
    return name;
  }
  const a = regAlloc.assignments.find(a => a.variable === name);
  if (a?.register) return `%${a.register}`;
  if (/^\d+/.test(name)) return `$${name}`;
  return `[rbp-${name}]`; // spilled
}

function isImmediate(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s);
}

export function generateAssembly(
  tac: TACInstruction[],
  arch: Architecture = 'x86-64',
  regAlloc: RegisterAllocationResult | null = null
): AssemblyResult {
  if (arch === 'pseudo') return generatePseudoAssembly(tac, regAlloc);
  if (arch === 'arm64') return generateARM64(tac, regAlloc);
  if (arch === 'riscv') return generateRISCV(tac, regAlloc);
  return generateX86(tac, regAlloc);
}

function generateX86(tac: TACInstruction[], regAlloc: RegisterAllocationResult | null): AssemblyResult {
  const lines: AssemblyLine[] = [];
  const usedRegs = new Set<string>();
  let instrCount = 0;

  lines.push({ text: '.section .text', kind: 'directive' });
  lines.push({ text: '', kind: 'blank' });

  for (let i = 0; i < tac.length; i++) {
    const instr = tac[i];

    if (instr.op === 'func_begin') {
      lines.push({ text: `.globl ${instr.result}`, kind: 'directive' });
      lines.push({ text: `${instr.result}:`, kind: 'label', tacIndex: i, sourceLine: instr.sourceLine });
      lines.push({ text: '    push %rbp', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    mov %rsp, %rbp', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: `    sub $64, %rsp          ; ${instr.comment || 'allocate locals'}`, kind: 'instruction', tacIndex: i }); instrCount++;
      usedRegs.add('rbp'); usedRegs.add('rsp');
      continue;
    }

    if (instr.op === 'func_end') {
      lines.push({ text: `    ; end ${instr.result}`, kind: 'comment', tacIndex: i });
      lines.push({ text: '    leave', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ret', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '', kind: 'blank' });
      continue;
    }

    if (instr.op === 'label') {
      lines.push({ text: `.${instr.label}:`, kind: 'label', tacIndex: i, sourceLine: instr.sourceLine });
      continue;
    }

    if (instr.op === 'decl') {
      lines.push({ text: `    ; ${instr.comment}`, kind: 'comment', tacIndex: i, sourceLine: instr.sourceLine });
      continue;
    }

    if (instr.op === '=') {
      const dst = getReg(instr.result!, regAlloc);
      const src = isImmediate(instr.arg1!) ? `$${instr.arg1}` : getReg(instr.arg1!, regAlloc);
      lines.push({ text: `    mov ${src}, ${dst}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      continue;
    }

    if (['+', '-', '*', '/', '%', '&', '|', '^', '<<', '>>'].includes(instr.op)) {
      const dst = getReg(instr.result!, regAlloc);
      const a = isImmediate(instr.arg1!) ? `$${instr.arg1}` : getReg(instr.arg1!, regAlloc);
      const b = isImmediate(instr.arg2!) ? `$${instr.arg2}` : getReg(instr.arg2!, regAlloc);
      
      const opMap: Record<string, string> = {
        '+': 'add', '-': 'sub', '*': 'imul', '&': 'and', '|': 'or', '^': 'xor',
        '<<': 'shl', '>>': 'sar',
      };

      if (instr.op === '/' || instr.op === '%') {
        lines.push({ text: `    mov ${a}, %rax`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
        lines.push({ text: '    cqo', kind: 'instruction', tacIndex: i }); instrCount++;
        lines.push({ text: `    idiv ${b}`, kind: 'instruction', tacIndex: i }); instrCount++;
        const resultReg = instr.op === '%' ? '%rdx' : '%rax';
        lines.push({ text: `    mov ${resultReg}, ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
        usedRegs.add('rax'); usedRegs.add('rdx');
      } else if (instr.op === '*') {
        lines.push({ text: `    mov ${a}, ${dst}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
        lines.push({ text: `    imul ${b}, ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
      } else {
        lines.push({ text: `    mov ${a}, ${dst}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
        lines.push({ text: `    ${opMap[instr.op] || 'add'} ${b}, ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
      }
      continue;
    }

    if (['<', '>', '<=', '>=', '==', '!='].includes(instr.op)) {
      const dst = getReg(instr.result!, regAlloc);
      const a = isImmediate(instr.arg1!) ? `$${instr.arg1}` : getReg(instr.arg1!, regAlloc);
      const b = isImmediate(instr.arg2!) ? `$${instr.arg2}` : getReg(instr.arg2!, regAlloc);
      const setcc: Record<string, string> = {
        '<': 'setl', '>': 'setg', '<=': 'setle', '>=': 'setge', '==': 'sete', '!=': 'setne',
      };
      lines.push({ text: `    mov ${a}, %rax`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      lines.push({ text: `    cmp ${b}, %rax`, kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: `    ${setcc[instr.op]} %al`, kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: `    movzx %al, ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
      usedRegs.add('rax');
      continue;
    }

    if (instr.op === 'goto') {
      lines.push({ text: `    jmp .${instr.result}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      continue;
    }

    if (instr.op === 'iffalse') {
      const cond = getReg(instr.arg1!, regAlloc);
      lines.push({ text: `    test ${cond}, ${cond}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      lines.push({ text: `    jz .${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
      continue;
    }

    if (instr.op === 'iftrue') {
      const cond = getReg(instr.arg1!, regAlloc);
      lines.push({ text: `    test ${cond}, ${cond}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      lines.push({ text: `    jnz .${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
      continue;
    }

    if (instr.op === 'return') {
      if (instr.arg1) {
        const val = isImmediate(instr.arg1) ? `$${instr.arg1}` : getReg(instr.arg1, regAlloc);
        lines.push({ text: `    mov ${val}, %rax`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
        usedRegs.add('rax');
      }
      lines.push({ text: '    leave', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ret', kind: 'instruction', tacIndex: i }); instrCount++;
      continue;
    }

    if (instr.op === 'arg') {
      const paramRegs = ['%rdi', '%rsi', '%rdx', '%rcx', '%r8', '%r9'];
      const val = isImmediate(instr.arg1!) ? `$${instr.arg1}` : getReg(instr.arg1!, regAlloc);
      lines.push({ text: `    mov ${val}, %rdi          ; arg`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      continue;
    }

    if (instr.op === 'call') {
      lines.push({ text: `    call ${instr.arg1}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      if (instr.result) {
        const dst = getReg(instr.result, regAlloc);
        lines.push({ text: `    mov %rax, ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
      }
      usedRegs.add('rax');
      continue;
    }

    if (instr.op === 'param') {
      const paramRegs = ['%rdi', '%rsi', '%rdx', '%rcx', '%r8', '%r9'];
      const dst = getReg(instr.result!, regAlloc);
      lines.push({ text: `    ; param ${instr.result} (in register)`, kind: 'comment', tacIndex: i, sourceLine: instr.sourceLine });
      continue;
    }

    if (instr.op.startsWith('unary_')) {
      const op = instr.op.replace('unary_', '');
      const dst = getReg(instr.result!, regAlloc);
      const src = getReg(instr.arg1!, regAlloc);
      if (op === '-') {
        lines.push({ text: `    mov ${src}, ${dst}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
        lines.push({ text: `    neg ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
      } else if (op === '~') {
        lines.push({ text: `    mov ${src}, ${dst}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
        lines.push({ text: `    not ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
      } else if (op === '!') {
        lines.push({ text: `    test ${src}, ${src}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
        lines.push({ text: `    sete %al`, kind: 'instruction', tacIndex: i }); instrCount++;
        lines.push({ text: `    movzx %al, ${dst}`, kind: 'instruction', tacIndex: i }); instrCount++;
      }
      continue;
    }

    // Fallback
    lines.push({ text: `    ; ${instr.op} ${instr.arg1 || ''} ${instr.arg2 || ''} -> ${instr.result || ''}`, kind: 'comment', tacIndex: i, sourceLine: instr.sourceLine });
  }

  return {
    lines,
    architecture: 'x86-64',
    instructionCount: instrCount,
    registerUsed: [...usedRegs],
  };
}

function generatePseudoAssembly(tac: TACInstruction[], regAlloc: RegisterAllocationResult | null): AssemblyResult {
  const lines: AssemblyLine[] = [];
  let instrCount = 0;

  lines.push({ text: '; Pseudo-Assembly (Educational)', kind: 'comment' });
  lines.push({ text: '', kind: 'blank' });

  for (let i = 0; i < tac.length; i++) {
    const instr = tac[i];
    if (instr.op === 'func_begin') {
      lines.push({ text: `FUNC ${instr.result}:`, kind: 'label', tacIndex: i });
      lines.push({ text: '    PUSH FP', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    FP = SP', kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'func_end') {
      lines.push({ text: '    SP = FP', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    POP FP', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    RET', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '', kind: 'blank' });
    } else if (instr.op === 'label') {
      lines.push({ text: `  ${instr.label}:`, kind: 'label', tacIndex: i });
    } else if (instr.op === '=') {
      lines.push({ text: `    LOAD ${instr.arg1} -> ${instr.result}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (['+', '-', '*', '/', '%'].includes(instr.op)) {
      const opNames: Record<string, string> = { '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '%': 'MOD' };
      lines.push({ text: `    ${opNames[instr.op]} ${instr.arg1}, ${instr.arg2} -> ${instr.result}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (['<', '>', '<=', '>=', '==', '!='].includes(instr.op)) {
      lines.push({ text: `    CMP ${instr.arg1}, ${instr.arg2} -> ${instr.result}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (instr.op === 'goto') {
      lines.push({ text: `    JMP ${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'iffalse') {
      lines.push({ text: `    JZ ${instr.arg1}, ${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'iftrue') {
      lines.push({ text: `    JNZ ${instr.arg1}, ${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'return') {
      if (instr.arg1) lines.push({ text: `    LOAD ${instr.arg1} -> RET_REG`, kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    RET', kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'call') {
      lines.push({ text: `    CALL ${instr.arg1} -> ${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'arg') {
      lines.push({ text: `    PUSH_ARG ${instr.arg1}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'param') {
      lines.push({ text: `    ; param ${instr.result}`, kind: 'comment', tacIndex: i });
    } else if (instr.op === 'decl') {
      lines.push({ text: `    ; ${instr.comment}`, kind: 'comment', tacIndex: i });
    } else if (instr.arg2) {
      lines.push({ text: `    OP.${instr.op} ${instr.arg1}, ${instr.arg2} -> ${instr.result}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else {
      lines.push({ text: `    ; ${instr.op} ${instr.arg1 || ''} ${instr.result || ''}`, kind: 'comment', tacIndex: i });
    }
  }

  return { lines, architecture: 'pseudo', instructionCount: instrCount, registerUsed: ['R0', 'R1', 'R2', 'R3', 'FP', 'SP', 'RET_REG'] };
}

function generateARM64(tac: TACInstruction[], regAlloc: RegisterAllocationResult | null): AssemblyResult {
  const lines: AssemblyLine[] = [];
  let instrCount = 0;

  lines.push({ text: '.text', kind: 'directive' });
  lines.push({ text: '', kind: 'blank' });

  for (let i = 0; i < tac.length; i++) {
    const instr = tac[i];
    if (instr.op === 'func_begin') {
      lines.push({ text: `.global ${instr.result}`, kind: 'directive' });
      lines.push({ text: `${instr.result}:`, kind: 'label', tacIndex: i });
      lines.push({ text: '    stp x29, x30, [sp, #-16]!', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    mov x29, sp', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    sub sp, sp, #64', kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'func_end') {
      lines.push({ text: '    ldp x29, x30, [sp], #16', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ret', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '', kind: 'blank' });
    } else if (instr.op === 'label') {
      lines.push({ text: `.${instr.label}:`, kind: 'label', tacIndex: i });
    } else if (instr.op === '=') {
      if (isImmediate(instr.arg1!)) {
        lines.push({ text: `    mov w0, #${instr.arg1}          ; ${instr.result} = ${instr.arg1}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      } else {
        lines.push({ text: `    mov w0, w1          ; ${instr.result} = ${instr.arg1}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      }
    } else if (['+', '-', '*'].includes(instr.op)) {
      const opMap: Record<string, string> = { '+': 'add', '-': 'sub', '*': 'mul' };
      lines.push({ text: `    ${opMap[instr.op]} w0, w1, w2     ; ${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (instr.op === '/') {
      lines.push({ text: `    sdiv w0, w1, w2      ; ${instr.result} = ${instr.arg1} / ${instr.arg2}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (['<', '>', '<=', '>=', '==', '!='].includes(instr.op)) {
      lines.push({ text: `    cmp w1, w2`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      const cc: Record<string, string> = { '<': 'lt', '>': 'gt', '<=': 'le', '>=': 'ge', '==': 'eq', '!=': 'ne' };
      lines.push({ text: `    cset w0, ${cc[instr.op]}          ; ${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'goto') {
      lines.push({ text: `    b .${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'iffalse') {
      lines.push({ text: `    cbz w0, .${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'return') {
      if (instr.arg1) {
        if (isImmediate(instr.arg1)) {
          lines.push({ text: `    mov w0, #${instr.arg1}`, kind: 'instruction', tacIndex: i }); instrCount++;
        }
      }
      lines.push({ text: '    ldp x29, x30, [sp], #16', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ret', kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'call') {
      lines.push({ text: `    bl ${instr.arg1}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'arg') {
      lines.push({ text: `    mov w0, w1          ; arg ${instr.arg1}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'decl' || instr.op === 'param') {
      lines.push({ text: `    ; ${instr.comment || instr.op + ' ' + (instr.result || '')}`, kind: 'comment', tacIndex: i });
    } else if (instr.arg2) {
      lines.push({ text: `    ; ${instr.op} ${instr.arg1}, ${instr.arg2} -> ${instr.result}`, kind: 'comment', tacIndex: i });
    }
  }

  return { lines, architecture: 'arm64', instructionCount: instrCount, registerUsed: ['x0', 'x1', 'x29', 'x30', 'sp'] };
}

function generateRISCV(tac: TACInstruction[], regAlloc: RegisterAllocationResult | null): AssemblyResult {
  const lines: AssemblyLine[] = [];
  let instrCount = 0;

  lines.push({ text: '.text', kind: 'directive' });
  lines.push({ text: '', kind: 'blank' });

  for (let i = 0; i < tac.length; i++) {
    const instr = tac[i];
    if (instr.op === 'func_begin') {
      lines.push({ text: `.globl ${instr.result}`, kind: 'directive' });
      lines.push({ text: `${instr.result}:`, kind: 'label', tacIndex: i });
      lines.push({ text: '    addi sp, sp, -64', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    sd ra, 56(sp)', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    sd s0, 48(sp)', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    addi s0, sp, 64', kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'func_end') {
      lines.push({ text: '    ld ra, 56(sp)', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ld s0, 48(sp)', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    addi sp, sp, 64', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ret', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '', kind: 'blank' });
    } else if (instr.op === 'label') {
      lines.push({ text: `.${instr.label}:`, kind: 'label', tacIndex: i });
    } else if (instr.op === '=') {
      if (isImmediate(instr.arg1!)) {
        lines.push({ text: `    li t0, ${instr.arg1}          # ${instr.result} = ${instr.arg1}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      } else {
        lines.push({ text: `    mv t0, t1               # ${instr.result} = ${instr.arg1}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
      }
    } else if (['+', '-'].includes(instr.op)) {
      const op = instr.op === '+' ? 'add' : 'sub';
      lines.push({ text: `    ${op} t0, t1, t2          # ${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (instr.op === '*') {
      lines.push({ text: `    mul t0, t1, t2          # ${instr.result} = ${instr.arg1} * ${instr.arg2}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (instr.op === '/') {
      lines.push({ text: `    div t0, t1, t2          # ${instr.result} = ${instr.arg1} / ${instr.arg2}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (instr.op === '<') {
      lines.push({ text: `    slt t0, t1, t2          # ${instr.result} = ${instr.arg1} < ${instr.arg2}`, kind: 'instruction', tacIndex: i, sourceLine: instr.sourceLine }); instrCount++;
    } else if (['>', '<=', '>=', '==', '!='].includes(instr.op)) {
      lines.push({ text: `    # compare ${instr.arg1} ${instr.op} ${instr.arg2} -> ${instr.result}`, kind: 'comment', tacIndex: i });
      if (instr.op === '==') {
        lines.push({ text: `    sub t0, t1, t2`, kind: 'instruction', tacIndex: i }); instrCount++;
        lines.push({ text: `    seqz t0, t0`, kind: 'instruction', tacIndex: i }); instrCount++;
      } else if (instr.op === '!=') {
        lines.push({ text: `    sub t0, t1, t2`, kind: 'instruction', tacIndex: i }); instrCount++;
        lines.push({ text: `    snez t0, t0`, kind: 'instruction', tacIndex: i }); instrCount++;
      } else if (instr.op === '>') {
        lines.push({ text: `    slt t0, t2, t1`, kind: 'instruction', tacIndex: i }); instrCount++;
      } else if (instr.op === '<=') {
        lines.push({ text: `    slt t0, t2, t1`, kind: 'instruction', tacIndex: i }); instrCount++;
        lines.push({ text: `    xori t0, t0, 1`, kind: 'instruction', tacIndex: i }); instrCount++;
      } else if (instr.op === '>=') {
        lines.push({ text: `    slt t0, t1, t2`, kind: 'instruction', tacIndex: i }); instrCount++;
        lines.push({ text: `    xori t0, t0, 1`, kind: 'instruction', tacIndex: i }); instrCount++;
      }
    } else if (instr.op === 'goto') {
      lines.push({ text: `    j .${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'iffalse') {
      lines.push({ text: `    beqz t0, .${instr.result}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'return') {
      if (instr.arg1) {
        if (isImmediate(instr.arg1)) {
          lines.push({ text: `    li a0, ${instr.arg1}`, kind: 'instruction', tacIndex: i }); instrCount++;
        } else {
          lines.push({ text: `    mv a0, t0`, kind: 'instruction', tacIndex: i }); instrCount++;
        }
      }
      lines.push({ text: '    ld ra, 56(sp)', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ld s0, 48(sp)', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    addi sp, sp, 64', kind: 'instruction', tacIndex: i }); instrCount++;
      lines.push({ text: '    ret', kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'call') {
      lines.push({ text: `    call ${instr.arg1}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'arg') {
      lines.push({ text: `    mv a0, t0               # arg ${instr.arg1}`, kind: 'instruction', tacIndex: i }); instrCount++;
    } else if (instr.op === 'decl' || instr.op === 'param') {
      lines.push({ text: `    # ${instr.comment || instr.op + ' ' + (instr.result || '')}`, kind: 'comment', tacIndex: i });
    } else if (instr.arg2) {
      lines.push({ text: `    # ${instr.op} ${instr.arg1}, ${instr.arg2} -> ${instr.result}`, kind: 'comment', tacIndex: i });
    }
  }

  return { lines, architecture: 'riscv', instructionCount: instrCount, registerUsed: ['t0', 't1', 't2', 'a0', 'ra', 's0', 'sp'] };
}
