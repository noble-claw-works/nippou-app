import { useState } from 'react';
import { Plus, X, Check, ChevronDown } from 'lucide-react';
import { BLOCK_EMOJIS, MOOD_EMOJIS } from '../../utils';
import type { DailyReport, Customer, MoodType, ManagerSignal } from '../../types';
import { ComplimentsCard } from './ComplimentsCard';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SidePanelCardsProps {
  report: DailyReport;
  customers: Customer[];
  onUpdateReport: (updates: Partial<DailyReport>) => void;
  onAddTodo: (text: string, priority?: 'high' | 'medium' | 'low') => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
}

// ─── TODO Card ────────────────────────────────────────────────────────────────
interface TodoInputState {
  text: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
}

function TodoCard({ report, isReadOnly, onAddTodo, onToggleTodo, onDeleteTodo }: Pick<SidePanelCardsProps, 'report' | 'onAddTodo' | 'onToggleTodo' | 'onDeleteTodo'> & { isReadOnly: boolean }) {
  const [input, setInput] = useState<TodoInputState>({ text: '', priority: 'medium', dueDate: '' });
  const [showInput, setShowInput] = useState(false);

  const handleAdd = () => {
    if (isReadOnly) return;
    const t = input.text.trim();
    if (!t) return;
    onAddTodo(t, input.priority);
    // TODO dueDate は updateTodo で後から設定するため、ここではaddTodoにはpriority渡し
    setInput({ text: '', priority: 'medium', dueDate: '' });
    setShowInput(false);
  };

  const handleToggle = (todoId: string) => {
    if (isReadOnly) return;
    onToggleTodo(todoId);
  };

  const handleDelete = (todoId: string) => {
    if (isReadOnly) return;
    onDeleteTodo(todoId);
  };

  const pending   = report.todos.filter(t => t.status !== 'done');
  const done      = report.todos.filter(t => t.status === 'done');

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            ✅ TODO
            {pending.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5">{pending.length}件</span>
            )}
            {report.todos.length > 0 && pending.length === 0 && (
              <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">✓ 完了</span>
            )}
            {isReadOnly && (
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 inline-flex items-center gap-0.5" title="提出済み・確認済み日報の TODO は読み取り専用です">
                🔒 読み取り専用
              </span>
            )}
          </span>
        {!isReadOnly && (
          <button
            onClick={() => setShowInput(v => !v)}
            className="p-1 rounded hover:bg-gray-100"
            title="TODO を追加"
          >
            <Plus className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* インライン入力 */}
      {showInput && !isReadOnly && (
        <div className="space-y-2 mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <input
            autoFocus
            type="text"
            value={input.text}
            onChange={e => setInput({ ...input, text: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowInput(false); setInput({ text: '', priority: 'medium', dueDate: '' }); } }}
            placeholder="TODO を入力"
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">優先度</label>
              <select
                value={input.priority}
                onChange={e => setInput({ ...input, priority: e.target.value as 'high' | 'medium' | 'low' })}
                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="high">🔥 高</option>
                <option value="medium">⭐ 中</option>
                <option value="low">💧 低</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">期限</label>
              <input
                type="date"
                value={input.dueDate}
                onChange={e => setInput({ ...input, dueDate: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <button onClick={handleAdd} className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">追加</button>
        </div>
      )}

      <div className="space-y-1.5">
        {report.todos.length === 0 && !showInput && (
          <p className="text-xs text-gray-400">TODOがありません。＋ で追加できます</p>
        )}
        {/* todo / doing / done */}
        {pending.map(todo => {
          const priorityEmoji = todo.priority === 'high' ? '🔥' : todo.priority === 'medium' ? '⭐' : '💧';
          const statusIcon = todo.status === 'todo' ? '☐' : todo.status === 'doing' ? '◐' : '☑';
          const today = new Date().toISOString().split('T')[0];
          const isDueSoon = todo.dueDate && todo.dueDate === today;
          const isOverdue = todo.dueDate && todo.dueDate < today;
          const dueColor = isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-gray-500';
          
          return (
            <div key={todo.id} className="flex items-center gap-2 group">
              <button
                onClick={() => handleToggle(todo.id)}
                disabled={isReadOnly}
                aria-disabled={isReadOnly}
                title={isReadOnly ? '提出済み日報の TODO は変更できません' : 'クリックで todo → doing → done を巡回'}
                className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-sm ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-100'}`}
              >
                {statusIcon}
              </button>
              <span className={`flex-1 text-sm ${todo.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{todo.text}</span>
              <span className="text-xs flex-shrink-0">{priorityEmoji}</span>
              {todo.dueDate && (
                <span className={`text-xs px-1.5 py-0.5 bg-gray-100 rounded flex-shrink-0 ${dueColor}`}>
                  〜{todo.dueDate.slice(5)}
                </span>
              )}
              {!isReadOnly && (
                <button onClick={() => handleDelete(todo.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded flex-shrink-0">
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
            </div>
          );
        })}
        {/* 完了済み（折りたたみ） */}
        {done.length > 0 && (
          <details className="mt-1">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
              <ChevronDown className="w-3 h-3" /> 完了済み {done.length}件
            </summary>
            <div className="mt-1 space-y-1">
              {done.map(todo => (
                <div key={todo.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => handleToggle(todo.id)}
                    disabled={isReadOnly}
                    aria-disabled={isReadOnly}
                    title={isReadOnly ? '提出済み日報の TODO は変更できません' : ''}
                    className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center text-sm ${isReadOnly ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    ☑️
                  </button>
                  <span className="flex-1 text-sm line-through text-gray-400">{todo.text}</span>
                  {!isReadOnly && (
                    <button onClick={() => handleDelete(todo.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-100 rounded flex-shrink-0">
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ─── Customer Summary Card ────────────────────────────────────────────────────
function CustomerSummaryCard({ report, customers }: Pick<SidePanelCardsProps, 'report' | 'customers'>) {
  const visitBlocks = report.blocks.filter(b => b.type === 'visit' && b.customerId);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <span className="text-sm font-semibold text-gray-700 block mb-3">👥 顧客対応サマリー</span>
      {visitBlocks.length === 0 ? (
        <p className="text-xs text-gray-400">訪問ブロックに顧客を設定してください</p>
      ) : (
        <div className="space-y-3">
          {visitBlocks.map(block => {
            const customer = customers.find(c => c.id === block.customerId);
            return (
              <div key={block.id} className="border border-gray-100 rounded-lg p-2.5 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <span>{BLOCK_EMOJIS[block.type]}</span>
                  <span className="truncate">{customer?.name ?? '不明'}</span>
                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
                    {block.startTime}–{block.endTime}
                  </span>
                </div>
                {/* Visit result badges */}
                <div className="flex flex-wrap gap-1.5 pl-5">
                  {block.collected && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-green-50 border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
                      ✓ 集金済み
                    </span>
                  )}
                  {block.nextAppointment && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                      📅 次回AP: {block.nextAppointment}
                    </span>
                  )}
                  {block.proposal && (
                    <span className="inline-flex items-center gap-0.5 text-xs bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full truncate max-w-full">
                      💡 {block.proposal}
                    </span>
                  )}
                  {!block.collected && !block.nextAppointment && !block.proposal && (
                    <span className="text-xs text-gray-400">結果未入力</span>
                  )}
                </div>
                {block.result && (
                  <p className="text-xs text-gray-600 pl-5 leading-relaxed">{block.result}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Other customer-related blocks (non-visit) */}
      {report.blocks.filter(b => b.type !== 'visit' && b.customerId).length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
          <p className="text-xs font-medium text-gray-500">その他の顧客対応</p>
          {report.blocks.filter(b => b.type !== 'visit' && b.customerId).map(block => (
            <div key={block.id} className="flex items-center gap-2 text-sm">
              <span>{BLOCK_EMOJIS[block.type]}</span>
              <span className="text-gray-700 truncate">
                {customers.find(c => c.id === block.customerId)?.name ?? '不明'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reflection Card (mood + manager signal) ─────────────────────────────────
function ReflectionCard({ report, onUpdateReport }: Pick<SidePanelCardsProps, 'report' | 'onUpdateReport'>) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {(() => {
        const done = !!(report.eveningMood && report.managerSignal);
        return (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">🌤 振り返り</span>
            {done
              ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">✓ 完了</span>
              : <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">未設定</span>
            }
          </div>
        );
      })()}
      <div className="space-y-3">
        {/* Morning mood */}
        <div>
          <p className="text-xs text-gray-500 mb-1">朝の気分</p>
          <div className="flex gap-2">
            {(['sunny', 'partly_cloudy', 'cloudy', 'rainy'] as MoodType[]).map(m => (
              <button
                key={m}
                onClick={() => onUpdateReport({ morningMood: m })}
                className={`text-lg p-1 rounded-lg ${
                  report.morningMood === m ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'
                }`}
              >
                {MOOD_EMOJIS[m]}
              </button>
            ))}
          </div>
        </div>
        {/* Evening mood */}
        <div>
          <p className="text-xs text-gray-500 mb-1">終わりの気分</p>
          <div className="flex gap-2">
            {(['sunny', 'partly_cloudy', 'cloudy', 'rainy'] as MoodType[]).map(m => (
              <button
                key={m}
                onClick={() => onUpdateReport({ eveningMood: m })}
                className={`text-lg p-1 rounded-lg ${
                  report.eveningMood === m ? 'bg-blue-50 ring-2 ring-blue-400' : 'hover:bg-gray-50'
                }`}
              >
                {MOOD_EMOJIS[m]}
              </button>
            ))}
          </div>
        </div>
        {/* Manager signal */}
        <div>
          <p className="text-xs text-gray-500 mb-1">上長への合図</p>
          <div className="flex gap-2 flex-wrap">
            {([
              ['consult', '💬 相談したい'],
              ['listen', '👂 聞いて'],
              ['ok', '👍 今は大丈夫'],
            ] as [ManagerSignal, string][]).map(([v, label]) => (
              <button
                key={v!}
                onClick={() => onUpdateReport({ managerSignal: v })}
                className={`px-2 py-1 text-xs rounded-lg border ${
                  report.managerSignal === v
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Theme Card ───────────────────────────────────────────────────────────────
function ThemeCard({ report, onUpdateReport }: Pick<SidePanelCardsProps, 'report' | 'onUpdateReport'>) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {(() => {
        const done = !!(report.mainTheme?.trim() || report.dailyTheme?.trim() || report.monthlyTheme?.trim());
        return (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">🎯 テーマ</span>
            {done
              ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">✓ 入力済</span>
              : <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">未入力</span>
            }
          </div>
        );
      })()}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">📌 メインテーマ（中長期）</label>
          <input
            type="text"
            value={report.mainTheme ?? ''}
            onChange={e => onUpdateReport({ mainTheme: e.target.value })}
            placeholder="中長期的なテーマを入力"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">今日のテーマ</label>
          <input
            type="text"
            value={report.dailyTheme ?? ''}
            onChange={e => onUpdateReport({ dailyTheme: e.target.value })}
            placeholder="今日取り組むテーマを入力"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">今月のテーマ</label>
          <input
            type="text"
            value={report.monthlyTheme ?? ''}
            onChange={e => onUpdateReport({ monthlyTheme: e.target.value })}
            placeholder="今月の目標テーマを入力"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Gratitude Card ───────────────────────────────────────────────────────────
function GratitudeCard({ report, onUpdateReport }: Pick<SidePanelCardsProps, 'report' | 'onUpdateReport'>) {
  const gratitude = report.gratitude.length >= 3
    ? report.gratitude
    : [...report.gratitude, ...Array(3 - report.gratitude.length).fill('')];

  const handleChange = (idx: number, value: string) => {
    const updated = [...gratitude];
    updated[idx] = value;
    onUpdateReport({ gratitude: updated });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {(() => {
        const filled = (report.gratitude ?? []).filter(g => g?.trim()).length;
        return (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">🙏 感謝3件</span>
            {filled >= 3
              ? <span className="text-xs bg-green-100 text-green-700 rounded-full px-1.5 py-0.5">✓ 完了</span>
              : filled > 0
                ? <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">{filled}/3</span>
                : <span className="text-xs bg-gray-100 text-gray-400 rounded-full px-1.5 py-0.5">未入力</span>
            }
          </div>
        );
      })()}
      <div className="space-y-2">
        {gratitude.slice(0, 3).map((text, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4 flex-shrink-0">{idx + 1}.</span>
            <input
              type="text"
              value={text}
              onChange={e => handleChange(idx, e.target.value)}
              placeholder={`感謝${idx + 1}`}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SidePanelCards ───────────────────────────────────────────────────────────
export function SidePanelCards({
  report, customers,
  onUpdateReport, onAddTodo, onToggleTodo, onDeleteTodo,
}: SidePanelCardsProps) {
  // BUG-B: 提出済み / 確認済み日報の TODO を UI レベルでも読み取り専用にする
  const isReadOnly = report.status === 'submitted' || report.status === 'confirmed';
  return (
    <div className="space-y-4">
      <CustomerSummaryCard report={report} customers={customers} />
      <TodoCard
        report={report}
        isReadOnly={isReadOnly}
        onAddTodo={onAddTodo}
        onToggleTodo={onToggleTodo}
        onDeleteTodo={onDeleteTodo}
      />
      <ThemeCard report={report} onUpdateReport={onUpdateReport} />
      <ComplimentsCard dayKey={report.date} isReadOnly={isReadOnly} />
      <ReflectionCard report={report} onUpdateReport={onUpdateReport} />
      <GratitudeCard report={report} onUpdateReport={onUpdateReport} />
    </div>
  );
}
