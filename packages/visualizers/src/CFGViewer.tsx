import { useMemo, useState, useRef, useCallback } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { TACInstruction } from '@ctac/shared';
import { GitBranch, ZoomIn, ZoomOut, Maximize2, Move } from 'lucide-react';

interface BasicBlock {
  id: string;
  label: string;
  instructions: TACInstruction[];
  successors: string[];
  isEntry: boolean;
  isExit: boolean;
  isLoopHeader: boolean;
  isConditional: boolean;
}

interface BlockPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function buildCFG(tac: TACInstruction[]): BasicBlock[] {
  if (tac.length === 0) return [];

  const leaders = new Set<number>();
  leaders.add(0);

  const labelToIndex = new Map<string, number>();
  tac.forEach((instr, i) => {
    if (instr.op === 'label' || instr.op === 'func_begin') {
      labelToIndex.set(instr.label || instr.result || '', i);
      leaders.add(i);
    }
  });

  tac.forEach((instr, i) => {
    if (instr.op === 'goto' || instr.op === 'iffalse' || instr.op === 'iftrue') {
      const target = instr.result || '';
      const targetIdx = labelToIndex.get(target);
      if (targetIdx !== undefined) leaders.add(targetIdx);
      if (i + 1 < tac.length) leaders.add(i + 1);
    }
    if (instr.op === 'return' || instr.op === 'func_end') {
      if (i + 1 < tac.length) leaders.add(i + 1);
    }
  });

  const sortedLeaders = [...leaders].sort((a, b) => a - b);
  const blocks: BasicBlock[] = [];
  const indexToBlock = new Map<number, string>();

  for (let li = 0; li < sortedLeaders.length; li++) {
    const start = sortedLeaders[li];
    const end = li + 1 < sortedLeaders.length ? sortedLeaders[li + 1] : tac.length;
    const instrs = tac.slice(start, end);
    if (instrs.length === 0) continue;

    const firstInstr = instrs[0];
    const blockLabel = firstInstr.op === 'label' ? firstInstr.label || `B${li}` :
                       firstInstr.op === 'func_begin' ? firstInstr.result || `B${li}` :
                       `B${li}`;
    const lastInstr = instrs[instrs.length - 1];
    const id = `block_${start}`;
    blocks.push({
      id,
      label: blockLabel,
      instructions: instrs,
      successors: [],
      isEntry: firstInstr.op === 'func_begin',
      isExit: false,
      isLoopHeader: false,
      isConditional: lastInstr.op === 'iffalse' || lastInstr.op === 'iftrue',
    });
    indexToBlock.set(start, id);
  }

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const lastInstr = block.instructions[block.instructions.length - 1];

    if (lastInstr.op === 'goto') {
      const target = lastInstr.result || '';
      const targetIdx = labelToIndex.get(target);
      if (targetIdx !== undefined) {
        const targetBlockId = indexToBlock.get(targetIdx);
        if (targetBlockId) {
          block.successors.push(targetBlockId);
          const targetBI = blocks.findIndex(b => b.id === targetBlockId);
          if (targetBI >= 0 && targetBI <= bi) {
            blocks[targetBI].isLoopHeader = true;
          }
        }
      }
    } else if (lastInstr.op === 'iffalse' || lastInstr.op === 'iftrue') {
      const target = lastInstr.result || '';
      const targetIdx = labelToIndex.get(target);
      if (targetIdx !== undefined) {
        const targetBlockId = indexToBlock.get(targetIdx);
        if (targetBlockId) block.successors.push(targetBlockId);
      }
      if (bi + 1 < blocks.length) block.successors.push(blocks[bi + 1].id);
    } else if (lastInstr.op === 'return' || lastInstr.op === 'func_end') {
      block.isExit = true;
    } else {
      if (bi + 1 < blocks.length) block.successors.push(blocks[bi + 1].id);
    }
  }

  return blocks;
}

