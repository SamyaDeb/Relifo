/**
 * Deploy TestnetUSDC for Polygon Amoy
 * This will be our USDC token for testing
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n🚀 Deploying TestnetUSDC...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "POL\n");

  // Deploy TestnetUSDC
  console.log("📝 Deploying TestnetUSDC...");
  const TestnetUSDC = await hre.ethers.getContractFactory("TestnetUSDC");
  const usdc = await TestnetUSDC.deploy();
  await usdc.waitForDeployment();
  
  const usdcAddress = await usdc.getAddress();
  console.log("✅ TestnetUSDC deployed to:", usdcAddress);
  
  // Check initial balance
  const deployerBalance = await usdc.balanceOf(deployer.address);
  console.log("✅ Deployer USDC balance:", hre.ethers.formatUnits(deployerBalance, 6), "USDC");
  
  // Update deployment file
  const deploymentsPath = path.join(__dirname, '../deployments/amoy.json');
  let deployments = {};
  
  if (fs.existsSync(deploymentsPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  }
  
  deployments.TestnetUSDC = usdcAddress;
  deployments.USDC = usdcAddress; // Also save as USDC for compatibility
  
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("✅ Updated deployments/amoy.json\n");
  
  console.log("=" .repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("TestnetUSDC:", usdcAddress);
  console.log("\n🔗 View on Explorer:");
  console.log(`https://amoy.polygonscan.com/address/${usdcAddress}`);
  console.log("\n⚠️  IMPORTANT: Update your .env file:");
  console.log(`VITE_USDC_ADDRESS=${usdcAddress}`);
  console.log("\n💡 To get testnet USDC, call the faucet function:");
  console.log(`   usdc.faucet(amount) // amount in USDC with 6 decimals`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
