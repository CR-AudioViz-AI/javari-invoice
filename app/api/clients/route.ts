/**
 * INVOICE GENERATOR PRO - CLIENT MANAGEMENT API
 * Full client CRM with portal access for payments
 * 
 * CR AudioViz AI - Fortune 50 Quality Standards
 * @version 2.0.0
 * @date December 27, 2025
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPES
// ============================================================================

interface Client {
  id?: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: number;
  default_currency?: string;
  notes?: string;
  tags?: string[];
  portal_access_token?: string;
  portal_enabled?: boolean;
  total_invoiced?: number;
  total_paid?: number;
  total_outstanding?: number;
  invoice_count?: number;
  last_invoice_date?: string;
  created_at?: string;
  updated_at?: string;
}

// ============================================================================
// GET - List clients or get single client
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
    const clientId = searchParams.get('id');
    const search = searchParams.get('search');
    const tag = searchParams.get('tag');
    const withStats = searchParams.get('stats') === 'true';

    if (clientId) {
      // Get single client with stats
      const { data: client, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('user_id', user.id)
        .single();

      if (error || !client) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      }

      // Get invoice stats
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total, status, invoice_date')
        .eq('client_id', clientId);

      const stats = {
        total_invoiced: 0,
        total_paid: 0,
        total_outstanding: 0,
        invoice_count: invoices?.length || 0,
        paid_count: 0,
        pending_count: 0,
        overdue_count: 0,
      };

      for (const inv of invoices || []) {
        stats.total_invoiced += inv.total;
        if (inv.status === 'paid') {
          stats.total_paid += inv.total;
          stats.paid_count++;
        } else if (inv.status === 'overdue') {
          stats.total_outstanding += inv.total;
          stats.overdue_count++;
        } else {
          stats.total_outstanding += inv.total;
          stats.pending_count++;
        }
      }

      return NextResponse.json({
        client: {
          ...client,
          stats,
        },
        invoices: invoices || [],
      });
    }

    // List all clients
    let query = supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data: clients, error } = await query;

    if (error) throw error;

    // Add basic stats if requested
    let clientsWithStats = clients || [];
    if (withStats) {
      const clientIds = clients?.map(c => c.id) || [];
      
      const { data: invoiceStats } = await supabase
        .from('invoices')
        .select('client_id, total, status')
        .in('client_id', clientIds);

      const statsMap = new Map();
      for (const inv of invoiceStats || []) {
        if (!statsMap.has(inv.client_id)) {
          statsMap.set(inv.client_id, { total: 0, paid: 0, outstanding: 0, count: 0 });
        }
        const s = statsMap.get(inv.client_id);
        s.total += inv.total;
        s.count++;
        if (inv.status === 'paid') {
          s.paid += inv.total;
        } else {
          s.outstanding += inv.total;
        }
      }

      clientsWithStats = clients?.map(client => ({
        ...client,
        stats: statsMap.get(client.id) || { total: 0, paid: 0, outstanding: 0, count: 0 },
      })) || [];
    }

    return NextResponse.json({
      clients: clientsWithStats,
      total: clientsWithStats.length,
    });

  } catch (error: any) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// POST - Create client
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
    const { name, email, ...rest } = body;

    if (!name || !email) {
      return NextResponse.json({
        error: 'Name and email are required'
      }, { status: 400 });
    }

    // Check for duplicate email
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'A client with this email already exists'
      }, { status: 400 });
    }

    const client: Client = {
      user_id: user.id,
      name,
      email,
      ...rest,
      payment_terms: rest.payment_terms || 30,
      default_currency: rest.default_currency || 'USD',
      portal_enabled: false,
    };

    const { data, error } = await supabase
      .from('clients')
      .insert(client)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      client: data,
      message: 'Client created successfully',
    });

  } catch (error: any) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PATCH - Update client
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
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      client: data,
      message: 'Client updated successfully',
    });

  } catch (error: any) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// DELETE - Delete client
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

    // Check for associated invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('client_id', id)
      .limit(1);

    if (invoices && invoices.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete client with existing invoices. Archive the client instead.',
        has_invoices: true,
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    });

  } catch (error: any) {
    console.error('Error deleting client:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// PUT - Client Portal Actions (enable portal, generate token)
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
    const { action, client_id } = body;

    if (!action || !client_id) {
      return NextResponse.json({
        error: 'Action and client_id required'
      }, { status: 400 });
    }

    switch (action) {
      case 'enable_portal': {
        const portalToken = generatePortalToken();
        
        const { data, error } = await supabase
          .from('clients')
          .update({
            portal_enabled: true,
            portal_access_token: portalToken,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${portalToken}`;

        return NextResponse.json({
          success: true,
          portal_url: portalUrl,
          message: 'Client portal enabled. Share this link with your client.',
        });
      }

      case 'disable_portal': {
        const { error } = await supabase
          .from('clients')
          .update({
            portal_enabled: false,
            portal_access_token: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client_id)
          .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({
          success: true,
          message: 'Client portal disabled',
        });
      }

      case 'regenerate_token': {
        const newToken = generatePortalToken();
        
        const { error } = await supabase
          .from('clients')
          .update({
            portal_access_token: newToken,
            updated_at: new Date().toISOString(),
          })
          .eq('id', client_id)
          .eq('user_id', user.id);

        if (error) throw error;

        const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/${newToken}`;

        return NextResponse.json({
          success: true,
          portal_url: portalUrl,
          message: 'Portal access token regenerated',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Error in portal action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generatePortalToken(): string {
  return randomBytes(32).toString('hex');
}
