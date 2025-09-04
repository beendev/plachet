// lib/validator.ts
import { z } from 'zod';

export const orderSchema = z.object({
  // Société / TVA (obligatoires)
  company: z.string().min(2).max(120),
  vatNumber: z.string().min(8).max(32),

  // Contact
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(40),

  // Adresse détaillée
  addressStreet: z.string().min(2).max(160),
  addressNumber: z.string().min(1).max(10),
  addressBox: z.string().max(20).optional().or(z.literal('')),
  postalCode: z.string().min(3).max(16),
  city: z.string().min(2).max(80),

  // Produit
  size: z.enum(['50x140', '100x70', '100x140']),
  finish: z.enum(['adhesif', 'ventouses']),
  qty: z.coerce.number().int().min(1).max(1000), // coerce évite les 400 si "qty" arrive en string

  // Divers
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export type OrderInput = z.infer<typeof orderSchema>;
