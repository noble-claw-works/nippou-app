import { useState } from 'react';
import { useAppStore } from '../../store';
import { ManagerCommentCard } from './ManagerCommentCard';

interface Props {
  dayKey: string;
  submitted: boolean; // true if report.status === 'submitted' || 'confirmed'
}

export function ManagerCommentSection({ dayKey, submitted }: Props) {
  const { currentRole, currentUserId, managerComments, addManagerComment, deleteManagerComment } = useAppStore();
  const [newComment, setNewComment] = useState('');
  const isManager = currentRole === 'manager' || currentRole === 'executive' || currentRole === 'admin';
  const dayComments = managerComments.filter(c => c.dayKey === dayKey);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addManagerComment(dayKey, currentUserId, newComment.trim());
    setNewComment('');
  };

  return (
    <div className="border-t border-gray-200 pt-4 mt-4 bg-white rounded-lg">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">📋 上長コメント</h4>

      {!submitted && !isManager && (
    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded mb-3">
      日報を提出すると、上長からのコメントが表示されます。
    </p>
  )}

      {dayComments.length === 0 ? (
        <p className="text-xs text-gray-400">{submitted ? 'コメントはまだありません' : 'コメントはありません'}</p>
      ) : (
        <div className="space-y-3 mb-4">
          {dayComments.map(comment => (
            <ManagerCommentCard
              key={comment.id}
              comment={comment}
              dayKey={dayKey}
              isManager={isManager}
              onDelete={deleteManagerComment}
            />
          ))}
        </div>
      )}

      {isManager && submitted && (
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <textarea
            placeholder="コメントを入力..."
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-xs resize-none h-12 mb-2"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="w-full bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 disabled:bg-gray-300"
          >
            コメントを送信
          </button>
        </div>
      )}
    </div>
  );
}
