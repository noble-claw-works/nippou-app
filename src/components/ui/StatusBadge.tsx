import type { ReportStatus } from '../../types';

const CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  planning:    { label: '予定入力中', className: 'bg-indigo-100 text-indigo-700' },
  in_progress: { label: '実績入力中', className: 'bg-amber-100 text-amber-700' },
  submitted:   { label: '提出済み',   className: 'bg-blue-100 text-blue-700' },
  confirmed:   { label: '承認済み',   className: 'bg-green-100 text-green-700' },
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
