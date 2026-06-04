import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MessageCircle, Check, RotateCcw, Send } from 'lucide-react';
import { useAppStore } from '../store';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { MOOD_EMOJIS, formatDate, formatRelativeTime } from '../utils';
import { ReadOnlyTimeline } from '../components/report/ReadOnlyTimeline';
import { format } from 'date-fns';

export function ReportDetailPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { reports, users, customers, currentRole, currentUserId, currentUserId: uid,
    addComment, deleteComment, confirmReport, withdrawReport, addToast,
    managerComments, addManagerComment, deleteManagerComment } = useAppStore();

  const report = reports.find(r => r.date === date && r.userId === (currentRole === 'general' ? uid : r.userId))
    ?? reports.find(r => r.date === date);

  const [newComment, setNewComment] = useState('');
  const [showSendBack, setShowSendBack] = useState(false);
  const [sendBackReason, setSendBackReason] = useState('');
  
  // ManagerComment store からこの日報のコメント一覧を取得
  const dayComments = managerComments.filter(c => c.dayKey === date);

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
  // MGR-4: 担当者（general）も自身の日報にコメントを追加できるようにする
  const canCommentAsAuthor = currentRole === 'general' && report.userId === uid;
  const canPostComment = canComment || canCommentAsAuthor;
  const isManagerView = currentRole === 'manager' || currentRole === 'executive';

  // 前後ナビゲーション計算
  const sortedAccessibleReports = (() => {
    let scope = reports;
    if (currentRole === 'general') {
      scope = reports.filter(r => r.userId === uid);
    } else if (currentRole === 'manager') {
      const viewer = users.find(u => u.id === uid);
      scope = reports.filter(r => {
        const author = users.find(u => u.id === r.userId);
        if (!viewer || !author) return false;
        return viewer.teamIds.some(tid => author.teamIds.includes(tid)) || r.userId === uid;
      });
    }
    return [...scope].sort((a, b) => a.date.localeCompare(b.date) || a.userId.localeCompare(b.userId));
  })();
  const currentIdx = sortedAccessibleReports.findIndex(r => r.id === report.id);
  const prevReport = currentIdx > 0 ? sortedAccessibleReports[currentIdx - 1] : null;
  const nextReport = currentIdx >= 0 && currentIdx < sortedAccessibleReports.length - 1
    ? sortedAccessibleReports[currentIdx + 1] : null;

  // 上長ビュー: 未確認（submitted）のみで前後
  const unconfirmedReports = isManagerView
    ? sortedAccessibleReports.filter(r => r.status === 'submitted')
    : [];
  const unconfirmedCurrentIdx = unconfirmedReports.findIndex(r => r.id === report.id);
  const prevUnconfirmed = isManagerView && unconfirmedReports.length > 0
    ? (unconfirmedCurrentIdx > 0 ? unconfirmedReports[unconfirmedCurrentIdx - 1] : unconfirmedReports[unconfirmedReports.length - 1])
    : null;
  const nextUnconfirmed = isManagerView && unconfirmedReports.length > 0
    ? (unconfirmedCurrentIdx >= 0 && unconfirmedCurrentIdx < unconfirmedReports.length - 1
        ? unconfirmedReports[unconfirmedCurrentIdx + 1]
        : (unconfirmedCurrentIdx === -1 ? unconfirmedReports[0] : unconfirmedReports[0]))
    : null;

  const goToReport = (target: typeof report) => {
    navigate(`/reports/${target.date}${target.userId !== uid ? `?user=${target.userId}` : ''}`);
  };
  const canConfirm = (currentRole === 'manager' || currentRole === 'executive') && report.status === 'submitted';
  const canSendBack = (currentRole === 'manager' || currentRole === 'executive') && ['submitted', 'confirmed'].includes(report.status);

  // 旧 handleAddComment は削除（ManagerComment 統合で inline に変更）

  const handleSendBack = () => {
    if (!sendBackReason.trim()) return;
    withdrawReport(report.id);
    setShowSendBack(false);
    setSendBackReason('');
    addToast({ type: 'info', message: '日報を差し戻しました' });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="戻る">
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

      {/* 前後ナビゲーション */}
      <nav aria-label="日報ナビゲーション" className="flex flex-wrap items-center justify-between gap-2 mb-4 px-2 py-2 bg-blue-50 border border-blue-100 rounded-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => prevReport && goToReport(prevReport)}
            disabled={!prevReport}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="前の日報"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> 前の日報
            {prevReport && <span className="text-xs text-gray-500 ml-1">({formatDate(prevReport.date)})</span>}
          </button>
          <button
            type="button"
            onClick={() => nextReport && goToReport(nextReport)}
            disabled={!nextReport}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="翌日の日報"
          >
            次の日報 <ArrowRight className="w-3.5 h-3.5" />
            {nextReport && <span className="text-xs text-gray-500 ml-1">({formatDate(nextReport.date)})</span>}
          </button>
        </div>
        {isManagerView && unconfirmedReports.length > 0 && (
          <div className="flex items-center gap-2" aria-label="未確認ナビゲーション">
            <span className="text-xs text-orange-700 font-medium">⚠ 未確認 {unconfirmedReports.length} 件</span>
            <button
              type="button"
              onClick={() => prevUnconfirmed && goToReport(prevUnconfirmed)}
              disabled={!prevUnconfirmed || prevUnconfirmed.id === report.id}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="前の未確認"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 前の未確認
            </button>
            <button
              type="button"
              onClick={() => nextUnconfirmed && goToReport(nextUnconfirmed)}
              disabled={!nextUnconfirmed || nextUnconfirmed.id === report.id}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-100 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-200 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="次の未確認"
            >
              次の未確認 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </nav>

      {/* BUG-A: Today と同じ 2 列レイアウト（左=タイムライン / 右=TODO+振り返り+上長コメント） */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Timeline (left 2 columns) */}
        <div className="lg:col-span-2 space-y-4">
          {/* RPT-2 縦軸ピクセルタイムライン */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">📅 タイムライン</h2>
            <ReadOnlyTimeline blocks={report.blocks} customers={customers} />
          </div>
        </div>

        {/* 右ペイン: TODO + 振り返り + 上長コメント */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">✅ TODO</h2>
            {report.todos.length === 0 ? (
              <p className="text-xs text-gray-400">TODOがありません</p>
            ) : (
              <div className="space-y-1.5">
                {report.todos.map(todo => {
                  // DEAD-1: 期限切れ判定
                  //   dueDate あり、未完了、今日より過去 → 期限切れ
                  //   dueDate あり、未完了、今日 → 今日期限
                  const today = new Date(); today.setHours(0,0,0,0);
                  const due = todo.dueDate ? new Date(todo.dueDate) : null;
                  if (due) due?.setHours(0,0,0,0);
                  const notDone = !todo.completed && todo.status !== 'done';
                  const isOverdue = notDone && !!due && due < today;
                  const isDueToday = notDone && !!due && due.getTime() === today.getTime();
                  return (
                    <div key={todo.id} className={`flex items-center gap-2 ${isOverdue ? 'bg-red-50 -mx-2 px-2 py-1 rounded' : isDueToday ? 'bg-amber-50 -mx-2 px-2 py-1 rounded' : ''}`}>
                      <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${todo.completed ? 'bg-green-500 border-green-500' : isOverdue ? 'border-red-400' : isDueToday ? 'border-amber-400' : 'border-gray-300'}`}>
                        {todo.completed && <Check className="w-3 h-3 text-white" />}
                      </span>
                      <span className={`text-sm flex-1 ${todo.completed ? 'line-through text-gray-400' : isOverdue ? 'text-red-900 font-medium' : isDueToday ? 'text-amber-900' : 'text-gray-700'}`}>{todo.text}</span>
                      {todo.dueDate && !todo.completed && (
                        <span className="text-[10px] text-gray-500 tabular-nums flex-shrink-0" title={`期限: ${todo.dueDate}`}>
                          {todo.dueDate.slice(5)}
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold flex-shrink-0" aria-label="期限切れ" title={`期限: ${todo.dueDate}`}>
                          ⚠ 期限切れ
                        </span>
                      )}
                      {isDueToday && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex-shrink-0" aria-label="今日期限">
                          ⏰ 今日期限
                        </span>
                      )}
                    </div>
                  );
                })}
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

          {/* RPT-1: 上長コメント */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MessageCircle className="w-4 h-4" /> 上長コメント ({dayComments.length})
          </h2>
        {dayComments.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">コメントがありません</p>
        )}
        <div className="space-y-3 mb-4">
          {dayComments.map(comment => {
            const commentUser = users.find(u => u.id === comment.authorUserId);
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
                  <p className="text-sm text-gray-800">{comment.body}</p>
                  {/* 返答表示 */}
                  {comment.replies.length > 0 && (
                    <div className="mt-2 space-y-1 pt-2 border-t border-gray-200 text-xs text-gray-600">
                      {comment.replies.map(reply => {
                        const replyUser = users.find(u => u.id === reply.userId);
                        const replyTime = new Date(reply.repliedAt).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                        return (
                          <div key={reply.userId}>
                            <span className="font-medium">{replyUser?.name}:</span>
                            <span className="ml-1">{reply.choice === 'yes' ? '✅ YES' : '❌ NO'}({replyTime})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {(canComment || (canCommentAsAuthor && comment.authorUserId === uid)) && (
                  <button
                    onClick={() => deleteManagerComment(comment.id)}
                    className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700"
                    title="削除"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {canPostComment && (
          <div className="flex gap-2">
            <input
              type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (() => { if (newComment.trim()) { addManagerComment(date || '', currentUserId, newComment); setNewComment(''); addToast({ type: 'success', message: 'コメントを追加しました' }); } })()}
              placeholder={canCommentAsAuthor ? '上長への返信・補足を入力...' : 'コメントを追加...'}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => { if (newComment.trim()) { addManagerComment(date || '', currentUserId, newComment); setNewComment(''); addToast({ type: 'success', message: 'コメントを追加しました' }); } }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
          </div>
        </aside>
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
