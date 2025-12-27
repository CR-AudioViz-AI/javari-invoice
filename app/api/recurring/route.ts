/**
 * INVOICE GENERATOR PRO - RECURRING INVOICES API
 * Automated recurring invoice management with multiple frequencies
 * 
 * CR AudioViz AI - Fortune 50 Quality Standards
 * @version 2.0.0
 * @date December 27, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { addDays, addWeeks, addMonths, addYears, format, parseISO } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

interface RecurringInvoice {
  id?: string;
  user_id: string;
  template_invoice_id: string;
  client_id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_run_date: string;
  last_run_date?: string;
  auto_send: boolean;
  send_days_before_due: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  invoices_generated: number;
  total_amount_generated: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// GET - List recurring invoices
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');

    let query = supabase
      .from('recurring_invoices')
      .select(`
        *,
        client:clients(id, name, email),
        template:invoices(id, invoice_number, total)
      `)
      .eq('user_id', user.id)
      .order('next_run_date', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      recurring_invoices: data || [],
      total: data?.length || 0,
    });

  } catch (error: any) {
    console.error('Error fetching recurring invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST - Create recurring invoice
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      template_invoice_id,
      client_id,
      frequency,
      start_date,
      end_date,
      auto_send = false,
      send_days_before_due = 0,
      notes,
    } = body;

    // Validate required fields
    if (!template_invoice_id || !client_id || !frequency || !start_date) {
      return NextResponse.json({
        error: 'Missing required fields: template_invoice_id, client_id, frequency, start_date'
      }, { status: 400 });
    }

    // Validate frequency
    const validFrequencies = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json({
        error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`
      }, { status: 400 });
    }

    // Calculate next run date
    const nextRunDate = calculateNextRunDate(start_date, frequency);

    const recurringInvoice: RecurringInvoice = {
      user_id: user.id,
      template_invoice_id,
      client_id,
      frequency,
      start_date,
      end_date,
      next_run_date: nextRunDate,
      auto_send,
      send_days_before_due,
      status: 'active',
      invoices_generated: 0,
      total_amount_generated: 0,
      notes,
    };

    const { data, error } = await supabase
      .from('recurring_invoices')
      .insert(recurringInvoice)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      recurring_invoice: data,
      message: `Recurring invoice created. Next invoice: ${nextRunDate}`,
    });

  } catch (error: any) {
    console.error('Error creating recurring invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Update recurring invoice
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Recurring invoice ID required' }, { status: 400 });
    }

    // If frequency or start_date changed, recalculate next_run_date
    if (updates.frequency || updates.start_date) {
      const { data: existing } = await supabase
        .from('recurring_invoices')
        .select('frequency, start_date, last_run_date')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        const frequency = updates.frequency || existing.frequency;
        const baseDate = existing.last_run_date || updates.start_date || existing.start_date;
        updates.next_run_date = calculateNextRunDate(baseDate, frequency);
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('recurring_invoices')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      recurring_invoice: data,
      message: 'Recurring invoice updated',
    });

  } catch (error: any) {
    console.error('Error updating recurring invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Cancel recurring invoice
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Recurring invoice ID required' }, { status: 400 });
    }

    // Soft delete - set status to cancelled
    const { data, error } = await supabase
      .from('recurring_invoices')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Recurring invoice cancelled',
    });

  } catch (error: any) {
    console.error('Error cancelling recurring invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateNextRunDate(fromDate: string, frequency: string): string {
  const date = parseISO(fromDate);
  let nextDate: Date;

  switch (frequency) {
    case 'weekly':
      nextDate = addWeeks(date, 1);
      break;
    case 'biweekly':
      nextDate = addWeeks(date, 2);
      break;
    case 'monthly':
      nextDate = addMonths(date, 1);
      break;
    case 'quarterly':
      nextDate = addMonths(date, 3);
      break;
    case 'yearly':
      nextDate = addYears(date, 1);
      break;
    default:
      nextDate = addMonths(date, 1);
  }

  return format(nextDate, 'yyyy-MM-dd');
}

// ============================================================================
// CRON JOB ENDPOINT - Process recurring invoices
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = format(new Date(), 'yyyy-MM-dd');

    // Get all recurring invoices due today
    const { data: dueInvoices, error: fetchError } = await supabase
      .from('recurring_invoices')
      .select(`
        *,
        template:invoices(*)
      `)
      .eq('status', 'active')
      .lte('next_run_date', today);

    if (fetchError) throw fetchError;

    const results = {
      processed: 0,
      failed: 0,
      invoices_created: [] as string[],
      errors: [] as string[],
    };

    for (const recurring of dueInvoices || []) {
      try {
        // Check if end_date has passed
        if (recurring.end_date && recurring.end_date < today) {
          await supabase
            .from('recurring_invoices')
            .update({ status: 'completed' })
            .eq('id', recurring.id);
          continue;
        }

        // Create new invoice from template
        const template = recurring.template;
        const newInvoice = {
          ...template,
          id: undefined,
          invoice_number: `INV-${Date.now().toString().slice(-8)}`,
          invoice_date: today,
          due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
          status: 'pending',
          recurring_invoice_id: recurring.id,
          created_at: new Date().toISOString(),
        };

        const { data: createdInvoice, error: createError } = await supabase
          .from('invoices')
          .insert(newInvoice)
          .select()
          .single();

        if (createError) throw createError;

        // Update recurring invoice stats
        const nextRunDate = calculateNextRunDate(today, recurring.frequency);
        await supabase
          .from('recurring_invoices')
          .update({
            last_run_date: today,
            next_run_date: nextRunDate,
            invoices_generated: recurring.invoices_generated + 1,
            total_amount_generated: recurring.total_amount_generated + template.total,
          })
          .eq('id', recurring.id);

        // Send invoice if auto_send is enabled
        if (recurring.auto_send) {
          // Queue email to be sent
          await supabase.from('email_queue').insert({
            type: 'invoice',
            recipient_email: template.to_email,
            invoice_id: createdInvoice.id,
            scheduled_for: new Date().toISOString(),
          });
        }

        results.processed++;
        results.invoices_created.push(createdInvoice.invoice_number);

      } catch (err: any) {
        results.failed++;
        results.errors.push(`Recurring ${recurring.id}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} recurring invoices`,
      results,
    });

  } catch (error: any) {
    console.error('Error processing recurring invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
