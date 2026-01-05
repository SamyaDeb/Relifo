const { ethers } = require("hardhat");

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Checking with account:", signer.address);
  
  // Contract addresses
  const NEW_FACTORY = "0x4693B6b30CADdb0488998dc7E30C052063d93897";
  const OLD_FACTORY = "0xd0BCB98e93773B587e27C0b160800c09218e30c4";
  const RELIEF_TOKEN = "0x2e3f557A6De6dFb63aB583991Ec77E3270d1D20e";
  
  // Beneficiary address from error
  const BENEFICIARY = "0xC69c2F20D27d9dd12473c27D0691243d4Deed087";
  const ORGANIZER = "0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A";
  
  // Get contracts
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  const Campaign = await ethers.getContractFactory("Campaign");
  const ReliefToken = await ethers.getContractFactory("ReliefToken");
  
  const token = ReliefToken.attach(RELIEF_TOKEN);
  
  console.log("\n========== NEW FACTORY ==========");
  try {
    const newFactory = CampaignFactory.attach(NEW_FACTORY);
    const newCampaigns = await newFactory.getCampaigns();
    console.log("New Factory Campaigns:", newCampaigns);
    
    for (const addr of newCampaigns) {
      console.log("\n--- Campaign:", addr, "---");
      const campaign = Campaign.attach(addr);
      const info = await campaign.campaignInfo();
      console.log("  Title:", info.title);
      console.log("  Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
      console.log("  Organizer:", info.organizer);
      
      // Check if beneficiary has wallet
      const wallet = await campaign.getBeneficiaryWallet(BENEFICIARY);
      console.log("  Beneficiary Wallet:", wallet);
      
      if (wallet !== "0x0000000000000000000000000000000000000000") {
        const balance = await token.balanceOf(wallet);
        console.log("  Wallet Balance:", ethers.formatEther(balance), "RELIEF");
      }
    }
  } catch (e) {
    console.log("Error with new factory:", e.message);
  }
  
  console.log("\n========== OLD FACTORY ==========");
  try {
    const oldFactory = CampaignFactory.attach(OLD_FACTORY);
    const oldCampaigns = await oldFactory.getCampaigns();
    console.log("Old Factory Campaigns:", oldCampaigns);
    
    for (const addr of oldCampaigns) {
      console.log("\n--- Campaign:", addr, "---");
      const campaign = Campaign.attach(addr);
      const info = await campaign.campaignInfo();
      console.log("  Title:", info.title);
      console.log("  Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
      console.log("  Organizer:", info.organizer);
      
      // Check if beneficiary has wallet
      try {
        const wallet = await campaign.getBeneficiaryWallet(BENEFICIARY);
        console.log("  Beneficiary Wallet:", wallet);
        
        if (wallet !== "0x0000000000000000000000000000000000000000") {
          const balance = await token.balanceOf(wallet);
          console.log("  Wallet Balance:", ethers.formatEther(balance), "RELIEF");
        }
      } catch (e) {
        console.log("  Error getting wallet:", e.message);
      }
    }
  } catch (e) {
    console.log("Error with old factory:", e.message);
  }
  
  // Check the specific campaign from the error
  console.log("\n========== CAMPAIGN FROM ERROR ==========");
  const ERROR_CAMPAIGN = "0xcda4ec0bfd410539467617b3f943d57be5ea3dbb";
  try {
    const campaign = Campaign.attach(ERROR_CAMPAIGN);
    const info = await campaign.campaignInfo();
    console.log("Campaign:", ERROR_CAMPAIGN);
    console.log("  Title:", info.title);
    console.log("  Raised:", ethers.formatEther(info.raisedAmount), "RELIEF");
    console.log("  Organizer:", info.organizer);
    console.log("  Is organizer correct?", info.organizer.toLowerCase() === ORGANIZER.toLowerCase());
    
    // Check totalAllocated
    const totalAllocated = await campaign.totalAllocated();
    console.log("  Total Allocated:", ethers.formatEther(totalAllocated), "RELIEF");
    console.log("  Available:", ethers.formatEther(info.raisedAmount - totalAllocated), "RELIEF");
    
    // Check beneficiary wallet
    const wallet = await campaign.getBeneficiaryWallet(BENEFICIARY);
    console.log("  Beneficiary Wallet:", wallet);
    
    if (wallet !== "0x0000000000000000000000000000000000000000") {
      const balance = await token.balanceOf(wallet);
      console.log("  Wallet Balance:", ethers.formatEther(balance), "RELIEF");
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
