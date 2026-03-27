import { ASTNode, ExprNode, TACInstruction, ProgramNode } from '@ctac/shared';

export class TACGenerator {
  private instructions: TACInstruction[] = [];
  private tempCount = 0;
  private labelCount = 0;
  private breakLabel: string | null = null;
  private continueLabel: string | null = null;

  private newTemp(): string { return `t${++this.tempCount}`; }
  private newLabel(): string { return `L${++this.labelCount}`; }

  private emit(instr: TACInstruction) { this.instructions.push(instr); }
  private emitLabel(label: string, sourceLine?: number) {
    this.emit({ op: 'label', label, sourceLine });
  }

  generate(program: ProgramNode): TACInstruction[] {
    this.instructions = [];
    this.tempCount = 0;
    this.labelCount = 0;
    for (const decl of program.declarations) {
      this.genNode(decl);
    }
    return this.instructions;
  }

  private genNode(node: ASTNode): void {
    switch (node.kind) {
      case 'FunctionDecl': {
        this.emit({ op: 'func_begin', result: node.name, sourceLine: node.line, comment: `function ${node.name}(${node.params.map(p => p.type + ' ' + p.name).join(', ')})` });
        for (const p of node.params) {
          this.emit({ op: 'param', result: p.name, sourceLine: node.line });
        }
        this.genNode(node.body);
        this.emit({ op: 'func_end', result: node.name, sourceLine: node.line });
        break;
      }
      case 'Block':
        for (const stmt of node.statements) this.genNode(stmt);
        break;
      case 'VarDecl': {
        if (node.init) {
          const val = this.genExpr(node.init);
          this.emit({ op: '=', arg1: val, result: node.name, sourceLine: node.line });
        } else {
          this.emit({ op: 'decl', result: node.name, sourceLine: node.line, comment: `${node.varType} ${node.name}` });
        }
        break;
      }
      case 'ExprStmt':
        this.genExpr(node.expr);
        break;
      case 'IfStmt': {
        const cond = this.genExpr(node.condition);
        const elseLabel = this.newLabel();
        const endLabel = this.newLabel();
        this.emit({ op: 'iffalse', arg1: cond, result: node.elseBranch ? elseLabel : endLabel, sourceLine: node.line });
        this.genNode(node.thenBranch);
        if (node.elseBranch) {
          this.emit({ op: 'goto', result: endLabel, sourceLine: node.line });
          this.emitLabel(elseLabel, node.line);
          this.genNode(node.elseBranch);
        }
        this.emitLabel(endLabel, node.line);
        break;
      }
      case 'WhileStmt': {
        const startL = this.newLabel();
        const endL = this.newLabel();
        const prevBreak = this.breakLabel;
        const prevContinue = this.continueLabel;
        this.breakLabel = endL;
        this.continueLabel = startL;
        this.emitLabel(startL, node.line);
        const cond = this.genExpr(node.condition);
        this.emit({ op: 'iffalse', arg1: cond, result: endL, sourceLine: node.line });
        this.genNode(node.body);
        this.emit({ op: 'goto', result: startL, sourceLine: node.line });
        this.emitLabel(endL, node.line);
        this.breakLabel = prevBreak;
        this.continueLabel = prevContinue;
        break;
      }
      case 'ForStmt': {
        if (node.init) this.genNode(node.init);
        const startL = this.newLabel();
        const endL = this.newLabel();
        const updateL = this.newLabel();
        const prevBreak = this.breakLabel;
        const prevContinue = this.continueLabel;
        this.breakLabel = endL;
        this.continueLabel = updateL;
        this.emitLabel(startL, node.line);
        if (node.condition) {
          const cond = this.genExpr(node.condition);
          this.emit({ op: 'iffalse', arg1: cond, result: endL, sourceLine: node.line });
        }
        this.genNode(node.body);
        this.emitLabel(updateL, node.line);
        if (node.update) this.genExpr(node.update);
        this.emit({ op: 'goto', result: startL, sourceLine: node.line });
        this.emitLabel(endL, node.line);
        this.breakLabel = prevBreak;
        this.continueLabel = prevContinue;
        break;
      }
      case 'DoWhileStmt': {
        const startL = this.newLabel();
        const endL = this.newLabel();
        const prevBreak = this.breakLabel;
        const prevContinue = this.continueLabel;
        this.breakLabel = endL;
        this.continueLabel = startL;
        this.emitLabel(startL, node.line);
        this.genNode(node.body);
        const cond = this.genExpr(node.condition);
        this.emit({ op: 'iftrue', arg1: cond, result: startL, sourceLine: node.line });
        this.emitLabel(endL, node.line);
        this.breakLabel = prevBreak;
        this.continueLabel = prevContinue;
        break;
      }
      case 'Return':
        if (node.value) {
          const val = this.genExpr(node.value);
          this.emit({ op: 'return', arg1: val, sourceLine: node.line });
        } else {
          this.emit({ op: 'return', sourceLine: node.line });
        }
        break;
      case 'Break':
        if (this.breakLabel) this.emit({ op: 'goto', result: this.breakLabel, sourceLine: node.line });
        break;
      case 'Continue':
        if (this.continueLabel) this.emit({ op: 'goto', result: this.continueLabel, sourceLine: node.line });
        break;
      case 'SwitchStmt': {
        const switchVal = this.genExpr(node.expr);
        const endSwitch = this.newLabel();
        const prevBreak = this.breakLabel;
        this.breakLabel = endSwitch;
        const caseLabels = node.cases.map(() => this.newLabel());
        const defaultIdx = node.cases.findIndex(c => !c.test);
        // Generate comparison jumps
        for (let i = 0; i < node.cases.length; i++) {
          const c = node.cases[i];
          if (c.test) {
            const testVal = this.genExpr(c.test);
            const cmp = this.newTemp();
            this.emit({ op: '==', arg1: switchVal, arg2: testVal, result: cmp, sourceLine: c.line });
            this.emit({ op: 'iftrue', arg1: cmp, result: caseLabels[i], sourceLine: c.line });
          }
        }
        if (defaultIdx >= 0) {
          this.emit({ op: 'goto', result: caseLabels[defaultIdx], sourceLine: node.line });
        } else {
          this.emit({ op: 'goto', result: endSwitch, sourceLine: node.line });
        }
        // Generate case bodies (fall-through)
        for (let i = 0; i < node.cases.length; i++) {
          this.emitLabel(caseLabels[i], node.cases[i].line);
          for (const stmt of node.cases[i].body) this.genNode(stmt);
        }
        this.emitLabel(endSwitch, node.line);
        this.breakLabel = prevBreak;
        break;
      }
      case 'StructDecl': {
        this.emit({ op: 'struct_decl', result: node.name, sourceLine: node.line, comment: `struct ${node.name} { ${node.members.map(m => m.type + ' ' + m.name).join('; ')} }` });
        break;
      }
      case 'UnionDecl': {
        this.emit({ op: 'union_decl', result: node.name, sourceLine: node.line, comment: `union ${node.name} { ${node.members.map(m => m.type + ' ' + m.name).join('; ')} }` });
        break;
      }
      case 'Typedef': {
        this.emit({ op: 'typedef', arg1: node.originalType, result: node.alias, sourceLine: node.line, comment: `typedef ${node.originalType} ${node.alias}` });
        break;
      }
      case 'EnumDecl': {
        for (const m of node.members) {
          this.emit({ op: '=', arg1: String(m.value ?? 0), result: m.name, sourceLine: node.line, comment: `enum ${node.name}::${m.name}` });
        }
        break;
      }
      default:
        // Expression or unsupported node
        if ('kind' in node && (node as ExprNode).kind) {
          this.genExpr(node as ExprNode);
        }
    }
  }

