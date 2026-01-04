const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Getting All Campaigns...\n");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/amoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const campaignFactoryAddress = deployment.contracts.CampaignFactory;

  console.log("📍 CampaignFactory Address:", campaignFactoryAddress);
  console.log();

  // Get CampaignFactory contract
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = CampaignFactory.attach(campaignFactoryAddress);

  try {
    // Get all campaigns
    const campaigns = await campaignFactory.getAllCampaigns();
    console.log("📊 Total Campaigns:", campaigns.length);
    console.log();

    if (campaigns.length === 0) {
      console.log("No campaigns created yet.");
      return;
    }

    // Get Campaign contract factory
    const Campaign = await hre.ethers.getContractFactory("Campaign");

    for (let i = 0; i < campaigns.length; i++) {
      const campaignAddress = campaigns[i];
      console.log(`Campaign ${i + 1}:`);
      console.log("  Address:", campaignAddress);

      try {
        const campaign = Campaign.attach(campaignAddress);
        
        // Get campaign info (campaignInfo is a public variable, so it has an auto-generated getter)
        const info = await campaign.campaignInfo();
        console.log("  Title:", info.title);
        console.log("  Organizer:", info.organizer);
        console.log("  Admin:", info.admin);
        console.log("  Description:", info.description);
        console.log("  Location:", info.location);
        console.log("  Disaster Type:", info.disasterType);
        console.log("  Goal Amount:", hre.ethers.formatEther(info.goalAmount), "RELIEF");
        console.log("  Raised Amount:", hre.ethers.formatEther(info.raisedAmount), "RELIEF");
        console.log("  Status:", ["Active", "Paused", "Completed", "Cancelled"][info.status]);
        console.log();
      } catch (error) {
        console.log("  ❌ Error reading campaign:", error.message);
        console.log();
      }
    }

    console.log("=" .repeat(60));
    console.log("✅ Campaign listing complete!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
