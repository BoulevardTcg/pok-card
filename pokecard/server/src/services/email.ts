import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let transporter: Transporter | null = null

// Protection CRLF: on refuse tout retour ligne dans les en-têtes.
const sanitizeHeaderValue = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()
const sanitizeEmailAddress = (value: string) => sanitizeHeaderValue(value)

function getTransporter(): Transporter {
  if (!transporter) {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
      console.log('Email: mode développement (streamTransport)')
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix'
      })
    } else {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      })
    }
  }
  return transporter
}

const SHOP_NAME = process.env.SHOP_NAME || 'Boulevard TCG'
const SHOP_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const SHOP_EMAIL = process.env.SHOP_EMAIL || 'contact@boulevardtcg.com'
const SHOP_LOGO = `${SHOP_URL}/logo.png`

const EMAIL_FROM = process.env.EMAIL_FROM || SHOP_EMAIL
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'contact@boulevardtcg.com'

const emailStyles = `
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .header img { max-width: 150px; margin-bottom: 15px; }
  .content { padding: 30px; }
  .order-number { background-color: #f0f9ff; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0; }
  .order-number span { font-size: 24px; font-weight: bold; color: #3b82f6; }
  .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
  .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  .items-table th { background-color: #f9fafb; font-weight: 600; }
  .items-table img { width: 50px; height: 50px; object-fit: cover; border-radius: 4px; }
  .total-row { font-weight: bold; background-color: #f0f9ff; }
  .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 600; }
  .status-confirmed { background-color: #dcfce7; color: #166534; }
  .status-shipped { background-color: #dbeafe; color: #1e40af; }
  .status-delivered { background-color: #d1fae5; color: #065f46; }
  .btn { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
  .btn:hover { opacity: 0.9; }
  .footer { background-color: #1f2937; color: #9ca3af; padding: 30px; text-align: center; font-size: 14px; }
  .footer a { color: #60a5fa; text-decoration: none; }
  .address-box { background-color: #f9fafb; border-radius: 8px; padding: 15px; margin: 10px 0; }
  .tracking-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
`

interface OrderItemForEmail {
  productName: string
  variantName?: string | null
  imageUrl?: string | null
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
}

interface OrderDataForEmail {
  orderNumber: string
  totalCents: number
  currency?: string
  items: OrderItemForEmail[]
  shippingAddress?: {
    name?: string
    address?: {
      line1?: string
      line2?: string
      city?: string
      postal_code?: string
      country?: string
    }
  } | null
  billingAddress?: {
    name?: string
    email?: string
  } | null
  promoCode?: string
  promoDiscount?: number
  trackingNumber?: string
  trackingUrl?: string
  orderTrackingUrl?: string
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €'
}

