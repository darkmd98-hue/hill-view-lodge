import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET is not configured. Webhook skipped.');
      return new Response('Webhook secret missing', { status: 500 });
    }

    if (!signature) {
      return new Response('Missing signature header', { status: 400 });
    }

    // 1. Verify Webhook Signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.error('Webhook signature mismatch.');
      return new Response('Signature mismatch', { status: 400 });
    }

    // 2. Parse body
    const event = JSON.parse(body);
    
    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      if (orderId) {
        const supabase = getSupabaseAdmin();

        // Check if payment is already marked paid
        const { data: payment } = await supabase
          .from('payments')
          .select('*')
          .eq('razorpay_order_id', orderId)
          .single();

        if (payment && payment.status !== 'paid') {
          // Update payment record to paid
          await supabase
            .from('payments')
            .update({
              razorpay_payment_id: paymentId,
              status: 'paid',
            })
            .eq('razorpay_order_id', orderId);

          // Update booking record to confirmed
          await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);

          console.log(`redundant webhook payment verification succeeded for order: ${orderId}`);
        }
      }
    }

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('Razorpay Webhook handler error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
