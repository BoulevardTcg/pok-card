import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

const sanitizeHeaderValue = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();
const sanitizeEmailAddress = (value: string) => sanitizeHeaderValue(value);

function getTransporter(): Transporter {
  if (!transporter) {
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
      console.log('Email: mode développement (streamTransport)');
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
      });
    } else {
      const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = parseInt(process.env.SMTP_PORT || '587');
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (process.env.NODE_ENV === 'development') {
        console.log('Email: Configuration SMTP');
        console.log(`  Host: ${smtpHost}`);
        console.log(`  Port: ${smtpPort}`);
        console.log(`  User: ${smtpUser ? smtpUser.substring(0, 3) + '***' : 'NON DÉFINI'}`);
        console.log(
          `  Pass: ${smtpPass ? (smtpPass.length > 0 ? '***' + smtpPass.substring(smtpPass.length - 2) : 'VIDE') : 'NON DÉFINI'}`
        );
      }

      if (!smtpUser || !smtpPass) {
        console.warn(
          '⚠️ SMTP_USER ou SMTP_PASS non défini. Les emails seront simulés (pas envoyés réellement).'
        );
        console.warn('   Pour envoyer réellement, configurez SMTP_USER et SMTP_PASS dans .env');
        transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'unix',
        });
      } else {
        transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
      }
    }
  }
  return transporter;
}

const SHOP_NAME = process.env.SHOP_NAME || 'Boulevard TCG';
const SHOP_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SHOP_EMAIL = process.env.SHOP_EMAIL || 'contact@boulevardtcg.com';
const SHOP_LOGO = `${SHOP_URL}/logo.png`;

const EMAIL_FROM = process.env.EMAIL_FROM || SHOP_EMAIL;
const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL || 'contact@boulevardtcg.com';

const emailStyles = `
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
  .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
  .header { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; color: #000000; }
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
`;

interface OrderItemForEmail {
  productName: string;
  variantName?: string | null;
  imageUrl?: string | null;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
}

interface OrderDataForEmail {
  orderNumber: string;
  totalCents: number;
  currency?: string;
  items: OrderItemForEmail[];
  shippingAddress?: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      postal_code?: string;
      country?: string;
    };
  } | null;
  billingAddress?: {
    name?: string;
    email?: string;
  } | null;
  promoCode?: string;
  promoDiscount?: number;
  trackingNumber?: string;
  trackingUrl?: string;
  orderTrackingUrl?: string;
  carrier?: string;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',') + ' €';
}

function generateItemsTable(items: OrderItemForEmail[]): string {
  const rows = items
    .map(
      (item) => `
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
  `
    )
    .join('');

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
  `;
}

function orderConfirmationTemplate(order: OrderDataForEmail, customerEmail: string): string {
  const subtotal = order.items.reduce((sum, item) => sum + item.totalPriceCents, 0);
  const discount = order.promoDiscount || 0;

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
      <h1 style="color: #000000;">🎉 Merci pour votre commande !</h1>
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
        ${
          discount > 0
            ? `
        <tr>
          <td style="text-align: right; padding: 8px; color: #10b981;"><strong>Reduction${order.promoCode ? ` (${order.promoCode})` : ''}:</strong></td>
          <td style="text-align: right; padding: 8px; color: #10b981; width: 100px;">-${formatPrice(discount)}</td>
        </tr>
        `
            : ''
        }
        <tr>
          <td style="text-align: right; padding: 8px;"><strong>Livraison:</strong></td>
          <td style="text-align: right; padding: 8px; width: 100px;">${subtotal >= 5000 ? 'Gratuite' : 'A calculer'}</td>
        </tr>
        <tr class="total-row">
          <td style="text-align: right; padding: 12px;"><strong>TOTAL:</strong></td>
          <td style="text-align: right; padding: 12px; font-size: 18px; width: 100px;">${formatPrice(order.totalCents)}</td>
        </tr>
      </table>
      
      ${
        order.shippingAddress
          ? `
      <h3 style="color: #1f2937; margin-top: 30px;">Adresse de livraison</h3>
      <div class="address-box">
        ${order.shippingAddress.name ? `<strong>${order.shippingAddress.name}</strong><br>` : ''}
        ${order.shippingAddress.address?.line1 || ''}<br>
        ${order.shippingAddress.address?.line2 ? `${order.shippingAddress.address.line2}<br>` : ''}
        ${order.shippingAddress.address?.postal_code || ''} ${order.shippingAddress.address?.city || ''}<br>
        ${order.shippingAddress.address?.country || ''}
      </div>
      `
          : ''
      }
      
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
`;
}

// Fonction pour obtenir le nom lisible du transporteur
function getCarrierDisplayName(carrier?: string | null): string {
  if (!carrier) return 'Transporteur';
  const carrierMap: Record<string, string> = {
    COLISSIMO: 'Colissimo (La Poste)',
    CHRONOPOST: 'Chronopost',
    MONDIAL_RELAY: 'Mondial Relay',
    UPS: 'UPS',
    DHL: 'DHL',
    FEDEX: 'FedEx',
    OTHER: 'Transporteur',
  };
  return carrierMap[carrier] || carrier;
}

