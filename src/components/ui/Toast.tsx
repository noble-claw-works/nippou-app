import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useAppStore } from '../../store';

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-green-600" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
  error:   <XCircle className="w-4 h-4 text-red-600" />,
  info:    <Info className="w-4 h-4 text-blue-600" />,
};

const BG = {
  success: 'bg-white border-green-400',
  warning: 'bg-white border-yellow-400',
  error:   'bg-white border-red-400',
  info:    'bg-white border-blue-400',
};

export function ToastContainer() {
  const { toasts, removeToast } = useAppStore();
  return (
    <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${BG[t.type]} min-w-[240px] max-w-[360px]`}>
          {ICONS[t.type]}
          <span className="flex-1 text-sm text-gray-800">{t.message}</span>
          {t.undoFn && (
            <button onClick={t.undoFn} className="text-xs text-blue-600 font-medium hover:underline">元に戻す</button>
          )}
          <button onClick={() => removeToast(t.id)}>
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      ))}
    </div>
  );
}
