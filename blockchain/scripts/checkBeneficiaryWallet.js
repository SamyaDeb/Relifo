const hre = require("hardhat");

async function main() {
  console.log("━".repeat(60));
  console.log("🔍 CHECKING BENEFICIARY WALLET");
  console.log("━".repeat(60));

  const [owner] = await hre.ethers.getSigners();
  console.log("Checking with account:", owner.address);

  // Get campaign address from deployments
  const fs = require('fs');
  const deploymentsPath = './deployments/amoy.json';
  
  if (!fs.existsSync(deploymentsPath)) {
    console.error("❌ Deployments file not found!");
    return;
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
  console.log("\n📋 Campaign Address:", deployments.campaign);

  // Get beneficiary address (replace with actual address)
  const beneficiaryAddress = process.argv[2];
  
  if (!beneficiaryAddress) {
    console.error("❌ Please provide beneficiary address as argument");
    console.error("Usage: npx hardhat run scripts/checkBeneficiaryWallet.js --network amoy <beneficiary_address>");
    return;
  }

  console.log("👤 Beneficiary Address:", beneficiaryAddress);
  console.log("");

  // Get Campaign contract
  const Campaign = await hre.ethers.getContractAt("Campaign", deployments.campaign);
  
  // Check if wallet exists
  const walletAddress = await Campaign.getBeneficiaryWallet(beneficiaryAddress);
  console.log("💼 Beneficiary Wallet Address:", walletAddress);

  if (walletAddress === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  No wallet created for this beneficiary yet");
    console.log("━".repeat(60));
    return;
  }

  // Get RELIEF token contract
  const ReliefToken = await hre.ethers.getContractAt("ReliefToken", deployments.reliefToken);
  
  // Check wallet balance
  const balance = await ReliefToken.balanceOf(walletAddress);
  const formattedBalance = hre.ethers.formatEther(balance);
  
  console.log("━".repeat(60));
  console.log("💰 WALLET BALANCE");
  console.log("━".repeat(60));
  console.log("Balance:", formattedBalance, "RELIEF");
  console.log("━".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
