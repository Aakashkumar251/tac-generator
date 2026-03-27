import { useState } from 'react';
import { BookOpen, ChevronRight, ChevronLeft, X, CheckCircle2, Lightbulb } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: string;
  highlight?: string; // tab to highlight
  tip?: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
}

const tutorials: Tutorial[] = [
  {
    id: 'intro',
    title: 'Getting Started',
    description: 'Learn the basics of the C-TAC Generator',
    steps: [
      {
        title: 'Welcome to C-TAC Generator Pro',
        content: 'This tool converts C source code into Three-Address Code (TAC), a low-level intermediate representation used by real compilers. TAC breaks complex expressions into simple operations with at most three operands.',
        tip: 'TAC is used in GCC, LLVM, and most production compilers as an intermediate step before generating machine code.',
      },
      {
        title: 'Writing C Code',
        content: 'Use the editor on the left to write C code. The tool supports functions, variables, loops (while, for, do-while), conditionals (if-else, switch-case), structs, enums, pointers, and arithmetic expressions.',
        tip: 'Try loading a sample from the Samples menu to see different C constructs.',
      },
      {
        title: 'Generating TAC',
        content: 'Click "Generate TAC" or press Ctrl+Enter to compile your code. The output panel on the right will show the generated Three-Address Code with syntax highlighting.',
        highlight: 'tac',
        tip: 'Each TAC instruction has the form: result = arg1 op arg2, where temporaries (t0, t1, ...) hold intermediate values.',
      },
      {
        title: 'Exploring Output Tabs',
        content: 'The output panel has many tabs: TAC shows the raw output, AST shows the parse tree, CFG shows control flow, Symbols shows the symbol table, and more. Each tab reveals a different stage of compilation.',
        tip: 'Understanding these intermediate representations is key to learning how compilers work.',
      },
    ],
  },
  {
    id: 'tac',
    title: 'Understanding TAC',
    description: 'Deep dive into Three-Address Code',
    steps: [
      {
        title: 'What is Three-Address Code?',
        content: 'TAC is an intermediate representation where each instruction has at most three addresses (operands). Complex expressions like "a + b * c" are broken into:\n\nt0 = b * c\nt1 = a + t0\n\nThis makes optimization and code generation simpler.',
        highlight: 'tac',
      },
      {
        title: 'TAC Instruction Types',
        content: 'Common TAC instructions include:\n• Assignment: x = y op z\n• Copy: x = y\n• Conditional jump: iffalse t0 goto L1\n• Unconditional jump: goto L2\n• Function call: t0 = call func, 2\n• Return: return t0\n• Labels: L0:',
        highlight: 'tac',
        tip: 'Labels mark jump targets. The "iffalse" instruction jumps only when the condition is false.',
      },
      {
        title: 'TAC Formats',
        content: 'TAC can be represented in different formats:\n• Default: Human-readable text\n• Quadruples: (op, arg1, arg2, result) tuples\n• Triples: (op, arg1, arg2) using indices\n• SSA: Static Single Assignment with versioned variables\n\nChange the format in Settings (F1).',
        highlight: 'tac',
        tip: 'SSA form is used by modern compilers like LLVM. Each variable is assigned exactly once, making optimizations easier.',
      },
    ],
  },
  {
    id: 'optimization',
    title: 'Compiler Optimizations',
    description: 'Learn about optimization passes',
    steps: [
      {
        title: 'Why Optimize?',
        content: 'Compilers apply optimization passes to the TAC to produce faster, smaller code. Each pass transforms the TAC while preserving program semantics.',
        highlight: 'optimizer',
      },
      {
        title: 'Constant Folding',
        content: 'Evaluates expressions with constant operands at compile time.\n\nBefore: t0 = 3 * 4\nAfter:  t0 = 12\n\nThis eliminates runtime computation for values known at compile time.',
        highlight: 'optimizer',
        tip: 'Constant folding can cascade: if t0 = 12, then t1 = t0 + 1 can be folded to t1 = 13 after copy propagation.',
      },
      {
        title: 'Dead Code Elimination',
        content: 'Removes instructions whose results are never used.\n\nIf t0 is computed but never read by any subsequent instruction, the computation of t0 is dead code and can be safely removed.',
        highlight: 'optimizer',
      },
      {
        title: 'Common Subexpression Elimination (CSE)',
        content: 'Detects when the same expression is computed multiple times and reuses the first result.\n\nBefore:\nt0 = a + b\nt1 = a + b\n\nAfter:\nt0 = a + b\nt1 = t0',
        highlight: 'optimizer',
        tip: 'CSE is invalidated across basic block boundaries (labels, jumps) in conservative implementations.',
      },
    ],
  },
  {
    id: 'cfg',
    title: 'Control Flow Graphs',
    description: 'Understanding program control flow',
    steps: [
      {
        title: 'What is a CFG?',
        content: 'A Control Flow Graph (CFG) represents all possible execution paths through a program. Each node is a basic block — a straight-line sequence of instructions with no branches except at the end.',
        highlight: 'cfg',
      },
      {
        title: 'Basic Blocks',
        content: 'A basic block starts at:\n• The program entry point\n• A label target of a jump\n• The instruction after a conditional/unconditional jump\n\nOnce execution enters a basic block, all instructions execute sequentially.',
        highlight: 'cfg',
        tip: 'The number of edges minus nodes plus 2 gives the cyclomatic complexity — a measure of code complexity.',
      },
      {
        title: 'Loop Detection',
        content: 'Back-edges in the CFG (edges pointing to earlier blocks) indicate loops. The target of a back-edge is a loop header. Loop detection is crucial for optimizations like loop-invariant code motion.',
        highlight: 'cfg',
      },
    ],
  },
  {
    id: 'regalloc',
    title: 'Register Allocation',
    description: 'Mapping variables to CPU registers',
    steps: [
      {
        title: 'The Register Allocation Problem',
        content: 'CPUs have a limited number of registers (e.g., 16 on x86-64). Programs may use many more variables and temporaries. Register allocation decides which variables live in registers and which must be "spilled" to memory.',
        highlight: 'regalloc',
      },
      {
        title: 'Live Ranges & Interference',
        content: 'A variable\'s live range is the interval from its definition to its last use. Two variables interfere if their live ranges overlap — they cannot share the same register.',
        highlight: 'regalloc',
        tip: 'The interference graph has variables as nodes and edges between interfering variables.',
      },
      {
        title: 'Graph Coloring',
        content: 'Register allocation is equivalent to graph coloring: assign K colors (registers) to nodes such that no two adjacent nodes share a color. If a node can\'t be colored, it must be spilled to memory.',
        highlight: 'regalloc',
        tip: 'Graph coloring for register allocation is NP-hard in general, but heuristic algorithms work well in practice.',
      },
    ],
  },
  {
    id: 'assembly',
    title: 'Assembly Generation',
    description: 'From TAC to machine code',
    steps: [
      {
        title: 'Code Generation',
        content: 'The final compiler stage translates TAC into assembly for a target architecture. Each TAC instruction maps to one or more machine instructions.',
        highlight: 'assembly',
      },
      {
        title: 'Architecture Differences',
        content: 'The tool supports four targets:\n• x86-64: CISC architecture (Intel/AMD)\n• ARM64: RISC architecture (Apple Silicon, mobile)\n• RISC-V: Open RISC ISA\n• Pseudo: Educational simplified assembly\n\nEach has different registers, instruction formats, and calling conventions.',
        highlight: 'assembly',
        tip: 'x86-64 uses variable-length instructions, while ARM64 and RISC-V use fixed 32-bit instructions.',
      },
    ],
  },
];

