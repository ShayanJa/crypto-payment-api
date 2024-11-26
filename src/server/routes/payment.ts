import { Router } from "express";
import { ethers } from "ethers";
import { z } from "zod";
import { PaymentModel } from "../models/payment";
import { generatePaymentAddress } from "../utils";

const router = Router();

const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["ETH", "BTC"]),
  webhookUrl: z.string().url().optional(),
  expiresIn: z.number().min(1).max(60).default(30), // minutes
});

const CheckPaymentSchema = z.object({
  address: z.string(),
  currency: z.enum(["ETH", "BTC"]),
  expectedAmount: z.number().positive(),
});

router.post("/create", async (req, res) => {
  try {
    const { amount, currency, webhookUrl, expiresIn } =
      CreatePaymentSchema.parse(req.body);

    const [address, derivationPath] = await generatePaymentAddress(currency);
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    const payment = new PaymentModel({
      address,
      currency,
      derivationPath,
      expectedAmount: amount,
      webhookUrl,
      expiresAt,
    });

    await payment.save();

    res.json({
      address,
      currency,
      amount,
      expiresAt,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    res.status(400).json({ error: "Failed to create payment" });
  }
});

router.post("/check", async (req, res) => {
  try {
    const { address, currency, expectedAmount } = CheckPaymentSchema.parse(
      req.body
    );

    const payment = await PaymentModel.findOne({ address });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status === "expired") {
      return res.json({
        isReceived: false,
        status: "expired",
      });
    }

    if (payment.status === "completed") {
      return res.json({
        isReceived: true,
        txHash: payment.txHash,
        confirmations: payment.confirmations,
      });
    }

    // For pending payments, check current status
    if (currency === "ETH") {
      const provider = new ethers.providers.EtherscanProvider(
        process.env.CHAIN_ID || "sepolia",
        process.env.ETHERSCAN_API_KEY
      );
      const history = await provider.getHistory(address);
      const lastTx = history[history.length - 1];
      console.log(history);
      if (lastTx && lastTx.blockNumber) {
        const latestBlock = await provider.getBlockNumber();
        const confirmations = latestBlock - (lastTx?.blockNumber | 0);
        const receivedAmount = Number(ethers.utils.formatEther(lastTx.value));

        return res.json({
          isReceived: receivedAmount >= expectedAmount,
          txHash: lastTx.hash,
          confirmations,
        });
      }
    }

    if (currency === "BTC") {
      const response = await fetch(
        `https://api.blockcypher.com/v1/btc/main/addrs/${address}`
      );
      const data = await response.json();

      if (data.balance > 0) {
        const lastTx = data.txrefs?.[0];
        return res.json({
          isReceived: data.balance >= expectedAmount * 100000000,
          txHash: lastTx?.tx_hash,
          confirmations: lastTx?.confirmations || 0,
        });
      }
    }

    res.json({
      isReceived: false,
      status: "pending",
    });
    return;
  } catch (error) {
    console.error("Payment check error:", error);
    res.status(400).json({ error: "Failed to check payment status" });
    return;
  }
});

export default router;
