'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone, Calendar, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { staggerContainer } from '@/lib/animations';

export default function SignupPage() {
  const router = useRouter();
  
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    dob: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Derived age calculation
  const ageInfo = useMemo(() => {
    if (!form.dob) return { age: null, valid: false };
    const date = new Date(form.dob);
    if (isNaN(date.getTime())) return { age: null, valid: false };

    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
      age--;
    }

    return { age, valid: age >= 18 && age <= 120 };
  }, [form.dob]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Final client-side check
    if (!ageInfo.valid) {
      setError(`Minimum age requirement is 18 (current age is ${ageInfo.age ?? 0}).`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isFormComplete =
    form.fullName.trim() &&
    form.email.trim() &&
    form.password.trim() &&
    form.phone.trim() &&
    ageInfo.valid;

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
            <h1 className="font-display italic text-3xl font-bold tracking-tight">Create Account</h1>
            <p className="text-text-muted text-xs">Join Hill View Lodge for premium stay reservations.</p>
          </div>

          {success ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center space-y-3"
            >
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
              <h2 className="font-semibold text-base">Signup Successful!</h2>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Welcome to Hill View. Redirecting you to the login page shortly...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-error bg-error-bg p-3.5 rounded-xl text-xs border border-error/10 text-center">
                  {error}
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                  <User className="w-3.5 h-3.5 text-text-muted" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="form-input py-2 text-sm"
                  required
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                  <Mail className="w-3.5 h-3.5 text-text-muted" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleInputChange}
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
                  value={form.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="form-input py-2 text-sm"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                  <Phone className="w-3.5 h-3.5 text-text-muted" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleInputChange}
                  placeholder="10-digit mobile number"
                  className="form-input py-2 text-sm"
                  required
                />
              </div>

              {/* DOB & Dynamic Age verification */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" />
                  Date of Birth
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    name="dob"
                    value={form.dob}
                    onChange={handleInputChange}
                    className="form-input py-2 text-sm flex-1"
                    required
                  />
                  {ageInfo.age !== null && (
                    <div
                      className={`px-3 py-2 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border select-none ${
                        ageInfo.valid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      Age: {ageInfo.age} {ageInfo.valid ? '✓' : '✗'}
                    </div>
                  )}
                </div>
                {form.dob && !ageInfo.valid && (
                  <p className="text-rose-600 text-[10px]">
                    * You must be at least 18 years old to reserve.
                  </p>
                )}
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    Sign Up
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Link */}
          <div className="text-center pt-2 border-t border-black/5 text-xs">
            <span className="text-text-muted">Already have an account? </span>
            <Link href="/login" className="text-accent hover:underline font-semibold">
              Log In
            </Link>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
