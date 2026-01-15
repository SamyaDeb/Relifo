const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploy all contracts with USDC as the donation token
 * This script deploys fresh contracts and clears old state
 */
async function main() {
  console.log("🚀 Deploying USDC-based Relief System to Polygon Amoy...\n");
  console.log("=".repeat(60));

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = deployer.address;
  console.log("📍 Deployer:", deployerAddress);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "POL\n");

  if (balance < hre.ethers.parseEther("0.5")) {
    console.log("⚠️  WARNING: Low balance! Need at least 0.5 POL for deployment.");
    console.log("Get POL from: https://faucet.polygon.technology\n");
  }

  // ==========================================
  // USDC Configuration
  // ==========================================
  // User's actual USDC contract on Polygon Amoy
  const USDC_ADDRESS = "0x8B0180f2101c8260d49339abfEe87927412494B4";
  console.log("💵 USDC Token Address:", USDC_ADDRESS);
  console.log("   Decimals: 6\n");

  // Verify USDC contract exists
  const usdcCode = await hre.ethers.provider.getCode(USDC_ADDRESS);
  if (usdcCode === "0x") {
    console.error("❌ ERROR: USDC contract not found at", USDC_ADDRESS);
    console.log("Please verify the USDC address is correct on Polygon Amoy.");
    process.exit(1);
  }
  console.log("✅ USDC contract verified\n");

  // ==========================================
  // 1. Deploy CampaignFactory with USDC
  // ==========================================
  console.log("📝 Step 1: Deploying CampaignFactory (USDC-based)...");
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = await CampaignFactory.deploy(USDC_ADDRESS, deployerAddress);
  await campaignFactory.waitForDeployment();
  const campaignFactoryAddress = await campaignFactory.getAddress();
  console.log("✅ CampaignFactory deployed to:", campaignFactoryAddress);
  console.log("   Token: USDC (6 decimals)");
  console.log("   Admin:", deployerAddress, "\n");

  // ==========================================
  // 2. Deploy TestnetUSDCSwap (for buying USDC with POL)
  // ==========================================
  console.log("📝 Step 2: Deploying TestnetUSDCSwap...");
  const TestnetUSDCSwap = await hre.ethers.getContractFactory("TestnetUSDCSwap");
  const testnetUsdcSwap = await TestnetUSDCSwap.deploy(USDC_ADDRESS, deployerAddress);
  await testnetUsdcSwap.waitForDeployment();
  const testnetUsdcSwapAddress = await testnetUsdcSwap.getAddress();
  console.log("✅ TestnetUSDCSwap deployed to:", testnetUsdcSwapAddress);
  console.log("   Exchange Rate: 0.16 USDC per POL");
  console.log("   USDC Token:", USDC_ADDRESS, "\n");

  // ==========================================
  // Summary
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 CONTRACT ADDRESSES:\n");
  console.log("USDC Token:            ", USDC_ADDRESS);
  console.log("CampaignFactory:       ", campaignFactoryAddress);
  console.log("TestnetUSDCSwap:       ", testnetUsdcSwapAddress);
  console.log("\n📋 CONFIGURATION:\n");
  console.log("Network:                Polygon Amoy Testnet");
  console.log("Chain ID:               80002");
  console.log("Token Used:             USDC (6 decimals)");
  console.log("Deployer/Admin:        ", deployerAddress);

  // ==========================================
  // Save addresses to deployment file
  // ==========================================
  const deploymentData = {
    network: "Polygon Amoy Testnet",
    chainId: 80002,
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    tokenUsed: "USDC",
    tokenDecimals: 6,
    contracts: {
      USDC: USDC_ADDRESS,
      CampaignFactory: campaignFactoryAddress,
      TestnetUSDCSwap: testnetUsdcSwapAddress,
    },
    note: "All campaigns accept USDC donations (6 decimals). Campaign.sol reliefToken variable = USDC address."
  };

  // Save to blockchain/deployments/amoy.json
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  const deploymentPath = path.join(deploymentsDir, "amoy.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log("\n📁 Deployment saved to:", deploymentPath);

  // Save to frontend/src/contracts/addresses.json
  const frontendAddresses = {
    network: "Polygon Amoy Testnet",
    chainId: 80002,
    deployer: deployerAddress,
    timestamp: deploymentData.timestamp,
    contracts: {
      USDC: USDC_ADDRESS,
      TestnetUSDCSwap: testnetUsdcSwapAddress,
      CampaignFactory: campaignFactoryAddress,
    },
    note: "CampaignFactory uses USDC for donations"
  };

  const frontendPath = path.join(__dirname, "../../frontend/src/contracts/addresses.json");
  fs.writeFileSync(frontendPath, JSON.stringify(frontendAddresses, null, 2));
  console.log("📁 Frontend addresses saved to:", frontendPath);

  // ==========================================
  // Next Steps
  // ==========================================
  console.log("\n💡 NEXT STEPS:\n");
  console.log("1. Fund TestnetUSDCSwap with USDC for swaps:");
  console.log(`   npx hardhat run scripts/fundSwapContract.js --network amoy\n`);
  console.log("2. Approve organizers:");
  console.log(`   npx hardhat run scripts/approveOrganizersUSDC.js --network amoy\n`);
  console.log("3. Clear Firebase data and test the flow");
  console.log("\n🔗 View on PolygonScan:");
  console.log(`https://amoy.polygonscan.com/address/${campaignFactoryAddress}`);
  console.log(`https://amoy.polygonscan.com/address/${testnetUsdcSwapAddress}`);
  console.log("\n" + "=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
