import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';

// ── Resend client ──
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set — email notifications will be skipped');
    return null;
  }
  return new Resend(apiKey);
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, token } = await request.json();

    if (!bookingId || !token) {
      return NextResponse.json({ success: false, error: 'Missing parameters.' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Verify User Auth Token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    // 2. Fetch booking and confirm ownership
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, profiles(*)')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ success: false, error: 'Booking request not found.' }, { status: 404 });
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ success: false, error: 'Booking is already cancelled.' }, { status: 400 });
    }

    // 3. Mark booking as cancelled
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (cancelError) {
      console.error('Failed to cancel booking:', cancelError);
      return NextResponse.json({ success: false, error: 'Failed to update booking status.' }, { status: 500 });
    }

    // 4. Increment room units back
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_or_activity_id)
      .single();

    if (room) {
      await supabase
        .from('rooms')
        .update({ available_units: room.available_units + 1 })
        .eq('id', room.id);
    }

    const roomName = room ? room.name : 'Reserved Stay Room';

    // 5. Send cancellation emails via Resend
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const ownerEmail = process.env.OWNER_EMAIL;

    const formattedDate = new Date(booking.check_in).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (resend) {
      const emailPromises: Promise<unknown>[] = [];

      // Customer Cancellation Email
      emailPromises.push(
        resend.emails
          .send({
            from: `Hill View Bookings <${fromEmail}>`,
            to: user.email!,
            subject: `Booking Cancelled — #${bookingId.slice(0, 8).toUpperCase()}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                <h2 style="font-style: italic; color: #0f1410; margin-bottom: 8px;">Hill View</h2>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                <p>Dear <strong>${booking.profiles?.full_name || 'Guest'}</strong>,</p>
                <p>Your booking cancellation request has been processed. Here are the details:</p>
                
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
                    <td style="padding: 8px 0; color: #6b7280;">Status</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">Cancelled</td>
                  </tr>
                </table>

                <p style="margin-top: 24px;">Warm regards,<br /><strong style="font-style: italic;">Hill View</strong></p>
              </div>
            `,
          })
          .catch((err) => {
            console.error('Failed to send customer cancellation email:', err);
          })
      );

      // Owner Notification Email
      if (ownerEmail) {
        emailPromises.push(
          resend.emails
            .send({
              from: `Hill View Bookings <${fromEmail}>`,
              to: ownerEmail,
              subject: 'Booking Cancelled — Hill View',
              html: `
                <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                  <h2 style="color: #dc2626; margin-bottom: 16px;">❌ Booking Cancelled</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">Guest Name</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${booking.profiles?.full_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${user.email}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Room Category</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${roomName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Check-in Date</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Booking ID</td><td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${bookingId}</td></tr>
                  </table>
                </div>
              `,
            })
            .catch((err) => {
              console.error('Failed to send owner cancellation email:', err);
            })
        );
      }

      Promise.allSettled(emailPromises);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Failed to cancel booking:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
