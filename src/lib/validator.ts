// lib/validators.ts
import { z } from 'zod';

export const orderSchema = z.object({
  company: z.string().max(120).optional().or(z.literal('')),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(6).max(40),
  address: z.string().min(5).max(800),
  size: z.enum(['50x140', '100x70', '100x140']),
  finish: z.enum(['adhesif', 'ventouses']),
  qty: z.number().int().min(1).max(1000),
  notes: z.string().max(1000).optional().or(z.literal('')),
});

export type OrderInput = z.infer<typeof orderSchema>;
