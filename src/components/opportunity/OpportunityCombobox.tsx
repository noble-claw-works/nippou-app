import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import type { Opportunity } from '../../types';
import { STAGE_META } from './StageBadge';

// =====================================================
// OpportunityCombobox — 案件選択コンボボックス
// =====================================================

interface Props {
  value?: string;            // selected opportunity id
  onChange: (id: string | undefined) => void;
  opportunities: Opportunity[];
  onQuickAdd?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function OpportunityCombobox({
  value, onChange, opportunities, onQuickAdd, disabled = false,
  placeholder = '案件を選択...',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = opportunities.find(o => o.id === value);
  const filtered = query
    ? opportunities.filter(o =>
        o.title.toLowerCase().includes(query.toLowerCase()) ||
        STAGE_META[o.stage].label.includes(query)
      )
    : opportunities;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opp: Opportunity | null) => {
    onChange(opp?.id ?? undefined);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm ${
          disabled
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white border-gray-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
        }`}
      >
        {selected ? (
          <span className="flex items-center gap-1.5 truncate">
            <span className="text-base leading-none">{STAGE_META[selected.stage].emoji}</span>
            <span className="truncate">{selected.title}</span>
            {selected.totalMonthlyPremium && (
              <span className="text-xs text-gray-400 shrink-0">
                ¥{selected.totalMonthlyPremium.toLocaleString()}/月
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-400 truncate">{disabled ? '先に世帯を選択してください' : placeholder}</span>
        )}
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 flex flex-col">
          {/* Search input */}
          <div className="p-2 border-b">
            <input
              type="text"
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="案件を検索..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {/* "None" option */}
            {selected && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 text-left"
              >
                （案件なし）
              </button>
            )}

            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                {opportunities.length === 0 ? '紐付け可能な案件がありません' : '該当する案件がありません'}
              </div>
            ) : (
              filtered.map(opp => {
                const meta = STAGE_META[opp.stage];
                return (
                  <button
                    key={opp.id}
                    type="button"
                    onClick={() => handleSelect(opp)}
                    className={`w-full px-3 py-2.5 text-left hover:bg-blue-50 flex items-start gap-2 ${
                      opp.id === value ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-lg leading-none mt-0.5">{meta.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-800 truncate">{opp.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                      </div>
                      {opp.totalMonthlyPremium && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          合計月払: ¥{opp.totalMonthlyPremium.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Quick add footer */}
          {onQuickAdd && (
            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => { setOpen(false); onQuickAdd(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                <span>+ 新規案件を作成</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
