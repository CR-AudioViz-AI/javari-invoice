# Javari Invoice

**AI-powered invoice generation and management**

## What It Actually Does

- Create professional invoices
- AI-generated descriptions
- PDF export
- Save and manage invoices
- Client management

## Current Status

✅ **Working:**
- Invoice creation form
- Basic PDF export
- User authentication
- Save/load invoices

⚠️ **In Progress:**
- More templates
- Email sending
- Payment integration

❌ **Planned:**
- Recurring invoices
- Multi-currency
- Advanced reporting

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase
- PDF generation (jsPDF)

## Features

### Invoice Creation
- Line items with descriptions
- Tax calculations
- Discount support
- Due dates
- Payment terms

### AI Features
- Auto-generate item descriptions
- Professional language
- Tax optimization suggestions

### Export
- PDF download
- Professional formatting
- Company branding

## Setup

```bash
npm install
npm run dev
```

Required environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Roadmap

**Week 1:**
- Add 10 more templates
- Email functionality
- Stripe payment links

**Week 2-4:**
- Recurring invoices
- Client portal
- Analytics dashboard

## Revenue Model

- Free: 5 invoices/month
- Starter ($9/mo): 50 invoices/month
- Pro ($29/mo): Unlimited
- Enterprise: Custom pricing

## Known Issues

- Limited templates (3 currently)
- Email sending not active
- Payment integration incomplete

## License

Proprietary - CR AudioViz AI, LLC
