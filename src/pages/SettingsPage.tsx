import { useState } from 'react';
import { useAppStore } from '../store';
import type { BlockType } from '../types';

const BLOCK_TYPES: BlockType[] = ['visit', 'office', 'phone', 'travel', 'break', 'meeting', 'lunch'];
const BLOCK_LABELS: Record<BlockType, string> = {
  visit: '訪問', office: '事務', phone: '電話', travel: '移動', break: '休憩', meeting: '会議', lunch: '昼食',
};
const BLOCK_EMOJIS: Record<BlockType, string> = {
  visit: '🤝', office: '📑', phone: '📞', travel: '🚗', break: '☕', meeting: '👥', lunch: '🍱',
};

export function SettingsPage() {
  const { currentUserId, users, quickChips, addQuickChip, deleteQuickChip, addToast, updateUser, requestEmailChange, getEmailChangeRequest } = useAppStore();
  const user = users.find(u => u.id === currentUserId);
  const myChips = quickChips.filter(c => c.userId === currentUserId || !c.userId);
  // Use store selector to ensure real-time updates
  const emailChangeReq = useAppStore(s => s.emailChangeRequests.find(r => r.userId === currentUserId && r.status === 'pending'));

  const [activeTab, setActiveTab] = useState('profile');
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newChipLabel, setNewChipLabel] = useState('');
  const [newChipType, setNewChipType] = useState<BlockType>('visit');
  const [showAddChip, setShowAddChip] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <h1 className="text-lg font-bold text-gray-900 mb-4">⚙ 設定</h1>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-4 flex-wrap">
        {[['profile', '👤 プロフィール'], ['password', '🔑 パスワード'], ['chips', '⚡ クイックチップ'], ['notifications', '🔔 通知'], ['display', '🎨 表示設定']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`px-3 py-2 text-xs rounded-lg transition-colors ${activeTab === id ? 'bg-white shadow font-medium text-gray-900' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
        {/* Profile */}
        {activeTab === 'profile' && !showEmailModal && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">プロフィール</h2>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">表示名</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">メールアドレス</label>
              <div className="flex gap-2">
                <input value={user?.email ?? ''} readOnly
                  className="flex-1 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500" />
                {!emailChangeReq && (
                  <button onClick={() => { setShowEmailModal(true); setNewEmail(''); }}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                    変更申請
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">メールアドレスの変更は申請制です</p>
              {emailChangeReq && (
                <p className="text-xs text-blue-500 mt-1">📋 申請待機中: {emailChangeReq.newEmail}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">言語</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option>日本語</option>
              </select>
            </div>
            <button onClick={() => {
              if (user) { updateUser(user.id, { name: displayName }); addToast({ type: 'success', message: '保存しました' }); }
            }}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">保存</button>
          </div>
        )}

        {/* Email Change Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowEmailModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">メールアドレス変更申請</h3>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">現在のメールアドレス</label>
                <input value={user?.email ?? ''} readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">新しいメールアドレス</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  キャンセル
                </button>
                <button onClick={() => {
                  if (!newEmail.trim()) { addToast({ type: 'error', message: 'メールアドレスを入力してください' }); return; }
                  if (!newEmail.includes('@')) { addToast({ type: 'error', message: '有効なメールアドレスを入力してください' }); return; }
                  requestEmailChange(currentUserId, newEmail);
                  addToast({ type: 'success', message: '変更申請を送信しました。管理者の承認をお待ちください。' });
                  setShowEmailModal(false);
                  setNewEmail('');
                }}
                  className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                  申請する
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password */}
        {activeTab === 'password' && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">パスワード変更</h2>
            {[['現在のパスワード'], ['新しいパスワード'], ['確認']].map(([label]) => (
              <div key={label}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="password"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <button onClick={() => addToast({ type: 'success', message: 'パスワードを変更しました（モック）' })}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">変更する</button>
          </div>
        )}

        {/* Quick Chips */}
        {activeTab === 'chips' && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">クイックチップ</h2>
            <div className="space-y-2 mb-4">
              {myChips.map(chip => (
                <div key={chip.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <span className="text-gray-400 cursor-grab">☰</span>
                  <span className="text-lg">{chip.emoji}</span>
                  <span className="flex-1 text-sm text-gray-700">{chip.label}</span>
                  <button onClick={() => {
                    deleteQuickChip(chip.id);
                    addToast({ type: 'info', message: '削除しました', undoFn: () => addToast({ type: 'info', message: '（元に戻す機能はモックです）' }) });
                  }}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">🗑</button>
                </div>
              ))}
            </div>
            {showAddChip ? (
              <div className="p-4 border border-gray-200 rounded-xl space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">ラベル *</label>
                  <input value={newChipLabel} onChange={e => setNewChipLabel(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">種別</label>
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_TYPES.map(type => (
                      <button key={type} onClick={() => setNewChipType(type)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg border ${newChipType === type ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                        {BLOCK_EMOJIS[type]} {BLOCK_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddChip(false)}
                    className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg">キャンセル</button>
                  <button onClick={() => {
                    if (!newChipLabel.trim()) return;
                    addQuickChip({ userId: currentUserId, label: newChipLabel, emoji: BLOCK_EMOJIS[newChipType], blockType: newChipType, order: myChips.length + 1 });
                    setNewChipLabel(''); setShowAddChip(false);
                    addToast({ type: 'success', message: 'チップを追加しました' });
                  }} className="px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700">追加する</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAddChip(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 w-full justify-center">
                + チップを追加
              </button>
            )}
          </div>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">通知設定</h2>
            <div className="space-y-3">
              {[
                'コメントを受け取ったらメール通知',
                '差し戻されたらメール通知',
                '未提出リマインダーメール（平日 18:00）',
                '確認済みになったらメール通知',
              ].map((label, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked={i < 3} className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <button onClick={() => addToast({ type: 'success', message: '保存しました' })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">保存</button>
          </div>
        )}

        {/* Display */}
        {activeTab === 'display' && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">表示設定</h2>
            <div className="space-y-3">
              {['起動時にToday画面を開く', '「日報のはじめ方」モーダルを次回も表示'].map((label, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">タイムラインのスナップ単位</label>
                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none">
                  <option>15分</option>
                  <option>30分</option>
                  <option>1時間</option>
                </select>
              </div>
            </div>
            <button onClick={() => addToast({ type: 'success', message: '保存しました' })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">保存</button>
          </div>
        )}
      </div>
    </div>
  );
}
