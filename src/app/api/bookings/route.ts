import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isValidPhone, isValidEmail, isValidDate, isValidUUID, isValidString, isValidPincode } from '@/lib/validation';
import { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rateLimit';
import { calculateInvoice } from '@/lib/pricing';
import Razorpay from 'razorpay';

// ── Request body shape ──
interface BookingRequest {
  customerName: string;
  phoneNumber: string;
  alternatePhoneNumber?: string;
  address: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  selectedRoom: string; // room UUID
  customerEmail: string;
  checkInDate: string; // YYYY-MM-DD  
  token?: string; // auth access token
  roomUnitId: string; // room unit UUID
  numberOfPeople?: number;
  extraAdults?: number;
  extraChildren?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit check (moderate — booking abuse prevention)
    const ip = getClientIP(request);
    const rl = checkRateLimit('bookings', ip, RATE_LIMITS.BOOKING_MAX_REQUESTS, RATE_LIMITS.BOOKING_WINDOW_MS);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: `Too many booking requests. Please try again in ${rl.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body: BookingRequest = await request.json();

    // 1. Presence validation
    if (
      !body.customerName ||
      !body.phoneNumber ||
      !body.selectedRoom ||
      !body.customerEmail ||
      !body.checkInDate ||
      !body.token ||
      !body.roomUnitId
    ) {
      return NextResponse.json(
        { success: false, error: 'All fields, selected room unit, and authentication are required.' },
        { status: 400 }
      );
    }

    // 2. Format validation
    if (!isValidString(body.customerName, 2, 100)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid name (2-100 characters).' }, { status: 400 });
    }

    if (!isValidPhone(body.phoneNumber)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid 10-digit Indian phone number.' }, { status: 400 });
    }

    if (body.alternatePhoneNumber && !isValidPhone(body.alternatePhoneNumber)) {
      return NextResponse.json({ success: false, error: 'Alternate phone number is invalid.' }, { status: 400 });
    }

    if (!isValidEmail(body.customerEmail)) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (!isValidDate(body.checkInDate)) {
      return NextResponse.json({ success: false, error: 'Check-in date must be today or in the future (YYYY-MM-DD).' }, { status: 400 });
    }

    if (!isValidUUID(body.selectedRoom)) {
      return NextResponse.json({ success: false, error: 'Invalid room selection.' }, { status: 400 });
    }

    if (!isValidUUID(body.roomUnitId)) {
      return NextResponse.json({ success: false, error: 'Invalid room unit selection.' }, { status: 400 });
    }

    if (body.pincode && !isValidPincode(body.pincode)) {
      return NextResponse.json({ success: false, error: 'Pincode must be a 6-digit number.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 3. Verify User Auth Token
    const { data: { user }, error: authError } = await supabase.auth.getUser(body.token);
    if (authError || !user) {
      console.error('API Auth validation failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication is required or session expired.' },
        { status: 401 }
      );
    }

    // 4. Fetch Room Pricing and Occupancy Limits
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', body.selectedRoom)
      .single();

    if (roomError || !room) {
      console.error('Room fetch error:', roomError);
      return NextResponse.json(
        { success: false, error: 'Selected room category not found.' },
        { status: 404 }
      );
    }

    // Validate extra guest limits against database room max extra values
    const maxExtraAdults = room.max_extra_adults ?? 2;
    const maxExtraChildren = room.max_extra_children ?? 2;

    const extraAdults = Math.max(0, Math.min(Number(body.extraAdults) || 0, maxExtraAdults));
    const extraChildren = Math.max(0, Math.min(Number(body.extraChildren) || 0, maxExtraChildren));

    // A. Verify client age check for Couple room types (Double / Suite / One Bed)
    const isCoupleCategory =
      room.name.toLowerCase().includes('double') ||
      room.name.toLowerCase().includes('suite') ||
      room.name.toLowerCase().includes('one bed');

    if (isCoupleCategory) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('date_of_birth')
        .eq('id', user.id)
        .single();

      if (profile && profile.date_of_birth) {
        const birthDate = new Date(profile.date_of_birth);
        const today = new Date();
        let userAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          userAge--;
        }

        if (userAge < 20) {
          return NextResponse.json(
            { success: false, error: 'Bookings for a couple room category require guests to be 20 years of age or older.' },
            { status: 400 }
          );
        }
      }
    }

    // B. Check if this specific room number/unit is already booked for that date
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_unit_id', body.roomUnitId)
      .eq('check_in', body.checkInDate)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: 'This room is currently occupied for the selected date — please select another room.' },
        { status: 400 }
      );
    }

    // 5. Compute server-side invoice (recalculated from trusted database prices & extra guest limits)
    const invoice = calculateInvoice({
      pricePerNight: Number(room.price_per_night),
      nights: 1,
      extraAdults,
      extraChildren,
    });

    // 6. Validate Razorpay configurations for paid bookings
    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;

    if (!rzpKeyId || !rzpSecret) {
      console.error('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set.');
      return NextResponse.json(
        { success: false, error: 'Payment gateway is temporarily unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Create Booking under 'pending' status
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      service_type: 'room',
      room_or_activity_id: room.id,
      check_in: body.checkInDate,
      amount: invoice.grandTotal,
      status: 'pending',
      room_unit_id: body.roomUnitId,
      extra_adults: extraAdults,
      extra_children: extraChildren,
    };

    if (body.alternatePhoneNumber) insertPayload.alternate_phone = body.alternatePhoneNumber;
    if (body.streetAddress) {
      insertPayload.street_address = body.streetAddress;
    } else if (body.address) {
      insertPayload.street_address = body.address;
    }
    if (body.city) insertPayload.city = body.city;
    if (body.state) insertPayload.state = body.state;
    if (body.pincode) insertPayload.pincode = body.pincode;

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(insertPayload)
      .select()
      .single();

    if (bookingError || !booking) {
      console.error('Booking insertion error:', bookingError);
      return NextResponse.json(
        { success: false, error: 'Failed to record booking request. Please try again.' },
        { status: 500 }
      );
    }

    const bookingId: string = booking.id;
    const roomName: string = room.name;

    // 7. Handle Razorpay Order Creation (using recalculated grandTotal in paise)
    try {
      const razorpay = new Razorpay({
        key_id: rzpKeyId,
        key_secret: rzpSecret,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(invoice.grandTotal * 100), // paise
        currency: 'INR',
        receipt: bookingId,
      });

      // Store payment order record in DB
      await supabase.from('payments').insert({
        booking_id: bookingId,
        razorpay_order_id: order.id,
        amount: invoice.grandTotal,
        status: 'created',
      });

      return NextResponse.json({
        success: true,
        bookingId,
        roomName,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        numberOfPeople: body.numberOfPeople || 1,
        checkInDate: body.checkInDate,
        paymentRequired: true,
        orderId: order.id,
        razorpayKeyId: rzpKeyId,
        invoice,
      });
    } catch (rzpErr) {
      console.error('Razorpay order creation failed:', rzpErr);
      
      // ROLLBACK: Delete booking so database state stays consistent
      await supabase.from('bookings').delete().eq('id', bookingId);
      
      return NextResponse.json(
        { success: false, error: 'Failed to create payment order. Please try again.' },
        { status: 500 }
      );
    }

  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json(
      { success: false, error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
