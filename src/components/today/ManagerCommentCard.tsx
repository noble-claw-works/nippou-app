import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import type { ManagerComment } from '../../types';

interface Props {
  comment: ManagerComment;
  dayKey: string;
  isManager: boolean;
  onDelete: (id: string) => void;
}

export function ManagerCommentCard({ comment, dayKey, isManager, onDelete }: Props) {
  const { currentUserId, users, replyToManagerComment } = useAppStore();
  const author = users.find(u => u.id === comment.authorUserId);
  const userReply = comment.replies.find(r => r.userId === currentUserId);
  const handleReply = (choice: 'yes' | 'no') => replyToManagerComment(comment.id, currentUserId, choice);
  const createdDate = new Date(comment.createdAt);
  const createdStr = createdDate.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="border-l-4 border-blue-500 bg-blue-50 p-3 rounded">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-700">
            {author?.name || 'Unknown'} ({createdStr})
          </div>
          <p className="text-sm text-gray-800 mt-1">{comment.body}</p>
          {!userReply && !isManager && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleReply('yes')}
                className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              >
                ✅ YES（了承）
              </button>
              <button
                onClick={() => handleReply('no')}
                className="px-3 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
              >
                ❌ NO（要相談）
              </button>
            </div>
          )}
          {userReply && (
            <div className="text-xs text-gray-600 mt-2 bg-white bg-opacity-50 p-2 rounded">
              📌 返答: {userReply.choice === 'yes' ? '了承' : '要相談'} ({new Date(userReply.repliedAt).toLocaleDateString('ja-JP')})
            </div>
          )}
        </div>
        {isManager && (
          <button
            onClick={() => onDelete(comment.id)}
            className="text-red-500 hover:text-red-700 p-1"
            title="削除"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
