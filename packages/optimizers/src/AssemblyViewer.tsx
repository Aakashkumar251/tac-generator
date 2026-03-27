import { useMemo, useState } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { generateAssembly, Architecture, AssemblyLine } from '@ctac/optimizers';
import { allocateRegisters } from '@ctac/optimizers';
import { Cpu, Download } from 'lucide-react';

const ARCH_OPTIONS: { id: Architecture; label: string; desc: string }[] = [
  { id: 'x86-64', label: 'x86-64', desc: 'Intel/AMD 64-bit' },
  { id: 'arm64', label: 'ARM64', desc: 'AArch64' },
  { id: 'riscv', label: 'RISC-V', desc: 'RV64I' },
  { id: 'pseudo', label: 'Pseudo', desc: 'Educational' },
];

function AsmLine({ line, index }: { line: AssemblyLine; index: number }) {
  if (line.kind === 'blank') return <div className="h-2" />;

  const colorClass = 
    line.kind === 'directive' ? 'text-syntax-type' :
    line.kind === 'label' ? 'text-syntax-label font-bold' :
    line.kind === 'comment' ? 'text-syntax-comment italic' :
    'text-foreground';

  // Highlight parts of instructions
  const renderText = (text: string) => {
    if (line.kind !== 'instruction') return <span className={colorClass}>{text}</span>;
    
    // Split by comments first
    const commentIdx = text.indexOf(';');
    const hashIdx = text.indexOf('#');
    const sepIdx = commentIdx >= 0 ? commentIdx : hashIdx;
    const code = sepIdx >= 0 ? text.slice(0, sepIdx) : text;
    const comment = sepIdx >= 0 ? text.slice(sepIdx) : '';

    // Highlight registers, immediates, mnemonics
    const parts = code.split(/(%\w+|\$-?\d+|#-?\d+|\b(?:mov|add|sub|imul|idiv|cmp|test|jmp|jz|jnz|je|jne|jl|jg|jle|jge|call|ret|push|pop|leave|cqo|sete|setne|setl|setg|setle|setge|movzx|neg|not|shl|sar|xor|and|or|stp|ldp|cbz|bl|addi|sd|ld|li|slt|seqz|snez|beqz|mul|div|LOAD|STORE|ADD|SUB|MUL|DIV|MOD|CMP|JMP|JZ|JNZ|CALL|RET|PUSH|POP|PUSH_ARG|FUNC|OP\.\w+)\b)/g);

    return (
      <span>
        {parts.map((p, i) => {
          if (/^%\w+$/.test(p)) return <span key={i} className="text-syntax-function">{p}</span>;
          if (/^[\$#]-?\d+$/.test(p)) return <span key={i} className="text-syntax-number">{p}</span>;
          if (/^(mov|add|sub|imul|idiv|cmp|test|jmp|jz|jnz|je|jne|call|ret|push|pop|leave|cqo|sete|setne|setl|setg|setle|setge|movzx|neg|not|shl|sar|xor|and|or|stp|ldp|cbz|bl|addi|sd|ld|li|slt|seqz|snez|beqz|mul|div|LOAD|STORE|ADD|SUB|MUL|DIV|MOD|CMP|JMP|JZ|JNZ|CALL|RET|PUSH|POP|PUSH_ARG|FUNC|OP\.\w+)$/i.test(p)) {
            return <span key={i} className="text-syntax-keyword font-medium">{p}</span>;
          }
          return <span key={i}>{p}</span>;
        })}
        {comment && <span className="text-syntax-comment italic">{comment}</span>}
      </span>
    );
  };

  return (
    <div className="flex items-start gap-3 px-3 py-0.5 font-code text-xs leading-5 hover:bg-muted/30 transition-colors">
      <span className="w-6 text-right text-muted-foreground/40 select-none shrink-0">
        {line.kind === 'instruction' ? index + 1 : ''}
      </span>
      {renderText(line.text)}
      {line.sourceLine && (
        <span className="ml-auto text-muted-foreground/30 select-none shrink-0 text-[10px]">
          src:{line.sourceLine}
        </span>
      )}
    </div>
  );
}

export function AssemblyViewer() {
  const { result } = useCompilerStore();
  const [arch, setArch] = useState<Architecture>('x86-64');
  const [useRegAlloc, setUseRegAlloc] = useState(true);

  const assembly = useMemo(() => {
    if (!result?.tac || result.tac.length === 0) return null;
    const regAlloc = useRegAlloc ? allocateRegisters(result.tac, 8) : null;
    return generateAssembly(result.tac, arch, regAlloc);
  }, [result?.tac, arch, useRegAlloc]);

  const handleDownload = () => {
    if (!assembly) return;
    const ext = arch === 'x86-64' ? '.s' : arch === 'arm64' ? '.s' : arch === 'riscv' ? '.s' : '.asm';
    const content = assembly.lines.map(l => l.text).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `output${ext}`;
    a.click();
  };

  if (!result?.tac || result.tac.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Cpu className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No TAC to generate assembly</p>
          <p className="mt-1 text-xs opacity-60">Compile code first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 bg-surface-panel flex-wrap">
        <span className="text-[10px] text-muted-foreground font-medium">Arch:</span>
        {ARCH_OPTIONS.map(a => (
          <button
            key={a.id}
            onClick={() => setArch(a.id)}
            className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
              arch === a.id ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:text-foreground bg-muted'
            }`}
            title={a.desc}
          >
            {a.label}
          </button>
        ))}
        <div className="h-3 w-px bg-border mx-1" />
        <button
          onClick={() => setUseRegAlloc(!useRegAlloc)}
          className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
            useRegAlloc ? 'bg-syntax-string/20 text-syntax-string' : 'text-muted-foreground bg-muted'
          }`}
        >
          Reg Alloc {useRegAlloc ? 'On' : 'Off'}
        </button>
        <button
          onClick={handleDownload}
          className="ml-auto rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Download assembly"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        {assembly && (
          <span className="text-[10px] text-muted-foreground font-code">
            {assembly.instructionCount} instr
          </span>
        )}
      </div>

      {/* Assembly output */}
      <div className="flex-1 overflow-auto py-2">
        {assembly?.lines.map((line, i) => (
          <AsmLine key={i} line={line} index={i} />
        ))}
      </div>
    </div>
  );
}
