import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Check, RotateCcw, Send } from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { BLOCK_COLORS, BLOCK_EMOJIS, BLOCK_LABELS, MOOD_EMOJIS, formatDate, formatRelativeTime } from '../utils';
import { format } from 'date-fns';

export function ReportDetailPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { reports, users, customers, currentRole, currentUserId, currentUserId: uid,
    addComment, deleteComment, confirmReport, sendBackReport, addToast } = useAppStore();

  const report = reports.find(r => r.date === date && r.userId === (currentRole === 'general' ? uid : r.userId))
    ?? reports.find(r => r.date === date);

  const [newComment, setNewComment] = useState('');
  const [showSendBack, setShowSendBack] = useState(false);
  const [sendBackReason, setSendBackReason] = useState('');

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> 戻る
        </button>
        <EmptyState icon="🔍" title="日報が見つかりません" />
      </div>
    );
  }

  const reportUser = users.find(u => u.id === report.userId);
  const canComment = currentRole === 'manager' || currentRole === 'executive';
  const canConfirm = (currentRole === 'manager' || currentRole === 'executive') && report.status === 'submitted';
  const canSendBack = (currentRole === 'manager' || currentRole === 'executive') && ['submitted', 'confirmed'].includes(report.status);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(report.id, currentUserId, newComment);
    setNewComment('');
    addToast({ type: 'success', message: 'コメントを追加しました' });
  };

  const handleSendBack = () => {
    if (!sendBackReason.trim()) return;
    sendBackReport(report.id, sendBackReason);
    setShowSendBack(false);
    setSendBackReason('');
    addToast({ type: 'info', message: '日報を差し戻しました' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900">{formatDate(report.date)}</h1>
            <StatusBadge status={report.status} />
            {reportUser && <span className="text-sm text-gray-500">作成者: {reportUser.name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {canConfirm && (
            <button onClick={() => { confirmReport(report.id); addToast({ type: 'success', message: '確認済みにしました' }); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
              <Check className="w-4 h-4" /> 確認済みにする
            </button>
          )}
          {canSendBack && (
            <button onClick={() => setShowSendBack(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200">
              <RotateCcw className="w-4 h-4" /> 差し戻す
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Timeline */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">📅 タイムライン</h2>
          {report.blocks.length === 0 ? (
            <p className="text-sm text-gray-400">記録がありません</p>
          ) : (
            <div className="space-y-2">
              {[...report.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(block => (
                <div key={block.id} className={`flex gap-3 p-3 rounded-xl border ${BLOCK_COLORS[block.type]}`}>
                  <div className="flex-shrink-0">
                    <span className="text-lg">{BLOCK_EMOJIS[block.type]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{block.startTime}–{block.endTime}</span>
                      <span className="text-sm font-medium truncate">{block.title || BLOCK_LABELS[block.type]}</span>
                    </div>
                    {block.customerId && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        顧客: {customers.find(c => c.id === block.customerId)?.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">✅ TODO</h2>
            {report.todos.length === 0 ? (
              <p className="text-xs text-gray-400">TODOがありません</p>
            ) : (
              <div className="space-y-1.5">
                {report.todos.map(todo => (
                  <div key={todo.id} className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${todo.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {todo.completed && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className={`text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{todo.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">🌤 振り返り</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">朝の気分:</span>
                <span>{report.morningMood ? MOOD_EMOJIS[report.morningMood] : '未設定'}</span>
                <span className="text-gray-400">→</span>
                <span>{report.eveningMood ? MOOD_EMOJIS[report.eveningMood] : '未設定'}</span>
              </div>
              {report.managerSignal && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">合図:</span>
                  <span className="text-xs">{{consult:'💬 相談したい', listen:'👂 聞いて', ok:'👍 今は大丈夫'}[report.managerSignal]}</span>
                </div>
              )}
            </div>
          </div>

          {report.status === 'sent_back' && report.sentBackReason && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-orange-700 mb-1">↩ 差し戻し理由</h2>
              <p className="text-sm text-orange-800">{report.sentBackReason}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comments */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> コメント ({report.comments.length})
        </h2>
        {report.comments.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">コメントがありません</p>
        )}
        <div className="space-y-3 mb-4">
          {report.comments.map(comment => {
            const commentUser = users.find(u => u.id === comment.userId);
            return (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
                  {commentUser?.avatarInitials ?? '?'}
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{commentUser?.name}</span>
                    <span className="text-xs text-gray-400">{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm text-gray-800">{comment.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        {canComment && (
          <div className="flex gap-2">
            <input
              type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              placeholder="コメントを追加..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleAddComment}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Send Back Modal */}
      <Modal open={showSendBack} onClose={() => setShowSendBack(false)}
        title="日報を差し戻す" size="sm" closeOnBackdrop={false}
        footer={
          <>
            <button onClick={() => setShowSendBack(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">
              キャンセル
            </button>
            <button onClick={handleSendBack} disabled={!sendBackReason.trim()}
              className="px-4 py-2 text-sm text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50">
              ↩ 差し戻す
            </button>
          </>
        }>
        <div className="space-y-3">
          <p className="text-sm text-gray-700">{reportUser?.name} さんに修正を依頼します。</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">差し戻し理由 *</label>
            <textarea value={sendBackReason} onChange={e => setSendBackReason(e.target.value)}
              rows={3} placeholder="修正してほしい点を入力してください"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
