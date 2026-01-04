const hre = require("hardhat");
require("dotenv").config();

/**
 * Verify a merchant on CampaignFactory contract (Super Admin only)
 * 
 * Usage: MERCHANT_ADDRESS=0x... npx hardhat run scripts/approveMerchant.js --network amoy
 */

async function main() {
  const merchantAddress = process.env.MERCHANT_ADDRESS;
  
  if (!merchantAddress) {
    console.error("❌ Error: MERCHANT_ADDRESS environment variable not set");
    console.log("Usage: MERCHANT_ADDRESS=0x... npx hardhat run scripts/approveMerchant.js --network amoy");
    process.exit(1);
  }

  console.log("🏪 Verifying Merchant on Blockchain");
  console.log("=====================================");
  console.log("Merchant Address:", merchantAddress);
  
  // Get deployed contract address
  const deployments = require("../deployments/amoy.json");
  const factoryAddress = deployments.contracts.CampaignFactory;
  console.log("CampaignFactory:", factoryAddress);
  
  // Get the contract
  const campaignFactory = await hre.ethers.getContractAt("CampaignFactory", factoryAddress);
  
  // Check if already verified
  const isVerified = await campaignFactory.isVerifiedMerchant(merchantAddress);
  
  if (isVerified) {
    console.log("\n⚠️  Merchant is already verified!");
    process.exit(0);
  }
  
  // Verify the merchant
  console.log("\n📝 Sending transaction to verify merchant...");
  const tx = await campaignFactory.verifyMerchant(merchantAddress);
  console.log("Transaction hash:", tx.hash);
  
  console.log("⏳ Waiting for confirmation...");
  const receipt = await tx.wait();
  
  console.log("\n✅ Merchant Verified Successfully!");
  console.log("=====================================");
  console.log("Block number:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());
  
  // Verify the approval
  const verified = await campaignFactory.isVerifiedMerchant(merchantAddress);
  console.log("\n✓ Verification confirmed:", verified);
  
  // Get all verified merchants
  const allMerchants = await campaignFactory.getAllVerifiedMerchants();
  console.log("\n📊 Total verified merchants:", allMerchants.length);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
    return;
  }

  // Approve the merchant
  console.log('\n📝 Submitting approval transaction...');
  const tx = await BeneficiaryWallet.approveMerchant(MERCHANT_ADDRESS, CATEGORY);
  
  console.log('📤 Transaction hash:', tx.hash);
  console.log('🔗 PolygonScan:', `https://amoy.polygonscan.com/tx/${tx.hash}`);
  console.log('⏳ Waiting for confirmation...');
  
  const receipt = await tx.wait();
  
  if (receipt.status === 1) {
    console.log('\n✅ SUCCESS! Merchant approved!');
    console.log('------------------------------------------------------------');
    console.log('✓ Merchant:', MERCHANT_ADDRESS);
    console.log('✓ Category:', CATEGORIES[CATEGORY]);
    console.log('✓ Beneficiary Wallet:', BENEFICIARY_WALLET_ADDRESS);
    console.log('------------------------------------------------------------');
    console.log('\n🎉 Beneficiary can now spend at this merchant for', CATEGORIES[CATEGORY], 'purchases!');
    
    // Verify the approval
    const isNowApproved = await BeneficiaryWallet.isMerchantApproved(MERCHANT_ADDRESS, CATEGORY);
    console.log('Verification:', isNowApproved ? '✅ Confirmed' : '❌ Failed');
  } else {
    console.log('\n❌ Transaction failed!');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
