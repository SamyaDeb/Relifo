/**
 * Redeploy contracts with correct USDC address
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("\n🔄 Redeploying Contracts with New USDC...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "POL\n");

  // Load deployments
  const deploymentsPath = path.join(__dirname, '../deployments/amoy.json');
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  
  const USDC_ADDRESS = deployments.USDC || "0xBc03f5c495d594304052824924461A24fa6d4163";
  const WMATIC_ADDRESS = "0x9c3C9283D3e44854cA1CC2e7cA2f22701e42d18e";
  const UNISWAP_ROUTER = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
  const RELIEF_TOKEN = deployments.contracts?.ReliefToken || deployments.ReliefToken || "0xA19dfE0a1fCDf819b073A36875374Db23B12A953";
  
  console.log("📋 Using addresses:");
  console.log("USDC:", USDC_ADDRESS);
  console.log("WMATIC:", WMATIC_ADDRESS);
  console.log("Uniswap Router:", UNISWAP_ROUTER);
  console.log("RELIEF Token:", RELIEF_TOKEN);
  console.log();

  // Deploy POLtoUSDCSwap
  console.log("1️⃣ Deploying POLtoUSDCSwap...");
  const POLtoUSDCSwap = await hre.ethers.getContractFactory("POLtoUSDCSwap");
  const swap = await POLtoUSDCSwap.deploy(deployer.address);
  await swap.waitForDeployment();
  const swapAddress = await swap.getAddress();
  console.log("✅ POLtoUSDCSwap deployed to:", swapAddress);

  // Deploy ReliefTokenSale
  console.log("\n2️⃣ Deploying ReliefTokenSale...");
  const ReliefTokenSale = await hre.ethers.getContractFactory("ReliefTokenSale");
  const sale = await ReliefTokenSale.deploy(RELIEF_TOKEN, USDC_ADDRESS, deployer.address);
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("✅ ReliefTokenSale deployed to:", saleAddress);

  // Transfer RELIEF tokens to sale contract
  console.log("\n3️⃣ Transferring RELIEF tokens to sale contract...");
  const reliefToken = await hre.ethers.getContractAt("ReliefToken", RELIEF_TOKEN);
  const transferAmount = hre.ethers.parseEther("100000");
  const transferTx = await reliefToken.transfer(saleAddress, transferAmount);
  await transferTx.wait();
  console.log("✅ Transferred 100,000 RELIEF to sale contract");

  // Update deployments file
  deployments.POLtoUSDCSwap = swapAddress;
  deployments.ReliefTokenSale = saleAddress;
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("✅ Updated deployments/amoy.json");

  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("USDC:", USDC_ADDRESS);
  console.log("POLtoUSDCSwap:", swapAddress);
  console.log("ReliefTokenSale:", saleAddress);
  console.log("\n⚠️  Update frontend/.env:");
  console.log(`VITE_USDC_ADDRESS=${USDC_ADDRESS}`);
  console.log(`VITE_POL_USDC_SWAP_ADDRESS=${swapAddress}`);
  console.log(`VITE_RELIEF_TOKEN_SALE_ADDRESS=${saleAddress}`);
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
