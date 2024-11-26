import cron from "node-cron";
import { ethers } from "ethers";
import axios from "axios";
import { PaymentModel } from "../models/payment";

export class BlockchainListener {
  private provider: ethers.providers.EtherscanProvider;

  constructor() {
    this.provider = new ethers.providers.EtherscanProvider(
      process.env.CHAIN_ID || "sepolia",
      process.env.ETHERSCAN_API_KEY
    );
    this.startListening();
  }

  private async checkEthereumPayment(payment: any) {
    try {
      const history = await this.provider.getHistory(payment.address);
      const lastTx = history[history.length - 1];

      if (lastTx && lastTx.blockNumber) {
        const latestBlock = await this.provider.getBlockNumber();
        const confirmations = latestBlock - lastTx.blockNumber;
        const receivedAmount = Number(ethers.utils.formatEther(lastTx.value));
        console.log(Number(lastTx.value));

        if (receivedAmount >= payment.expectedAmount && confirmations >= 1) {
          await this.markPaymentComplete(payment, lastTx.hash, confirmations);
        }
      }
    } catch (error) {
      console.error(
        `Error checking ETH payment for ${payment.address}:`,
        error
      );
    }
  }

  private async checkBitcoinPayment(payment: any) {
    try {
      const response = await axios.get(
        `https://api.blockcypher.com/v1/btc/main/addrs/${payment.address}`
      );

      const data = response.data;
      if (data.balance >= payment.expectedAmount * 100000000) {
        // Convert to satoshis
        const lastTx = data.txrefs?.[0];
        if (lastTx && lastTx.confirmations >= 1) {
          await this.markPaymentComplete(
            payment,
            lastTx.tx_hash,
            lastTx.confirmations
          );
        }
      }
    } catch (error) {
      console.error(
        `Error checking BTC payment for ${payment.address}:`,
        error
      );
    }
  }

  private async markPaymentComplete(
    payment: any,
    txHash: string,
    confirmations: number
  ) {
    try {
      // Update payment status in database
      const updatedPayment = await PaymentModel.findOneAndUpdate(
        { _id: payment._id, status: "pending" },
        {
          status: "completed",
          txHash,
          confirmations,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (updatedPayment && payment.webhookUrl) {
        // Send webhook notification
        await axios
          .post(payment.webhookUrl, {
            status: "completed",
            address: payment.address,
            currency: payment.currency,
            txHash,
            confirmations,
            timestamp: new Date().toISOString(),
          })
          .catch((error) => {
            console.error(
              `Webhook delivery failed for ${payment.address}:`,
              error
            );
          });
      }
    } catch (error) {
      console.error(
        `Error marking payment complete for ${payment.address}:`,
        error
      );
    }
  }

  private async checkExpiredPayments() {
    try {
      const expiredPayments = await PaymentModel.updateMany(
        {
          status: "pending",
          expiresAt: { $lt: new Date() },
        },
        {
          status: "expired",
          updatedAt: new Date(),
        }
      );

      // Send webhook notifications for expired payments
      const payments = await PaymentModel.find({
        status: "expired",
        webhookUrl: { $exists: true },
      });

      for (const payment of payments) {
        if (payment.webhookUrl) {
          await axios
            .post(payment.webhookUrl, {
              status: "expired",
              address: payment.address,
              currency: payment.currency,
              timestamp: new Date().toISOString(),
            })
            .catch((error) => {
              console.error(
                `Webhook delivery failed for ${payment.address}:`,
                error
              );
            });
        }
      }
    } catch (error) {
      console.error("Error checking expired payments:", error);
    }
  }

  private async checkPendingPayments() {
    try {
      const pendingPayments = await PaymentModel.find({ status: "pending" });

      for (const payment of pendingPayments) {
        if (payment.currency === "ETH") {
          await this.checkEthereumPayment(payment);
        } else if (payment.currency === "BTC") {
          await this.checkBitcoinPayment(payment);
        }
      }
    } catch (error) {
      console.error("Error checking pending payments:", error);
    }
  }

  public startListening() {
    // Check pending payments every minute
    cron.schedule("* * * * *", async () => {
      await this.checkPendingPayments();
    });

    // Check for expired payments every 5 minutes
    cron.schedule("*/5 * * * *", async () => {
      await this.checkExpiredPayments();
    });
  }
}
