import nodemailer from 'nodemailer';
import type { OrderInput } from './validator';

const to = process.env.ORDER_TO_EMAIL || 'info@plachet.be';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://plachet.be';

function transporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error('SMTP non configuré (.env manquant)');
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

const money = (n: number) => `${n.toFixed(2)}€`;

export async function sendOrderEmails(
  order: OrderInput,
  totals: { pricePerPiece: number; shipping: number; freeUnits: number; merchandise: number; total: number }
) {
  const t = transporter();

  // ADMIN (HTML + texte)
  await t.sendMail({
    from: `PLACHET <${process.env.SMTP_USER}>`,
    to,
    subject: `Nouvelle commande – ${order.qty} unité(s) – ${money(totals.total)}`,
    text: renderAdminText(order, totals),
    html: renderAdminHtml(order, totals),
    replyTo: `${order.name} <${order.email}>`,
  });

  // CLIENT (HTML + texte)
  await t.sendMail({
    from: `PLACHET <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: 'Votre commande PLACHET – confirmation',
    text: renderClientText(order, totals),
    html: renderClientHtml(order, totals),
  });
}

function renderAdminText(order: OrderInput, t: { pricePerPiece: number; shipping: number; freeUnits: number; merchandise: number; total: number }) {
  return `Nouvelle commande PLACHET
-------------------------
Nom: ${order.name}
Société: ${order.company || '-'}
E-mail: ${order.email}
Téléphone: ${order.phone}
Adresse: ${order.address}

Produit:
- Taille: ${order.size}
- Finition: ${order.finish}
- Quantité demandée: ${order.qty}
- Unités offertes: ${t.freeUnits}
- Prix unitaire: ${money(t.pricePerPiece)}
- Articles: ${money(t.merchandise)}
- Livraison (BE): ${money(t.shipping)}
- Total: ${money(t.total)}

Notes: ${order.notes || '-'}

Source: ${siteUrl}
`;
}

function outerWrap(inner: string) {
  return `<!doctype html>
<html lang="fr"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>PLACHET</title></head>
<body style="margin:0;background:#f6f7fb;padding:24px;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.05)">
    <tr>
      <td style="background:#8B5CF6;color:#fff;padding:18px 22px;font-weight:700;font-size:18px;letter-spacing:.5px">PLACHET</td>
    </tr>
    <tr>
      <td style="padding:22px">${inner}</td>
    </tr>
    <tr>
      <td style="padding:16px 22px;color:#6b7280;font-size:12px;text-align:center">Cet e‑mail a été envoyé automatiquement depuis <a href="${siteUrl}" style="color:#8B5CF6;text-decoration:none">${siteUrl.replace('https://','')}</a>.</td>
    </tr>
  </table>
</body></html>`;
}

function line(label: string, value: string) {
  return `<tr><td style=\"padding:8px 0;color:#6b7280\">${label}</td><td style=\"padding:8px 0;text-align:right;font-weight:600;color:#111827\">${value}</td></tr>`;
}

function sectionTitle(txt: string) {
  return `<h2 style=\"margin:0 0 12px;font-size:16px;color:#111827\">${txt}</h2>`;
}

function pill(txt: string) {
  return `<span style=\"display:inline-block;background:#10B9811a;color:#065f46;border-radius:999px;padding:4px 10px;font-size:12px\">${txt}</span>`;
}

function renderAdminHtml(order: OrderInput, t: { pricePerPiece: number; shipping: number; freeUnits: number; merchandise: number; total: number }) {
  const inner = `
    ${sectionTitle('Nouvelle commande')}
    <p style="margin:0 0 16px">${order.name}${order.company ? ` · ${order.company}` : ''}</p>
    <p style="margin:0 0 16px">${order.email} · ${order.phone}</p>
    <p style="margin:0 0 16px;white-space:pre-wrap">${order.address}</p>

    ${sectionTitle('Détails produit')}
    <table role="presentation" width="100%" style="border-collapse:collapse">
      ${line('Taille', order.size)}
      ${line('Finition', order.finish)}
      ${line('Quantité', String(order.qty))}
      ${line('Unités offertes', String(t.freeUnits))}
      ${line('Prix unitaire', money(t.pricePerPiece))}
      ${line('Articles', money(t.merchandise))}
      ${line('Livraison (BE)', money(t.shipping))}
      ${line('<strong>Total</strong>', `<strong>${money(t.total)}</strong>`)}
    </table>

    ${order.notes ? `${sectionTitle('Remarques')}<p style=\"margin:0 0 16px;white-space:pre-wrap\">${order.notes}</p>` : ''}

    <p style="margin:16px 0 0;color:#6b7280;font-size:12px">Répondre à ce message pour contacter le client.</p>
  `;
  return outerWrap(inner);
}

function renderClientText(order: OrderInput, t: { pricePerPiece: number; shipping: number; freeUnits: number; merchandise: number; total: number }) {
  return `Bonjour ${order.name},

Merci pour votre commande chez PLACHET. Voici votre récapitulatif :

• Taille: ${order.size}
• Finition: ${order.finish}
• Quantité: ${order.qty} (dont ${t.freeUnits} offert(s) par tranche de 10)
• Prix unitaire: ${t.pricePerPiece}€
• Articles: ${t.merchandise.toFixed(2)}€
• Livraison (Belgique): ${t.shipping.toFixed(2)}€
• Total: ${t.total.toFixed(2)}€

Adresse de livraison:
${order.address}

${order.notes ? `Remarques: ${order.notes}

` : ''}Vous recevrez une facture par e‑mail pour valider la commande. Dès réception du paiement, nous prenons en charge la commande sous 24 h.

Cordialement,
PLACHET
${siteUrl}`;
}

function renderClientHtml(order: OrderInput, t: { pricePerPiece: number; shipping: number; freeUnits: number; merchandise: number; total: number }) {
  const inner = `
    ${sectionTitle('Merci pour votre commande !')}
    <p style="margin:0 0 12px">Bonjour <strong>${order.name}</strong>,</p>
    <p style="margin:0 0 16px">Voici le récapitulatif de votre commande. ${pill('Facture à venir par e‑mail')} ${pill('Prise en charge sous 24 h après paiement')}</p>

    ${sectionTitle('Récapitulatif')}
    <table role="presentation" width="100%" style="border-collapse:collapse">
      ${line('Taille', order.size)}
      ${line('Finition', order.finish)}
      ${line('Quantité', String(order.qty))}
      ${line('Unités offertes', String(t.freeUnits))}
      ${line('Prix unitaire', money(t.pricePerPiece))}
      ${line('Articles', money(t.merchandise))}
      ${line('Livraison (BE)', money(t.shipping))}
      ${line('<strong>Total</strong>', `<strong>${money(t.total)}</strong>`)}
    </table>

    ${sectionTitle('Livraison')}
    <p style="margin:0 0 16px;white-space:pre-wrap">${order.address}</p>

    ${order.notes ? `${sectionTitle('Remarques')}<p style=\"margin:0 0 16px;white-space:pre-wrap\">${order.notes}</p>` : ''}

    <p style="margin:16px 0 0;color:#6b7280;font-size:12px">Besoin d’aide ? Répondez à cet e‑mail ou contactez <a href="mailto:info@plachet.be" style="color:#8B5CF6;text-decoration:none">info@plachet.be</a>.</p>
  `;
  return outerWrap(inner);
}
