C-TAC Generator Pro
A web-based educational pplatform that transforms C source code into 3-Address Code (TAC) intermediate representation, with rich visualizations and interactive learning features.
Overview
C-TAC Generator Pro makes compiler internals accessible — from source code to IR, with every step visualized and explained. No installation required; fully browser-based.
Features

Code Editor — Monaco-powered editor with C syntax highlighting, IntelliSense, and real-time error detection
TAC Generation — Output in Quadruples, Triples, or SSA form
Visualizations — AST, Control Flow Graph (CFG), memory layout, pointer chains, and call stacks
Optimization Engine — 9 optimization passes (constant folding, dead code elimination, CSE, and more) with O0/O1/O2/Custom levels
Step-by-step Execution — Walk through compilation and optimization pass-by-pass
Export & Share — Export TAC, visualizations (SVG/PNG), and optimization reports (PDF/Markdown)
Educational Mode — Tutorials, tooltips, and guided learning paths

Tech Stack
LayerTechnologyFrontendReact 18 + TypeScriptEditorMonaco EditorUIshadcn/ui + Tailwind CSSVisualizationsD3.js, Cytoscape.js, React Flow, RechartsBuildVite + pnpmDeploymentVercel (edge functions)AnalyticsPlausible
Getting Started
bash# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
Target Users

CS Students — Visualize abstract compiler concepts for coursework
Educators — Demo compilation steps in lectures; share and embed examples
Researchers — Experiment with optimization strategies and export metrics

Optimization Passes
PassDescriptionConstant FoldingEvaluate constant expressions at compile timeConstant PropagationReplace variables with known constant valuesCopy PropagationEliminate redundant copy assignmentsDead Code EliminationRemove unused assignments and unreachable codeCSEReuse common subexpressionsAlgebraic SimplificationSimplify identities (x * 1 → x, etc.)Strength ReductionReplace costly ops with cheaper equivalentsLoop Invariant Code MotionHoist loop-invariant computationsLoop UnrollingUnroll small fixed-iteration loops
Goals

< 500ms compilation for programs under 500 LOC
99.9% uptime
WCAG 2.1 AA accessibility compliance
Open source — contributions welcome

License
MIT
