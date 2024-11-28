import mongoose from "mongoose";
export type SupportedCrypto = "ETH" | "BTC" | "USDC";

export interface Payment {
  address: string;
  currency: SupportedCrypto;
  expectedAmount: number;
  webhookUrl?: string;
  status: "pending" | "completed" | "expired";
  txHash?: string;
  confirmations?: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new mongoose.Schema<Payment>({
  address: { type: String, required: true },
  currency: { type: String, enum: ["ETH", "BTC", "USDC"], required: true },
  expectedAmount: { type: Number, required: true },
  webhookUrl: String,
  status: {
    type: String,
    enum: ["pending", "completed", "expired"],
    default: "pending",
  },
  txHash: String,
  confirmations: Number,
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const PaymentModel = mongoose.model<Payment>("Payment", paymentSchema);