  private genExpr(expr: ExprNode): string {
    switch (expr.kind) {
      case 'Literal':
        return expr.value;
      case 'Identifier':
        return expr.name;
      case 'BinaryExpr': {
        const left = this.genExpr(expr.left);
        const right = this.genExpr(expr.right);
        const temp = this.newTemp();
        this.emit({ op: expr.op, arg1: left, arg2: right, result: temp, sourceLine: expr.line });
        return temp;
      }
      case 'UnaryExpr': {
        const operand = this.genExpr(expr.operand);
        if (expr.op === '++' || expr.op === '--') {
          const binOp = expr.op === '++' ? '+' : '-';
          this.emit({ op: binOp, arg1: operand, arg2: '1', result: operand, sourceLine: expr.line });
          return operand;
        }
        const temp = this.newTemp();
        this.emit({ op: `unary_${expr.op}`, arg1: operand, result: temp, sourceLine: expr.line });
        return temp;
      }
      case 'PostfixExpr': {
        const operand = this.genExpr(expr.operand);
        const temp = this.newTemp();
        this.emit({ op: '=', arg1: operand, result: temp, sourceLine: expr.line });
        const binOp = expr.op === '++' ? '+' : '-';
        this.emit({ op: binOp, arg1: operand, arg2: '1', result: operand, sourceLine: expr.line });
        return temp;
      }
      case 'AssignExpr': {
        const val = this.genExpr(expr.value);
        // Handle array element assignment: arr[i] = val
        if (expr.target.kind === 'ArrayAccess') {
          const arr = this.genExpr(expr.target.array);
          const idx = this.genExpr(expr.target.index);
          if (expr.op === '=') {
            this.emit({ op: '[]=', arg1: val, arg2: idx, result: arr, sourceLine: expr.line, comment: `${arr}[${idx}] = ${val}` });
          } else {
            const binOp = expr.op.replace('=', '');
            const oldVal = this.newTemp();
            this.emit({ op: '[]', arg1: arr, arg2: idx, result: oldVal, sourceLine: expr.line });
            const newVal = this.newTemp();
            this.emit({ op: binOp, arg1: oldVal, arg2: val, result: newVal, sourceLine: expr.line });
            this.emit({ op: '[]=', arg1: newVal, arg2: idx, result: arr, sourceLine: expr.line, comment: `${arr}[${idx}] = ${newVal}` });
          }
          return val;
        }
        const target = this.genExpr(expr.target);
        if (expr.op === '=') {
          this.emit({ op: '=', arg1: val, result: target, sourceLine: expr.line });
        } else {
          const binOp = expr.op.replace('=', '');
          const temp = this.newTemp();
          this.emit({ op: binOp, arg1: target, arg2: val, result: temp, sourceLine: expr.line });
          this.emit({ op: '=', arg1: temp, result: target, sourceLine: expr.line });
        }
        return target;
      }
      case 'CallExpr': {
        const args = expr.args.map(a => this.genExpr(a));
        for (const arg of args) {
          this.emit({ op: 'arg', arg1: arg, sourceLine: expr.line });
        }
        const temp = this.newTemp();
        this.emit({ op: 'call', arg1: expr.callee, arg2: String(args.length), result: temp, sourceLine: expr.line });
        return temp;
      }
      case 'ArrayAccess': {
        const arr = this.genExpr(expr.array);
        const idx = this.genExpr(expr.index);
        const temp = this.newTemp();
        this.emit({ op: '[]', arg1: arr, arg2: idx, result: temp, sourceLine: expr.line });
        return temp;
      }
      case 'MemberAccess': {
        const obj = this.genExpr(expr.object);
        const temp = this.newTemp();
        this.emit({ op: expr.isArrow ? '->' : '.', arg1: obj, arg2: expr.member, result: temp, sourceLine: expr.line });
        return temp;
      }
      case 'TernaryExpr': {
        const cond = this.genExpr(expr.condition);
        const temp = this.newTemp();
        const elseL = this.newLabel();
        const endL = this.newLabel();
        this.emit({ op: 'iffalse', arg1: cond, result: elseL, sourceLine: expr.line });
        const cons = this.genExpr(expr.consequent);
        this.emit({ op: '=', arg1: cons, result: temp, sourceLine: expr.line });
        this.emit({ op: 'goto', result: endL, sourceLine: expr.line });
        this.emitLabel(elseL, expr.line);
        const alt = this.genExpr(expr.alternate);
        this.emit({ op: '=', arg1: alt, result: temp, sourceLine: expr.line });
        this.emitLabel(endL, expr.line);
        return temp;
      }
      case 'CastExpr': {
        const val = this.genExpr(expr.expr);
        const temp = this.newTemp();
        this.emit({ op: 'cast', arg1: val, arg2: expr.targetType, result: temp, sourceLine: expr.line });
        return temp;
      }
      case 'SizeofExpr': {
        const temp = this.newTemp();
        const target = expr.targetType || (expr.expr ? this.genExpr(expr.expr) : '?');
        this.emit({ op: 'sizeof', arg1: target, result: temp, sourceLine: expr.line });
        return temp;
      }
      default:
        return '0';
    }
  }

  get stats() {
    return { tempCount: this.tempCount, labelCount: this.labelCount };
  }
}
