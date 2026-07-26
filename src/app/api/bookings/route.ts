import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import Razorpay from 'razorpay';

// ── Resend client ──
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email notifications will be skipped');
    return null;
  }
  return new Resend(apiKey);
}

// ── Request body shape ──
interface BookingRequest {
  customerName: string;
  phoneNumber: string;
  address: string;
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
      !body.address ||
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

    // Create Booking under 'pending' status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: user.id,
        service_type: 'room',
        room_or_activity_id: room.id,
        check_in: body.checkInDate,
        amount: room.price_per_night,
        status: 'pending',
        room_unit_id: body.roomUnitId,
      })
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

    // 7. Send Immediate Confirmation Email (Phase 1 / Payment Disabled Fallback)
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const ownerEmail = process.env.OWNER_EMAIL;

    const formattedDate = new Date(body.checkInDate).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (resend) {
      const client = resend as NonNullable<typeof resend>;
      const emailPromises: Promise<unknown>[] = [];

      const isSandbox = fromEmail.includes('onboarding@resend.dev');
      const recipient = isSandbox ? (ownerEmail || 'codeex97@gmail.com') : body.customerEmail;
      const subjectPrefix = isSandbox ? `[Sandbox for ${body.customerEmail}] ` : '';

      // Customer Email
      emailPromises.push(
        client.emails
          .send({
            from: `Hill View Bookings <${fromEmail}>`,
            to: recipient,
            subject: `${subjectPrefix}Booking Confirmed — #${bookingId.slice(0, 8).toUpperCase()}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                <h2 style="font-style: italic; color: #0f1410; margin-bottom: 8px;">Hill View</h2>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                <p>Dear <strong>${body.customerName}</strong>,</p>
                <p>Your reservation is confirmed! Here are your booking details:</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Booking ID</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${bookingId.slice(0, 8).toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Room Type</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${roomName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Check-in Date</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Guests Count</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.numberOfPeople || 1}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Amount</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${room.price_per_night}</td>
                  </tr>
                </table>

                <div style="background: #f7f4ef; padding: 16px; border-radius: 8px; border-left: 3px solid #c8781f; margin: 20px 0;">
                  <strong>Cancellation Policy:</strong> Free cancellation up to 24h before check-in. Stays are logged in your profile dashboard.
                </div>

                <p style="margin-top: 24px;">Warm regards,<br /><strong style="font-style: italic;">Hill View</strong></p>
              </div>
            `,
          })
      );

      // Owner Email
      if (ownerEmail) {
        const toEmail = ownerEmail as string;
        emailPromises.push(
          client.emails
            .send({
              from: `Hill View Bookings <${fromEmail}>`,
              to: toEmail,
              subject: 'New Booking Confirmed — Hill View',
              html: `
                <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                  <h2 style="color: #c8781f; margin-bottom: 16px;">🏔️ New Booking Confirmed</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">Guest Name</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.customerName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.phoneNumber}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.customerEmail}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Room Category</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${roomName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Check-in Date</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Guests</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.numberOfPeople}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Booking ID</td><td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${bookingId}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Payment Status</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">Pay Later</td></tr>
                  </table>
                </div>
              `,
            })
        );
      }

      Promise.allSettled(emailPromises);
    }

    return NextResponse.json({
      success: true,
      bookingId,
      roomName,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      numberOfPeople: body.numberOfPeople || 1,
      checkInDate: body.checkInDate,
      paymentRequired: false,
    });
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