function generateItemsTable(items: OrderItemForEmail[]): string {
  const rows = items.map(item => `
    <tr>
      <td>
        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.productName}">` : ''}
      </td>
      <td>
        <strong>${item.productName}</strong>
        ${item.variantName && item.variantName !== 'Standard' ? `<br><small style="color: #6b7280;">${item.variantName}</small>` : ''}
      </td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${formatPrice(item.unitPriceCents)}</td>
      <td style="text-align: right;">${formatPrice(item.totalPriceCents)}</td>
    </tr>
  `).join('')

  return `
    <table class="items-table">
      <thead>
        <tr>
          <th></th>
          <th>Produit</th>
          <th style="text-align: center;">Qte</th>
          <th style="text-align: right;">Prix unit.</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

function orderConfirmationTemplate(order: OrderDataForEmail, customerEmail: string): string {
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPriceCents, 0)
  const discount = order.promoDiscount || 0

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmation de commande - ${SHOP_NAME}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Merci pour votre commande !</h1>
    </div>
    
    <div class="content">
      <p>Bonjour${order.billingAddress?.name ? ` ${order.billingAddress.name}` : ''},</p>
      
      <p>Nous avons bien recu votre commande et nous vous en remercions ! Votre paiement a ete confirme.</p>
      
      <div class="order-number">
        <p style="margin: 0; color: #6b7280;">Numero de commande</p>
        <span>${order.orderNumber}</span>
      </div>
      
      <h2 style="color: #1f2937;">Recapitulatif de votre commande</h2>
      
      ${generateItemsTable(order.items)}
      
      <table style="width: 100%; margin-top: 20px;">
        <tr>
          <td style="text-align: right; padding: 8px;"><strong>Sous-total:</strong></td>
          <td style="text-align: right; padding: 8px; width: 100px;">${formatPrice(subtotal)}</td>
        </tr>
        ${discount > 0 ? `
        <tr>
          <td style="text-align: right; padding: 8px; color: #10b981;"><strong>Reduction${order.promoCode ? ` (${order.promoCode})` : ''}:</strong></td>
          <td style="text-align: right; padding: 8px; color: #10b981; width: 100px;">-${formatPrice(discount)}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="text-align: right; padding: 8px;"><strong>Livraison:</strong></td>
          <td style="text-align: right; padding: 8px; width: 100px;">${subtotal >= 5000 ? 'Gratuite' : 'A calculer'}</td>
        </tr>
        <tr class="total-row">
          <td style="text-align: right; padding: 12px;"><strong>TOTAL:</strong></td>
          <td style="text-align: right; padding: 12px; font-size: 18px; width: 100px;">${formatPrice(order.totalCents)}</td>
        </tr>
      </table>
      
      ${order.shippingAddress ? `
      <h3 style="color: #1f2937; margin-top: 30px;">Adresse de livraison</h3>
      <div class="address-box">
        ${order.shippingAddress.name ? `<strong>${order.shippingAddress.name}</strong><br>` : ''}
        ${order.shippingAddress.address?.line1 || ''}<br>
        ${order.shippingAddress.address?.line2 ? `${order.shippingAddress.address.line2}<br>` : ''}
        ${order.shippingAddress.address?.postal_code || ''} ${order.shippingAddress.address?.city || ''}<br>
        ${order.shippingAddress.address?.country || ''}
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${SHOP_URL}/commandes" class="btn">Voir ma commande</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Vous recevrez un email des que votre commande sera expediee avec les informations de suivi.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>${SHOP_NAME}</strong></p>
      <p>Des questions ? Contactez-nous : <a href="mailto:${SHOP_EMAIL}">${SHOP_EMAIL}</a></p>
      <p style="margin-top: 20px; font-size: 12px;">
        Cet email a ete envoye a ${customerEmail}<br>
        <a href="${SHOP_URL}">Visiter notre boutique</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// Template: Notification d'expédition
function shippingNotificationTemplate(order: OrderDataForEmail, customerEmail: string): string {
  const trackingCtaUrl = order.orderTrackingUrl || order.trackingUrl || `${SHOP_URL}/commandes`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre commande a ete expediee - ${SHOP_NAME}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Votre commande est en route !</h1>
    </div>
    
    <div class="content">
      <p>Bonjour${order.billingAddress?.name ? ` ${order.billingAddress.name}` : ''},</p>
      
      <p>Bonne nouvelle ! Votre commande <strong>${order.orderNumber}</strong> a ete expediee et est en route vers vous.</p>
      
      ${order.trackingNumber ? `
      <div class="tracking-box">
        <h3 style="margin: 0 0 10px 0; color: #92400e;">📍 Suivi de votre colis</h3>
        <p style="margin: 0;"><strong>Numero de suivi:</strong> ${order.trackingNumber}</p>
        ${order.trackingUrl ? `
        <p style="margin: 10px 0 0 0;">
          <a href="${order.trackingUrl}" class="btn" style="background: #f59e0b;">Suivre mon colis</a>
        </p>
        ` : ''}
      </div>
      ` : `
      <div class="tracking-box">
        <p style="margin: 0;">Le numero de suivi sera disponible sous peu.</p>
      </div>
      `}
      
      <h3 style="color: #1f2937;">Contenu de votre colis</h3>
      
      ${generateItemsTable(order.items)}
      
      ${order.shippingAddress ? `
      <h3 style="color: #1f2937; margin-top: 30px;">Adresse de livraison</h3>
      <div class="address-box">
        ${order.shippingAddress.name ? `<strong>${order.shippingAddress.name}</strong><br>` : ''}
        ${order.shippingAddress.address?.line1 || ''}<br>
        ${order.shippingAddress.address?.line2 ? `${order.shippingAddress.address.line2}<br>` : ''}
        ${order.shippingAddress.address?.postal_code || ''} ${order.shippingAddress.address?.city || ''}<br>
        ${order.shippingAddress.address?.country || ''}
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${trackingCtaUrl}" class="btn">Suivre ma commande</a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        La livraison est generalement effectuee sous 2 a 5 jours ouvrables.<br>
        Vous recevrez un email une fois votre colis livre.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>${SHOP_NAME}</strong></p>
      <p>Des questions sur votre livraison ? <a href="mailto:${SHOP_EMAIL}">${SHOP_EMAIL}</a></p>
      <p style="margin-top: 20px; font-size: 12px;">
        Cet email a ete envoye a ${customerEmail}<br>
        <a href="${SHOP_URL}">Visiter notre boutique</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// Template: Commande livrée
function deliveryConfirmationTemplate(order: OrderDataForEmail, customerEmail: string): string {
  const trackingCtaUrl = order.orderTrackingUrl || `${SHOP_URL}/commandes`
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre commande a ete livree - ${SHOP_NAME}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Commande livree !</h1>
    </div>
    
    <div class="content">
      <p>Bonjour${order.billingAddress?.name ? ` ${order.billingAddress.name}` : ''},</p>
      
      <p>Votre commande <strong>${order.orderNumber}</strong> a ete livree avec succes !</p>
      
      <p>Nous esperons que vous etes satisfait(e) de vos achats. N'hesitez pas a nous laisser un avis, ca nous aide beaucoup !</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${trackingCtaUrl}" class="btn">Laisser un avis</a>
      </div>
      
      <h3 style="color: #1f2937;">Rappel de votre commande</h3>
      
      ${generateItemsTable(order.items)}
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Un probleme avec votre commande ? Contactez-nous dans les 14 jours pour toute reclamation.
      </p>
    </div>
    
    <div class="footer">
      <p><strong>Merci de votre confiance !</strong></p>
      <p>${SHOP_NAME}</p>
      <p><a href="mailto:${SHOP_EMAIL}">${SHOP_EMAIL}</a></p>
      <p style="margin-top: 20px; font-size: 12px;">
        <a href="${SHOP_URL}">Visiter notre boutique</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

export async function sendOrderConfirmationEmail(order: OrderDataForEmail, customerEmail: string): Promise<boolean> {
  try {
    const transport = getTransporter()
    const html = orderConfirmationTemplate(order, customerEmail)

    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${SHOP_EMAIL}>`,
      to: customerEmail,
      subject: `✅ Confirmation de commande ${order.orderNumber} - ${SHOP_NAME}`,
      html
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`Email: confirmation envoyée (${order.orderNumber})`)
    } else {
      console.log('Email: confirmation envoyée', { messageId: info.messageId })
    }

    return true
  } catch (error) {
    console.error('Email: erreur envoi confirmation', error)
    return false
  }
}

