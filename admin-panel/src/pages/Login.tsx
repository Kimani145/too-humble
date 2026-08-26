import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAdminAuth } from '../hooks/useAdminAuth';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        params: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
        }
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

export default function Login(): React.JSX.Element {
  const navigate = useNavigate();
  const { isAdmin, session, isLoading: isAuthLoading } = useAdminAuth();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const turnstileKey: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!isAuthLoading && session && isAdmin) {
      navigate('/', { replace: true });
    }
  }, [session, isAdmin, isAuthLoading, navigate]);

  useEffect(() => {
    if (!turnstileKey) return;

    const scriptId = 'cf-turnstile-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const renderTurnstile = () => {
      if (window.turnstile) {
        try {
          window.turnstile.render('#cf-turnstile', {
            sitekey: turnstileKey,
            callback: (token: string) => setTurnstileToken(token),
          });
        } catch {
          // ignore duplicate render errors
        }
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v1/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = renderTurnstile;
      document.head.appendChild(script);
    } else {
      renderTurnstile();
    }
  }, [turnstileKey]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (turnstileKey && !turnstileToken) {
      setError('Complete the security check.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role !== 'admin') {
          await supabase.auth.signOut();
          setError('Access denied: this account does not have administrator privileges.');
          setIsLoading(false);
          return;
        }

        navigate('/', { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred during sign in.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-10 max-w-md w-full">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="text-brand-600 text-4xl font-bold mb-2">✝</div>
          <h1 className="text-2xl font-bold text-gray-900">Too Humble Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Administrative access only</p>
        </div>

        {/* Error Box */}
        {error ? (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        ) : null}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 text-sm outline-none transition"
              placeholder="admin@toohumble.dev"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-gray-900 text-sm outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {turnstileKey ? <div id="cf-turnstile" className="my-4 flex justify-center" /> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Access restricted to authorised administrators only.
        </p>
      </div>
    </div>
  );
}