function shippingNotificationTemplate(order: OrderDataForEmail, customerEmail: string): string {
  const trackingCtaUrl = order.orderTrackingUrl || order.trackingUrl || `${SHOP_URL}/commandes`;
  const carrierName = getCarrierDisplayName(order.carrier);

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
    <div class="header" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
      <h1 style="color: #000000;">📦 Votre colis a été expédié !</h1>
    </div>
    
    <div class="content">
      <p style="font-size: 16px; line-height: 1.6;">Bonjour${order.billingAddress?.name ? ` ${order.billingAddress.name}` : ''},</p>
      
      <p style="font-size: 16px; line-height: 1.6;">Nous avons le plaisir de vous informer que votre commande <strong style="color: #1f2937;">${order.orderNumber}</strong> a été expédiée et est en route vers vous.</p>
      
      ${
        order.trackingNumber
          ? `
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin: 30px 0; text-align: center;">
        <h2 style="margin: 0 0 15px 0; color: #92400e; font-size: 20px;">📍 Informations de suivi</h2>
        <div style="background: white; border-radius: 8px; padding: 20px; margin: 15px 0;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Transporteur</p>
          <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: bold; color: #1f2937;">${carrierName}</p>
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Numéro de suivi</p>
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b; letter-spacing: 1px; font-family: 'Courier New', monospace;">${order.trackingNumber}</p>
        </div>
        ${
          order.trackingUrl
            ? `
        <a href="${order.trackingUrl}" class="btn" style="background: #f59e0b; color: white; padding: 14px 28px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 15px;">
          🔍 Suivre mon colis en temps réel
        </a>
        `
            : ''
        }
        ${
          order.orderTrackingUrl
            ? `
        <p style="margin: 15px 0 0 0;">
          <a href="${order.orderTrackingUrl}" style="color: #92400e; text-decoration: underline;">Ou suivre depuis votre espace client</a>
        </p>
        `
            : ''
        }
      </div>
      `
          : `
      <div class="tracking-box" style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin: 30px 0; text-align: center;">
        <p style="margin: 0; color: #92400e; font-size: 16px;">Le numéro de suivi sera disponible sous peu. Vous recevrez un email dès qu'il sera prêt.</p>
      </div>
      `
      }
      
      <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
        <h3 style="color: #1f2937; margin-bottom: 20px; font-size: 18px;">📋 Contenu de votre colis</h3>
        ${generateItemsTable(order.items)}
      </div>
      
      ${
        order.shippingAddress
          ? `
      <div style="margin-top: 30px; padding-top: 30px; border-top: 2px solid #e5e7eb;">
        <h3 style="color: #1f2937; margin-bottom: 15px; font-size: 18px;">📍 Adresse de livraison</h3>
        <div class="address-box" style="background: #f9fafb; padding: 15px; border-radius: 8px;">
          ${order.shippingAddress.name ? `<strong style="font-size: 16px;">${order.shippingAddress.name}</strong><br>` : ''}
          ${order.shippingAddress.address?.line1 || ''}<br>
          ${order.shippingAddress.address?.line2 ? `${order.shippingAddress.address.line2}<br>` : ''}
          ${order.shippingAddress.address?.postal_code || ''} ${order.shippingAddress.address?.city || ''}<br>
          ${order.shippingAddress.address?.country || ''}
        </div>
      </div>
      `
          : ''
      }
      
      <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 30px 0; border-radius: 8px;">
        <p style="margin: 0; color: #1e40af; font-size: 15px; line-height: 1.6;">
          <strong>⏱️ Délai de livraison estimé :</strong> 2 à 5 jours ouvrables<br>
          <strong>📧 Notification :</strong> Vous recevrez un email automatique une fois votre colis livré.
        </p>
      </div>
      
      ${
        order.trackingNumber && order.trackingUrl
          ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${order.trackingUrl}" class="btn" style="background: #f59e0b; color: white; padding: 14px 28px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">
          🔍 Suivre mon colis
        </a>
      </div>
      `
          : ''
      }
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
`;
}

function deliveryConfirmationTemplate(order: OrderDataForEmail, customerEmail: string): string {
  const trackingCtaUrl = order.orderTrackingUrl || `${SHOP_URL}/commandes`;
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
      <h1 style="color: #000000;">✅ Commande livree !</h1>
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
`;
}

export async function sendOrderConfirmationEmail(
  order: OrderDataForEmail,
  customerEmail: string
): Promise<boolean> {
  try {
    const transport = getTransporter();
    const html = orderConfirmationTemplate(order, customerEmail);

    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${SHOP_EMAIL}>`,
      to: customerEmail,
      subject: `✅ Confirmation de commande ${order.orderNumber} - ${SHOP_NAME}`,
      html,
    });

    // Vérifier si l'email a vraiment été envoyé ou juste simulé
    const isStreamTransport = !info.messageId && !info.response;
    if (isStreamTransport) {
      console.log(
        `⚠️ Email: mode simulation (streamTransport) - Email NON envoyé réellement (${order.orderNumber})`
      );
      console.log(`   Destinataire: ${customerEmail}`);
      console.log(`   Pour envoyer réellement, configurez SMTP_USER et SMTP_PASS dans .env`);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Email: confirmation envoyée (${order.orderNumber})`);
        console.log(`   MessageId: ${info.messageId || 'N/A'}`);
        console.log(`   Destinataire: ${customerEmail}`);
      } else {
        console.log('Email: confirmation envoyée', { messageId: info.messageId });
      }
    }

    return true;
  } catch (error) {
    console.error('Email: erreur envoi confirmation', error);
    return false;
  }
}

export async function sendShippingNotificationEmail(
  order: OrderDataForEmail,
  customerEmail: string
): Promise<boolean> {
  try {
    const transport = getTransporter();
    const html = shippingNotificationTemplate(order, customerEmail);

    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${SHOP_EMAIL}>`,
      to: customerEmail,
      subject: `📦 Votre commande ${order.orderNumber} a ete expediee ! - ${SHOP_NAME}`,
      html,
    });

    // Vérifier si l'email a vraiment été envoyé ou juste simulé
    const isStreamTransport = !info.messageId && !info.response;
    if (isStreamTransport) {
      console.log(
        `⚠️ Email: mode simulation (streamTransport) - Email NON envoyé réellement (${order.orderNumber})`
      );
      console.log(`   Destinataire: ${customerEmail}`);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Email: notification expédition envoyée (${order.orderNumber})`);
        console.log(`   MessageId: ${info.messageId || 'N/A'}`);
        console.log(`   Destinataire: ${customerEmail}`);
      } else {
        console.log('Email: notification expédition envoyée', { messageId: info.messageId });
      }
    }

    return true;
  } catch (error) {
    console.error('Email: erreur envoi expédition', error);
    return false;
  }
}

export async function sendDeliveryConfirmationEmail(
  order: OrderDataForEmail,
  customerEmail: string
): Promise<boolean> {
  try {
    const transport = getTransporter();
    const html = deliveryConfirmationTemplate(order, customerEmail);

    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${SHOP_EMAIL}>`,
      to: customerEmail,
      subject: `✅ Votre commande ${order.orderNumber} a ete livree ! - ${SHOP_NAME}`,
      html,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`Email: livraison envoyée (${order.orderNumber})`);
    } else {
      console.log('Email: livraison envoyée', { messageId: info.messageId });
    }

    return true;
  } catch (error) {
    console.error('Email: erreur envoi livraison', error);
    return false;
  }
}

