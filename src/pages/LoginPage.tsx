import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store';

export function LoginPage() {
  const [email, setEmail] = useState('hakuta@example.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (failCount >= 5) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (password === 'demo') {
      addToast({ type: 'success', message: 'ログインしました' });
      navigate('/today');
    } else {
      setFailCount(f => f + 1);
      if (failCount + 1 >= 5) {
        setError('アカウントが30分間ロックされました');
      } else {
        setError('メールアドレスまたはパスワードが正しくありません');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">📋</div>
          <h1 className="text-xl font-bold text-gray-900">日報管理</h1>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="demo" required
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={loading || failCount >= 5}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? '認証中...' : 'ログイン'}
          </button>
        </form>
        <p className="text-xs text-center text-gray-400 mt-4">
          パスワード: <code className="bg-gray-100 px-1 rounded">demo</code>
        </p>
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium mb-1">🎮 デモ情報</p>
          <p className="text-xs text-blue-600">ログイン後、右上のロール切替セレクタで4種のロールを体験できます</p>
        </div>
      </div>
    </div>
  );
}
