// app/api/order/route.ts
import { NextResponse } from 'next/server';
import { orderSchema } from '@/lib/validator';
import { sendOrderEmails } from '@/lib/mailer';
import { ZodError } from 'zod';
export const runtime = 'nodejs';

const PRICE_PER_PIECE = 15;
const SHIP_BE = 4.99;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const order = orderSchema.parse(body);

    // Recalcul serveur (anti-bidouille)
    const freeUnits = Math.floor(order.qty / 10);
    const payUnits  = Math.max(0, order.qty - freeUnits);
    const merchandise = payUnits * PRICE_PER_PIECE;
    const total = merchandise + SHIP_BE;

    await sendOrderEmails(order, {
      pricePerPiece: PRICE_PER_PIECE,
      shipping: SHIP_BE,
      freeUnits,
      merchandise,
      total,
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Validation échouée', details: err.issues },
        { status: 400 }
      );
    }

    console.error(err instanceof Error ? err.message : err);
    return NextResponse.json(
      { ok: false, error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}