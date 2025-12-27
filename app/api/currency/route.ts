/**
 * INVOICE GENERATOR PRO - MULTI-CURRENCY API
 * Support for 50+ currencies with real-time exchange rates
 * 
 * CR AudioViz AI - Fortune 50 Quality Standards
 * @version 2.0.0
 * @date December 27, 2025
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// SUPPORTED CURRENCIES
// ============================================================================

const CURRENCIES: Record<string, { name: string; symbol: string; decimal_places: number }> = {
  USD: { name: 'US Dollar', symbol: '$', decimal_places: 2 },
  EUR: { name: 'Euro', symbol: '€', decimal_places: 2 },
  GBP: { name: 'British Pound', symbol: '£', decimal_places: 2 },
  JPY: { name: 'Japanese Yen', symbol: '¥', decimal_places: 0 },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2 },
  AUD: { name: 'Australian Dollar', symbol: 'A$', decimal_places: 2 },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2 },
  CNY: { name: 'Chinese Yuan', symbol: '¥', decimal_places: 2 },
  INR: { name: 'Indian Rupee', symbol: '₹', decimal_places: 2 },
  MXN: { name: 'Mexican Peso', symbol: '$', decimal_places: 2 },
  BRL: { name: 'Brazilian Real', symbol: 'R$', decimal_places: 2 },
  KRW: { name: 'South Korean Won', symbol: '₩', decimal_places: 0 },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2 },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2 },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', decimal_places: 2 },
  SEK: { name: 'Swedish Krona', symbol: 'kr', decimal_places: 2 },
  DKK: { name: 'Danish Krone', symbol: 'kr', decimal_places: 2 },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2 },
  ZAR: { name: 'South African Rand', symbol: 'R', decimal_places: 2 },
  RUB: { name: 'Russian Ruble', symbol: '₽', decimal_places: 2 },
  TRY: { name: 'Turkish Lira', symbol: '₺', decimal_places: 2 },
  PLN: { name: 'Polish Zloty', symbol: 'zł', decimal_places: 2 },
  THB: { name: 'Thai Baht', symbol: '฿', decimal_places: 2 },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', decimal_places: 0 },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', decimal_places: 2 },
  PHP: { name: 'Philippine Peso', symbol: '₱', decimal_places: 2 },
  CZK: { name: 'Czech Koruna', symbol: 'Kč', decimal_places: 2 },
  ILS: { name: 'Israeli Shekel', symbol: '₪', decimal_places: 2 },
  CLP: { name: 'Chilean Peso', symbol: '$', decimal_places: 0 },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2 },
  SAR: { name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2 },
  TWD: { name: 'Taiwan Dollar', symbol: 'NT$', decimal_places: 0 },
  ARS: { name: 'Argentine Peso', symbol: '$', decimal_places: 2 },
  COP: { name: 'Colombian Peso', symbol: '$', decimal_places: 0 },
  PEN: { name: 'Peruvian Sol', symbol: 'S/', decimal_places: 2 },
  VND: { name: 'Vietnamese Dong', symbol: '₫', decimal_places: 0 },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', decimal_places: 2 },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', decimal_places: 2 },
  NGN: { name: 'Nigerian Naira', symbol: '₦', decimal_places: 2 },
  BDT: { name: 'Bangladeshi Taka', symbol: '৳', decimal_places: 2 },
  UAH: { name: 'Ukrainian Hryvnia', symbol: '₴', decimal_places: 2 },
  RON: { name: 'Romanian Leu', symbol: 'lei', decimal_places: 2 },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft', decimal_places: 0 },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв', decimal_places: 2 },
  HRK: { name: 'Croatian Kuna', symbol: 'kn', decimal_places: 2 },
  ISK: { name: 'Icelandic Krona', symbol: 'kr', decimal_places: 0 },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', decimal_places: 2 },
  QAR: { name: 'Qatari Riyal', symbol: '﷼', decimal_places: 2 },
  KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك', decimal_places: 3 },
  BHD: { name: 'Bahraini Dinar', symbol: '.د.ب', decimal_places: 3 },
  OMR: { name: 'Omani Rial', symbol: '﷼', decimal_places: 3 },
};

// Fallback exchange rates (updated periodically)
// In production, use a real API like exchangerate-api.com
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
  CNY: 7.24,
  INR: 83.12,
  MXN: 17.15,
  BRL: 4.97,
  KRW: 1298.5,
  SGD: 1.34,
  HKD: 7.82,
  NOK: 10.65,
  SEK: 10.42,
  DKK: 6.87,
  NZD: 1.64,
  ZAR: 18.75,
};

// ============================================================================
// GET CURRENCIES & EXCHANGE RATES
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const from = searchParams.get('from') || 'USD';
    const to = searchParams.get('to');
    const amount = parseFloat(searchParams.get('amount') || '1');

    if (action === 'list') {
      return NextResponse.json({
        currencies: Object.entries(CURRENCIES).map(([code, info]) => ({
          code,
          ...info
        })),
        count: Object.keys(CURRENCIES).length
      });
    }

    if (action === 'convert' && to) {
      const rate = await getExchangeRate(from, to);
      const converted = amount * rate;
      const toInfo = CURRENCIES[to];

      return NextResponse.json({
        from: {
          code: from,
          amount,
          formatted: formatCurrency(amount, from)
        },
        to: {
          code: to,
          amount: converted,
          formatted: formatCurrency(converted, to)
        },
        rate,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'rates') {
      const rates = await getAllRates(from);
      return NextResponse.json({
        base: from,
        rates,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Currency error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getExchangeRate(from: string, to: string): Promise<number> {
  // Try to get real-time rates from API
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`,
        { next: { revalidate: 3600 } } // Cache for 1 hour
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.result === 'success') {
          return data.conversion_rate;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch live rates, using fallback');
  }

  // Fallback to static rates
  const fromRate = FALLBACK_RATES[from] || 1;
  const toRate = FALLBACK_RATES[to] || 1;
  return toRate / fromRate;
}

async function getAllRates(base: string): Promise<Record<string, number>> {
  const rates: Record<string, number> = {};
  
  // Try API first
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (apiKey) {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`,
        { next: { revalidate: 3600 } }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.result === 'success') {
          return data.conversion_rates;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to fetch live rates');
  }

  // Fallback
  const baseRate = FALLBACK_RATES[base] || 1;
  for (const [code, rate] of Object.entries(FALLBACK_RATES)) {
    rates[code] = rate / baseRate;
  }
  
  return rates;
}

function formatCurrency(amount: number, currencyCode: string): string {
  const currency = CURRENCIES[currencyCode];
  if (!currency) return `${amount.toFixed(2)} ${currencyCode}`;

  const formatted = amount.toFixed(currency.decimal_places);
  
  // Format with thousand separators
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  return `${currency.symbol}${parts.join('.')}`;
}

// ============================================================================
// EXPORT HELPERS FOR USE IN OTHER ROUTES
// ============================================================================

export { CURRENCIES, formatCurrency, getExchangeRate };