function formatInstr(instr: TACInstruction): string {
  if (instr.op === 'label') return `${instr.label}:`;
  if (instr.op === 'func_begin') return `${instr.result}:`;
  if (instr.op === 'func_end') return `end ${instr.result}`;
  if (instr.op === 'decl') return `// ${instr.comment}`;
  if (instr.op === '=') return `${instr.result} = ${instr.arg1}`;
  if (instr.op === 'goto') return `goto ${instr.result}`;
  if (instr.op === 'iffalse') return `iffalse ${instr.arg1} goto ${instr.result}`;
  if (instr.op === 'iftrue') return `iftrue ${instr.arg1} goto ${instr.result}`;
  if (instr.op === 'return') return instr.arg1 ? `return ${instr.arg1}` : 'return';
  if (instr.op === 'param') return `param ${instr.result}`;
  if (instr.op === 'arg') return `arg ${instr.arg1}`;
  if (instr.op === 'call') return `${instr.result} = call ${instr.arg1}, ${instr.arg2}`;
  if (instr.op === '[]') return `${instr.result} = ${instr.arg1}[${instr.arg2}]`;
  if (instr.op === '[]=') return instr.comment || `${instr.result}[${instr.arg2}] = ${instr.arg1}`;
  if (instr.arg2) return `${instr.result} = ${instr.arg1} ${instr.op} ${instr.arg2}`;
  if (instr.op.startsWith('unary_')) return `${instr.result} = ${instr.op.replace('unary_', '')}${instr.arg1}`;
  return `${instr.op} ${instr.arg1 || ''} ${instr.result || ''}`.trim();
}

// Hierarchical layout: topological ordering with depth-based placement
function layoutBlocks(blocks: BasicBlock[]): BlockPosition[] {
  if (blocks.length === 0) return [];

  const BLOCK_W = 260;
  const BLOCK_MIN_H = 70;
  const LINE_H = 18;
  const PAD_X = 80;
  const PAD_Y = 70;
  const HEADER_H = 32;
  const FOOTER_H = 16;

  // Build adjacency for topological sort
  const idToIdx = new Map<string, number>();
  blocks.forEach((b, i) => idToIdx.set(b.id, i));

  // Assign depths via BFS from entries
  const depth = new Array(blocks.length).fill(-1);
  const queue: number[] = [];
  
  blocks.forEach((b, i) => {
    if (b.isEntry || i === 0) {
      depth[i] = 0;
      queue.push(i);
    }
  });

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const succ of blocks[cur].successors) {
      const si = idToIdx.get(succ);
      if (si !== undefined && depth[si] < depth[cur] + 1) {
        // Only update if going deeper (avoids back-edge issues)
        if (depth[si] === -1 || depth[si] < depth[cur] + 1) {
          const succBlock = blocks[si];
          // Don't push loop headers deeper
          if (!succBlock.isLoopHeader || depth[si] === -1) {
            depth[si] = depth[cur] + 1;
            queue.push(si);
          }
        }
      }
    }
  }

  // Fix any unreachable blocks
  depth.forEach((d, i) => { if (d === -1) depth[i] = 0; });

  // Group blocks by depth
  const depthGroups = new Map<number, number[]>();
  depth.forEach((d, i) => {
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(i);
  });

  const positions: BlockPosition[] = new Array(blocks.length);

  const sortedDepths = [...depthGroups.keys()].sort((a, b) => a - b);

  for (const d of sortedDepths) {
    const group = depthGroups.get(d)!;
    const totalWidth = group.length * BLOCK_W + (group.length - 1) * PAD_X;
    const startX = Math.max(PAD_X, (group.length > 1 ? PAD_X : (PAD_X + BLOCK_W)));

    group.forEach((bi, col) => {
      const block = blocks[bi];
      const instrCount = Math.min(block.instructions.length, 8);
      const h = HEADER_H + instrCount * LINE_H + FOOTER_H;
      const blockH = Math.max(BLOCK_MIN_H, h);

      const x = startX + col * (BLOCK_W + PAD_X);
      const y = d * (200 + PAD_Y) + PAD_Y;

      positions[bi] = { id: block.id, x, y, width: BLOCK_W, height: blockH };
    });
  }

  return positions;
}