export function TutorialPanel() {
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  if (!activeTutorial) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-surface-panel px-3 py-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Interactive Tutorials</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {tutorials.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActiveTutorial(t); setStepIndex(0); }}
              className="w-full text-left rounded-lg border border-border bg-card p-3 hover:border-primary/40 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{t.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{t.description}</div>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground group-hover:text-primary">
                  <span className="text-[10px] font-code">{t.steps.length} steps</span>
                  <ChevronRight className="h-3 w-3" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const step = activeTutorial.steps[stepIndex];
  const isLast = stepIndex === activeTutorial.steps.length - 1;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border bg-surface-panel px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">{activeTutorial.title}</span>
          <span className="text-[10px] text-muted-foreground font-code">
            {stepIndex + 1}/{activeTutorial.steps.length}
          </span>
        </div>
        <button
          onClick={() => setActiveTutorial(null)}
          className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-1 px-3 py-1.5 bg-surface-panel border-b border-border">
        {activeTutorial.steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < stepIndex ? 'bg-primary' : i === stepIndex ? 'bg-primary/60' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
        <div className="text-xs text-muted-foreground leading-5 whitespace-pre-line">
          {step.content}
        </div>

        {step.tip && (
          <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-primary/80 leading-4">{step.tip}</p>
          </div>
        )}

        {step.highlight && (
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2 text-[10px] text-muted-foreground font-code">
            💡 Check the <span className="text-primary font-medium">{step.highlight.toUpperCase()}</span> tab to see this in action
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="border-t border-border bg-surface-panel px-3 py-2 flex items-center justify-between">
        <button
          onClick={() => setStepIndex(Math.max(0, stepIndex - 1))}
          disabled={stepIndex === 0}
          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="h-3 w-3" /> Previous
        </button>
        {isLast ? (
          <button
            onClick={() => setActiveTutorial(null)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground hover:brightness-110"
          >
            <CheckCircle2 className="h-3 w-3" /> Complete
          </button>
        ) : (
          <button
            onClick={() => setStepIndex(stepIndex + 1)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-[10px] font-semibold text-primary-foreground hover:brightness-110"
          >
            Next <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