export async function sendShippingNotificationEmail(order: OrderDataForEmail, customerEmail: string): Promise<boolean> {
  try {
    const transport = getTransporter()
    const html = shippingNotificationTemplate(order, customerEmail)

    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${SHOP_EMAIL}>`,
      to: customerEmail,
      subject: `📦 Votre commande ${order.orderNumber} a ete expediee ! - ${SHOP_NAME}`,
      html
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`Email: expédition envoyée (${order.orderNumber})`)
    } else {
      console.log('Email: expédition envoyée', { messageId: info.messageId })
    }

    return true
  } catch (error) {
    console.error('Email: erreur envoi expédition', error)
    return false
  }
}

export async function sendDeliveryConfirmationEmail(order: OrderDataForEmail, customerEmail: string): Promise<boolean> {
  try {
    const transport = getTransporter()
    const html = deliveryConfirmationTemplate(order, customerEmail)

    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${SHOP_EMAIL}>`,
      to: customerEmail,
      subject: `✅ Votre commande ${order.orderNumber} a ete livree ! - ${SHOP_NAME}`,
      html
    })

    if (process.env.NODE_ENV === 'development') {
      console.log(`Email: livraison envoyée (${order.orderNumber})`)
    } else {
      console.log('Email: livraison envoyée', { messageId: info.messageId })
    }

    return true
  } catch (error) {
    console.error('Email: erreur envoi livraison', error)
    return false
  }
}

