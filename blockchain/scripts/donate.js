require('dotenv').config();
const { ethers } = require('hardhat');
const addresses = require('../deployments/amoy.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const campaignAddress = process.env.CAMPAIGN_ADDRESS;
  const amount = process.env.AMOUNT || '5000';
  
  if (!campaignAddress) {
    console.log('Usage: CAMPAIGN_ADDRESS=0x... AMOUNT=5000 npx hardhat run scripts/donate.js --network amoy');
    process.exit(1);
  }
  
  const reliefToken = await ethers.getContractAt('ReliefToken', addresses.contracts.ReliefToken);
  const campaign = await ethers.getContractAt('Campaign', campaignAddress);
  
  const amountInWei = ethers.parseEther(amount);
  
  console.log(`\n📍 Campaign: ${campaignAddress}`);
  console.log(`💸 Donating: ${amount} RELIEF`);
  
  // Approve
  console.log('\n🔄 Approving tokens...');
  let tx = await reliefToken.approve(campaignAddress, amountInWei);
  await tx.wait();
  console.log('✅ Approved');
  
  // Donate
  console.log('\n🔄 Donating...');
  tx = await campaign.donate(amountInWei);
  await tx.wait();
  
  console.log(`\n✅ Donation Successful!`);
  console.log(`Transaction: https://amoy.polygonscan.com/tx/${tx.hash}`);
  
  // Check campaign balance
  const details = await campaign.getCampaignDetails();
  console.log(`\n💰 Campaign Raised: ${ethers.formatEther(details.raisedAmount)} RELIEF`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
