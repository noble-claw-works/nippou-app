// NotesSection — 留意事項（追記型・削除なし）
import { useState } from "react";
import { StickyNote, Plus } from "lucide-react";
import type { RenewalCase } from "../../types";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

interface NotesSectionProps {
  rc: RenewalCase;
  onAddNote: (body: string) => void;
}

export function NotesSection({ rc, onAddNote }: NotesSectionProps) {
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAddNote(trimmed);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-yellow-500" />
          留意事項
          {rc.notes.length > 0 && (
            <span className="text-xs text-gray-400">({rc.notes.length}件)</span>
          )}
        </h3>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          追記
        </button>
      </div>

      {/* 追記フォーム */}
      {adding && (
        <div className="mb-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="留意事項を入力..."
            rows={3}
            autoFocus
            className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSubmit}
              disabled={!draft.trim()}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              追記する
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setDraft("");
              }}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 留意事項一覧（追記順・削除なし） */}
      {rc.notes.length === 0 && !adding ? (
        <p className="text-sm text-gray-400 text-center py-4">
          留意事項はありません
        </p>
      ) : (
        <ul className="space-y-3">
          {rc.notes.map((note) => (
            <li
              key={note.id}
              className="flex gap-3 border-l-2 border-yellow-300 pl-3 py-1"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                  {note.body}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {format(parseISO(note.at), "MM/dd HH:mm", { locale: ja })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
