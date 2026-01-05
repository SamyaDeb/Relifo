const { ethers } = require("hardhat");

async function main() {
  const Campaign = await ethers.getContractFactory("Campaign");
  const campaign = Campaign.attach("0xcda4ec0bfd410539467617b3f943d57be5ea3dbb");
  
  const info = await campaign.campaignInfo();
  console.log("Status:", info.status);
  
  try {
    const paused = await campaign.paused();
    console.log("Paused:", paused);
  } catch (e) {
    console.log("Paused check error:", e.message);
  }
}

main().catch(console.error);
