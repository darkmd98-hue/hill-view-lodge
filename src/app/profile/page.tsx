'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getSupabase } from '@/lib/supabaseClient';
import { Mail, Phone, Calendar, Loader2, LogOut, Mountain } from 'lucide-react';
import { staggerContainer } from '@/lib/animations';
import { type User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  date_of_birth: string;
}

interface BookingLog {
  id: string;
  service_type: string;
  room_or_activity_id: string;
  check_in: string;
  check_out: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<BookingLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const supabase = getSupabase();
        
        // 1. Get current auth user
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          router.push('/login');
          return;
        }
        
        setUser(authUser);

        // 2. Get profile details
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (!profileErr && profileData) {
          setProfile(profileData);
        }

        // 3. Get bookings log
        const { data: bookingsData, error: bookingsErr } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (!bookingsErr && bookingsData) {
          setBookings(bookingsData as BookingLog[]);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, token }),
      });

      const result = await response.json();
      if (result.success) {
        alert('Booking cancelled successfully.');
        
        // Refresh local bookings list
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });
        if (bookingsData) {
          setBookings(bookingsData as BookingLog[]);
        }
      } else {
        alert(result.error || 'Failed to cancel booking.');
      }
    } catch {
      alert('Connection error. Please try again.');
    }
  };

  const getAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-[#f7f4ef]">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
        <p className="text-xs text-text-muted mt-2">Loading your profile dashboard...</p>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-dvh bg-[#f7f4ef] text-text-primary py-24 sm:py-28 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Profile Card */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 sm:p-8 flex flex-col md:flex-row items-center md:items-start justify-between gap-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent text-2xl font-bold select-none uppercase">
              {profile.full_name.slice(0, 2)}
            </div>
            <div className="space-y-1">
              <h1 className="font-display italic text-2xl sm:text-3xl font-bold tracking-tight">{profile.full_name}</h1>
              <p className="text-xs text-text-muted">Registered member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}</p>
              <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f7f4ef] border border-black/5 text-xs text-text-muted font-medium font-mono text-[11px]">
                  <Mail className="w-3.5 h-3.5" />
                  {user?.email}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f7f4ef] border border-black/5 text-xs text-text-muted font-medium">
                  <Phone className="w-3.5 h-3.5" />
                  {profile.phone}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f7f4ef] border border-black/5 text-xs text-text-muted font-medium">
                  <Calendar className="w-3.5 h-3.5" />
                  {getAge(profile.date_of_birth)} years old ({new Date(profile.date_of_birth).toLocaleDateString()})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4.5 py-2 border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-full transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </motion.div>

        {/* Bookings log list */}
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="border-b border-black/5 pb-4">
            <h2 className="font-display italic text-xl font-bold">Your Reservations</h2>
            <p className="text-text-muted text-xs mt-0.5">Track your past stay logs and active payment details.</p>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-12">
              <Mountain className="w-12 h-12 text-accent/25 mx-auto mb-3" />
              <p className="text-text-muted text-xs font-medium">No stays reserved yet.</p>
              <Link href="/rooms-booking" className="text-accent hover:underline text-xs font-semibold mt-1 inline-block">
                Book a room category now →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-5 rounded-2xl bg-[#f7f4ef]/60 border border-black/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-[#f7f4ef]"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                        {booking.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        {booking.service_type} reservation
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-text-primary">
                      {new Date(booking.check_in).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                      {booking.check_out && ` – ${new Date(booking.check_out).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}`}
                    </p>
                    <p className="text-xs text-text-muted">
                      Created on {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-text-muted block uppercase tracking-wider">Total</span>
                      <span className="font-semibold text-sm">{formatPrice(booking.amount)}</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                          booking.status === 'confirmed'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : booking.status === 'cancelled'
                            ? 'bg-rose-50 border-rose-200 text-rose-800'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                        }`}
                      >
                        {booking.status.toUpperCase()}
                      </span>
                      
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-100 hover:border-rose-200 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
