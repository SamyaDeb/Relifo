const { ethers } = require("hardhat");

async function main() {
  console.log("\n🧪 Testing POLtoUSDCSwap Contract...\n");

  const SWAP_ADDRESS = "0x57af49233094939E87a875bf04FD003045E6266D";
  const USDC_ADDRESS = "0x41E94Ca92cD8d48f89F8059FfC125265Ce440722";

  const [user] = await ethers.getSigners();
  console.log("👤 Testing with account:", user.address);

  const balance = await ethers.provider.getBalance(user.address);
  console.log("💰 POL Balance:", ethers.formatEther(balance), "POL");

  // Get contract instance
  const swap = await ethers.getContractAt("POLtoUSDCSwap", SWAP_ADDRESS);
  
  console.log("✅ Contract found at:", SWAP_ADDRESS);

  // Get estimated output
  const polAmount = ethers.parseEther("0.1"); // 0.1 POL
  const estimated = await swap.getEstimatedUSDCOut(polAmount);
  console.log("📊 Estimated output for 0.1 POL:", ethers.formatUnits(estimated, 6), "USDC");

  console.log("\n📝 Contract Statistics:");
  const totalSwapped = await swap.totalPOLSwapped();
  const totalReceived = await swap.totalUSDCReceived();
  console.log("Total POL Swapped:", ethers.formatEther(totalSwapped), "POL");
  console.log("Total USDC Received:", ethers.formatUnits(totalReceived, 6), "USDC");

  console.log("\n⚠️  To test an actual swap:");
  console.log("1. Visit: https://amoy.polygonscan.com/address/" + SWAP_ADDRESS);
  console.log("2. Click 'Contract' → 'Write Contract'");
  console.log("3. Connect your wallet");
  console.log("4. Call 'swapPOLtoUSDC' with 0.5 POL (500000000000000000 wei)");
  console.log("5. Approve transaction and wait for confirmation");
  console.log("6. Check USDC balance in MetaMask (import token if needed)");

  console.log("\n✅ Test complete! Contract is deployed and ready to use.");
  console.log("🔗 View contract: https://amoy.polygonscan.com/address/" + SWAP_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
