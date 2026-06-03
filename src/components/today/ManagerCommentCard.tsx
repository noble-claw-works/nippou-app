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
  const otherReplies = comment.replies.filter(r => r.userId !== currentUserId);
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
          
          {/* 未返答時: YES/NO ボタン表示（自分のみ、かつマネージャーでない） */}
          {!userReply && !isManager && (
            <div className="flex gap-2 mt-3 flex-wrap">
              <button
                onClick={() => handleReply('yes')}
                className="px-4 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors"
              >
                ✅ YES（了承）
              </button>
              <button
                onClick={() => handleReply('no')}
                className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors"
              >
                ❌ NO（要相談）
              </button>
            </div>
          )}

          {/* 返答済み時: あなたの返答 + 他ユーザーの返答も表示 */}
          {userReply && (
            <div className="mt-3 space-y-2">
              <div className="text-xs text-gray-700 bg-blue-50 border border-blue-200 p-2 rounded">
                <span className="font-medium">📌 あなたの返答:</span>
                <span className="ml-1">{userReply.choice === 'yes' ? '✅ YES（了承）' : '❌ NO（要相談）'}</span>
                <span className="text-gray-500 ml-2">({new Date(userReply.repliedAt).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })})</span>
              </div>
            </div>
          )}

          {/* 他ユーザーの返答を表示 */}
          {otherReplies.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {otherReplies.map(reply => {
                const replyUser = users.find(u => u.id === reply.userId);
                const replyTime = new Date(reply.repliedAt).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={reply.userId} className="text-xs text-gray-600">
                    <span className="font-medium">{replyUser?.name || reply.userId}:</span>
                    <span className="ml-1">{reply.choice === 'yes' ? '✅ YES' : '❌ NO'}({replyTime})</span>
                  </div>
                );
              })}
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
