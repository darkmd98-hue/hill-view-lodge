'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Script from 'next/script';
import Image from 'next/image';
import { fetchRooms, submitBooking } from '@/lib/api';
import { useBooking } from '@/context/BookingContext';
import type { Room, BookingFormData } from '@/lib/types';
import { getSupabase } from '@/lib/supabaseClient';
import { type User as AuthUser } from '@supabase/supabase-js';
import {
  fadeUp,
  staggerContainer,
} from '@/lib/animations';
import {
  Calendar,
  Users,
  MapPin,
  Mail,
  Phone,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle,
  HelpCircle,
  Wifi,
  Coffee,
  ShieldCheck,
  Mountain,
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

export default function RoomsBookingWizard() {
  const router = useRouter();
  const { setBookingData } = useBooking();

  // ── States ──
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // Auth state
  const [user, setUser] = useState<AuthUser | null>(null);

  // Form Fields
  const [form, setForm] = useState<BookingFormData>({
    customerName: '',
    phoneNumber: '',
    address: '',
    numberOfPeople: 1,
    selectedRoom: '',
    customerEmail: '',
    checkInDate: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFormLocked, setIsFormLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync auth state & load profile details
  useEffect(() => {
    const supabase = getSupabase();
    
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (authUser) {
        setUser(authUser);
        
        // Fetch matching profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        if (profileData) {
          setForm(prev => ({
            ...prev,
            customerName: profileData.full_name,
            customerEmail: authUser.email || '',
            phoneNumber: profileData.phone || '',
          }));
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const activeUser = session?.user ?? null;
      setUser(activeUser);
      if (activeUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeUser.id)
          .single();
        if (profileData) {
          setForm(prev => ({
            ...prev,
            customerName: profileData.full_name,
            customerEmail: activeUser.email || '',
            phoneNumber: profileData.phone || '',
          }));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch Rooms
  useEffect(() => {
    async function loadRooms() {
      try {
        const data = await fetchRooms();
        setRooms(data);
      } catch (err) {
        setRoomsError(err instanceof Error ? err.message : 'Failed to fetch rooms');
      } finally {
        setRoomsLoading(false);
      }
    }
    loadRooms();
  }, []);



  // Compute Day of Week
  const dayOfWeek = useMemo(() => {
    if (!form.checkInDate) return '';
    const date = new Date(form.checkInDate);
    // Handle timezone offsets to represent local day of chosen date
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() + offset * 60 * 1000);
    return localDate.toLocaleDateString('en-IN', { weekday: 'long' });
  }, [form.checkInDate]);

  // Client-Side Validation
  const validateForm = useCallback((fields: BookingFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!fields.customerName.trim()) {
      errors.customerName = 'Name is required';
    } else if (fields.customerName.trim().length < 2) {
      errors.customerName = 'Name must be at least 2 characters';
    }

    if (!fields.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!PHONE_REGEX.test(fields.phoneNumber.trim())) {
      errors.phoneNumber = 'Please enter a valid 10-digit phone number';
    }

    if (!fields.address.trim()) {
      errors.address = 'Address is required';
    }

    if (!fields.numberOfPeople || fields.numberOfPeople < 1) {
      errors.numberOfPeople = 'At least 1 guest is required';
    } else if (fields.numberOfPeople > 20) {
      errors.numberOfPeople = 'Maximum 20 guests allowed';
    }

    if (!fields.customerEmail.trim()) {
      errors.customerEmail = 'Email is required';
    } else if (!EMAIL_REGEX.test(fields.customerEmail.trim())) {
      errors.customerEmail = 'Please enter a valid email address';
    }

    if (!fields.checkInDate) {
      errors.checkInDate = 'Check-in date is required';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const chosen = new Date(fields.checkInDate);
      chosen.setHours(0, 0, 0, 0);
      if (chosen < today) {
        errors.checkInDate = 'Check-in date cannot be in the past';
      }
    }

    return errors;
  }, []);

  // Sync Form Validations
  useEffect(() => {
    const errors = validateForm(form);
    setFormErrors(errors);
  }, [form, validateForm]);

  // Is Form Valid flag
  const isFormValid = Object.keys(formErrors).length === 0;

  // Handle Input Changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (isFormLocked) return;
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'numberOfPeople' ? Number(value) || '' : value,
    }));
  };

  // Submit Booking (Step 4 Reserve)
  const handleReserveSubmit = async () => {
    if (!isFormValid || !isFormLocked || !selectedRoom) {
      console.warn('handleReserveSubmit cancelled because form validation or selection is not ready.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    console.log('Sending booking request to server...', form);

    let paymentLaunched = false;

    try {
      const result = await submitBooking(form);
      console.log('Received booking result from API:', result);

      if (result.success) {
        // If Razorpay payment integration is enabled and required
        if (result.paymentRequired) {
          console.log('Razorpay payment is required. Preparing checkout options...', {
            orderId: result.orderId,
            razorpayKeyId: result.razorpayKeyId,
          });

          paymentLaunched = true;
          
          const supabase = getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token || '';

          if (!(window as unknown as { Razorpay: unknown }).Razorpay) {
            console.error('Razorpay SDK is not loaded. window.Razorpay is undefined.');
            throw new Error('Razorpay Checkout SDK failed to load. Please verify your internet connection, disable any adblockers, and try again.');
          }

          const options = {
            key: result.razorpayKeyId,
            amount: Math.round(selectedRoom.price_per_night * 100), // paise
            currency: 'INR',
            name: 'Hill View Lodge',
            description: selectedRoom.name,
            order_id: result.orderId,
            handler: async function (response: { razorpay_payment_id: string; razorpay_signature: string }) {
              console.log('Payment checkout callback received. Verifying signature on server...', response);
              setIsSubmitting(true);
              setSubmitError(null);
              
              try {
                const verifyResponse = await fetch('/api/payments/verify', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orderId: result.orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    bookingId: result.bookingId,
                    token,
                  }),
                });

                const verifyData = await verifyResponse.json();
                console.log('Payment verification response from server:', verifyData);
                
                if (verifyData.success) {
                  setBookingData({
                    customerName: form.customerName,
                    customerEmail: form.customerEmail,
                    roomName: result.roomName,
                    numberOfPeople: form.numberOfPeople,
                    bookingId: result.bookingId,
                    checkInDate: form.checkInDate,
                  });
                  router.push('/rooms-booking/confirmation');
                } else {
                  console.error('Server signature verification failed:', verifyData.error);
                  setSubmitError(verifyData.error || 'Payment signature verification failed.');
                  setIsFormLocked(false);
                }
              } catch (verifyErr) {
                console.error('Network error during signature verification:', verifyErr);
                setSubmitError('Verification error. Please contact property care directly.');
                setIsFormLocked(false);
              } finally {
                setIsSubmitting(false);
              }
            },
            prefill: {
              name: form.customerName,
              email: form.customerEmail,
              contact: form.phoneNumber,
            },
            theme: {
              color: '#c8781f',
            },
          };

          const RazorpayConstructor = (window as unknown as {
            Razorpay: new (options: unknown) => {
              open: () => void;
              on: (event: string, callback: (res: { error: { description: string } }) => void) => void;
            };
          }).Razorpay;

          console.log('Opening Razorpay Checkout overlay popup...');
          const rzp = new RazorpayConstructor(options);
          rzp.on('payment.failed', function (response: { error: { description: string } }) {
            console.error('Payment checkout failed callback:', response.error);
            setSubmitError(response.error.description || 'Payment transaction failed.');
            setIsFormLocked(false);
          });
          rzp.open();
          setIsSubmitting(false);
        } else {
          console.log('Razorpay payment not required. Proceeding directly to confirmation screen.');
          // Standard confirmed booking (Deferred payment)
          setBookingData({
            customerName: form.customerName,
            customerEmail: form.customerEmail,
            roomName: result.roomName,
            numberOfPeople: form.numberOfPeople,
            bookingId: result.bookingId,
            checkInDate: form.checkInDate,
          });
          router.push('/rooms-booking/confirmation');
        }
      } else {
        console.error('Booking creation API returned failure:', result.error);
        setSubmitError(result.error || 'Failed to complete reservation. Please try again.');
        setIsFormLocked(false);
      }
    } catch (err) {
      console.error('Exception caught in handleReserveSubmit:', err);
      setSubmitError(err instanceof Error ? err.message : 'Connection error. Please check your internet connection.');
      setIsFormLocked(false);
    } finally {
      if (!paymentLaunched) {
        setIsSubmitting(false);
      }
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Progress Bar Steps helper
  const progressPercent = (step / 4) * 100;

  return (
    <main className="min-h-dvh bg-[#f7f4ef] text-text-primary py-24 sm:py-28 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* ── Wizard Header & Progress Bar ── */}
        <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-text-muted">
            <span>Step {step} of 4</span>
            <span>
              {step === 1 && 'Select Room category'}
              {step === 2 && 'Review Room Features'}
              {step === 3 && 'Enter Guest Details'}
              {step === 4 && 'Confirm & Lock Reservation'}
            </span>
          </div>
          <div className="w-full bg-[#f1eeeb] h-1.5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              className="bg-accent h-full"
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>

        {/* ── Wizard Content panel with AnimatePresence ── */}
        <AnimatePresence mode="wait">
          
          {/* STEP 1: SELECT ROOM GRID */}
          {step === 1 && (
            <motion.div
              key="step-1"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h1 className="font-display italic text-4xl font-bold">Select Category</h1>
                <p className="text-text-muted text-sm">
                  Choose from our carefully crafted spaces designed for comfort, luxury, and tranquility.
                </p>
              </div>

              {roomsLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
              ) : roomsError ? (
                <div className="text-error bg-error-bg border border-error/10 p-4 rounded-2xl text-center">
                  {roomsError}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
                    <motion.div
                      key={room.id}
                      variants={fadeUp}
                      whileHover={{ y: -6 }}
                      className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm flex flex-col justify-between"
                    >
                      <div className="relative h-48 w-full bg-[#f1eeeb]">
                        <Image
                          src={room.thumbnail_image_url || '/images/hero-interior.png'}
                          alt={room.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        {room.available_units <= 0 && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-semibold uppercase tracking-wider text-xs">
                            Sold Out
                          </div>
                        )}
                      </div>

                      <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="inline-block text-[10px] uppercase font-bold tracking-widest bg-accent/10 text-accent px-2.5 py-0.5 rounded-full">
                              {room.occupancy_info || '2 Adults, 1 Child'}
                            </span>
                            <span className="text-xs text-text-muted">
                              {room.available_units} left
                            </span>
                          </div>
                          <h2 className="font-display italic text-xl font-bold text-text-primary leading-tight">
                            {room.name}
                          </h2>
                          <p className="text-text-muted text-xs line-clamp-2 leading-relaxed">
                            {room.description || 'Experience comfort and stunning valley coordinates at Hill View.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-black/5">
                          <div>
                            <span className="text-[10px] text-text-muted block uppercase tracking-wider">Per Night</span>
                            <span className="font-semibold text-text-primary">{formatPrice(room.price_per_night)}</span>
                          </div>
                          <button
                            disabled={room.available_units <= 0}
                            onClick={() => {
                              setSelectedRoom(room);
                              setForm((prev) => ({ ...prev, selectedRoom: room.id }));
                              setStep(2);
                            }}
                            className={`flex items-center gap-1 text-xs font-semibold px-4 py-2 rounded-full border transition-all cursor-pointer ${
                              room.available_units <= 0
                                ? 'border-black/5 bg-gray-50 text-text-muted cursor-not-allowed'
                                : 'border-accent/30 bg-accent/5 text-accent hover:bg-accent hover:text-white shadow-sm'
                            }`}
                          >
                            Select
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: ROOM DETAIL VIEW */}
          {step === 2 && selectedRoom && (
            <motion.div
              key="step-2"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12"
            >
              <div className="md:col-span-6 relative h-64 md:h-full min-h-[300px] bg-[#f1eeeb]">
                <Image
                  src={selectedRoom.image_url || '/images/hero-exterior.png'}
                  alt={selectedRoom.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              <div className="md:col-span-6 p-8 sm:p-10 flex flex-col justify-between space-y-8">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <span className="inline-block text-[10px] uppercase font-bold tracking-widest bg-accent/15 text-accent px-2.5 py-0.5 rounded-full">
                      {selectedRoom.occupancy_info || '2 Adults, 1 Child'}
                    </span>
                    <h1 className="font-display italic text-3xl font-bold leading-tight">
                      {selectedRoom.name}
                    </h1>
                  </div>

                  <p className="text-text-muted text-sm leading-relaxed">
                    {selectedRoom.description || 'Welcome to a cozy, curated hillside escape at Hill View. Features natural ventilation, stunning morning viewpoint sights, and premium materials designed for clean living.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Mountain className="w-4 h-4 text-accent" />
                      <span>Valley coordinates</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Coffee className="w-4 h-4 text-accent" />
                      <span>Free morning breakfast</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Wifi className="w-4 h-4 text-accent" />
                      <span>High speed Wi-Fi</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <ShieldCheck className="w-4 h-4 text-accent" />
                      <span>Free reservation cancel</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-black/5 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-text-muted block uppercase tracking-wider">Total Price</span>
                    <span className="text-2xl font-bold text-text-primary">{formatPrice(selectedRoom.price_per_night)}</span>
                    <span className="text-xs text-text-muted block">/night</span>
                  </div>

                  <div className="flex gap-2.5">
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-black/5 text-xs text-text-muted hover:bg-black/5 transition-all cursor-pointer font-semibold"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-full shadow-lg shadow-accent/20 transition-all cursor-pointer"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: CUSTOMER DETAILS FORM */}
          {step === 3 && selectedRoom && !user && (
            <motion.div
              key="step-3-auth"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-black/5 shadow-sm p-8 sm:p-12 text-center space-y-6"
            >
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mx-auto">
                  <User className="w-8 h-8" />
                </div>
                <h1 className="font-display italic text-2xl font-bold">Authentication Required</h1>
                <p className="text-text-muted text-sm leading-relaxed">
                  Please log in or create an account to proceed with your booking request. This helps us sync stays to your dashboard.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded-full shadow-lg shadow-accent/25 transition-all cursor-pointer"
                >
                  Log In
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/signup"
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 border border-black/5 text-xs text-text-muted hover:bg-black/5 transition-all cursor-pointer font-semibold rounded-full"
                >
                  Create Account
                </Link>
              </div>

              <div className="pt-4 border-t border-black/5 flex justify-start">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 border border-black/5 text-xs text-text-muted hover:bg-black/5 transition-all cursor-pointer font-semibold rounded-full"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && selectedRoom && user && (
            <motion.div
              key="step-3"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 sm:p-10 space-y-6"
            >
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-black/5">
                <div>
                  <h1 className="font-display italic text-2xl font-bold">Guest Particulars</h1>
                  <p className="text-text-muted text-xs mt-0.5">Please provide your coordinates below.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-text-muted block uppercase tracking-wider">Reserved Room</span>
                  <span className="font-semibold text-accent text-sm">{selectedRoom.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Customer Name */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <User className="w-3.5 h-3.5 text-text-muted" />
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    name="customerName"
                    value={form.customerName}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className={`form-input py-2 text-sm ${formErrors.customerName ? 'error' : ''}`}
                    required
                  />
                  {formErrors.customerName && <p className="text-error text-xs">{formErrors.customerName}</p>}
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Phone className="w-3.5 h-3.5 text-text-muted" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={form.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    className={`form-input py-2 text-sm ${formErrors.phoneNumber ? 'error' : ''}`}
                    required
                  />
                  {formErrors.phoneNumber && <p className="text-error text-xs">{formErrors.phoneNumber}</p>}
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Mail className="w-3.5 h-3.5 text-text-muted" />
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    name="customerEmail"
                    value={form.customerEmail}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className={`form-input py-2 text-sm ${formErrors.customerEmail ? 'error' : ''}`}
                    required
                  />
                  {formErrors.customerEmail && <p className="text-error text-xs">{formErrors.customerEmail}</p>}
                </div>

                {/* Guests count */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    Number of Guests *
                  </label>
                  <input
                    type="number"
                    name="numberOfPeople"
                    value={form.numberOfPeople || ''}
                    onChange={handleInputChange}
                    placeholder="Guests count"
                    min={1}
                    max={20}
                    className={`form-input py-2 text-sm ${formErrors.numberOfPeople ? 'error' : ''}`}
                    required
                  />
                  {formErrors.numberOfPeople && <p className="text-error text-xs">{formErrors.numberOfPeople}</p>}
                </div>

                {/* Check-In Date */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                    Check-in Date *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <input
                      type="date"
                      name="checkInDate"
                      value={form.checkInDate}
                      onChange={handleInputChange}
                      className={`form-input py-2 text-sm flex-1 ${formErrors.checkInDate ? 'error' : ''}`}
                      required
                    />
                    {dayOfWeek && (
                      <div className="bg-[#f7f4ef] border border-black/5 px-4 py-2 rounded-xl flex items-center justify-center font-semibold text-accent text-sm sm:w-40 shrink-0 select-none">
                        📅 {dayOfWeek}
                      </div>
                    )}
                  </div>
                  {formErrors.checkInDate && <p className="text-error text-xs">{formErrors.checkInDate}</p>}
                </div>

                {/* Address */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                    <MapPin className="w-3.5 h-3.5 text-text-muted" />
                    Address *
                  </label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleInputChange}
                    placeholder="Enter your full residential address"
                    rows={2}
                    className={`form-input py-2 text-sm resize-none ${formErrors.address ? 'error' : ''}`}
                    required
                  />
                  {formErrors.address && <p className="text-error text-xs">{formErrors.address}</p>}
                </div>

              </div>

              <div className="pt-6 border-t border-black/5 flex justify-end gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-black/5 text-xs text-text-muted hover:bg-black/5 transition-all cursor-pointer font-semibold"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={() => {
                    if (isFormValid) setStep(4);
                  }}
                  disabled={!isFormValid}
                  className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-full shadow-lg transition-all ${
                    isFormValid
                      ? 'bg-accent hover:bg-accent-hover text-white shadow-accent/20 cursor-pointer'
                      : 'bg-accent/40 text-white/80 cursor-not-allowed shadow-none'
                  }`}
                >
                  Continue to Confirm
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: CONFIRM / RESERVE REVIEW */}
          {step === 4 && selectedRoom && (
            <motion.div
              key="step-4"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-black/5 shadow-sm p-6 sm:p-10 space-y-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-black/5">
                <div>
                  <h1 className="font-display italic text-2xl font-bold">Review Reservation</h1>
                  <p className="text-text-muted text-xs mt-0.5">Double check details before confirmation.</p>
                </div>
                {!isFormLocked && (
                  <span className="text-xs bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full font-medium">
                    Review Required
                  </span>
                )}
                {isFormLocked && (
                  <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Locked & Ready
                  </span>
                )}
              </div>

              {/* Review particulars box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4 bg-[#f7f4ef]/60 p-5 rounded-2xl border border-black/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-black/5 pb-1">Room Particulars</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Room Type</span>
                      <span className="font-semibold text-text-primary">{selectedRoom.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Price per Night</span>
                      <span className="font-semibold text-text-primary">{formatPrice(selectedRoom.price_per_night)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Guests allowed</span>
                      <span className="font-semibold text-text-primary">{selectedRoom.occupancy_info}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 bg-[#f7f4ef]/60 p-5 rounded-2xl border border-black/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-black/5 pb-1">Guest Particulars</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Guest Name</span>
                      <span className="font-semibold text-text-primary">{form.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Phone Number</span>
                      <span className="font-semibold text-text-primary">{form.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Check-in Date</span>
                      <span className="font-semibold text-text-primary">{new Date(form.checkInDate).toLocaleDateString()} ({dayOfWeek})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Guest Count</span>
                      <span className="font-semibold text-text-primary">{form.numberOfPeople} Adults/Children</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Email</span>
                      <span className="font-semibold text-text-primary font-mono text-xs">{form.customerEmail}</span>
                    </div>
                    <div className="flex flex-col pt-1 border-t border-black/5">
                      <span className="text-text-muted">Address</span>
                      <span className="font-semibold text-text-primary mt-0.5">{form.address}</span>
                    </div>
                  </div>
                </div>
              </div>

              {submitError && (
                <div className="text-error bg-error-bg p-4 rounded-2xl text-sm border border-error/10 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-6 border-t border-black/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                
                {/* Edit details trigger */}
                {isFormLocked ? (
                  <button
                    onClick={() => setIsFormLocked(false)}
                    className="text-accent hover:underline text-sm font-semibold cursor-pointer"
                  >
                    Edit Particulars
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">
                    Lock the details first to enable reservation.
                  </span>
                )}

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setStep(3)}
                    disabled={isFormLocked}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-semibold transition-all ${
                      isFormLocked
                        ? 'border-black/5 bg-gray-50 text-text-muted cursor-not-allowed'
                        : 'border-black/5 text-text-muted hover:bg-black/5 cursor-pointer'
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  {/* CONFIRM BUTTON */}
                  <button
                    onClick={() => {
                      if (isFormValid) setIsFormLocked(true);
                    }}
                    disabled={isFormLocked || !isFormValid}
                    className={`px-5 py-2.5 text-xs font-semibold rounded-full shadow-lg transition-all ${
                      !isFormLocked && isFormValid
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer'
                        : 'bg-gray-100 text-text-muted cursor-not-allowed shadow-none'
                    }`}
                  >
                    Confirm Details
                  </button>

                  {/* RESERVE BUTTON */}
                  <button
                    onClick={handleReserveSubmit}
                    disabled={!isFormLocked || isSubmitting}
                    className={`flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold rounded-full shadow-xl transition-all ${
                      isFormLocked && !isSubmitting
                        ? 'bg-accent hover:bg-accent-hover text-white shadow-accent/25 cursor-pointer'
                        : 'bg-gray-100 text-text-muted cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Reserving...
                      </>
                    ) : (
                      'Reserve Room'
                    )}
                  </button>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </div>
    </main>
  );
}
