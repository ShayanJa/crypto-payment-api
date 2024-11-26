import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

// Derive a wallet from a given path
const deriveWallet = (mnemonic, path) => {
  const node = ethers.utils.HDNode.fromMnemonic(mnemonic);
  const derivedNode = node.derivePath(path);
  return {
    path,
    address: derivedNode.address,
    privateKey: derivedNode.privateKey,
  };
};

const main = async () => {
  var provider = null;
  console.log("Command-line arguments:");
  console.log(
    `arguments: list of derivations paths: "m/44'/60'/0'/0/222" "m/44'/60'/0'/0/23"  "m/44'/60'/0'/0/81"]`
  );
  console.log("--getBalances: get balances of the addresses too");
  const getBalances = process.argv.indexOf("--getBalances");
  if (getBalances !== -1) {
    provider = new ethers.providers.EtherscanProvider(
      process.env.CHAIN_ID || "sepolia",
      process.env.ETHERSCAN_API_KEY
    );
  }

  process.argv.forEach((val, index) => {
    if (index > 1 && val !== "--getBalances") {
      const wallet = deriveWallet(process.env.ETHEREUM_MNEMONIC, val);
      console.log(wallet);
      if (getBalances !== -1) {
        provider.getBalance(wallet.address).then((balance) => {
          console.log(
            `Balance of ${wallet.address}: ${ethers.utils.formatEther(
              balance
            )} ETH`
          );
        });
      }
    }
  });
};
main();
