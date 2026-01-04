const hre = require("hardhat");

async function main() {
  const BENEFICIARY_WALLET_ADDRESS = "0x0C8E19e91952E2954eea3f479E1E85728DfEbb2F";

  console.log('🔍 Checking BeneficiaryWallet details...');
  console.log('Wallet Address:', BENEFICIARY_WALLET_ADDRESS);
  console.log('------------------------------------------------------------\n');

  const BeneficiaryWallet = await hre.ethers.getContractAt(
    "BeneficiaryWallet",
    BENEFICIARY_WALLET_ADDRESS
  );

  // Get key information
  const campaign = await BeneficiaryWallet.campaign();
  const beneficiary = await BeneficiaryWallet.beneficiary();
  
  console.log('📋 Campaign Contract:', campaign);
  console.log('👤 Beneficiary Address:', beneficiary);
  
  // Get campaign contract to find organizer
  const Campaign = await hre.ethers.getContractAt("Campaign", campaign);
  const campaignInfo = await Campaign.campaignInfo();
  const token = await Campaign.reliefToken();
  
  console.log('👔 Campaign Organizer:', campaignInfo.organizer);
  console.log('🪙 Relief Token:', token);
  console.log('------------------------------------------------------------');
  
  const [currentSigner] = await hre.ethers.getSigners();
  console.log('\n🔑 Current Signer:', currentSigner.address);
  
  if (currentSigner.address.toLowerCase() === campaignInfo.organizer.toLowerCase()) {
    console.log('✅ You ARE the organizer - you can approve merchants!');
  } else {
    console.log('❌ You are NOT the organizer');
    console.log('   The organizer is:', campaignInfo.organizer);
    console.log('   You need to use the organizer wallet to approve merchants');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