type ContactPayload = {
  name: string
  email: string
  subject: string
  message: string
  ip?: string
  userAgent?: string
  createdAt?: Date
}

function contactEmailTemplate(payload: ContactPayload): string {
  const createdAt = payload.createdAt ? payload.createdAt.toLocaleString('fr-FR') : new Date().toLocaleString('fr-FR')
  const ip = payload.ip || '—'
  const ua = payload.userAgent || '—'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact - ${SHOP_NAME}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📨 Nouveau message de contact</h1>
    </div>
    <div class="content">
      <div class="address-box">
        <p style="margin: 0 0 8px 0;"><strong>Nom:</strong> ${payload.name}</p>
        <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${payload.email}</p>
        <p style="margin: 0;"><strong>Date:</strong> ${createdAt}</p>
      </div>

      <div class="tracking-box">
        <p style="margin: 0 0 8px 0;"><strong>Sujet:</strong> ${payload.subject}</p>
        <p style="margin: 0; white-space: pre-wrap;"><strong>Message:</strong><br>${payload.message}</p>
      </div>

      <p style="color: #6b7280; font-size: 12px; margin-top: 16px;">
        IP: ${ip}<br>
        User-Agent: ${ua}
      </p>
    </div>
    <div class="footer">
      <p><strong>${SHOP_NAME}</strong></p>
      <p><a href="${SHOP_URL}">Visiter la boutique</a></p>
    </div>
  </div>
</body>
</html>
`
}

function contactAutoReplyTemplate(payload: { name: string; subject: string }): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nous avons bien reçu votre message - ${SHOP_NAME}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Message reçu</h1>
    </div>
    <div class="content">
      <p>Bonjour ${payload.name},</p>
      <p>Merci pour votre message. Notre équipe vous répondra dès que possible.</p>
      <div class="address-box">
        <p style="margin: 0;"><strong>Sujet:</strong> ${payload.subject}</p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">
        Si vous avez besoin de compléter votre demande, répondez simplement à cet email.
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${SHOP_URL}" class="btn">Retour à la boutique</a>
      </div>
    </div>
    <div class="footer">
      <p><strong>${SHOP_NAME}</strong></p>
      <p style="margin-top: 20px; font-size: 12px;">
        Ceci est un message automatique, merci de ne pas envoyer d'informations sensibles.
      </p>
    </div>
  </div>
</body>
</html>
`
}

export async function sendContactEmail(payload: ContactPayload): Promise<boolean> {
  try {
    const transport = getTransporter()
    const html = contactEmailTemplate(payload)
    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${EMAIL_FROM}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: sanitizeEmailAddress(payload.email),
      subject: sanitizeHeaderValue(`[Contact – Boulevard] ${payload.subject}`),
      html,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Email: contact envoyé')
    } else {
      console.log('Email: contact envoyé', { messageId: info.messageId })
    }

    return true
  } catch (error) {
    console.error('Email: erreur envoi contact', error)
    return false
  }
}

export async function sendContactAutoReply(payload: { name: string; email: string; subject: string }): Promise<boolean> {
  try {
    const transport = getTransporter()
    const html = contactAutoReplyTemplate({ name: payload.name, subject: payload.subject })
    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${EMAIL_FROM}>`,
      to: sanitizeEmailAddress(payload.email),
      replyTo: CONTACT_TO_EMAIL,
      subject: sanitizeHeaderValue(`✅ Nous avons bien reçu votre message - ${SHOP_NAME}`),
      html,
    })

    if (process.env.NODE_ENV === 'development') {
      console.log('Email: accusé réception contact envoyé')
    } else {
      console.log('Email: accusé réception contact envoyé', { messageId: info.messageId })
    }

    return true
  } catch (error) {
    console.error('Email: erreur envoi accusé réception contact', error)
    return false
  }
}

export type { OrderDataForEmail, OrderItemForEmail }

