import { useMemo, useState } from 'react';
import { useCompilerStore } from '@/stores/compilerStore';
import { buildSymbolTable, SymbolEntry } from '@ctac/visualizers';
import { Database, Search, Filter } from 'lucide-react';

type SortKey = 'name' | 'type' | 'scope' | 'lineDeclared' | 'usageCount';
type FilterCategory = 'all' | 'variable' | 'function' | 'parameter';

export function SymbolTableViewer() {
  const { result } = useCompilerStore();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('lineDeclared');
  const [filterCat, setFilterCat] = useState<FilterCategory>('all');

  const table = useMemo(() => {
    if (!result?.ast) return null;
    return buildSymbolTable(result.ast);
  }, [result?.ast]);

  if (!table) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Database className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm font-medium">No symbol table</p>
          <p className="mt-1 text-xs opacity-60">Compile code to view symbols</p>
        </div>
      </div>
    );
  }

  let entries = [...table.entries];
  if (search) {
    const q = search.toLowerCase();
    entries = entries.filter(e => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q));
  }
  if (filterCat !== 'all') {
    entries = entries.filter(e => e.category === filterCat);
  }
  entries.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'type') return a.type.localeCompare(b.type);
    if (sortBy === 'scope') return a.scope.localeCompare(b.scope);
    if (sortBy === 'usageCount') return b.usageCount - a.usageCount;
    return a.lineDeclared - b.lineDeclared;
  });

  const catColors: Record<string, string> = {
    function: 'text-syntax-function bg-syntax-function/10',
    variable: 'text-primary bg-primary/10',
    parameter: 'text-syntax-label bg-syntax-label/10',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-panel">
        <div className="relative flex-1 max-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search symbols..."
            className="w-full pl-7 pr-2 py-1 text-[11px] rounded bg-muted border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-1">
          {(['all', 'function', 'variable', 'parameter'] as FilterCategory[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-2 py-0.5 text-[10px] rounded font-medium transition-colors ${
                filterCat === cat ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1) + 's'}
            </button>
          ))}
        </div>
        <span className="ml-auto text-[10px] font-code text-muted-foreground">{entries.length} symbols</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 p-3">
        {[
          { label: 'Functions', count: table.entries.filter(e => e.category === 'function').length, color: 'text-syntax-function' },
          { label: 'Variables', count: table.entries.filter(e => e.category === 'variable').length, color: 'text-primary' },
          { label: 'Parameters', count: table.entries.filter(e => e.category === 'parameter').length, color: 'text-syntax-label' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-2 text-center">
            <div className={`text-lg font-bold font-code ${s.color}`}>{s.count}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 pb-3">
        <table className="w-full text-[11px] font-code">
          <thead className="sticky top-0 bg-surface-editor">
            <tr className="text-left text-muted-foreground border-b border-border">
              {[
                { key: 'name', label: 'Name' },
                { key: 'type', label: 'Type' },
                { key: 'scope', label: 'Scope' },
                { key: 'lineDeclared', label: 'Line' },
                { key: 'usageCount', label: 'Uses' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => setSortBy(col.key as SortKey)}
                  className={`pb-1.5 pr-3 cursor-pointer hover:text-foreground transition-colors ${
                    sortBy === col.key ? 'text-primary' : ''
                  }`}
                >
                  {col.label}
                  {sortBy === col.key && ' ↓'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i} className={`hover:bg-muted/30 transition-colors ${!e.isUsed ? 'opacity-50' : ''}`}>
                <td className="py-1 pr-3">
                  <span className="text-foreground font-medium">{e.name}</span>
                  {!e.isUsed && <span className="ml-1 text-[9px] text-syntax-number">unused</span>}
                </td>
                <td className="py-1 pr-3 text-syntax-type">{e.type}</td>
                <td className="py-1 pr-3">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] ${catColors[e.category]}`}>
                    {e.scope}
                  </span>
                </td>
                <td className="py-1 pr-3 text-muted-foreground">{e.lineDeclared}</td>
                <td className="py-1">
                  <span className={e.usageCount > 2 ? 'text-primary' : 'text-muted-foreground'}>
                    {e.usageCount}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
