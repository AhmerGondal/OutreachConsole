import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

interface AuthGateProps {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<string | null>;
}

export function AuthGate({ onSignIn, onSignUp }: AuthGateProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setBusy(true);

    const err = mode === 'login'
      ? await onSignIn(email.trim(), password)
      : await onSignUp(email.trim(), password);

    setBusy(false);

    if (err) {
      setError(err);
    } else if (mode === 'signup') {
      setSignupSuccess(true);
    }
  };

  return (
    <div className="noise-overlay relative flex min-h-screen items-center justify-center">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/[0.06] blur-[150px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-sm px-6"
      >
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
            <div className="h-2.5 w-2.5 rounded-full bg-accent animate-glow-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Outreach Console</h1>
          <p className="mt-1 text-sm text-white/30">
            {mode === 'login' ? 'Sign in to continue' : 'Create your account'}
          </p>
        </div>

        {signupSuccess ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
            <p className="text-sm text-emerald-400">Check your email for a confirmation link.</p>
            <button
              onClick={() => { setMode('login'); setSignupSuccess(false); }}
              className="mt-3 text-xs text-white/50 hover:text-white/80"
            >
              Back to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-white/40">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoFocus
                  required
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-accent/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium text-white/40">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-accent/40"
                />
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
                busy
                  ? 'cursor-not-allowed bg-white/[0.04] text-white/20'
                  : 'bg-accent text-white hover:bg-accent-dim'
              )}
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'login' ? (
                <LogIn size={16} />
              ) : (
                <UserPlus size={16} />
              )}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                className="text-xs text-white/30 hover:text-white/60"
              >
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
