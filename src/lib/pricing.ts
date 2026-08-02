// ── Pricing & Invoicing Logic (Shared between Client & Server) ──

export const EXTRA_ADULT_PRICE = 500; // Flat per stay
export const EXTRA_CHILD_PRICE = 300; // Flat per stay

/**
 * Determines GST Rate based on Room Price Per Night:
 * - <= ₹1,000: 0% GST
 * - <= ₹7,500: 5% GST
 * - > ₹7,500: 18% GST
 */
export function calculateGstRate(pricePerNight: number): number {
  if (pricePerNight <= 1000) return 0;
  if (pricePerNight <= 7500) return 5;
  return 18;
}

export interface InvoiceCalculationInput {
  pricePerNight: number;
  nights?: number;
  extraAdults: number;
  extraChildren: number;
}

export interface InvoiceBreakdown {
  roomRateTotal: number;
  extraAdultsCharge: number;
  extraChildrenCharge: number;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
}

/**
 * Calculates itemized invoice breakdown for a booking.
 * Used everywhere to guarantee zero price drift:
 * - Wizard live preview
 * - Step 4 Pre-payment Chargesheet
 * - Server-side Razorpay order creation
 * - DB Invoice record insertion
 * - On-screen confirmation invoice & Resend email breakdown
 */
export function calculateInvoice({
  pricePerNight,
  nights = 1,
  extraAdults,
  extraChildren,
}: InvoiceCalculationInput): InvoiceBreakdown {
  const safeNights = Math.max(1, nights);
  const safeExtraAdults = Math.max(0, extraAdults);
  const safeExtraChildren = Math.max(0, extraChildren);

  const roomRateTotal = pricePerNight * safeNights;
  const extraAdultsCharge = safeExtraAdults * EXTRA_ADULT_PRICE;
  const extraChildrenCharge = safeExtraChildren * EXTRA_CHILD_PRICE;
  const subtotal = roomRateTotal + extraAdultsCharge + extraChildrenCharge;
  const gstRate = calculateGstRate(pricePerNight);
  const gstAmount = Math.round(subtotal * (gstRate / 100));
  const grandTotal = subtotal + gstAmount;

  return {
    roomRateTotal,
    extraAdultsCharge,
    extraChildrenCharge,
    subtotal,
    gstRate,
    gstAmount,
    grandTotal,
  };
}
