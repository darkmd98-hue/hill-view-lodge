'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Printer, Receipt } from 'lucide-react';
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

  const invoice = bookingData.invoice;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <main className="min-h-dvh bg-surface flex items-center justify-center px-5 py-28 print:p-0 print:bg-white">
      {/* Print-specific CSS styles */}
      <style jsx global>{`
        @media print {
          nav, footer, .no-print, header {
            display: none !important;
          }
          body, main {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-card {
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
          }
        }
      `}</style>

      <motion.div
        variants={confirmationStagger}
        initial="hidden"
        animate="visible"
        className="booking-card print-card text-center max-w-lg w-full"
      >
        {/* 1. Success Animation */}
        <motion.div variants={successPop} className="mb-6 flex justify-center no-print">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2
              className="w-12 h-12 text-green-500"
              strokeWidth={1.5}
            />
          </div>
        </motion.div>

        {/* Header */}
        <motion.h1
          variants={fadeUp}
          className="font-display italic text-2xl sm:text-3xl font-bold text-text-primary mb-2"
        >
          Booking Confirmed!
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-text-muted text-sm sm:text-base leading-relaxed mb-4 px-2 no-print"
        >
          Hill View property care will contact you shortly from <span className="font-semibold text-text-primary">8050153736</span> / <span className="font-semibold text-text-primary">8618160939</span>.
        </motion.p>

        <motion.p
          variants={fadeUp}
          className="text-accent font-semibold text-base mb-6 font-display italic no-print"
        >
          Thank you for choosing Hill View.
        </motion.p>

        {/* Booking & Invoice Summary */}
        <motion.div
          variants={fadeUpDelayed}
          className="bg-white rounded-2xl p-5 mb-6 text-left space-y-4 border border-black/10 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-black/5 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-text-primary text-xs uppercase tracking-wider">
              <Receipt className="w-4 h-4 text-accent" />
              Tax Invoice & Reservation Summary
            </div>
            <span className="text-[11px] font-mono font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">
              #{bookingData.bookingId.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Guest Name</span>
              <span className="font-semibold text-text-primary">{bookingData.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Email</span>
              <span className="font-semibold text-text-primary font-mono">{bookingData.customerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Room Category</span>
              <span className="font-semibold text-text-primary">{bookingData.roomName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Room Number</span>
              <span className="font-semibold text-text-primary">{bookingData.roomNumber || 'Assigned on arrival'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Check-in Date</span>
              <span className="font-semibold text-text-primary">
                {bookingData.checkInDate ? new Date(bookingData.checkInDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </div>

          {/* Itemized Invoice Chargesheet */}
          {invoice && (
            <div className="pt-3 border-t border-black/10 space-y-2 text-xs sm:text-sm">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted block">Itemized Billing</span>
              
              <div className="flex justify-between">
                <span className="text-text-muted">Room Rate (1 night)</span>
                <span className="font-semibold text-text-primary font-mono">₹{invoice.roomRateTotal}</span>
              </div>

              {(bookingData.extraAdults || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Extra Adults ({bookingData.extraAdults} × ₹500)</span>
                  <span className="font-semibold text-text-primary font-mono">+₹{invoice.extraAdultsCharge}</span>
                </div>
              )}

              {(bookingData.extraChildren || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-text-muted">Extra Children ({bookingData.extraChildren} × ₹300)</span>
                  <span className="font-semibold text-text-primary font-mono">+₹{invoice.extraChildrenCharge}</span>
                </div>
              )}

              <div className="flex justify-between pt-1 border-t border-black/5">
                <span className="text-text-muted font-medium">Subtotal</span>
                <span className="font-semibold text-text-primary font-mono">₹{invoice.subtotal}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-text-muted">GST ({invoice.gstRate}%)</span>
                <span className="font-semibold text-text-primary font-mono">₹{invoice.gstAmount}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-black/10 font-bold text-sm sm:text-base">
                <span className="text-text-primary">Grand Total Paid</span>
                <span className="text-accent font-extrabold font-mono text-base sm:text-lg">₹{invoice.grandTotal}</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center no-print">
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-black/10 bg-white hover:bg-black/5 text-text-primary text-sm font-bold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-accent" />
            Print / Save as PDF
          </button>
          
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
