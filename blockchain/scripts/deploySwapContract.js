const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Starting POLtoUSDCSwap Contract Deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contract with account:", deployer.address);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "POL\n");

  if (balance === 0n) {
    console.error("❌ Error: Account has no POL for gas fees!");
    console.log("📌 Get testnet POL from: https://faucet.polygon.technology/");
    process.exit(1);
  }

  // Deploy contract
  console.log("⏳ Deploying POLtoUSDCSwap contract...");
  const POLtoUSDCSwap = await ethers.getContractFactory("POLtoUSDCSwap");
  const swap = await POLtoUSDCSwap.deploy(deployer.address);
  
  await swap.waitForDeployment();
  
  const swapAddress = await swap.getAddress();
  console.log("✅ POLtoUSDCSwap deployed to:", swapAddress);
  console.log("🔗 View on Explorer: https://amoy.polygonscan.com/address/" + swapAddress);

  // Update deployments file
  console.log("\n📄 Updating deployments file...");
  const deploymentsPath = path.join(__dirname, "../deployments/amoy.json");
  
  let deployments = {};
  if (fs.existsSync(deploymentsPath)) {
    const data = fs.readFileSync(deploymentsPath, "utf8");
    deployments = JSON.parse(data);
  }

  // Update contract address
  if (!deployments.contracts) {
    deployments.contracts = {};
  }
  deployments.contracts.POLtoUSDCSwap = swapAddress;
  deployments.timestamp = new Date().toISOString();

  // Write updated deployments
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("✅ Updated deployments/amoy.json");

  // Display important information
  console.log("\n" + "=".repeat(70));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(70));
  console.log("Network:              Polygon Amoy Testnet");
  console.log("Chain ID:             80002");
  console.log("Contract:             POLtoUSDCSwap");
  console.log("Address:              " + swapAddress);
  console.log("Deployer:             " + deployer.address);
  console.log("USDC Address:         0x41E94cA92cD8D48f89f8059ffc125265ce440722");
  console.log("WMATIC Address:       0x9c3C9283D3e44854ca1cc2E7Ca2f22701E42d18e");
  console.log("Uniswap V3 Router:    0xE592427A0AEce92De3Edee1F18E0157C05861564");
  console.log("=".repeat(70));

  console.log("\n📝 NEXT STEPS:");
  console.log("1. Update frontend/.env with this address:");
  console.log("   VITE_POL_USDC_SWAP_ADDRESS=" + swapAddress);
  console.log("\n2. Test the contract at:");
  console.log("   https://amoy.polygonscan.com/address/" + swapAddress);
  console.log("\n3. Get testnet POL from:");
  console.log("   https://faucet.polygon.technology/");
  console.log("\n4. Try swapping 0.5 POL to USDC to verify it works!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
