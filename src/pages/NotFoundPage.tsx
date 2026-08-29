import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="bg-gray-50 rounded-2xl border border-gray-200 p-10 max-w-md w-full shadow-sm">
        <div className="flex justify-center mb-4">
          <FileQuestion className="w-16 h-16 text-gray-300" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          404 - ページが見つかりません
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          お探しのページは存在しないか、移動・削除された可能性があります。
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-colors"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
