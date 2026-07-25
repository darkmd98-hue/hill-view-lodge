import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ── Server-only Supabase client ──
function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(url, key);
}

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
  numberOfPeople: number;
  selectedRoom: string; // room UUID
  customerEmail: string;
  checkInDate: string; // check-in date (YYYY-MM-DD)
}

export async function POST(request: NextRequest) {
  try {
    const body: BookingRequest = await request.json();

    // Basic server-side validation
    if (
      !body.customerName ||
      !body.phoneNumber ||
      !body.address ||
      !body.numberOfPeople ||
      !body.selectedRoom ||
      !body.customerEmail ||
      !body.checkInDate
    ) {
      return NextResponse.json(
        { success: false, error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // ── 1. Call create_booking RPC ──
    const supabase = getServerSupabase();
    const { data, error } = await supabase.rpc('create_booking', {
      p_room_id: body.selectedRoom,
      p_customer_name: body.customerName,
      p_customer_phone: body.phoneNumber,
      p_customer_email: body.customerEmail,
      p_customer_address: body.address,
      p_number_of_people: body.numberOfPeople,
      p_check_in_date: body.checkInDate,
    });

    // Supabase-level error
    if (error) {
      console.error('Supabase RPC error:', error);
      return NextResponse.json(
        { success: false, error: 'Something went wrong. Please try again later.' },
        { status: 500 }
      );
    }

    // Application-level error (e.g., room full)
    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.error || 'Booking failed.' },
        { status: 200 }
      );
    }

    // ── 2. Booking succeeded — fire notification emails in parallel ──
    const bookingId: string = data.booking_id;
    const roomName: string = data.room_name;
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
      const emailPromises: Promise<unknown>[] = [];

      // Email to customer
      emailPromises.push(
        resend.emails
          .send({
            from: `Hill View <${fromEmail}>`,
            to: body.customerEmail,
            subject: "Your Hill View booking request — we'll be in touch",
            html: `
              <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                <h2 style="font-style: italic; color: #0f1410; margin-bottom: 8px;">Hill View</h2>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                <p>Dear <strong>${body.customerName}</strong>,</p>
                <p>Thank you for your booking request! Here are the details:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Room</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${roomName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Guests</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.numberOfPeople}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Check-in Date</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Booking ID</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${bookingId.slice(0, 8).toUpperCase()}</td>
                  </tr>
                </table>
                <p style="background: #f7f4ef; padding: 16px; border-radius: 8px; border-left: 3px solid #c8781f;">
                  <strong>You will get a message or call from the property for confirmation.</strong>
                </p>
                <p style="margin-top: 24px;">Warm regards,<br /><strong style="font-style: italic;">Hill View</strong></p>
              </div>
            `,
          })
          .catch((err) => {
            console.error('Failed to send customer confirmation email:', err);
          })
      );

      // Email to owner
      if (ownerEmail) {
        emailPromises.push(
          resend.emails
            .send({
              from: `Hill View Bookings <${fromEmail}>`,
              to: ownerEmail,
              subject: 'New booking — Hill View',
              html: `
                <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                  <h2 style="color: #c8781f; margin-bottom: 16px;">🏔️ New Booking Received</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">Guest Name</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.customerName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Phone</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.phoneNumber}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.customerEmail}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Address</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.address}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Room</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${roomName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Guests</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${body.numberOfPeople}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Check-in Date</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Booking ID</td><td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${bookingId}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Status</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">Pending</td></tr>
                  </table>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                  <p style="color: #6b7280; font-size: 14px;">Please call or message the guest to confirm.</p>
                </div>
              `,
            })
            .catch((err) => {
              console.error('Failed to send owner notification email:', err);
            })
        );
      } else {
        console.warn('OWNER_EMAIL not set — skipping owner notification');
      }

      // TODO: Twilio SMS notification to owner can be layered in here
      // once the Twilio number/registration is sorted. Would fire in
      // parallel alongside the email promises above.

      // Fire all emails in parallel — don't await blocking the response
      // Notification failures must never fail the booking
      Promise.allSettled(emailPromises).then((results) => {
        results.forEach((result, idx) => {
          if (result.status === 'rejected') {
            console.error(`Email ${idx} failed:`, result.reason);
          }
        });
      });
    }

    // ── 3. Return success to client ──
    return NextResponse.json({
      success: true,
      bookingId,
      roomName,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      numberOfPeople: body.numberOfPeople,
      checkInDate: body.checkInDate,
    });
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
