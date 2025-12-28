/**
 * INVOICE GENERATOR PRO - EXPENSE TRACKING API
 * Track expenses to deduct from invoices or reports
 * 
 * CR AudioViz AI - Fortune 50 Quality Standards
 * @version 2.0.1
 * @date December 27, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Internal expense categories (not exported to avoid route error)
const expenseCategories = [
  { id: 'advertising', name: 'Advertising & Marketing', icon: '📢' },
  { id: 'software', name: 'Software & Subscriptions', icon: '💻' },
  { id: 'office', name: 'Office Supplies', icon: '📎' },
  { id: 'equipment', name: 'Equipment', icon: '🖥️' },
  { id: 'travel', name: 'Travel', icon: '✈️' },
  { id: 'meals', name: 'Meals & Entertainment', icon: '🍽️' },
  { id: 'professional', name: 'Professional Services', icon: '👔' },
  { id: 'utilities', name: 'Utilities', icon: '💡' },
  { id: 'rent', name: 'Rent & Lease', icon: '🏢' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️' },
  { id: 'taxes', name: 'Taxes & Licenses', icon: '📋' },
  { id: 'shipping', name: 'Shipping & Delivery', icon: '📦' },
  { id: 'contractors', name: 'Contractors', icon: '👷' },
  { id: 'education', name: 'Education & Training', icon: '📚' },
  { id: 'other', name: 'Other', icon: '📁' },
];

// GET - List expenses
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
    const action = searchParams.get('action') || 'list';
    const category = searchParams.get('category');
    const clientId = searchParams.get('client_id');
    const invoiceId = searchParams.get('invoice_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period');

    // Return categories list
    if (action === 'categories') {
      return NextResponse.json({ categories: expenseCategories });
    }

    // Return summary/stats
    if (action === 'summary') {
      return await getExpenseSummary(user.id, startDate, endDate, period);
    }

    // Build query
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (category) query = query.eq('category', category);
    if (clientId) query = query.eq('client_id', clientId);
    if (invoiceId) query = query.eq('invoice_id', invoiceId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query.limit(100);

    if (error) throw error;

    const total = data?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
    const byCategory = data?.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      expenses: data || [],
      total,
      count: data?.length || 0,
      by_category: byCategory,
    });

  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create expense
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
    const { description, amount, category, date } = body;

    if (!description || !amount || !category || !date) {
      return NextResponse.json({
        error: 'description, amount, category, and date are required'
      }, { status: 400 });
    }

    const expense = {
      user_id: user.id,
      description,
      amount: parseFloat(amount),
      category,
      date,
      client_id: body.client_id,
      invoice_id: body.invoice_id,
      receipt_url: body.receipt_url,
      notes: body.notes,
      is_billable: body.is_billable || false,
      is_reimbursable: body.is_reimbursable || false,
      tax_deductible: body.tax_deductible !== false,
      vendor: body.vendor,
      payment_method: body.payment_method,
      currency: body.currency || 'USD',
    };

    const { data, error } = await supabase
      .from('expenses')
      .insert(expense)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      expense: data,
      message: 'Expense recorded',
    });

  } catch (error: any) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update expense
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
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    if (updates.amount) {
      updates.amount = parseFloat(updates.amount);
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      expense: data,
      message: 'Expense updated',
    });

  } catch (error: any) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete expense
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
      return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Expense deleted',
    });

  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function for expense summary
async function getExpenseSummary(
  userId: string,
  startDate?: string | null,
  endDate?: string | null,
  period?: string | null
) {
  let start: string;
  let end: string;
  const now = new Date();

  if (startDate && endDate) {
    start = startDate;
    end = endDate;
  } else if (period === 'quarter') {
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    start = format(quarterStart, 'yyyy-MM-dd');
    end = format(endOfMonth(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 2, 1)), 'yyyy-MM-dd');
  } else if (period === 'year') {
    start = `${now.getFullYear()}-01-01`;
    end = `${now.getFullYear()}-12-31`;
  } else {
    start = format(startOfMonth(now), 'yyyy-MM-dd');
    end = format(endOfMonth(now), 'yyyy-MM-dd');
  }

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .gte('date', start)
    .lte('date', end);

  if (error) throw error;

  const total = expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const billable = expenses?.filter(e => e.is_billable).reduce((sum, e) => sum + e.amount, 0) || 0;
  const taxDeductible = expenses?.filter(e => e.tax_deductible).reduce((sum, e) => sum + e.amount, 0) || 0;

  const byCategory = expenseCategories.map(cat => {
    const catExpenses = expenses?.filter(e => e.category === cat.id) || [];
    return {
      ...cat,
      amount: catExpenses.reduce((sum, e) => sum + e.amount, 0),
      count: catExpenses.length,
    };
  }).filter(c => c.amount > 0);

  return NextResponse.json({
    period: { start, end },
    summary: {
      total,
      billable,
      non_billable: total - billable,
      tax_deductible: taxDeductible,
      expense_count: expenses?.length || 0,
    },
    by_category: byCategory,
  });
}
