// =====================================================
// CustomerCombobox.tsx - 顧客選択コンボボックス
// 検索フィルタ対応・1000件規模スケーラビリティ改善
// =====================================================
import { useState, useRef, useEffect, useId, useCallback } from 'react';
import type { Customer } from '../../types';
import { searchCustomers, getCustomerLabel } from '../../utils/customerSearch';

export interface CustomerComboboxProps {
  value: string | undefined;          // customerId
  onChange: (customerId: string | undefined) => void;
  customers: Customer[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowClear?: boolean;               // 「選択しない」を許容
  autoFocus?: boolean;
  /** 「+ 新規顧客を追加」ボタンのハンドラ。未指定時はボタン非表示 */
  onAddNew?: () => void;
}

const MAX_DISPLAY = 50;

export function CustomerCombobox({
  value,
  onChange,
  customers,
  placeholder = '顧客を検索...',
  required = false,
  disabled = false,
  allowClear = false,
  autoFocus = false,
  onAddNew,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const listboxId = useId();

  // 現在選択中の顧客
  const selectedCustomer = value ? customers.find(c => c.id === value) : undefined;
  const displayValue = selectedCustomer ? getCustomerLabel(selectedCustomer) : '';

  // 検索結果
  const searchResults = searchCustomers(customers, query, { max: MAX_DISPLAY });
  const totalResults = searchResults.length;

  // 実際の totalMatchCount を計算 (フッタ表示用)
  const totalMatchCount = query.trim()
    ? searchCustomers(customers, query, { max: 9999 }).length
    : customers.length;

  // ドロップダウンアイテム (allowClear なら先頭に「選択しない」)
  const dropdownItems = allowClear
    ? [null, ...searchResults]
    : searchResults;
  // items は const で使うため alias
  const items = dropdownItems;

  const openDropdown = useCallback(() => {
    if (!disabled) {
      setOpen(true);
      setActiveIndex(-1);
    }
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }, []);

  const selectCustomer = useCallback((customerId: string | undefined) => {
    onChange(customerId);
    closeDropdown();
    inputRef.current?.blur();
  }, [onChange, closeDropdown]);

  // 外部クリックで閉じる
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleMouseDown);
    }
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open, closeDropdown]);

  // autoFocus
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // activeIndex 変更時にスクロール
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(-1);
    if (!open) setOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        openDropdown();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          const item = items[activeIndex];
          selectCustomer(item === null ? undefined : item.customer.id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;
      case 'Tab':
        closeDropdown();
        break;
    }
  };

  const handleInputFocus = () => {
    openDropdown();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(undefined);
    setQuery('');
    inputRef.current?.focus();
  };

  // 最終接触日フォーマット
  const formatDate = (dateStr: string | undefined): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  };

  // アイテムの activeIndex 対応 ID
  const getItemId = (index: number) => `${listboxId}-item-${index}`;

  const activeDescendant =
    activeIndex >= 0 ? getItemId(activeIndex) : undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input with optional clear button */}
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          aria-required={required}
          value={open ? query : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={displayValue || placeholder}
          disabled={disabled}
          className={[
            'w-full border border-gray-300 rounded-lg px-3 py-2 text-base',
            'focus:ring-2 focus:ring-blue-500 focus:outline-none',
            'pr-10',
            disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white',
          ].join(' ')}
        />
        {/* Clear button */}
        {value && allowClear && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="選択をクリア"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded"
          >
            ✕
          </button>
        )}
        {/* Dropdown arrow (when no value or no clear) */}
        {(!value || !allowClear) && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => open ? closeDropdown() : openDropdown()}
            disabled={disabled}
            aria-hidden="true"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center"
          >
            {open ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {/* List */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label="顧客一覧"
            className="max-h-72 overflow-y-auto"
          >
            {items.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                <div>該当顧客なし</div>
              </li>
            )}

            {items.map((item, idx) => {
              const isActive = idx === activeIndex;

              // 「選択しない」エントリ
              if (item === null) {
                return (
                  <li
                    key="__clear__"
                    id={getItemId(idx)}
                    role="option"
                    aria-selected={!value}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onMouseDown={e => { e.preventDefault(); selectCustomer(undefined); }}
                    className={[
                      'px-4 py-2 cursor-pointer text-sm text-gray-500 italic',
                      isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                    ].join(' ')}
                  >
                    選択しない
                  </li>
                );
              }

              const { customer } = item;
              const isSelected = customer.id === value;
              const label = getCustomerLabel(customer);
              const lastContact = formatDate(customer.lastContactDate);

              return (
                <li
                  key={customer.id}
                  id={getItemId(idx)}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={e => { e.preventDefault(); selectCustomer(customer.id); }}
                  className={[
                    'px-4 py-2 cursor-pointer',
                    isActive ? 'bg-blue-50' : 'hover:bg-gray-50',
                    isSelected ? 'font-medium' : '',
                  ].join(' ')}
                >
                  {/* 1行目: 星 + 名前(エリア) */}
                  <div className="flex items-center gap-1 text-sm text-gray-900">
                    {customer.isFavorite && (
                      <span className="text-yellow-400" title="お気に入り">⭐</span>
                    )}
                    {customer.lastContactDate && (() => {
                      const d = new Date(customer.lastContactDate);
                      const now = new Date();
                      const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
                      return diffDays <= 30 ? (
                        <span className="text-blue-400 text-xs" title="最近接触">🕒</span>
                      ) : null;
                    })()}
                    <span className={isSelected ? 'text-blue-700' : ''}>
                      {label}
                    </span>
                    {isSelected && (
                      <span className="ml-auto text-blue-500 text-xs">✓</span>
                    )}
                  </div>

                  {/* 2行目: タグ + 最終接触 */}
                  {(customer.tags.length > 0 || lastContact) && (
                    <div className="text-xs text-gray-400 mt-0.5 pl-1 flex items-center gap-1">
                      {customer.tags.length > 0 && (
                        <span>{customer.tags.join(' / ')}</span>
                      )}
                      {customer.tags.length > 0 && lastContact && (
                        <span>・</span>
                      )}
                      {lastContact && (
                        <span>最終接触: {lastContact}</span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Footer: 件数超過時 */}
          {totalMatchCount > MAX_DISPLAY && (
            <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100 text-center">
              他 {totalMatchCount - totalResults} 件は検索を絞ってください
            </div>
          )}

          {/* Footer: 新規追加ボタン (onAddNew 指定時は常時表示) */}
          {onAddNew && (
            <div className="border-t border-gray-100 p-2">
              <button
                type="button"
                onClick={() => { onAddNew(); closeDropdown(); }}
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <span className="font-medium">＋</span>
                <span>新規世帯を登録</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
