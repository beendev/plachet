// lib/validator.ts
import { z } from "zod";

export const pricingSchema = z
  .object({
    unitPrice: z.number().nonnegative().optional(),
    merchandise: z.number().nonnegative().optional(),
    shipping: z.number().nonnegative().optional(),
    placement: z.number().nonnegative().optional(), // si un jour tu factures le placement
    total: z.number().nonnegative().optional(),
  })
  .partial();

export const orderSchema = z.object({
  // Client
  company: z.string().min(1),
  vatNumber: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(3),

  // Adresse
  addressStreet: z.string().min(1),
  addressNumber: z.string().min(1),
  addressBox: z.string().optional().nullable(),
  postalCode: z.string().min(1),
  city: z.string().min(1),

  // Produit (affiché dans le récap)
  size: z.string().min(1),
  finish: z.string().min(1),
  qty: z.number().int().positive(),

  // Divers
  notes: z.string().optional().default(""),
  product: z.enum(["panneau", "plaquette"]).optional(), // indicatif
  pricing: pricingSchema.optional(),                    // si présent => on l’utilise
});

export type OrderInput = z.infer<typeof orderSchema>;
export type PricingInput = z.infer<typeof pricingSchema>;
