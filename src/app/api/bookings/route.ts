import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
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
}

export async function POST(request: NextRequest) {
  try {
    const body: BookingRequest = await request.json();

    // 1. Basic validation
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

    const supabase = getSupabaseAdmin();

    // 2. Verify User Auth Token
    const { data: { user }, error: authError } = await supabase.auth.getUser(body.token);
    if (authError || !user) {
      console.error('API Auth validation failed:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication is required or session expired.' },
        { status: 401 }
      );
    }

    // 3. Fetch Room Pricing and Availability
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

    // 4. Validate Razorpay configurations for paid bookings
    const rzpKeyId = process.env.RAZORPAY_KEY_ID;
    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;

    if (!rzpKeyId || !rzpSecret) {
      console.error('Server side configuration missing: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not set.');
      return NextResponse.json(
        { success: false, error: 'Payment gateway configuration is missing on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.' },
        { status: 500 }
      );
    }

    const constructedAddress = body.address || `${body.streetAddress || ''}, ${body.city || ''}, ${body.state || ''} - ${body.pincode || ''}`;

    // Create Booking under 'pending' status
    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      service_type: 'room',
      room_or_activity_id: room.id,
      check_in: body.checkInDate,
      amount: room.price_per_night,
      status: 'pending',
      room_unit_id: body.roomUnitId,
      address: constructedAddress,
    };

    if (body.alternatePhoneNumber) insertPayload.alternate_phone = body.alternatePhoneNumber;
    if (body.streetAddress) insertPayload.street_address = body.streetAddress;
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
        { success: false, error: 'Failed to record booking request.' },
        { status: 500 }
      );
    }

    const bookingId: string = booking.id;
    const roomName: string = room.name;

    // 6. Handle Razorpay Order Creation (Mandatory for all paid rooms)
    try {
      const razorpay = new Razorpay({
        key_id: rzpKeyId,
        key_secret: rzpSecret,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(room.price_per_night * 100), // paise
        currency: 'INR',
        receipt: bookingId,
      });

      // Store payment order record in DB
      await supabase.from('payments').insert({
        booking_id: bookingId,
        razorpay_order_id: order.id,
        amount: room.price_per_night,
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
      });
    } catch (rzpErr) {
      console.error('Razorpay order creation failed:', rzpErr);
      
      // ROLLBACK: Delete booking so database state stays consistent
      await supabase.from('bookings').delete().eq('id', bookingId);
      
      const errMsg = rzpErr instanceof Error ? rzpErr.message : String(rzpErr);
      return NextResponse.json(
        { success: false, error: `Failed to create payment gateway order: ${errMsg}` },
        { status: 500 }
      );
    }

  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
