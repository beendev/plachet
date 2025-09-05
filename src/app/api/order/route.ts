// app/api/order/route.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { orderSchema } from "@/lib/validator";
import { sendOrderEmails } from "@/lib/mailer";
import { generateOrderRef } from "@/lib/orderRef";

export const runtime = "nodejs";

// Prix par défaut pour PANNEAUX (calcul serveur)
const PANEL_PRICE_PER_PIECE = 15;
const PANEL_SHIP_BE = 4.99;

function computePanelTotals(qty: number) {
  const freeUnits = Math.floor(qty / 10); // 1 offert / 10
  const payUnits = Math.max(0, qty - freeUnits);
  const merchandise = payUnits * PANEL_PRICE_PER_PIECE;
  const total = merchandise + PANEL_SHIP_BE;
  return {
    unitPrice: PANEL_PRICE_PER_PIECE,
    merchandise,
    shipping: PANEL_SHIP_BE,
    total,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const order = orderSchema.parse(body);

    // Si "pricing" est fourni (plaquettes), on reprend ces montants.
    // Sinon on calcule en mode "panneaux".
    const t = order.pricing && typeof order.pricing.total === "number"
      ? {
          pricePerPiece: order.pricing.unitPrice ?? PANEL_PRICE_PER_PIECE,
          merchandise: order.pricing.merchandise ?? 0,
          shipping: order.pricing.shipping ?? PANEL_SHIP_BE,
          total: order.pricing.total,
        }
      : (() => {
          const p = computePanelTotals(order.qty);
          return {
            pricePerPiece: p.unitPrice,
            merchandise: p.merchandise,
            shipping: p.shipping,
            total: p.total,
          };
        })();

    const orderRef = generateOrderRef();

    await sendOrderEmails(order, t, orderRef);

    return NextResponse.json({ ok: true, ref: orderRef });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation échouée", details: err.issues },
        { status: 400 }
      );
    }
    console.error(err);
    return NextResponse.json({ ok: false, error: "Erreur serveur" }, { status: 500 });
  }
}
