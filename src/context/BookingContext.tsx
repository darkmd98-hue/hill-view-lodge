'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { BookingConfirmation } from '@/lib/types';

interface BookingContextType {
  bookingData: BookingConfirmation | null;
  setBookingData: (data: BookingConfirmation) => void;
  clearBookingData: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookingData, setBookingDataState] =
    useState<BookingConfirmation | null>(null);

  const setBookingData = useCallback((data: BookingConfirmation) => {
    setBookingDataState(data);
  }, []);

  const clearBookingData = useCallback(() => {
    setBookingDataState(null);
  }, []);

  return (
    <BookingContext.Provider
      value={{ bookingData, setBookingData, clearBookingData }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking(): BookingContextType {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
