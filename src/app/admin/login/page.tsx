'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { scaleButton, fadeUp } from '@/lib/animations';
import { Loader2, Lock } from 'lucide-react';

/**
 * Simple password login page for administration panel access.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to dashboard on success
        router.push('/admin');
        router.refresh();
      } else {
        setError(data.error || 'Authentication failed.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-dvh bg-surface flex items-center justify-center px-4 py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl w-full max-w-md border border-black/5"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4 border border-accent/20">
            <Lock className="w-6 h-6 text-accent" />
          </div>
          <h1 className="font-display italic text-3xl font-bold text-text-primary">
            Hill View Admin
          </h1>
          <p className="text-text-muted text-sm mt-1.5">
            Please verify your credentials to manage properties.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="adminPassword" className="block text-sm font-medium text-text-primary">
              Admin Password
            </label>
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="form-input"
              required
            />
          </div>

          {error && (
            <div className="text-error bg-error-bg p-3 rounded-xl text-sm border border-error/10 flex items-center gap-1.5 animate-pulse">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? scaleButton.whileHover : undefined}
            whileTap={!loading ? scaleButton.whileTap : undefined}
            transition={scaleButton.transition}
            className={`w-full py-3.5 rounded-full text-white font-semibold text-sm transition-all duration-200 mt-2 cursor-pointer ${
              loading
                ? 'bg-accent/60 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover shadow-lg shadow-accent/20'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}
