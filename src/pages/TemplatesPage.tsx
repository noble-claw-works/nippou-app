import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../store';
import { ForbiddenState, EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function TemplatesPage() {
  const { currentRole, templates, addTemplate, publishTemplate, deactivateTemplate, addToast } = useAppStore();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [publishId, setPublishId] = useState<string | null>(null);

  if (currentRole !== 'admin') return <div className="px-4 py-8"><ForbiddenState /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">テンプレート管理</h1>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 新規作成
        </button>
      </div>

      {templates.length === 0 ? (
        <EmptyState icon="📄" title="テンプレートがありません"
          action={{ label: 'テンプレートを作成', onClick: () => setShowNew(true) }} />
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <div key={tmpl.id} className={`bg-white rounded-xl border p-4 ${!tmpl.isActive ? 'opacity-60 border-gray-100' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{tmpl.name}</h3>
                    {tmpl.isDefault && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">既定</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tmpl.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {tmpl.status === 'published' ? '公開済み' : '下書き'}
                    </span>
                    {!tmpl.isActive && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">無効</span>}
                  </div>
                  <p className="text-xs text-gray-500">v{tmpl.version} · ブロック数: {tmpl.blocks.length} · 使用日報: {tmpl.usageCount.toLocaleString()}</p>
                  {tmpl.description && <p className="text-xs text-gray-400 mt-1">{tmpl.description}</p>}
                </div>
                <div className="flex gap-2">
                  {tmpl.status === 'draft' && tmpl.isActive && (
                    <button onClick={() => setPublishId(tmpl.id)}
                      className="px-2.5 py-1 text-xs text-green-700 border border-green-200 rounded-lg hover:bg-green-50">
                      公開する
                    </button>
                  )}
                  {tmpl.isActive && (
                    <button onClick={() => setDeactivateId(tmpl.id)}
                      className="px-2.5 py-1 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                      無効化
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Template Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="テンプレートを作成" size="sm"
        footer={
          <>
            <button onClick={() => setShowNew(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">キャンセル</button>
            <button onClick={() => {
              if (!newName.trim()) return;
              addTemplate({ name: newName, description: newDesc, version: 1, status: 'draft', isDefault: false, isActive: true, blocks: [] });
              setShowNew(false); setNewName(''); setNewDesc('');
              addToast({ type: 'success', message: 'テンプレートを作成しました' });
            }} disabled={!newName.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg disabled:opacity-50">作成する</button>
          </>
        }>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">テンプレート名 *</label>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!publishId} onClose={() => setPublishId(null)}
        onConfirm={() => { publishTemplate(publishId!); addToast({ type: 'success', message: '公開しました' }); }}
        title="テンプレートを公開しますか？"
        message="このテンプレートを公開すると、ユーザーが新規日報作成時に選択できるようになります。"
        confirmLabel="公開する" confirmVariant="primary" />

      <ConfirmDialog open={!!deactivateId} onClose={() => setDeactivateId(null)}
        onConfirm={() => { deactivateTemplate(deactivateId!); addToast({ type: 'info', message: '無効化しました' }); }}
        title="テンプレートを無効化しますか？"
        message="既存の日報は引き続き表示されますが、新規日報の作成時に選択肢から外れます。"
        confirmLabel="無効化する" />
    </div>
  );
}
