import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { Resend } from 'resend';
import crypto from 'crypto';

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
    const { orderId, paymentId, signature, bookingId, token } = await request.json();

    if (!orderId || !paymentId || !signature || !bookingId) {
      return NextResponse.json({ success: false, error: 'Missing required payment parameters.' }, { status: 400 });
    }

    const rzpSecret = process.env.RAZORPAY_KEY_SECRET;
    if (!rzpSecret) {
      return NextResponse.json({ success: false, error: 'Razorpay keys not configured on the server.' }, { status: 500 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Verify Razorpay Signature (Cryptographic proof of authorized payment)
    const expectedSignature = crypto
      .createHmac('sha256', rzpSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Razorpay signature mismatch:', { expectedSignature, signature });
      return NextResponse.json({ success: false, error: 'Payment verification signature mismatch.' }, { status: 400 });
    }

    // 2. Update payment status to paid
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        status: 'paid',
      })
      .eq('razorpay_order_id', orderId);

    if (paymentUpdateError) {
      console.warn('Failed to update payments table status:', paymentUpdateError);
    }

    // 3. Update booking status to confirmed
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId)
      .select('*, profiles(*)')
      .single();

    if (bookingErr || !booking) {
      console.error('Failed to update booking status:', bookingErr);
      return NextResponse.json({ success: false, error: 'Failed to confirm booking record.' }, { status: 500 });
    }

    // 4. Resolve user email for transactional receipts (supports fallback if session token expired during OTP)
    let userEmail: string | null = null;

    if (token) {
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      if (authUser?.email) {
        userEmail = authUser.email;
      }
    }

    // Fallback: look up user by booking's user_id if token was missing or expired
    if (!userEmail && booking.user_id) {
      try {
        const { data: adminUser } = await supabase.auth.admin.getUserById(booking.user_id);
        if (adminUser?.user?.email) {
          userEmail = adminUser.user.email;
        }
      } catch (err) {
        console.warn('Fallback admin user lookup failed:', err);
      }
    }

    // 5. Fetch Room details for email
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_or_activity_id)
      .single();

    const roomName = room ? room.name : 'Selected Stay Room';

    // 6. Send transactional confirmation email via Resend
    const resend = getResend();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const ownerEmail = process.env.OWNER_EMAIL;

    const formattedDate = new Date(booking.check_in).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (resend && userEmail) {
      const emailPromises: Promise<unknown>[] = [];

      const isSandbox = fromEmail.includes('onboarding@resend.dev');
      const recipient = isSandbox ? (ownerEmail || 'codeex97@gmail.com') : userEmail;
      const subjectPrefix = isSandbox ? `[Sandbox for ${userEmail}] ` : '';

      // Customer Email
      emailPromises.push(
        resend.emails
          .send({
            from: `Hill View Bookings <${fromEmail}>`,
            to: recipient,
            subject: `${subjectPrefix}Booking Confirmed — #${bookingId.slice(0, 8).toUpperCase()}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                <h2 style="font-style: italic; color: #0f1410; margin-bottom: 8px;">Hill View</h2>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                <p>Dear <strong>${booking.profiles?.full_name || 'Guest'}</strong>,</p>
                <p>Your payment was successful and your reservation is confirmed! Here are the details:</p>
                
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
                    <td style="padding: 8px 0; color: #6b7280;">Amount Paid</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${booking.amount}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Payment ID</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${paymentId}</td>
                  </tr>
                </table>

                <div style="background: #f7f4ef; padding: 16px; border-radius: 8px; border-left: 3px solid #c8781f; margin: 20px 0;">
                  <strong>Cancellation Policy:</strong> Free cancellation up to 24h before check-in. Manage stays in your profile dashboard.
                </div>

                <p style="margin-top: 24px;">Warm regards,<br /><strong style="font-style: italic;">Hill View</strong></p>
              </div>
            `,
          })
          .catch((err) => {
            console.error('Failed to send customer payment confirmation email:', err);
          })
      );

      // Owner Notification Email
      if (ownerEmail) {
        emailPromises.push(
          resend.emails
            .send({
              from: `Hill View Bookings <${fromEmail}>`,
              to: ownerEmail,
              subject: 'New Paid Booking — Hill View',
              html: `
                <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                  <h2 style="color: #c8781f; margin-bottom: 16px;">💳 New Paid Booking Received</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 8px 0; color: #6b7280;">Guest Name</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${booking.profiles?.full_name}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${userEmail}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Room Category</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${roomName}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Check-in Date</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Amount Paid</td><td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${booking.amount}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Payment ID</td><td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${paymentId}</td></tr>
                    <tr><td style="padding: 8px 0; color: #6b7280;">Booking ID</td><td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${bookingId}</td></tr>
                  </table>
                </div>
              `,
            })
            .catch((err) => {
              console.error('Failed to send owner payment email:', err);
            })
        );
      }

      Promise.allSettled(emailPromises);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Payment verification failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
