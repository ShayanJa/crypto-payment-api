import { Router } from "express";
import { ethers } from "ethers";
import { z } from "zod";
import { PaymentModel } from "../models/payment";
import { generatePaymentAddress } from "../utils";

const router = Router();

const USDC_CONTRACT_ADDRESS = "0x5425890298aed601595a70AB815c96711a31Bc65";
const USDC_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const CreatePaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(["ETH", "BTC", "USDC"]),
  webhookUrl: z.string().url().optional(),
  expiresIn: z.number().min(1).max(60).default(30),
});

const CheckPaymentSchema = z.object({
  address: z.string(),
  currency: z.enum(["ETH", "BTC", "USDC"]),
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

    const provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL
    );
    const ethProvider = new ethers.providers.EtherscanProvider(
      process.env.CHAIN_ID || "sepolia",
      process.env.ETHERSCAN_API_KEY
    );

    if (currency === "ETH") {
      const history = await ethProvider.getHistory(address);
      const lastTx = history[history.length - 1];
      if (lastTx) {
        const latestBlock = await provider.getBlockNumber();
        const confirmations = latestBlock - lastTx.blockNumber;
        const receivedAmount = Number(ethers.utils.formatEther(lastTx.value));

        return res.json({
          isReceived: receivedAmount >= expectedAmount,
          txHash: lastTx.hash,
          confirmations,
        });
      }
    }

    if (currency === "USDC") {
      const contract = new ethers.Contract(
        USDC_CONTRACT_ADDRESS,
        USDC_ABI,
        provider
      );
      console.log(contract);
      const balance = await contract.balanceOf(address);
      console.log(balance);
      const receivedAmount = Number(ethers.utils.formatUnits(balance, 6)); // USDC has 6 decimals

      if (receivedAmount >= expectedAmount) {
        const latestBlock = await provider.getBlockNumber();
        const filter = contract.filters.Transfer(null, address);
        const events = await contract.queryFilter(
          filter,
          latestBlock - 100,
          latestBlock
        );
        const lastTransfer = events[events.length - 1];

        return res.json({
          isReceived: true,
          confirmations: lastTransfer
            ? latestBlock - lastTransfer.blockNumber
            : 1,
          txHash: lastTransfer ? lastTransfer.transactionHash : "usdc_transfer",
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
  } catch (error) {
    console.error("Payment check error:", error);
    res.status(400).json({ error: "Failed to check payment status" });
  }
});

export default router;
