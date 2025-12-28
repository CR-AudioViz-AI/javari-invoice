/**
 * PAYPAL WEBHOOK HANDLER FOR INVOICE PAYMENTS
 * Automatically marks invoices as paid when PayPal payment succeeds
 * 
 * @version 1.0.1
 * @date December 27, 2025
 * @fix Move Supabase initialization inside handler to avoid build-time errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// PayPal webhook verification
async function verifyPayPalWebhook(body: string, headers: Headers): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  
  if (!webhookId || !process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    console.log('PayPal credentials not configured, skipping verification');
    return true; // Allow for development/testing
  }

  try {
    // Get PayPal access token
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const { access_token } = await tokenResponse.json();

    // Verify the webhook
    const verifyResponse = await fetch('https://api-m.paypal.com/v1/notifications/verify-webhook-signature', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        auth_algo: headers.get('paypal-auth-algo'),
        cert_url: headers.get('paypal-cert-url'),
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: JSON.parse(body)
      })
    });

    const result = await verifyResponse.json();
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('PayPal webhook verification error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Initialize Supabase inside the handler to avoid build-time errors
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase environment variables not configured');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const body = await request.text();
    
    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(body, request.headers);
    if (!isValid) {
      console.error('Invalid PayPal webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('PayPal webhook event:', event.event_type);

    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const capture = event.resource;
        const invoiceId = capture.custom_id || capture.invoice_id;

        if (invoiceId) {
          // Update invoice status
          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              paypal_capture_id: capture.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', invoiceId);

          if (updateError) {
            console.error('Error updating invoice:', updateError);
          } else {
            console.log(`Invoice ${invoiceId} marked as paid via PayPal`);

            // Record the payment
            const amount = parseFloat(capture.amount?.value || '0');
            await supabase.from('invoice_payments').insert({
              invoice_id: invoiceId,
              amount: amount,
              currency: capture.amount?.currency_code || 'USD',
              payment_method: 'paypal',
              payment_reference: capture.id,
              status: 'completed',
              paid_at: new Date().toISOString()
            });
          }
        }
        break;
      }

      case 'PAYMENT.CAPTURE.REFUNDED': {
        const refund = event.resource;
        // Find the invoice by PayPal capture ID
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id')
          .eq('paypal_capture_id', refund.id)
          .limit(1);

        if (invoices && invoices.length > 0) {
          await supabase
            .from('invoices')
            .update({
              status: 'refunded',
              updated_at: new Date().toISOString()
            })
            .eq('id', invoices[0].id);

          console.log(`Invoice ${invoices[0].id} marked as refunded`);
        }
        break;
      }

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.PENDING': {
        const capture = event.resource;
        const invoiceId = capture.custom_id || capture.invoice_id;
        console.log(`PayPal payment ${event.event_type} for invoice ${invoiceId}`);
        break;
      }

      default:
        console.log(`Unhandled PayPal event type: ${event.event_type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
