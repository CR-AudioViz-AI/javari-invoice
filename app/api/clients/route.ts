/**
 * INVOICE GENERATOR PRO - CLIENT MANAGEMENT API
 * Manage clients and provide client portal access
 * 
 * CR AudioViz AI - Fortune 50 Quality Standards
 * @version 2.0.0
 * @date December 27, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// CREATE CLIENT
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
      name,
      email,
      company,
      phone,
      address,
      city,
      state,
      zip,
      country,
      tax_id,
      notes,
      default_currency,
      default_payment_terms,
    } = body;

    if (!name || !email) {
      return NextResponse.json({ 
        error: 'Name and email are required' 
      }, { status: 400 });
    }

    // Generate client portal access token
    const portalToken = crypto.randomBytes(32).toString('hex');

    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name,
        email,
        company,
        phone,
        address,
        city,
        state,
        zip,
        country: country || 'USA',
        tax_id,
        notes,
        default_currency: default_currency || 'USD',
        default_payment_terms: default_payment_terms || 30,
        portal_token: portalToken,
        portal_enabled: true,
        total_invoiced: 0,
        total_paid: 0,
        outstanding_balance: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      client: data,
      portal_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalToken}`
    });

  } catch (error: any) {
    console.error('Create client error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// GET CLIENTS
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const portalToken = searchParams.get('portal_token');

    // Client portal access (no auth required, uses token)
    if (portalToken) {
      return await getClientPortalData(portalToken);
    }

    // Regular authenticated access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const clientId = searchParams.get('id');
    const search = searchParams.get('search');

    if (clientId) {
      // Get single client
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          invoices(*)
        `)
        .eq('id', clientId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      return NextResponse.json({ client: data });
    }

    // Get all clients
    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      clients: data,
      count: data?.length || 0
    });

  } catch (error: any) {
    console.error('Get clients error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// UPDATE CLIENT
// ============================================================================

export async function PUT(request: NextRequest) {
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
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('clients')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      client: data
    });

  } catch (error: any) {
    console.error('Update client error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE CLIENT
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
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    // Check for existing invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', id)
      .limit(1);

    if (invoices && invoices.length > 0) {
      // Soft delete - just deactivate
      await supabase
        .from('clients')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      return NextResponse.json({
        success: true,
        message: 'Client deactivated (has existing invoices)'
      });
    }

    // Hard delete if no invoices
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Client deleted'
    });

  } catch (error: any) {
    console.error('Delete client error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// CLIENT PORTAL DATA
// ============================================================================

async function getClientPortalData(portalToken: string) {
  // Get client by portal token
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('portal_token', portalToken)
    .eq('portal_enabled', true)
    .single();

  if (clientError || !client) {
    return NextResponse.json({ error: 'Invalid portal access' }, { status: 404 });
  }

  // Get client's invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false });

  // Calculate stats
  const stats = {
    total_invoiced: 0,
    total_paid: 0,
    outstanding: 0,
    overdue: 0,
  };

  const now = new Date();
  invoices?.forEach(inv => {
    stats.total_invoiced += inv.total;
    if (inv.status === 'paid') {
      stats.total_paid += inv.total;
    } else if (inv.status !== 'cancelled') {
      stats.outstanding += inv.total;
      if (new Date(inv.due_date) < now) {
        stats.overdue += inv.total;
      }
    }
  });

  return NextResponse.json({
    client: {
      name: client.name,
      company: client.company,
      email: client.email,
    },
    invoices: invoices?.map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      due_date: inv.due_date,
      total: inv.total,
      status: inv.status,
      currency: inv.currency,
    })),
    stats,
    payment_methods: ['credit_card', 'bank_transfer', 'paypal'] // Configure per user
  });
}

// ============================================================================
// REGENERATE PORTAL TOKEN
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
    const { client_id, action } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    if (action === 'regenerate_token') {
      const newToken = crypto.randomBytes(32).toString('hex');

      const { data, error } = await supabase
        .from('clients')
        .update({ portal_token: newToken })
        .eq('id', client_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        portal_url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${newToken}`
      });
    }

    if (action === 'toggle_portal') {
      const { data: current } = await supabase
        .from('clients')
        .select('portal_enabled')
        .eq('id', client_id)
        .single();

      const { data, error } = await supabase
        .from('clients')
        .update({ portal_enabled: !current?.portal_enabled })
        .eq('id', client_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        portal_enabled: data.portal_enabled
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Patch client error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