type ContactPayload = {
  name: string;
  email: string;
  subject: string;
  message: string;
  ip?: string;
  userAgent?: string;
  createdAt?: Date;
};

function contactEmailTemplate(payload: ContactPayload): string {
  const createdAt = payload.createdAt
    ? payload.createdAt.toLocaleString('fr-FR')
    : new Date().toLocaleString('fr-FR');
  const ip = payload.ip || '—';
  const ua = payload.userAgent || '—';

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
      <h1 style="color: #000000;">📨 Nouveau message de contact</h1>
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
`;
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
`;
}

export async function sendContactEmail(payload: ContactPayload): Promise<boolean> {
  try {
    const transport = getTransporter();
    const html = contactEmailTemplate(payload);
    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${EMAIL_FROM}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: sanitizeEmailAddress(payload.email),
      subject: sanitizeHeaderValue(`[Contact – Boulevard] ${payload.subject}`),
      html,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Email: contact envoyé');
    } else {
      console.log('Email: contact envoyé', { messageId: info.messageId });
    }

    return true;
  } catch (error) {
    console.error('Email: erreur envoi contact', error);
    return false;
  }
}

export async function sendContactAutoReply(payload: {
  name: string;
  email: string;
  subject: string;
}): Promise<boolean> {
  try {
    const transport = getTransporter();
    const html = contactAutoReplyTemplate({ name: payload.name, subject: payload.subject });
    const info = await transport.sendMail({
      from: `"${SHOP_NAME}" <${EMAIL_FROM}>`,
      to: sanitizeEmailAddress(payload.email),
      replyTo: CONTACT_TO_EMAIL,
      subject: sanitizeHeaderValue(`✅ Nous avons bien reçu votre message - ${SHOP_NAME}`),
      html,
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('Email: accusé réception contact envoyé');
    } else {
      console.log('Email: accusé réception contact envoyé', { messageId: info.messageId });
    }

    return true;
  } catch (error) {
    console.error('Email: erreur envoi accusé réception contact', error);
    return false;
  }
}

export type { OrderDataForEmail, OrderItemForEmail };
