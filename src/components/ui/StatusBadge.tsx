import type { ReportStatus } from '../../types';

const CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  draft:     { label: '下書き',   className: 'bg-gray-100 text-gray-600' },
  submitted: { label: '提出済み', className: 'bg-blue-100 text-blue-700' },
  confirmed: { label: '確認済み', className: 'bg-green-100 text-green-700' },
  sent_back: { label: '差し戻し', className: 'bg-orange-100 text-orange-700' },
};

export function StatusBadge({ status }: { status: ReportStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
