const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);
  
  // Contract addresses
  const NEW_TOKEN = "0x2e3f557A6De6dFb63aB583991Ec77E3270d1D20e";
  const OLD_TOKEN = "0xc9B20a030aA7d2FBAafB8AD1d7AD3e1e9b84ed88"; // Guessing this might be old token
  const CAMPAIGN = "0xcda4ec0bfd410539467617b3f943d57be5ea3dbb";
  
  const Campaign = await ethers.getContractFactory("Campaign");
  const ReliefToken = await ethers.getContractFactory("ReliefToken");
  
  const campaign = Campaign.attach(CAMPAIGN);
  
  // Get the token address used by this campaign
  const campaignTokenAddress = await campaign.reliefToken();
  console.log("\nCampaign uses token:", campaignTokenAddress);
  console.log("NEW token address:", NEW_TOKEN);
  console.log("Same token?", campaignTokenAddress.toLowerCase() === NEW_TOKEN.toLowerCase());
  
  // Check balance on the token the campaign uses
  const token = ReliefToken.attach(campaignTokenAddress);
  const balance = await token.balanceOf(signer.address);
  console.log("\nAdmin balance on campaign's token:", ethers.formatEther(balance), "RELIEF");
  
  // Check allowance
  const allowance = await token.allowance(signer.address, CAMPAIGN);
  console.log("Allowance to campaign:", ethers.formatEther(allowance), "RELIEF");
  
  // If campaign uses old token, check if admin has any
  if (campaignTokenAddress.toLowerCase() !== NEW_TOKEN.toLowerCase()) {
    console.log("\n⚠️ Campaign uses a DIFFERENT token than the new deployment!");
    console.log("This is likely an OLD campaign from a previous deployment.");
    
    // Check new token balance
    const newToken = ReliefToken.attach(NEW_TOKEN);
    const newBalance = await newToken.balanceOf(signer.address);
    console.log("\nAdmin balance on NEW token:", ethers.formatEther(newBalance), "RELIEF");
  }
}

main().catch(console.error);
