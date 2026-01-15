const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Redeploy CampaignFactory with USDC instead of RELIEF token
 * This enables full USDC stablecoin donation flow
 */
async function main() {
  console.log("🚀 Redeploying CampaignFactory with USDC...\n");

  // Polygon Amoy Testnet USDC address (Circle's official testnet USDC)
  const USDC_ADDRESS = "0xBc03f5c495d594304052824924461A24fa6d4163";
  
  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = deployer.address;
  console.log("📍 Deploying with account:", deployerAddress);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "POL\n");

  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("⚠️  WARNING: Low balance! You may need more POL from faucet.");
    console.log("Get POL from: https://faucet.polygon.technology\n");
  }

  // ==========================================
  // Deploy NEW CampaignFactory with USDC
  // ==========================================
  console.log("📝 Deploying CampaignFactory with USDC token...");
  console.log("   USDC Address:", USDC_ADDRESS);
  
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = await CampaignFactory.deploy(USDC_ADDRESS, deployerAddress);
  await campaignFactory.waitForDeployment();
  const campaignFactoryAddress = await campaignFactory.getAddress();
  
  console.log("✅ CampaignFactory deployed to:", campaignFactoryAddress);
  console.log("   Token: USDC (not RELIEF)");
  console.log("   Admin:", deployerAddress, "\n");

  // Verify the token address is set correctly
  const tokenAddress = await campaignFactory.reliefToken();
  console.log("🔍 Verification - Factory token address:", tokenAddress);
  console.log("   Expected USDC:", USDC_ADDRESS);
  console.log("   Match:", tokenAddress.toLowerCase() === USDC_ADDRESS.toLowerCase() ? "✅ YES" : "❌ NO");

  // ==========================================
  // Summary
  // ==========================================
  console.log("\n" + "=".repeat(60));
  console.log("🎉 USDC CAMPAIGN FACTORY DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\n📋 NEW CONTRACT ADDRESS:\n");
  console.log("CampaignFactory (USDC): ", campaignFactoryAddress);
  console.log("Token Used:              USDC");
  console.log("Token Address:          ", USDC_ADDRESS);
  console.log("Token Decimals:          6 (not 18!)");
  console.log("\n⚠️  IMPORTANT NOTES:\n");
  console.log("1. Old campaigns still use RELIEF token");
  console.log("2. NEW campaigns created with this factory use USDC");
  console.log("3. USDC has 6 decimals (use parseUnits(amount, 6))");
  console.log("4. Update frontend polygonService.js with new address");
  console.log("\n🔗 View on PolygonScan:");
  console.log(`https://amoy.polygonscan.com/address/${campaignFactoryAddress}`);
  console.log("\n" + "=".repeat(60));

  // ==========================================
  // Update deployment files
  // ==========================================
  
  // Load existing deployment info
  const jsonPath = path.join(__dirname, "../deployments/amoy.json");
  let deploymentInfo = {};
  
  if (fs.existsSync(jsonPath)) {
    deploymentInfo = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
  
  // Update with new CampaignFactory
  deploymentInfo.CampaignFactory_USDC = campaignFactoryAddress;
  deploymentInfo.CampaignFactory_OLD = deploymentInfo.contracts?.CampaignFactory || deploymentInfo.CampaignFactory;
  
  // Update the main CampaignFactory reference
  if (deploymentInfo.contracts) {
    deploymentInfo.contracts.CampaignFactory = campaignFactoryAddress;
  }
  
  deploymentInfo.tokenUsed = "USDC";
  deploymentInfo.usdcAddress = USDC_ADDRESS;
  deploymentInfo.lastUpdated = new Date().toISOString();
  deploymentInfo.note = "CampaignFactory now uses USDC instead of RELIEF for donations";

  // Save updated deployment info
  fs.writeFileSync(jsonPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info updated: deployments/amoy.json");

  // Update frontend contract addresses
  const frontendServicePath = path.join(__dirname, "../../frontend/src/services/polygonService.js");
  
  if (fs.existsSync(frontendServicePath)) {
    let serviceContent = fs.readFileSync(frontendServicePath, 'utf8');
    
    // Find and replace the campaignFactory address
    const oldFactoryMatch = serviceContent.match(/campaignFactory:\s*['"]0x[a-fA-F0-9]+['"]/);
    if (oldFactoryMatch) {
      console.log("📝 Updating frontend polygonService.js...");
      console.log("   Old:", oldFactoryMatch[0]);
      serviceContent = serviceContent.replace(
        /campaignFactory:\s*['"]0x[a-fA-F0-9]+['"]/,
        `campaignFactory: '${campaignFactoryAddress}'`
      );
      console.log("   New: campaignFactory: '" + campaignFactoryAddress + "'");
      fs.writeFileSync(frontendServicePath, serviceContent);
      console.log("✅ Frontend polygonService.js updated!");
    }
  }

  console.log("\n✅ All done! New campaigns will now use USDC for donations.");
  console.log("   Remember: USDC uses 6 decimals, not 18!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
