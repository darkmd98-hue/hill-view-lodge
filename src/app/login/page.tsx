'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { getSupabase } from '@/lib/supabaseClient';
import { staggerContainer } from '@/lib/animations';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabase();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
      } else {
        router.push('/profile');
        router.refresh();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete = email.trim() && password.trim();

  return (
    <main className="min-h-dvh bg-[#f7f4ef] text-text-primary py-24 sm:py-28 px-5 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="bg-white p-8 rounded-3xl border border-black/5 shadow-lg space-y-6"
        >
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="font-display italic text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-text-muted text-xs">Enter your details to log in to your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="text-error bg-error-bg p-3.5 rounded-xl text-xs border border-error/10 text-center">
                {error}
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <Mail className="w-3.5 h-3.5 text-text-muted" />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="form-input py-2 text-sm"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <Lock className="w-3.5 h-3.5 text-text-muted" />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input py-2 text-sm"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !isFormComplete}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold rounded-full shadow-lg transition-all ${
                isFormComplete && !loading
                  ? 'bg-accent hover:bg-accent-hover text-white shadow-accent/25 cursor-pointer'
                  : 'bg-accent/40 text-white/80 cursor-not-allowed shadow-none'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-black/5 text-xs">
            <span className="text-text-muted">Don&apos;t have an account? </span>
            <Link href="/signup" className="text-accent hover:underline font-semibold">
              Sign Up
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
