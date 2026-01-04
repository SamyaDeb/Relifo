const hre = require("hardhat");

/**
 * Approve a merchant for a specific category in a BeneficiaryWallet
 * 
 * Usage: npx hardhat run scripts/approveMerchant.js --network amoy
 * 
 * Categories:
 * 0 = Food
 * 1 = Medicine
 * 2 = Shelter
 * 3 = Education
 * 4 = Clothing
 * 5 = Other
 */

async function main() {
  // ============= CONFIGURATION =============
  // UPDATE THESE VALUES:
  const BENEFICIARY_WALLET_ADDRESS = "0x0C8E19e91952E2954eea3f479E1E85728DfEbb2F"; // The beneficiary's wallet contract
  const MERCHANT_ADDRESS = "0x3ae5f0da6031f1b974904c55b84a6ab205e9d1dd"; // The merchant to approve
  const CATEGORY = 0; // 0 = Food, 1 = Medicine, 2 = Shelter, 3 = Education, 4 = Clothing, 5 = Other
  
  const CATEGORIES = ['Food', 'Medicine', 'Shelter', 'Education', 'Clothing', 'Other'];
  // ==========================================

  console.log('🔐 Approving merchant for beneficiary wallet...');
  console.log('------------------------------------------------------------');
  console.log('Beneficiary Wallet:', BENEFICIARY_WALLET_ADDRESS);
  console.log('Merchant Address:', MERCHANT_ADDRESS);
  console.log('Category:', CATEGORIES[CATEGORY], `(${CATEGORY})`);
  console.log('------------------------------------------------------------\n');

  const [organizer] = await hre.ethers.getSigners();
  console.log('👤 Organizer address:', organizer.address);
  console.log('💰 Organizer balance:', hre.ethers.formatEther(await hre.ethers.provider.getBalance(organizer.address)), 'MATIC\n');

  // Get the BeneficiaryWallet contract
  const BeneficiaryWallet = await hre.ethers.getContractAt(
    "BeneficiaryWallet",
    BENEFICIARY_WALLET_ADDRESS
  );

  // Check if already approved
  console.log('🔍 Checking current approval status...');
  const isCurrentlyApproved = await BeneficiaryWallet.isMerchantApproved(MERCHANT_ADDRESS, CATEGORY);
  console.log('Current status:', isCurrentlyApproved ? '✅ Already Approved' : '❌ Not Approved');
  
  if (isCurrentlyApproved) {
    console.log('\n✅ Merchant is already approved for this category!');
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
