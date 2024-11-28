import { ethers } from "ethers";
import { PaymentModel } from "./models/payment";

export type SupportedCrypto = "ETH" | "BTC" | "USDC";

const UNIQUE_PATHS_NUMS = parseFloat(process.env.UNIQUE_PATHS_NUMS || "1000");
export const generatePaymentAddress = async (
  currency: SupportedCrypto
): Promise<string[]> => {
  if (currency === "ETH" || currency == "USDC") {
    if (process.env.ETHEREUM_MNEMONIC) {
      // Don't save the private key only public public key is needed for payment processing
      // Generate a unique wallet for each payment to avoid conflicts
      let i = 0;
      while (i < UNIQUE_PATHS_NUMS) {
        const wallet = generateUniqueWallet(process.env.ETHEREUM_MNEMONIC);
        var publicKey = wallet.address;
        const pendingPayments = await PaymentModel.find({
          address: publicKey,
          status: "pending",
        });
        if (pendingPayments.length > 0) {
          console.log(
            "Pending payment found, Creating new path:",
            publicKey,
            wallet.path
          );
        } else {
          console.log(publicKey);
          return [publicKey, wallet.path];
        }
      }
    }
  }
  return [];
};

// Generate a random unused path
const generateRandomPath = () => {
  const basePath = "m/44'/60'/0";
  const usedPaths = new Set();
  let path;
  do {
    const accountIndex = Math.floor(Math.random() * UNIQUE_PATHS_NUMS); // Random index (0-9999)
    path = `${basePath}'/0/${accountIndex}`;
  } while (usedPaths.has(path)); // Ensure no collisions
  usedPaths.add(path); // Mark path as used
  return path;
};

// Derive a wallet from a given path
const deriveWallet = (mnemonic: string, path: string) => {
  const node = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const derivedNode = node.derivePath(path);
  return {
    path,
    address: derivedNode.address,
    privateKey: derivedNode.privateKey,
  };
};

// Generate and derive a random path
const generateUniqueWallet = (mnemonic: string) => {
  const randomPath = generateRandomPath();
  return deriveWallet(mnemonic, randomPath);
};
