// app/api/order/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { orderSchema } from '@/lib/validator';     // <-- importe bien depuis "validator" (singulier) si tu as ce fichier
import { sendOrderEmails } from '@/lib/mailer';
import { generateOrderRef } from '@/lib/orderRef';

const PRICE_PER_PIECE = 15;
const SHIP_BE = 4.99;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validation Zod
    const order = orderSchema.parse(body);

    // Totaux (1 offert par tranche de 10)
    const freeUnits = Math.floor(order.qty / 10);
    const payUnits  = Math.max(0, order.qty - freeUnits);
    const merchandise = payUnits * PRICE_PER_PIECE;
    const total = merchandise + SHIP_BE;

    const orderRef = generateOrderRef();

    await sendOrderEmails(
      order,
      { pricePerPiece: PRICE_PER_PIECE, shipping: SHIP_BE, merchandise, total },
      orderRef
    );

    return NextResponse.json({ ok: true, orderRef });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      // log serveur (utile en dev et dans les logs Vercel)
      console.error('ZOD issues:', JSON.stringify(err.issues, null, 2));
      return NextResponse.json(
        { ok: false, error: 'Validation échouée', details: err.issues },
        { status: 400 }
      );
    }
    console.error(err instanceof Error ? err.stack || err.message : err);
    return NextResponse.json({ ok: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
