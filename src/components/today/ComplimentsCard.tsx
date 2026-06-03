import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';

interface Props {
  dayKey: string;
  isReadOnly: boolean;
}

export function ComplimentsCard({ dayKey, isReadOnly }: Props) {
  const { customers, addCompliment, deleteCompliment, compliments } = useAppStore();
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [type, setType] = useState<'praise' | 'request'>('praise');
  const [body, setBody] = useState('');

  const dayCompliments = compliments.filter(c => c.dayKey === dayKey);

  const handleAdd = () => {
    if (!body.trim()) return;
    addCompliment(dayKey, customerId || undefined, customerName || undefined, type, body.trim());
    setCustomerId('');
    setCustomerName('');
    setType('praise');
    setBody('');
  };

  const handleDelete = (id: string) => {
    deleteCompliment(id);
  };

  return (
    <div className="border rounded-lg p-4 bg-gradient-to-br from-pink-50 to-yellow-50">
      <h3 className="text-base font-semibold text-gray-800 mb-3">💐 お褒め・要望の言葉</h3>

      {dayCompliments.length > 0 && (
        <div className="space-y-2 mb-4">
          {dayCompliments.map(c => (
            <div key={c.id} className="bg-white rounded p-2 text-sm border-l-4 border-pink-300">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <div className="font-medium text-gray-700">
                    {c.type === 'praise' ? '📝 お褒め' : '💡 要望'} • {c.customerName || c.customerId || '（記名なし）'}
                  </div>
                  <p className="text-gray-700 text-xs mt-1">{c.body}</p>
                </div>
                {!isReadOnly && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isReadOnly && (
        <div className="bg-white rounded p-3 border border-gray-300">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="">👤 顧客選択</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="顧客名（自由記述）"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            />
          </div>
          <div className="flex gap-2 mb-2">
            <label className="flex items-center text-xs gap-1 cursor-pointer">
              <input type="radio" name="compliment-type" value="praise" checked={type === 'praise'} onChange={e => setType(e.target.value as 'praise' | 'request')} />
              📝 お褒め
            </label>
            <label className="flex items-center text-xs gap-1 cursor-pointer">
              <input type="radio" name="compliment-type" value="request" checked={type === 'request'} onChange={e => setType(e.target.value as 'praise' | 'request')} />
              💡 要望
            </label>
          </div>
          <textarea
            placeholder="本文（必須）"
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full text-xs border rounded px-2 py-1 resize-none h-16 mb-2"
          />
          <button
            onClick={handleAdd}
            disabled={!body.trim()}
            className="w-full bg-pink-500 text-white py-1 rounded text-xs hover:bg-pink-600 disabled:bg-gray-300"
          >
            <Plus size={14} className="inline mr-1" /> 追加
          </button>
        </div>
      )}
    </div>
  );
}
