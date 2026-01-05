const { ethers } = require("hardhat");

/**
 * Quick test script to verify donation flow
 */
async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Testing with account:", signer.address);
  
  // Your campaign and token addresses
  const CAMPAIGN_ADDRESS = "0xcda4ec0bfd410539467617b3f943d57be5ea3dbb";
  const OLD_TOKEN = "0xc5740EF327ffaDAe587D463DC310023d7feAf119";
  
  const Campaign = await ethers.getContractFactory("Campaign");
  const ReliefToken = await ethers.getContractFactory("ReliefToken");
  
  const campaign = Campaign.attach(CAMPAIGN_ADDRESS);
  const token = ReliefToken.attach(OLD_TOKEN);
  
  console.log("\n========== QUICK CHECKS ==========");
  
  // 1. Check campaign token
  try {
    const campaignToken = await campaign.reliefToken();
    console.log("✅ Campaign token:", campaignToken);
    console.log("   Your token:", OLD_TOKEN);
    console.log("   Match?", campaignToken.toLowerCase() === OLD_TOKEN.toLowerCase());
  } catch (e) {
    console.log("❌ Cannot read campaign token:", e.message);
  }
  
  // 2. Check campaign status
  try {
    const info = await campaign.campaignInfo();
    console.log("\n✅ Campaign Info:");
    console.log("   Title:", info.title);
    console.log("   Status:", info.status, "(0=Active)");
    console.log("   Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
  } catch (e) {
    console.log("❌ Cannot read campaign info:", e.message);
  }
  
  // 3. Check your token balance
  try {
    const balance = await token.balanceOf(signer.address);
    console.log("\n✅ Your token balance:", ethers.formatEther(balance), "RELIEF");
  } catch (e) {
    console.log("❌ Cannot read balance:", e.message);
  }
  
  // 4. Check network
  const network = await ethers.provider.getNetwork();
  console.log("\n✅ Network:", network.name, "Chain ID:", network.chainId);
  
  // 5. Check latest block
  const blockNumber = await ethers.provider.getBlockNumber();
  console.log("✅ Latest block:", blockNumber);
  
  console.log("\n========== READY TO DONATE ==========");
  console.log("Frontend: http://localhost:5174");
  console.log("\nSteps to test:");
  console.log("1. Connect your wallet on the frontend");
  console.log("2. Go to Donor Dashboard");
  console.log("3. Click 'Donate' on a campaign");
  console.log("4. Enter amount and confirm");
  console.log("5. Approve tokens in MetaMask");
  console.log("6. Confirm donation in MetaMask");
  console.log("=====================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
