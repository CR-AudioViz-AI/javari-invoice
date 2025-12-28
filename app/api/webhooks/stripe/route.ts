/**
 * STRIPE WEBHOOK HANDLER FOR INVOICE PAYMENTS
 * Automatically marks invoices as paid when payment succeeds
 * 
 * @version 1.0.2
 * @date December 27, 2025
 * @fix Move Stripe/Supabase initialization inside handler to avoid build-time errors
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  // Initialize clients inside the handler to avoid build-time errors
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe environment variables not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase environment variables not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
  });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
    }

    // Verify the webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = paymentIntent.metadata?.invoice_id;

        if (invoiceId) {
          // Update invoice status to paid
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntent.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          if (updateError) {
            console.error('Error updating invoice:', updateError);
          } else {
            console.log(`Invoice ${invoiceId} marked as paid`);

            // Record the payment
            await supabase.from('invoice_payments').insert({
              invoice_id: invoiceId,
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency.toUpperCase(),
              payment_method: 'stripe',
              payment_reference: paymentIntent.id,
              status: 'completed',
              paid_at: new Date().toISOString()
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const invoiceId = paymentIntent.metadata?.invoice_id;

        if (invoiceId) {
          console.log(`Payment failed for invoice ${invoiceId}`);
          // Optionally update invoice status or send notification
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const invoiceId = charge.metadata?.invoice_id;

        if (invoiceId) {
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'refunded',
              updated_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          if (!updateError) {
            console.log(`Invoice ${invoiceId} marked as refunded`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
