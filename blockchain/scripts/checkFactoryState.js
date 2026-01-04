const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Checking CampaignFactory State...\n");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/amoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const campaignFactoryAddress = deployment.contracts.CampaignFactory;
  const reliefTokenAddress = deployment.contracts.ReliefToken;

  console.log("📍 CampaignFactory Address:", campaignFactoryAddress);
  console.log("📍 Expected ReliefToken:", reliefTokenAddress);
  console.log("📍 Expected Owner:", deployment.deployer);
  console.log();

  // Get CampaignFactory contract
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = CampaignFactory.attach(campaignFactoryAddress);

  try {
    // Check reliefToken address
    const actualReliefToken = await campaignFactory.reliefToken();
    console.log("✅ Actual ReliefToken in contract:", actualReliefToken);
    console.log("   Match:", actualReliefToken.toLowerCase() === reliefTokenAddress.toLowerCase() ? "✅ YES" : "❌ NO");
    console.log();

    // Check owner
    const actualOwner = await campaignFactory.owner();
    console.log("✅ Actual Owner in contract:", actualOwner);
    console.log("   Match:", actualOwner.toLowerCase() === deployment.deployer.toLowerCase() ? "✅ YES" : "❌ NO");
    console.log();

    // Check if owner is zero address
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    if (actualOwner.toLowerCase() === zeroAddress) {
      console.log("❌ ERROR: Owner is zero address!");
    } else {
      console.log("✅ Owner is valid non-zero address");
    }
    console.log();

    // Check if reliefToken is zero address
    if (actualReliefToken.toLowerCase() === zeroAddress) {
      console.log("❌ ERROR: ReliefToken is zero address!");
    } else {
      console.log("✅ ReliefToken is valid non-zero address");
    }
    console.log();

    // Check campaign count
    const campaignCount = await campaignFactory.campaignCount();
    console.log("📊 Campaign Count:", campaignCount.toString());
    console.log();

    // Check if organizer is approved
    const organizerAddress = process.env.ORGANIZER_ADDRESS || "0x19B1dc625F682AF8D005B4405B65dFc342f8c912";
    const isApproved = await campaignFactory.approvedOrganizers(organizerAddress);
    console.log("👤 Organizer:", organizerAddress);
    console.log("   Approved:", isApproved ? "✅ YES" : "❌ NO");
    console.log();

    console.log("=" .repeat(60));
    console.log("🎉 All checks complete!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("❌ Error checking contract state:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
