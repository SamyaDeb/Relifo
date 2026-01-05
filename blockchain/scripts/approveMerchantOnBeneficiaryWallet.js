const hre = require("hardhat");

/**
 * Script to approve a merchant on a beneficiary wallet for specific categories
 * Usage: BENEFICIARY_WALLET=0x... MERCHANT_ADDRESS=0x... CATEGORIES=0,1,2 npx hardhat run scripts/approveMerchantOnBeneficiaryWallet.js --network amoy
 * 
 * Categories:
 * 0 = Food
 * 1 = Medicine
 * 2 = Shelter
 * 3 = Education
 * 4 = Other
 */

async function main() {
  const beneficiaryWalletAddress = process.env.BENEFICIARY_WALLET;
  const merchantAddress = process.env.MERCHANT_ADDRESS;
  const categoriesStr = process.env.CATEGORIES || "0"; // Default to Food

  if (!beneficiaryWalletAddress) {
    throw new Error("Please provide BENEFICIARY_WALLET environment variable");
  }

  if (!merchantAddress) {
    throw new Error("Please provide MERCHANT_ADDRESS environment variable");
  }

  console.log("\n🔐 Approving Merchant on Beneficiary Wallet");
  console.log("============================================");
  console.log("Beneficiary Wallet:", beneficiaryWalletAddress);
  console.log("Merchant Address:", merchantAddress);

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer (should be organizer):", signer.address);

  // Get contracts
  const BeneficiaryWallet = await hre.ethers.getContractAt("BeneficiaryWallet", beneficiaryWalletAddress);
  const CampaignFactory = await hre.ethers.getContractAt("CampaignFactory", "0xfbc48bA4C0F5bC16aF4563CAF056013EC2718569");

  // Verify merchant is verified on CampaignFactory
  const isVerified = await CampaignFactory.isVerifiedMerchant(merchantAddress);
  if (!isVerified) {
    console.log("\n❌ Error: Merchant is not verified on CampaignFactory");
    console.log("Please verify merchant first using admin account");
    return;
  }
  console.log("✅ Merchant is verified on CampaignFactory");

  // Check if signer is organizer
  const organizer = await BeneficiaryWallet.organizer();
  console.log("Wallet Organizer:", organizer);
  
  if (signer.address.toLowerCase() !== organizer.toLowerCase()) {
    console.log("\n❌ Error: Signer is not the organizer of this beneficiary wallet");
    console.log("Expected:", organizer);
    console.log("Got:", signer.address);
    return;
  }

  // Parse categories
  const categories = categoriesStr.split(',').map(c => parseInt(c.trim()));
  const categoryNames = ["Food", "Medicine", "Shelter", "Education", "Other"];

  console.log("\n📋 Categories to approve:");
  categories.forEach(cat => {
    console.log(`  - ${categoryNames[cat]} (${cat})`);
  });

  // Approve merchant for each category
  for (const category of categories) {
    console.log(`\n🔄 Approving for ${categoryNames[category]}...`);

    // Check if already approved
    const isAlreadyApproved = await BeneficiaryWallet.isMerchantApproved(merchantAddress, category);
    if (isAlreadyApproved) {
      console.log(`  ℹ️  Already approved for ${categoryNames[category]}`);
      continue;
    }

    try {
      const tx = await BeneficiaryWallet.approveMerchant(merchantAddress, category);
      console.log(`  📝 Transaction hash: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`  ✅ Approved for ${categoryNames[category]} (Block: ${receipt.blockNumber})`);
    } catch (error) {
      console.error(`  ❌ Failed to approve for ${categoryNames[category]}:`, error.message);
    }
  }

  // Verify approvals
  console.log("\n✅ Final Status:");
  for (let i = 0; i < 5; i++) {
    const isApproved = await BeneficiaryWallet.isMerchantApproved(merchantAddress, i);
    if (isApproved) {
      console.log(`  ✓ ${categoryNames[i]}: Approved`);
    }
  }

  console.log("\n🎉 Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