// Smooth curved arrow with proper routing
function Arrow({ from, to, positions, isBackEdge, isConditionalFalse, isConditionalTrue, isHighlighted }: {
  from: string;
  to: string;
  positions: Map<string, BlockPosition>;
  isBackEdge: boolean;
  isConditionalFalse: boolean;
  isConditionalTrue: boolean;
  isHighlighted: boolean;
}) {
  const fromPos = positions.get(from);
  const toPos = positions.get(to);
  if (!fromPos || !toPos) return null;

  let strokeColor = 'hsl(var(--muted-foreground))';
  let strokeDash = '';
  let strokeWidth = isHighlighted ? 2.5 : 1.5;
  let glowFilter = '';

  if (isBackEdge) {
    strokeColor = 'hsl(var(--syntax-function))';
    strokeDash = '6,4';
    strokeWidth = isHighlighted ? 3 : 2;
  } else if (isConditionalFalse) {
    strokeColor = 'hsl(var(--destructive))';
  } else if (isConditionalTrue) {
    strokeColor = 'hsl(var(--primary))';
  }

  if (isHighlighted) {
    glowFilter = 'url(#edgeGlow)';
  }

  const opacity = isHighlighted ? 1 : 0.55;

  // Calculate connection points with offsets for multiple edges
  const fromCenterX = fromPos.x + fromPos.width / 2;
  const fromBottomY = fromPos.y + fromPos.height;
  const toCenterX = toPos.x + toPos.width / 2;
  const toTopY = toPos.y;

  // Offset conditional edges slightly
  const edgeOffset = isConditionalFalse ? -20 : isConditionalTrue ? 20 : 0;
  const fromX = fromCenterX + edgeOffset;
  const toX = toCenterX;

  let path: string;
  if (isBackEdge) {
    // Back edge: route to the left side
    const leftX = Math.min(fromPos.x, toPos.x) - 50;
    const fromSideY = fromPos.y + fromPos.height / 2;
    const toSideY = toPos.y + toPos.height / 2;
    path = `M ${fromPos.x} ${fromSideY} C ${leftX} ${fromSideY}, ${leftX} ${toSideY}, ${toPos.x} ${toSideY}`;
  } else if (Math.abs(fromX - toX) < 10 && fromBottomY < toTopY) {
    // Straight down with slight curve for elegance
    const midY = (fromBottomY + toTopY) / 2;
    path = `M ${fromX} ${fromBottomY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toTopY}`;
  } else {
    // Smooth S-curve
    const dy = toTopY - fromBottomY;
    const cp1Y = fromBottomY + dy * 0.4;
    const cp2Y = toTopY - dy * 0.4;
    path = `M ${fromX} ${fromBottomY} C ${fromX} ${cp1Y}, ${toX} ${cp2Y}, ${toX} ${toTopY}`;
  }

  const markerId = `arrow-${from}-${to}`.replace(/[^a-zA-Z0-9]/g, '_');

  return (
    <g className="transition-opacity duration-200">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX="10"
          refY="6"
          markerWidth={isHighlighted ? 8 : 6}
          markerHeight={isHighlighted ? 8 : 6}
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 6 L 0 11 Q 3 6 0 1" fill={strokeColor} />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
        opacity={opacity}
        filter={glowFilter}
      />
      {/* Edge label */}
      {(isConditionalFalse || isConditionalTrue) && (
        <g>
          <rect
            x={(fromX + toX) / 2 - 8 + (isConditionalFalse ? -14 : 14)}
            y={(fromBottomY + toTopY) / 2 - 9}
            width={16}
            height={16}
            rx={4}
            fill={isConditionalFalse ? 'hsl(var(--destructive) / 0.15)' : 'hsl(var(--primary) / 0.15)'}
            stroke={strokeColor}
            strokeWidth={0.5}
          />
          <text
            x={(fromX + toX) / 2 + (isConditionalFalse ? -14 : 14)}
            y={(fromBottomY + toTopY) / 2 + 3}
            fill={strokeColor}
            fontSize="10"
            fontFamily="var(--font-code)"
            fontWeight="700"
            textAnchor="middle"
          >
            {isConditionalFalse ? 'F' : 'T'}
          </text>
        </g>
      )}
    </g>
  );
}

