import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store';

const ROLE_LABEL_JA: Record<string, string> = {
  general: '一般社員',
  manager: '上長',
  executive: '経営者',
  admin: '管理者',
};

export function LoginPage() {
  const FAILS_KEY = 'nippou_login_fails';
  const LOCK_KEY = 'nippou_login_lock_until';
  const LOCK_DURATION_MS = 30 * 60 * 1000; // 30分

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('demo');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [failCount, setFailCount] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('nippou_login_fails') ?? '0', 10);
    return Number.isNaN(v) ? 0 : v;
  });
  const [lockUntil, setLockUntil] = useState<number>(() => {
    const v = parseInt(localStorage.getItem('nippou_login_lock_until') ?? '0', 10);
    return Number.isNaN(v) ? 0 : v;
  });
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // 毎秒更新してロック解除時刻のカウントダウンを表示
  useEffect(() => {
    if (lockUntil <= 0) return;
    const timer = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockUntil) {
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockUntil]);

  const isLocked = failCount >= 5 || lockUntil > now;
  const [showQuickPick, setShowQuickPick] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast, login, loginAsUser, users, isAuthenticated } = useAppStore();

  // 既にログイン済みなら /today へ
  useEffect(() => {
    if (isAuthenticated()) {
      const from = (location.state as { from?: string } | null)?.from ?? '/today';
      navigate(from, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeUsers = useMemo(() => users.filter(u => u.status === 'active'), [users]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);
    setError('');
    await new Promise(r => setTimeout(r, 300));

    const result = login(email, password);
    if (result.ok) {
      // 成功時: 失敗カウンタ・ロックをリセット
      setFailCount(0);
      setLockUntil(0);
      localStorage.removeItem(FAILS_KEY);
      localStorage.removeItem(LOCK_KEY);
      addToast({ type: 'success', message: `${result.user.name} さんとしてログインしました` });
      const from = (location.state as { from?: string } | null)?.from ?? '/today';
      navigate(from, { replace: true });
    } else {
      const nextFail = failCount + 1;
      setFailCount(nextFail);
      localStorage.setItem(FAILS_KEY, String(nextFail));
      if (nextFail >= 5) {
        const until = Date.now() + LOCK_DURATION_MS;
        setLockUntil(until);
        setNow(Date.now());
        localStorage.setItem(LOCK_KEY, String(until));
        setError(`アカウントがロックされました。${LOCK_DURATION_MS / 60000}分後に自動解除されます。`);
      } else {
        setError(result.error + ` (あと${5 - nextFail}回失敗するとロック)`);
      }
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 200));
    // デフォルトは u1 (一般社員)
    loginAsUser('u1');
    addToast({ type: 'success', message: 'デモアカウントでログインしました' });
    const from = (location.state as { from?: string } | null)?.from ?? '/today';
    navigate(from, { replace: true });
    setLoading(false);
  };

  const handlePickUser = (userId: string) => {
    loginAsUser(userId);
    const u = users.find(x => x.id === userId);
    addToast({ type: 'success', message: `${u?.name ?? 'ユーザー'} さんとしてログインしました` });
    const from = (location.state as { from?: string } | null)?.from ?? '/today';
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* デモバナー */}
      <div className="w-full max-w-sm mb-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
        <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
        <p className="text-xs text-amber-800 font-medium">
          これはデモ版です。入力データは保存されません。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">📋</div>
          <h1 className="text-xl font-bold text-gray-900">305-hrl-nippou-app</h1>
          <p className="text-xs text-gray-500 mt-1">ログインしてください</p>
        </div>

        {/* ワンクリックデモログイン */}
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={loading}
          className="w-full mb-3 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-sm min-h-[44px]"
        >
          🎮 デモでお試し — サンプルデータで今すぐ体験
        </button>

        {/* 役割で選んでログイン */}
        <button
          type="button"
          onClick={() => setShowQuickPick(v => !v)}
          aria-expanded={showQuickPick}
          className="w-full mb-2 py-2.5 text-xs text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
        >
          役割で選んでログイン
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQuickPick ? 'rotate-180' : ''}`} />
        </button>

        {showQuickPick && (
          <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
            {activeUsers.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => handlePickUser(u.id)}
                disabled={loading}
                className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
              >
                <span className="inline-flex w-7 h-7 rounded-full bg-blue-100 text-blue-700 items-center justify-center text-xs font-bold flex-shrink-0">
                  {u.avatarInitials}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-gray-900 truncate">{u.name}</span>
                  <span className="block text-[10px] text-gray-500 truncate">{u.email}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full whitespace-nowrap">
                  {ROLE_LABEL_JA[u.role] ?? u.role}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">またはメールでログイン</div>
        </div>

        {/* P1: ロックバナー */}
        {isLocked && (
          <div role="alert" className="mb-4 px-4 py-3 bg-red-50 border border-red-300 rounded-xl flex items-start gap-2">
            <span className="text-red-500 text-lg flex-shrink-0">🔒</span>
            <div className="text-xs text-red-700">
              <p className="font-semibold mb-0.5">アカウントがロックされています</p>
              {lockUntil > now ? (
                <p>{Math.ceil((lockUntil - now) / 60000)} 分後にロック解除されます</p>
              ) : (
                <p>ログイン失敗が5回に達しました。しばらくお待ちください。</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3" aria-label="ログインフォーム">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-email">メールアドレス</label>
            <input
              id="login-email"
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="hakuta@example.com" required autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="login-password">パスワード</label>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを入力" required autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? 'パスワードを隠す' : 'パスワードを表示'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading || isLocked}
            className="w-full py-2.5 bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors min-h-[44px]">
            {loading ? '認証中...' : isLocked ? 'ロック中' : 'ログイン'}
          </button>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium mb-1">💡 デモ用パスワード</p>
          <p className="text-xs text-blue-600">全アカウント共通で <code className="px-1.5 py-0.5 bg-white rounded font-mono">demo</code> です。メールアドレスは「役割で選んでログイン」で確認できます。</p>
        </div>
      </div>
    </div>
  );
}
