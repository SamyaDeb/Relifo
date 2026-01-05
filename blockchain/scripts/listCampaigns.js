require('dotenv').config();
const { ethers } = require('hardhat');
const addresses = require('../deployments/amoy.json');

async function main() {
  const [deployer] = await ethers.getSigners();
  
  const campaignFactory = await ethers.getContractAt('CampaignFactory', addresses.contracts.CampaignFactory);
  
  const campaignCount = await campaignFactory.campaignCount();
  console.log(`\n📊 Total Campaigns: ${campaignCount}`);
  
  if (campaignCount === 0n) {
    console.log('No campaigns found.');
    return;
  }
  
  for (let i = 0; i < campaignCount; i++) {
    const campaignAddress = await campaignFactory.campaigns(i);
    const campaign = await ethers.getContractAt('Campaign', campaignAddress);
    
    const details = await campaign.getCampaignDetails();
    console.log(`\n--- Campaign ${i + 1} ---`);
    console.log(`Address: ${campaignAddress}`);
    console.log(`Name: ${details.name}`);
    console.log(`Organizer: ${details.organizer}`);
    console.log(`Goal: ${ethers.formatEther(details.goalAmount)} RELIEF`);
    console.log(`Raised: ${ethers.formatEther(details.raisedAmount)} RELIEF`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
