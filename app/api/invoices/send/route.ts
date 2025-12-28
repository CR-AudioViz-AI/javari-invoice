import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(request: NextRequest) {
  try {
    const { 
      invoiceId, 
      to, 
      subject, 
      invoiceNumber, 
      amount, 
      dueDate, 
      paymentLink,
      pdfAttachment 
    } = await request.json()
    
    if (!to || !subject) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
    }
    
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    // Generate email HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .invoice-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .amount { font-size: 32px; font-weight: bold; color: #2563eb; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Invoice ${invoiceNumber || 'N/A'}</h1>
            <p style="margin:10px 0 0 0;opacity:0.9;">You have a new invoice</p>
          </div>
          
          <div class="content">
            <div class="invoice-details">
              <p><strong>Invoice Number:</strong> ${invoiceNumber || 'N/A'}</p>
              <p><strong>Amount Due:</strong></p>
              <p class="amount">${amount || '$0.00'}</p>
              <p><strong>Due Date:</strong> ${dueDate || 'N/A'}</p>
            </div>
            
            ${paymentLink ? `
              <p>Click the button below to pay this invoice securely online:</p>
              <a href="${paymentLink}" class="button">Pay Now →</a>
              <p style="margin-top:20px;font-size:14px;color:#6b7280;">
                Or copy this link: ${paymentLink}
              </p>
            ` : `
              <p>Please contact us for payment details.</p>
            `}
          </div>
          
          <div class="footer">
            <p>This invoice was sent via Invoice Generator Pro by CR AudioViz AI</p>
            <p>Questions? Reply to this email for support.</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    // Prepare email options
    const emailOptions: any = {
      from: 'Invoice Generator <invoices@craudiovizai.com>',
      to: [to],
      subject: subject,
      html: html
    }
    
    // Add attachment if PDF provided
    if (pdfAttachment) {
      const base64Data = pdfAttachment.includes(',') ? pdfAttachment.split(',')[1] : pdfAttachment
      emailOptions.attachments = [{
        filename: `invoice-${invoiceNumber || 'document'}.pdf`,
        content: base64Data
      }]
    }
    
    // Send via Resend
    const { data, error } = await resend.emails.send(emailOptions)
    
    if (error) {
      throw new Error(error.message)
    }
    
    return NextResponse.json({ 
      success: true, 
      messageId: data?.id 
    })
  } catch (error: any) {
    console.error('Invoice send error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send invoice' },
      { status: 500 }
    )
  }
}
