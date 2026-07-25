'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useBooking } from '@/context/BookingContext';
import { successPop, fadeUp, fadeUpDelayed, confirmationStagger } from '@/lib/animations';
import MotionButton from '@/components/MotionButton';

export default function ConfirmationPage() {
  const { bookingData, clearBookingData } = useBooking();
  const router = useRouter();

  // Redirect if no booking data
  useEffect(() => {
    if (!bookingData) {
      router.replace('/rooms-booking');
    }
  }, [bookingData, router]);

  if (!bookingData) {
    return null;
  }

  return (
    <main className="min-h-dvh bg-surface flex items-center justify-center px-5 py-28">
      <motion.div
        variants={confirmationStagger}
        initial="hidden"
        animate="visible"
        className="booking-card text-center max-w-md w-full"
      >
        {/* 1. Success Animation */}
        <motion.div variants={successPop} className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2
              className="w-12 h-12 text-green-500"
              strokeWidth={1.5}
            />
          </div>
        </motion.div>

        {/* 2. There are a few next steps. */}
        <motion.h1
          variants={fadeUp}
          className="font-display italic text-2xl sm:text-3xl font-bold text-text-primary mb-4"
        >
          There are a few next steps.
        </motion.h1>

        {/* 3. Customer Care message */}
        <motion.p
          variants={fadeUp}
          className="text-text-muted text-sm sm:text-base leading-relaxed mb-4 px-2"
        >
          Hill View customer care will contact you shortly for your confirmation from the contact numbers <span className="font-semibold text-text-primary">8050153736</span> / <span className="font-semibold text-text-primary">8618160939</span>.
        </motion.p>

        {/* 4. Thank you for choosing Hill View. */}
        <motion.p
          variants={fadeUp}
          className="text-accent font-semibold text-base mb-8 font-display italic"
        >
          Thank you for choosing Hill View.
        </motion.p>

        {/* Booking Summary */}
        <motion.div
          variants={fadeUpDelayed}
          className="bg-surface rounded-xl p-4 mb-8 text-left space-y-2 border border-black/5"
        >
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Booking ID</span>
            <span className="font-medium text-text-primary font-mono">
              {bookingData.bookingId.slice(0, 8).toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Room Type</span>
            <span className="font-medium text-text-primary">
              {bookingData.roomName}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Check-in Date</span>
            <span className="font-medium text-text-primary">
              {bookingData.checkInDate ? new Date(bookingData.checkInDate).toLocaleDateString() : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Guest Count</span>
            <span className="font-medium text-text-primary">
              {bookingData.numberOfPeople}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">Email Address</span>
            <span className="font-medium text-text-primary font-mono">
              {bookingData.customerEmail}
            </span>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div variants={fadeUp}>
          <MotionButton
            href="/"
            variant="primary"
            size="md"
            onClick={() => clearBookingData()}
          >
            Back to Home
          </MotionButton>
        </motion.div>
      </motion.div>
    </main>
  );
}
