// lib/mailer.ts
// Si votre tsconfig n'a PAS "esModuleInterop": true,
// remplacez la ligne suivante par:  import * as nodemailer from 'nodemailer';
import nodemailer from 'nodemailer';
import type { OrderInput } from './validator'; // <-- si votre fichier est "validator.ts", remplacez par './validator'

const TO = process.env.ORDER_TO_EMAIL || 'info@plachet.be';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://plachet.be';

function transporter() {
  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const user = process.env.SMTP_USER!;
  const pass = process.env.SMTP_PASS!;
  if (!host || !user || !pass) {
    throw new Error('SMTP non configuré (.env manquant)');
  }
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

type Totals = {
  pricePerPiece: number; // ex. 15
  shipping: number;      // ex. 4.99
  merchandise: number;   // total articles, gratuités déduites
  total: number;         // merchandise + shipping
};

const money = (n: number) => `${n.toFixed(2)}€`;

export async function sendOrderEmails(
  order: OrderInput,
  t: Totals,
  orderRef: string
) {
  const tx = transporter();

  // ADMIN
  await tx.sendMail({
    from: `PLACHET <${process.env.SMTP_USER}>`,
    to: TO,
    subject: `#${orderRef} – Nouvelle commande – ${order.qty} unité(s) – ${money(t.total)}`,
    text: renderAdminText(order, t, orderRef),
    html: renderAdminHtml(order, t, orderRef),
    replyTo: `${order.name} <${order.email}>`,
  });

  // CLIENT
  await tx.sendMail({
    from: `PLACHET <${process.env.SMTP_USER}>`,
    to: order.email,
    subject: `#${orderRef} – Confirmation de commande`,
    text: renderClientText(order, t, orderRef),
    html: renderClientHtml(order, t, orderRef),
  });
}

/* -------------------- Helpers mise en forme -------------------- */

function addressLines(o: OrderInput) {
  const l1 = `${o.addressStreet} ${o.addressNumber}${o.addressBox ? `, boîte ${o.addressBox}` : ''}`;
  const l2 = `${o.postalCode} ${o.city}`;
  return { l1, l2 };
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
      <td style="padding:16px 22px;color:#6b7280;font-size:12px;text-align:center">Cet e-mail a été envoyé automatiquement depuis <a href="${SITE_URL}" style="color:#8B5CF6;text-decoration:none">${SITE_URL.replace('https://','')}</a>.</td>
    </tr>
  </table>
</body></html>`;
}

function line(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280">${label}</td>
    <td style="padding:8px 0;text-align:right;font-weight:600;color:#111827">${value}</td>
  </tr>`;
}

function sectionTitle(txt: string) {
  return `<h2 style="margin:0 0 12px;font-size:16px;color:#111827">${txt}</h2>`;
}

/* -------------------- ADMIN: texte + HTML -------------------- */

function renderAdminText(o: OrderInput, t: Totals, ref: string) {
  const { l1, l2 } = addressLines(o);
  const freeUnits = Math.floor(o.qty / 10); // info pour le calcul
  const calc = `${o.qty} × ${t.pricePerPiece}€${freeUnits ? ` − ${freeUnits} offert${freeUnits>1 ? 's' : ''}` : ''} = ${money(t.merchandise)}`;

  return `Commande #${ref}
-------------------------
Société: ${o.company}
TVA: ${o.vatNumber}
Nom: ${o.name}
E-mail: ${o.email}
Téléphone: ${o.phone}

Adresse:
${l1}
${l2}

Produit:
- Taille: ${o.size}
- Finition: ${o.finish}
- Quantité: ${o.qty}

Récapitulatif:
- Panneau de fenêtre (${o.qty} article${o.qty>1?'s':''}): ${calc}
- Livraison (Belgique): ${money(t.shipping)}
= Total: ${money(t.total)}

Notes: ${o.notes || '-'}

Source: ${SITE_URL}
`;
}

function renderAdminHtml(o: OrderInput, t: Totals, ref: string) {
  const { l1, l2 } = addressLines(o);
  const freeUnits = Math.floor(o.qty / 10);
  const calc = `${o.qty} × ${t.pricePerPiece}€${freeUnits ? ` − ${freeUnits} offert${freeUnits>1 ? 's' : ''}` : ''} = ${money(t.merchandise)}`;

  const inner = `
    <p style="margin:0 0 12px;font-size:13px;color:#6b7280">Commande <strong>#${ref}</strong></p>

    ${sectionTitle('Nouvelle commande')}
    <p style="margin:0 0 6px"><strong>Société:</strong> ${o.company}</p>
    <p style="margin:0 0 16px"><strong>TVA:</strong> ${o.vatNumber}</p>
    <p style="margin:0 0 16px">${o.name} · ${o.email} · ${o.phone}</p>

    ${sectionTitle('Adresse')}
    <p style="margin:0 0 4px">${l1}</p>
    <p style="margin:0 0 16px">${l2}</p>

    ${sectionTitle('Produit')}
    <table role="presentation" width="100%" style="border-collapse:collapse">
      ${line('Taille', o.size)}
      ${line('Finition', o.finish)}
      ${line('Quantité', String(o.qty))}
    </table>

    ${sectionTitle('Récapitulatif')}
    <table role="presentation" width="100%" style="border-collapse:collapse">
      ${line(`Panneau de fenêtre (${o.qty} article${o.qty>1?'s':''})`, calc)}
      ${line('Livraison (BE)', money(t.shipping))}
      ${line('<strong>Total</strong>', `<strong>${money(t.total)}</strong>`)}
    </table>

    ${o.notes ? `${sectionTitle('Remarques')}<p style="margin:0 0 16px;white-space:pre-wrap">${o.notes}</p>` : ''}
  `;
  return outerWrap(inner);
}

/* -------------------- CLIENT: texte + HTML -------------------- */

function renderClientText(o: OrderInput, t: Totals, ref: string) {
  const { l1, l2 } = addressLines(o);
  const freeUnits = Math.floor(o.qty / 10);
  const calc = `${o.qty} × ${t.pricePerPiece}€${freeUnits ? ` − ${freeUnits} offert${freeUnits>1 ? 's' : ''}` : ''} = ${money(t.merchandise)}`;

  return `Commande #${ref}

Merci pour votre commande chez PLACHET. Voici votre récapitulatif:

• Taille: ${o.size}
• Finition: ${o.finish}
• Quantité: ${o.qty}

Récapitulatif:
• Panneau de fenêtre (${o.qty} article${o.qty>1?'s':''}): ${calc}
• Livraison (Belgique): ${money(t.shipping)}
= Total: ${money(t.total)}

Adresse de livraison:
${l1}
${l2}

${o.notes ? `Remarques: ${o.notes}\n\n` : ''}Vous recevrez une facture par e-mail pour valider la commande. Dès réception du paiement, nous prenons en charge la commande sous 24 h.

Cordialement,
PLACHET
${SITE_URL}`;
}

function renderClientHtml(o: OrderInput, t: Totals, ref: string) {
  const { l1, l2 } = addressLines(o);
  const freeUnits = Math.floor(o.qty / 10);
  const calc = `${o.qty} × ${t.pricePerPiece}€${freeUnits ? ` − ${freeUnits} offert${freeUnits>1 ? 's' : ''}` : ''} = ${money(t.merchandise)}`;

  const inner = `
    <p style="margin:0 0 12px;font-size:13px;color:#6b7280">Commande <strong>#${ref}</strong></p>

    ${sectionTitle('Merci pour votre commande !')}
    <p style="margin:0 0 16px">Voici le récapitulatif. La facture vous sera envoyée par e-mail pour valider la commande.</p>

    ${sectionTitle('Produit')}
    <table role="presentation" width="100%" style="border-collapse:collapse">
      ${line('Taille', o.size)}
      ${line('Finition', o.finish)}
      ${line('Quantité', String(o.qty))}
    </table>

    ${sectionTitle('Récapitulatif')}
    <table role="presentation" width="100%" style="border-collapse:collapse">
      ${line(`Panneau de fenêtre (${o.qty} article${o.qty>1?'s':''})`, calc)}
      ${line('Livraison (BE)', money(t.shipping))}
      ${line('<strong>Total</strong>', `<strong>${money(t.total)}</strong>`)}
    </table>

    ${sectionTitle('Livraison')}
    <p style="margin:0 0 4px">${l1}</p>
    <p style="margin:0 0 16px">${l2}</p>

    ${o.notes ? `${sectionTitle('Remarques')}<p style="margin:0 0 16px;white-space:pre-wrap">${o.notes}</p>` : ''}
  `;
  return outerWrap(inner);
}