export function CFGViewer() {
  const { result } = useCompilerStore();
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const blocks = useMemo(() => {
    if (!result?.tac || result.tac.length === 0) return [];
    return buildCFG(result.tac);
  }, [result?.tac]);

  const positions = useMemo(() => layoutBlocks(blocks), [blocks]);
  const posMap = useMemo(() => {
    const m = new Map<string, BlockPosition>();
    positions.forEach(p => m.set(p.id, p));
    return m;
  }, [positions]);

  const stats = useMemo(() => {
    const edges = blocks.reduce((s, b) => s + b.successors.length, 0);
    const loops = blocks.filter(b => b.isLoopHeader).length;
    const cyclomatic = edges - blocks.length + 2;
    return { blocks: blocks.length, edges, loops, cyclomatic };
  }, [blocks]);

  // Compute edges with metadata
  const edges = useMemo(() => {
    const result: { from: string; to: string; isBackEdge: boolean; isConditionalFalse: boolean; isConditionalTrue: boolean }[] = [];
    const blockOrder = new Map<string, number>();
    blocks.forEach((b, i) => blockOrder.set(b.id, i));

    for (const block of blocks) {
      block.successors.forEach((succ, i) => {
        const fromIdx = blockOrder.get(block.id) || 0;
        const toIdx = blockOrder.get(succ) || 0;
        const isBackEdge = toIdx <= fromIdx;
        result.push({
          from: block.id,
          to: succ,
          isBackEdge,
          isConditionalFalse: block.isConditional && i === 0,
          isConditionalTrue: block.isConditional && i === 1,
        });
      });
    }
    return result;
  }, [blocks]);

  // Highlighted edges: connected to hovered or selected block
  const activeBlockId = hoveredBlock || selectedBlock;
  const highlightedEdges = useMemo(() => {
    if (!activeBlockId) return new Set<number>();
    const s = new Set<number>();
    edges.forEach((e, i) => {
      if (e.from === activeBlockId || e.to === activeBlockId) s.add(i);
    });
    return s;
  }, [activeBlockId, edges]);

  // Connected blocks for dimming
  const connectedBlocks = useMemo(() => {
    if (!activeBlockId) return null;
    const s = new Set<string>();
    s.add(activeBlockId);
    edges.forEach(e => {
      if (e.from === activeBlockId) s.add(e.to);
      if (e.to === activeBlockId) s.add(e.from);
    });
    return s;
  }, [activeBlockId, edges]);

  const svgWidth = useMemo(() => {
    if (positions.length === 0) return 800;
    return Math.max(...positions.map(p => p.x + p.width)) + 120;
  }, [positions]);

  const svgHeight = useMemo(() => {
    if (positions.length === 0) return 600;
    return Math.max(...positions.map(p => p.y + p.height)) + 120;
  }, [positions]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.15, 2.5)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.15, 0.3)), []);
  const handleFit = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom(z => Math.max(0.3, Math.min(2.5, z + delta)));
    } else {
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  if (blocks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <GitBranch className="h-8 w-8 text-primary/40" />
          </div>
          <p className="text-sm font-medium">No CFG available</p>
          <p className="mt-1.5 text-xs opacity-60">Compile code to view the control flow graph</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface-panel">
        {/* Legend */}
        <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary/20 border-2 border-primary/70 shadow-[0_0_4px_hsl(var(--primary)/0.3)]" />
            Entry
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-destructive/20 border-2 border-destructive/70" />
            Exit
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-syntax-function/20 border-2 border-syntax-function/70" />
            Loop
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-syntax-number/20 border-2 border-syntax-number/70" />
            Cond
          </span>
          <span className="w-px h-3 bg-border" />
          <span className="text-primary font-semibold">T</span>
          <span className="text-destructive font-semibold">F</span>
          <span className="text-syntax-function opacity-70" style={{ textDecoration: 'underline dashed' }}>back</span>
        </div>

        {/* Stats */}
        <div className="ml-auto flex items-center gap-2.5 font-code text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{stats.blocks} blocks</span>
          <span className="text-muted-foreground">{stats.edges} edges</span>
          <span className="text-syntax-function">{stats.loops} loops</span>
          <span className="px-1.5 py-0.5 rounded bg-syntax-number/10 text-syntax-number font-semibold" title="Cyclomatic Complexity">CC={stats.cyclomatic}</span>
        </div>

        <span className="w-px h-4 bg-border" />

        {/* Zoom controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-code text-muted-foreground w-8 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFit}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Fit to view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`${-pan.x / zoom} ${-pan.y / zoom} ${(containerRef.current?.clientWidth || 800) / zoom} ${(containerRef.current?.clientHeight || 600) / zoom}`}
          style={{ minWidth: '100%', minHeight: '100%' }}
        >
          <defs>
            {/* Glow filter for highlighted edges */}
            <filter id="edgeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Block shadow */}
            <filter id="blockShadow" x="-10%" y="-10%" width="130%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="hsl(0 0% 0%)" floodOpacity="0.3" />
            </filter>
            <filter id="blockShadowHover" x="-10%" y="-10%" width="130%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="hsl(var(--primary))" floodOpacity="0.2" />
            </filter>
            {/* Grid pattern */}
            <pattern id="cfgGrid" patternUnits="userSpaceOnUse" width="40" height="40">
              <circle cx="20" cy="20" r="0.5" fill="hsl(var(--border))" opacity="0.3" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect x={-pan.x / zoom - 200} y={-pan.y / zoom - 200} width={(containerRef.current?.clientWidth || 800) / zoom + 400} height={(containerRef.current?.clientHeight || 600) / zoom + 400} fill="url(#cfgGrid)" />

          {/* Non-highlighted edges first */}
          {edges.map((edge, i) => (
            !highlightedEdges.has(i) && (
              <Arrow
                key={`e-${i}`}
                from={edge.from}
                to={edge.to}
                positions={posMap}
                isBackEdge={edge.isBackEdge}
                isConditionalFalse={edge.isConditionalFalse}
                isConditionalTrue={edge.isConditionalTrue}
                isHighlighted={false}
              />
            )
          ))}
          {/* Highlighted edges on top */}
          {edges.map((edge, i) => (
            highlightedEdges.has(i) && (
              <Arrow
                key={`eh-${i}`}
                from={edge.from}
                to={edge.to}
                positions={posMap}
                isBackEdge={edge.isBackEdge}
                isConditionalFalse={edge.isConditionalFalse}
                isConditionalTrue={edge.isConditionalTrue}
                isHighlighted={true}
              />
            )
          ))}

          {/* Blocks */}
          {blocks.map((block) => {
            const pos = posMap.get(block.id);
            if (!pos) return null;

            const isActive = activeBlockId === block.id;
            const isDimmed = connectedBlocks && !connectedBlocks.has(block.id);
            const isSelected = selectedBlock === block.id;

            const accentColor = block.isEntry ? 'var(--primary)' :
              block.isExit ? 'var(--destructive)' :
              block.isLoopHeader ? 'var(--syntax-function)' :
              block.isConditional ? 'var(--syntax-number)' :
              'var(--border)';

            return (
              <g
                key={block.id}
                onClick={() => setSelectedBlock(isSelected ? null : block.id)}
                onMouseEnter={() => setHoveredBlock(block.id)}
                onMouseLeave={() => setHoveredBlock(null)}
                className="cursor-pointer"
                opacity={isDimmed ? 0.3 : 1}
                style={{ transition: 'opacity 0.2s ease' }}
              >
                {/* Selection glow ring */}
                {isSelected && (
                  <rect
                    x={pos.x - 4}
                    y={pos.y - 4}
                    width={pos.width + 8}
                    height={pos.height + 8}
                    rx={12}
                    fill="none"
                    stroke={`hsl(${accentColor})`}
                    strokeWidth={2}
                    opacity={0.5}
                    strokeDasharray="4,2"
                  />
                )}

                {/* Block body */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  rx={10}
                  fill={`hsl(${accentColor} / ${isActive ? 0.12 : 0.06})`}
                  stroke={`hsl(${accentColor} / ${isActive ? 0.8 : 0.4})`}
                  strokeWidth={isActive ? 2 : 1.5}
                  filter={isActive ? 'url(#blockShadowHover)' : 'url(#blockShadow)'}
                />

                {/* Top accent bar */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={4}
                  rx={2}
                  fill={`hsl(${accentColor})`}
                  opacity={isActive ? 0.9 : 0.5}
                  clipPath={`inset(0 0 0 0 round 10px 10px 0 0)`}
                />
                {/* Clip top bar to rounded corners */}
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={4}
                  fill={`hsl(${accentColor})`}
                  opacity={isActive ? 0.9 : 0.5}
                  style={{ clipPath: `inset(0 round 10px 10px 0 0)` }}
                />

                {/* Label row */}
                <text
                  x={pos.x + 12}
                  y={pos.y + 22}
                  fill={`hsl(${accentColor})`}
                  fontSize="12"
                  fontFamily="var(--font-code)"
                  fontWeight="700"
                >
                  {block.label}
                </text>
                {/* Badge */}
                {(block.isEntry || block.isExit || block.isLoopHeader) && (
                  <g>
                    <rect
                      x={pos.x + pos.width - (block.isEntry ? 52 : block.isExit ? 44 : 48) - 8}
                      y={pos.y + 10}
                      width={block.isEntry ? 52 : block.isExit ? 44 : 48}
                      height={16}
                      rx={4}
                      fill={`hsl(${accentColor} / 0.15)`}
                      stroke={`hsl(${accentColor} / 0.3)`}
                      strokeWidth={0.5}
                    />
                    <text
                      x={pos.x + pos.width - (block.isEntry ? 52 : block.isExit ? 44 : 48) / 2 - 8}
                      y={pos.y + 22}
                      fill={`hsl(${accentColor} / 0.8)`}
                      fontSize="8"
                      fontFamily="var(--font-code)"
                      fontWeight="600"
                      textAnchor="middle"
                      letterSpacing="0.5"
                    >
                      {block.isEntry ? 'ENTRY' : block.isExit ? 'EXIT' : 'LOOP'}
                    </text>
                  </g>
                )}

                {/* Separator */}
                <line
                  x1={pos.x + 8}
                  y1={pos.y + 30}
                  x2={pos.x + pos.width - 8}
                  y2={pos.y + 30}
                  stroke={`hsl(${accentColor} / 0.15)`}
                  strokeWidth={1}
                />

                {/* Instructions */}
                {block.instructions.slice(0, 8).map((instr, i) => {
                  const text = formatInstr(instr);
                  const isLabel = instr.op === 'label' || instr.op === 'func_begin';
                  const isJump = instr.op === 'goto' || instr.op === 'iffalse' || instr.op === 'iftrue';
                  const isReturn = instr.op === 'return';
                  const fillColor = isLabel ? `hsl(var(--syntax-label))` :
                    isJump ? `hsl(var(--syntax-keyword))` :
                    isReturn ? `hsl(var(--destructive))` :
                    'hsl(var(--muted-foreground))';

                  return (
                    <text
                      key={i}
                      x={pos.x + 12}
                      y={pos.y + 44 + i * 18}
                      fill={fillColor}
                      fontSize="10.5"
                      fontFamily="var(--font-code)"
                      opacity={isDimmed ? 0.5 : 0.85}
                    >
                      {text.slice(0, 34)}
                    </text>
                  );
                })}
                {block.instructions.length > 8 && (
                  <text
                    x={pos.x + 12}
                    y={pos.y + 44 + 8 * 18}
                    fill="hsl(var(--muted-foreground))"
                    fontSize="9"
                    fontFamily="var(--font-code)"
                    opacity={0.4}
                  >
                    ⋯ +{block.instructions.length - 8} more
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom info bar */}
      {selectedBlock && (() => {
        const block = blocks.find(b => b.id === selectedBlock);
        if (!block) return null;
        return (
          <div className="px-3 py-2 border-t border-border bg-surface-panel text-[11px] font-code">
            <div className="flex items-center gap-3">
              <span className="text-primary font-semibold">{block.label}</span>
              <span className="text-muted-foreground">{block.instructions.length} instructions</span>
              <span className="text-muted-foreground">→ {block.successors.length} successors</span>
              {block.isLoopHeader && <span className="text-syntax-function">⟳ loop header</span>}
              {block.isConditional && <span className="text-syntax-number">◇ conditional</span>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
