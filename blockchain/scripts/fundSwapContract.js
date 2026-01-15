const hre = require("hardhat");
const deployments = require("../deployments/amoy.json");

/**
 * Fund the TestnetUSDCSwap contract with USDC for POL->USDC swaps
 */
async function main() {
  console.log("💰 Funding TestnetUSDCSwap with USDC...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Funder:", deployer.address);

  const USDC_ADDRESS = deployments.contracts.USDC;
  const SWAP_ADDRESS = deployments.contracts.TestnetUSDCSwap;

  console.log("💵 USDC Contract:", USDC_ADDRESS);
  console.log("🔄 Swap Contract:", SWAP_ADDRESS);

  // Get USDC contract
  const USDC = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);
  
  // Check current balances
  const deployerBalance = await USDC.balanceOf(deployer.address);
  const swapBalance = await USDC.balanceOf(SWAP_ADDRESS);
  
  console.log("\n📊 Current Balances:");
  console.log("   Deployer USDC:", hre.ethers.formatUnits(deployerBalance, 6));
  console.log("   Swap Contract USDC:", hre.ethers.formatUnits(swapBalance, 6));

  // Amount to fund (100 USDC)
  const fundAmount = hre.ethers.parseUnits("100", 6);
  
  if (deployerBalance < fundAmount) {
    console.log("\n⚠️  Not enough USDC in deployer wallet to fund swap contract.");
    console.log("   Please add USDC to your wallet first.");
    console.log("   You can get testnet USDC from a faucet or transfer from another wallet.");
    return;
  }

  console.log("\n📝 Transferring 100 USDC to Swap Contract...");
  const tx = await USDC.transfer(SWAP_ADDRESS, fundAmount);
  console.log("   TX Hash:", tx.hash);
  
  await tx.wait();
  console.log("   ✅ Transfer confirmed!");

  // Verify new balances
  const newSwapBalance = await USDC.balanceOf(SWAP_ADDRESS);
  console.log("\n📊 New Swap Contract Balance:", hre.ethers.formatUnits(newSwapBalance, 6), "USDC");
  console.log("\n🎉 Swap contract is now funded and ready for POL->USDC swaps!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
