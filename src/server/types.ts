import { z } from 'zod';

export const CheckoutSchema = z.object({
  amount: z.number().positive(),
  currency: z.string(),
  supportedCurrencies: z.array(z.enum(['ETH', 'BTC'])),
  description: z.string().optional(),
});

export const CheckoutUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(['pending', 'completed', 'failed']),
  txHash: z.string().optional(),
});

export type Checkout = z.infer<typeof CheckoutSchema> & {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  paymentAddress?: string;
  txHash?: string;
};