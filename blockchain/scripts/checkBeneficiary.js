require('dotenv').config();
const { ethers } = require('hardhat');

async function main() {
  const campaignAddress = '0xF003Fe6c9066A2e829c45F3e46d76af09CC60367';
  const beneficiaryAddress = '0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A';
  
  const campaign = await ethers.getContractAt('Campaign', campaignAddress);
  
  console.log('🔍 Checking beneficiary wallet...\n');
  console.log('Campaign:', campaignAddress);
  console.log('Beneficiary:', beneficiaryAddress);
  
  try {
    const walletAddress = await campaign.getBeneficiaryWallet(beneficiaryAddress);
    console.log('\n💼 Wallet Address:', walletAddress);
    
    if (walletAddress === '0x0000000000000000000000000000000000000000') {
      console.log('⚠️  No wallet created yet (address is zero)');
    } else {
      console.log('✅ Wallet found!');
      
      // Check balance
      const reliefToken = await ethers.getContractAt('ReliefToken', '0x2e3f557A6De6dFb63aB583991Ec77E3270d1D20e');
      const balance = await reliefToken.balanceOf(walletAddress);
      console.log('💰 Balance:', ethers.formatEther(balance), 'RELIEF');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().then(() => process.exit(0));
