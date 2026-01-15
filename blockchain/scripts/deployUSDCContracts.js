const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("\n🚀 Starting USDC-Based Contract Deployment...\n");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "POL\n");

  if (balance === 0n) {
    console.error("❌ Error: Account has no POL for gas fees!");
    process.exit(1);
  }

  // Contract addresses
  const USDC_ADDRESS = "0x41E94Ca92cD8d48f89F8059FfC125265Ce440722";
  
  // Load existing deployments
  const deploymentsPath = path.join(__dirname, "../deployments/amoy.json");
  let deployments = {};
  if (fs.existsSync(deploymentsPath)) {
    const data = fs.readFileSync(deploymentsPath, "utf8");
    deployments = JSON.parse(data);
  }

  const RELIEF_TOKEN_ADDRESS = deployments.contracts?.ReliefToken;
  
  if (!RELIEF_TOKEN_ADDRESS) {
    console.error("❌ Error: ReliefToken address not found in deployments!");
    console.log("Please deploy ReliefToken first.");
    process.exit(1);
  }

  console.log("📋 Using existing contracts:");
  console.log("   ReliefToken:", RELIEF_TOKEN_ADDRESS);
  console.log("   USDC Token:", USDC_ADDRESS);
  console.log("");

  // Deploy ReliefTokenSale (USDC version)
  console.log("⏳ Deploying ReliefTokenSale (USDC version)...");
  const ReliefTokenSale = await ethers.getContractFactory("ReliefTokenSale");
  const tokenSale = await ReliefTokenSale.deploy(
    RELIEF_TOKEN_ADDRESS,
    USDC_ADDRESS,
    deployer.address
  );
  
  await tokenSale.waitForDeployment();
  const tokenSaleAddress = await tokenSale.getAddress();
  
  console.log("✅ ReliefTokenSale deployed to:", tokenSaleAddress);
  console.log("🔗 View on Explorer: https://amoy.polygonscan.com/address/" + tokenSaleAddress);

  // Transfer some RELIEF tokens to TokenSale contract for testing
  console.log("\n⏳ Transferring RELIEF tokens to TokenSale contract...");
  const reliefToken = await ethers.getContractAt("ReliefToken", RELIEF_TOKEN_ADDRESS);
  const transferAmount = ethers.parseEther("100000"); // 100,000 RELIEF tokens
  
  const transferTx = await reliefToken.transfer(tokenSaleAddress, transferAmount);
  await transferTx.wait();
  
  console.log("✅ Transferred 100,000 RELIEF tokens to TokenSale contract");

  // Update deployments file
  console.log("\n📄 Updating deployments file...");
  
  if (!deployments.contracts) {
    deployments.contracts = {};
  }
  
  // Save old address with timestamp
  if (deployments.contracts.ReliefTokenSale) {
    deployments.contracts.ReliefTokenSale_OLD = deployments.contracts.ReliefTokenSale;
  }
  
  deployments.contracts.ReliefTokenSale = tokenSaleAddress;
  deployments.contracts.USDC = USDC_ADDRESS;
  deployments.timestamp = new Date().toISOString();
  deployments.note = "Updated to USDC-based ReliefTokenSale";

  // Write updated deployments
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("✅ Updated deployments/amoy.json");

  // Display important information
  console.log("\n" + "=".repeat(70));
  console.log("📋 DEPLOYMENT SUMMARY - PHASE 2 COMPLETE");
  console.log("=".repeat(70));
  console.log("Network:                Polygon Amoy Testnet");
  console.log("Chain ID:               80002");
  console.log("");
  console.log("UPDATED CONTRACT:");
  console.log("ReliefTokenSale (USDC): " + tokenSaleAddress);
  console.log("");
  console.log("EXISTING CONTRACTS:");
  console.log("ReliefToken:            " + RELIEF_TOKEN_ADDRESS);
  console.log("USDC Token:             " + USDC_ADDRESS);
  console.log("CampaignFactory:        " + (deployments.contracts?.CampaignFactory || "N/A"));
  console.log("POLtoUSDCSwap:          " + (deployments.contracts?.POLtoUSDCSwap || "N/A"));
  console.log("=".repeat(70));

  console.log("\n📝 NEXT STEPS:");
  console.log("1. Update frontend/.env with new ReliefTokenSale address:");
  console.log("   VITE_RELIEF_TOKEN_SALE_ADDRESS=" + tokenSaleAddress);
  console.log("\n2. Donor flow is now:");
  console.log("   a. User swaps POL → USDC (via POLtoUSDCSwap)");
  console.log("   b. User approves USDC spending");
  console.log("   c. User calls buyTokens(usdcAmount) on ReliefTokenSale");
  console.log("   d. User receives RELIEF tokens");
  console.log("   e. User donates RELIEF to campaigns");
  console.log("\n3. Test the flow:");
  console.log("   - Get USDC via POLtoUSDCSwap contract");
  console.log("   - Approve USDC: " + tokenSaleAddress);
  console.log("   - Buy RELIEF tokens with USDC");
  console.log("   - Donate RELIEF to campaigns\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
