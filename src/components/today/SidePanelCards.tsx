import type { DailyReport, Customer } from "../../types";
import { ComplimentsCard } from "./ComplimentsCard";
import { TodoCard } from "./SidePanelCards/TodoCard";
import { CustomerSummaryCard } from "./SidePanelCards/CustomerSummaryCard";
import { ReflectionCard } from "./SidePanelCards/ReflectionCard";
import { ThemeCard } from "./SidePanelCards/ThemeCard";
import { GratitudeCard } from "./SidePanelCards/GratitudeCard";

// ─── Props ────────────────────────────────────────────────────────────────────
export interface SidePanelCardsProps {
  report: DailyReport;
  customers: Customer[];
  onUpdateReport: (updates: Partial<DailyReport>) => void;
  onAddTodo: (text: string, priority?: "high" | "medium" | "low") => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  /** B-2c: 日報が実績入力中（in_progress）かどうか。世帯まとめ入力導線ボタンの活性化に使用 */
  canEditActual?: boolean;
}

// resolveBackUrl, canActivateBatchEntry は utils/batchEntryNavigation.ts に定義
// (react-refresh/only-export-components 対応)

// ─── SidePanelCards ───────────────────────────────────────────────────────────
export function SidePanelCards({
  report,
  customers,
  onUpdateReport,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  canEditActual,
}: SidePanelCardsProps) {
  // BUG-B: 提出済み / 確認済み日報の TODO を UI レベルでも読み取り専用にする
  const isReadOnly =
    report.status === "submitted" || report.status === "confirmed";
  return (
    <div className="space-y-4">
      <CustomerSummaryCard
        report={report}
        customers={customers}
        canEditActual={canEditActual}
      />
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
