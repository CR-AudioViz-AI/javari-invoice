/**
 * INVOICE GENERATOR PRO - EXPENSE TRACKING API
 * Track expenses to deduct from invoices or reports
 * 
 * CR AudioViz AI - Fortune 50 Quality Standards
 * @version 2.0.0
 * @date December 27, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function for expense categories (not exported)
function getExpenseCategories() {
  return [
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
}

// GET - List expenses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categories = searchParams.get('categories');
    
    // If requesting categories list
    if (categories === 'true') {
      return NextResponse.json({ 
        success: true, 
        categories: getExpenseCategories() 
      });
    }
    
    // Otherwise list expenses
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    
    let query = supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false });
    
    if (userId) query = query.eq('user_id', userId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query.limit(100);
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      expenses: data || [],
      count: data?.length || 0
    });
  } catch (error: any) {
    console.error('Expense list error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list expenses' },
      { status: 500 }
    );
  }
}

// POST - Create expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, description, amount, category, date, vendor, receipt_url, notes } = body;
    
    if (!user_id || !description || !amount || !category || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, description, amount, category, date' },
        { status: 400 }
      );
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .insert([{
        user_id,
        description,
        amount: parseFloat(amount),
        category,
        date,
        vendor: vendor || null,
        receipt_url: receipt_url || null,
        notes: notes || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      expense: data 
    });
  } catch (error: any) {
    console.error('Expense creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// PUT - Update expense
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('expenses')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      expense: data 
    });
  } catch (error: any) {
    console.error('Expense update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update expense' },
      { status: 500 }
    );
  }
}

// DELETE - Delete expense
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing expense ID' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return NextResponse.json({ 
      success: true, 
      message: 'Expense deleted' 
    });
  } catch (error: any) {
    console.error('Expense deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
