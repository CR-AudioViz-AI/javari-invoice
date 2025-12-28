/**
 * STRIPE WEBHOOK HANDLER FOR INVOICE PAYMENTS
 * Automatically marks invoices as paid when payment succeeds
 * 
 * @version 1.0.1
 * @date December 27, 2025
 * @fix Changed apiVersion from '2024-06-20' to '2023-10-16' for type compatibility
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Webhook secret for signature verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleSuccessfulPayment(session);
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentIntentSuccess(paymentIntent);
      break;
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailed(paymentIntent);
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      await handleRefund(charge);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// ==============================================================================
// PAYMENT HANDLERS
// ==============================================================================

async function handleSuccessfulPayment(session: Stripe.Checkout.Session) {
  const invoiceId = session.metadata?.invoice_id;
  
  if (!invoiceId) {
    console.log('No invoice_id in session metadata');
    return;
  }

  const amountPaid = (session.amount_total || 0) / 100; // Convert from cents

  try {
    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('Invoice not found:', invoiceId);
      return;
    }

    // Calculate new balance
    const newAmountPaid = (invoice.amount_paid || 0) + amountPaid;
    const newBalance = invoice.total - newAmountPaid;
    
    // Determine new status
    let newStatus = invoice.status;
    if (newBalance <= 0) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    // Update invoice
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: newStatus,
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalance),
        paid_at: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Failed to update invoice:', updateError);
      return;
    }

    // Record payment
    await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount: amountPaid,
      currency: session.currency?.toUpperCase() || 'USD',
      method: 'stripe',
      status: 'completed',
      transaction_id: session.payment_intent as string,
      stripe_session_id: session.id,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    // Log activity
    await supabase.from('activity_logs').insert({
      entity_type: 'invoice',
      entity_id: invoiceId,
      action: 'payment_received',
      details: {
        amount: amountPaid,
        method: 'stripe',
        session_id: session.id,
        new_status: newStatus
      },
      created_at: new Date().toISOString()
    });

    console.log(`Payment processed for invoice ${invoiceId}: $${amountPaid}`);

  } catch (error) {
    console.error('Error processing payment:', error);
  }
}

async function handlePaymentIntentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoice_id;
  
  if (!invoiceId) {
    console.log('No invoice_id in payment intent metadata');
    return;
  }

  const amountPaid = paymentIntent.amount / 100;

  try {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      console.error('Invoice not found:', invoiceId);
      return;
    }

    const newAmountPaid = (invoice.amount_paid || 0) + amountPaid;
    const newBalance = invoice.total - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : newAmountPaid > 0 ? 'partial' : invoice.status;

    await supabase
      .from('invoices')
      .update({
        status: newStatus,
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalance),
        paid_at: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_at,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount: amountPaid,
      currency: paymentIntent.currency.toUpperCase(),
      method: 'stripe',
      status: 'completed',
      transaction_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    console.log(`Payment intent succeeded for invoice ${invoiceId}: $${amountPaid}`);

  } catch (error) {
    console.error('Error processing payment intent:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata?.invoice_id;
  
  if (!invoiceId) {
    return;
  }

  try {
    await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      method: 'stripe',
      status: 'failed',
      transaction_id: paymentIntent.id,
      error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
      created_at: new Date().toISOString()
    });

    await supabase.from('activity_logs').insert({
      entity_type: 'invoice',
      entity_id: invoiceId,
      action: 'payment_failed',
      details: {
        amount: paymentIntent.amount / 100,
        error: paymentIntent.last_payment_error?.message
      },
      created_at: new Date().toISOString()
    });

    console.log(`Payment failed for invoice ${invoiceId}`);

  } catch (error) {
    console.error('Error logging failed payment:', error);
  }
}

async function handleRefund(charge: Stripe.Charge) {
  const invoiceId = charge.metadata?.invoice_id;
  
  if (!invoiceId) {
    return;
  }

  const refundAmount = (charge.amount_refunded || 0) / 100;

  try {
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (fetchError || !invoice) {
      return;
    }

    const newAmountPaid = Math.max(0, (invoice.amount_paid || 0) - refundAmount);
    const newBalance = invoice.total - newAmountPaid;
    const newStatus = newAmountPaid === 0 ? 'sent' : newBalance > 0 ? 'partial' : 'paid';

    await supabase
      .from('invoices')
      .update({
        status: newStatus,
        amount_paid: newAmountPaid,
        balance_due: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    await supabase.from('invoice_payments').insert({
      invoice_id: invoiceId,
      amount: -refundAmount,
      currency: charge.currency.toUpperCase(),
      method: 'stripe',
      status: 'refunded',
      transaction_id: charge.id,
      created_at: new Date().toISOString()
    });

    await supabase.from('activity_logs').insert({
      entity_type: 'invoice',
      entity_id: invoiceId,
      action: 'payment_refunded',
      details: {
        amount: refundAmount,
        new_status: newStatus
      },
      created_at: new Date().toISOString()
    });

    console.log(`Refund processed for invoice ${invoiceId}: $${refundAmount}`);

  } catch (error) {
    console.error('Error processing refund:', error);
  }
}
