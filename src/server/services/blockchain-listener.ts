import cron from "node-cron";
import { ethers } from "ethers";
import axios from "axios";
import { PaymentModel } from "../models/payment";

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

export class BlockchainListener {
  private ethProvider: ethers.providers.EtherscanProvider;
  private provider: ethers.providers.JsonRpcProvider;
  private usdcContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL
    );
    this.usdcContract = new ethers.Contract(
      USDC_CONTRACT_ADDRESS,
      USDC_ABI,
      this.provider
    );
    this.ethProvider = new ethers.providers.EtherscanProvider(
      "sepolia",
      process.env.ETHERSCAN_API_KEY
    );

    this.startListening();
  }

  private async checkEthereumPayment(payment: any) {
    try {
      const history = await this.ethProvider.getHistory(payment.address);
      const lastTx = history[history.length - 1];

      if (lastTx && lastTx.blockNumber) {
        const latestBlock = await this.ethProvider.getBlockNumber();
        const confirmations = latestBlock - lastTx.blockNumber;
        const receivedAmount = Number(ethers.utils.formatEther(lastTx.value));

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

  private async checkUSDCPayment(payment: any) {
    try {
      const balance = await this.usdcContract.balanceOf(payment.address);
      const receivedAmount = Number(ethers.utils.formatUnits(balance, 6));

      if (receivedAmount >= payment.expectedAmount) {
        const latestBlock = await this.provider.getBlockNumber();
        const filter = this.usdcContract.filters.Transfer(
          null,
          payment.address
        );
        const events = await this.usdcContract.queryFilter(
          filter,
          latestBlock - 100,
          latestBlock
        );
        const lastTransfer = events[events.length - 1];

        if (lastTransfer) {
          await this.markPaymentComplete(
            payment,
            lastTransfer.transactionHash,
            latestBlock - lastTransfer.blockNumber
          );
        }
      }
    } catch (error) {
      console.error(
        `Error checking USDC payment for ${payment.address}:`,
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
      await PaymentModel.updateMany(
        {
          status: "pending",
          expiresAt: { $lt: new Date() },
        },
        {
          status: "expired",
          updatedAt: new Date(),
        }
      );

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
        switch (payment.currency) {
          case "ETH":
            await this.checkEthereumPayment(payment);
            break;
          case "USDC":
            await this.checkUSDCPayment(payment);
            break;
          case "BTC":
            await this.checkBitcoinPayment(payment);
            break;
        }
      }
    } catch (error) {
      console.error("Error checking pending payments:", error);
    }
  }

  public startListening() {
    cron.schedule("* * * * *", async () => {
      await this.checkPendingPayments();
    });

    cron.schedule("*/5 * * * *", async () => {
      await this.checkExpiredPayments();
    });
  }
}
