import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store';

export function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [failCount, setFailCount] = useState(0);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { addToast } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (failCount >= 5) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    if (password === 'demo') {
      addToast({ type: 'success', message: 'ログインしました' });
      navigate('/today');
    } else {
      setFailCount(f => f + 1);
      setError(failCount + 1 >= 5
        ? 'アカウントが30分間ロックされました'
        : 'メールアドレスまたはパスワードが正しくありません');
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    addToast({ type: 'success', message: 'デモアカウントでログインしました' });
    navigate('/today');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* デモバナー (P1-1) */}
      <div className="w-full max-w-sm mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
        <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
        <p className="text-xs text-amber-800 font-medium">
          これはデモ版です。入力データは保存されません。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">📋</div>
          <h1 className="text-xl font-bold text-gray-900">日報管理</h1>
        </div>

        {/* ワンクリックデモボタン (P1-1) */}
        <button
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full mb-5 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          🎮 デモでお試し — サンプルデータで今すぐ体験
        </button>

        <div className="relative mb-5">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">または</div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを入力" required
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[44px]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading || failCount >= 5}
            className="w-full py-2.5 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {loading ? '認証中...' : 'ログイン'}
          </button>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium mb-1">💡 ヒント</p>
          <p className="text-xs text-blue-600">ログイン後、右上のロール切替で4種のロール（一般社員・マネージャーなど）を体験できます</p>
        </div>
      </div>
    </div>
  );
}
