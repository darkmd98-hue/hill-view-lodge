import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateInvoice } from '@/lib/pricing';
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

    // 4. Resolve user email for transactional receipts
    let userEmail: string | null = null;

    if (token) {
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      if (authUser?.email) {
        userEmail = authUser.email;
      }
    }

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

    // 5. Fetch Room details & calculate itemized Invoice
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', booking.room_or_activity_id)
      .single();

    const roomName = room ? room.name : 'Selected Stay Room';
    const pricePerNight = room ? Number(room.price_per_night) : Number(booking.amount);
    const extraAdults = Number(booking.extra_adults) || 0;
    const extraChildren = Number(booking.extra_children) || 0;

    const invoice = calculateInvoice({
      pricePerNight,
      nights: 1,
      extraAdults,
      extraChildren,
    });

    // 6. Save Invoice record to database
    try {
      await supabase.from('invoices').insert({
        booking_id: bookingId,
        room_rate_total: invoice.roomRateTotal,
        extra_adults_charge: invoice.extraAdultsCharge,
        extra_children_charge: invoice.extraChildrenCharge,
        subtotal: invoice.subtotal,
        gst_rate: invoice.gstRate,
        gst_amount: invoice.gstAmount,
        grand_total: invoice.grandTotal,
      });
    } catch (invDbErr) {
      console.warn('Invoice DB record insertion skipped/failed:', invDbErr);
    }

    // 7. Send transactional confirmation email via Resend with Itemized Chargesheet
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

      const itemizedHtml = `
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Booking ID</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; font-family: monospace;">${bookingId.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Room Category</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${roomName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Check-in Date</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formattedDate}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Room Rate (1 night)</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${invoice.roomRateTotal}</td>
          </tr>
          ${extraAdults > 0 ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Extra Adults (${extraAdults} × ₹500)</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${invoice.extraAdultsCharge}</td>
          </tr>` : ''}
          ${extraChildren > 0 ? `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Extra Children (${extraChildren} × ₹300)</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${invoice.extraChildrenCharge}</td>
          </tr>` : ''}
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Subtotal</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${invoice.subtotal}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">GST (${invoice.gstRate}%)</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600;">₹${invoice.gstAmount}</td>
          </tr>
          <tr style="border-top: 2px solid #0f1410;">
            <td style="padding: 10px 0; font-weight: 700; color: #0f1410; font-size: 16px;">Grand Total Paid</td>
            <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #c8781f; font-size: 16px;">₹${invoice.grandTotal}</td>
          </tr>
        </table>
      `;

      // Customer Email
      emailPromises.push(
        resend.emails
          .send({
            from: `Hill View Bookings <${fromEmail}>`,
            to: recipient,
            subject: `${subjectPrefix}Booking Confirmed & Tax Invoice — #${bookingId.slice(0, 8).toUpperCase()}`,
            html: `
              <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 32px; color: #1a1a1a;">
                <h2 style="font-style: italic; color: #0f1410; margin-bottom: 8px;">Hill View Lodge</h2>
                <p style="font-size: 12px; color: #6b7280; margin-top: 0;">Official Tax Invoice & Payment Receipt</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                <p>Dear <strong>${booking.profiles?.full_name || 'Guest'}</strong>,</p>
                <p>Your payment was successful and your reservation is confirmed! Here is your itemized invoice breakdown:</p>
                
                ${itemizedHtml}

                <div style="background: #f7f4ef; padding: 16px; border-radius: 8px; border-left: 3px solid #c8781f; margin: 20px 0;">
                  <strong>Payment Reference ID:</strong> <span style="font-family: monospace;">${paymentId}</span><br />
                  <strong>Cancellation Policy:</strong> Free cancellation up to 24h before check-in. Manage stays in your profile dashboard.
                </div>

                <p style="margin-top: 24px;">Warm regards,<br /><strong style="font-style: italic;">Hill View Property Care</strong></p>
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
                  ${itemizedHtml}
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

    return NextResponse.json({ success: true, invoice });
  } catch (err) {
    console.error('Payment verification failed:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
