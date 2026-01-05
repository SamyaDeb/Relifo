require('dotenv').config();
const { ethers } = require('hardhat');
const addresses = require('../deployments/amoy.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const campaignAddress = process.env.CAMPAIGN_ADDRESS;
  const beneficiaryAddress = process.env.BENEFICIARY_ADDRESS;
  const amount = process.env.AMOUNT || '1000';
  
  if (!campaignAddress || !beneficiaryAddress) {
    console.log('Usage: CAMPAIGN_ADDRESS=0x... BENEFICIARY_ADDRESS=0x... AMOUNT=1000 npx hardhat run scripts/allocateFunds.js --network amoy');
    process.exit(1);
  }
  
  const campaign = await ethers.getContractAt('Campaign', campaignAddress);
  
  // Get beneficiary wallet
  const beneficiaryWallet = await campaign.beneficiaryWallets(beneficiaryAddress);
  console.log(`\n📍 Campaign: ${campaignAddress}`);
  console.log(`👤 Beneficiary: ${beneficiaryAddress}`);
  console.log(`💰 Beneficiary Wallet: ${beneficiaryWallet}`);
  console.log(`💸 Allocating: ${amount} RELIEF`);
  
  const amountInWei = ethers.parseEther(amount);
  
  console.log('\n🔄 Allocating funds...');
  const tx = await campaign.allocateFunds(beneficiaryAddress, amountInWei);
  await tx.wait();
  
  console.log(`\n✅ Funds Allocated Successfully!`);
  console.log(`Transaction: https://amoy.polygonscan.com/tx/${tx.hash}`);
  
  // Check balance
  const walletContract = await ethers.getContractAt('BeneficiaryWallet', beneficiaryWallet);
  const balance = await walletContract.getBalance();
  
  console.log(`\n💰 Current Balance: ${ethers.formatEther(balance)} RELIEF`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
