const hre = require("hardhat");
const deployments = require("../deployments/amoy.json");

/**
 * Approve organizers on the NEW USDC-based CampaignFactory
 */
async function main() {
  console.log("🔧 Approving organizers on USDC CampaignFactory...\n");
  
  const FACTORY_ADDRESS = deployments.contracts.CampaignFactory; // New USDC factory
  
  // Add your organizer addresses here
  const ORGANIZERS_TO_APPROVE = [
    "0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A", // Example organizer
    // Add more organizer addresses as needed
  ];

  console.log("📍 CampaignFactory (USDC):", FACTORY_ADDRESS);
  console.log("👥 Organizers to approve:", ORGANIZERS_TO_APPROVE.length);
  console.log("");

  const [deployer] = await hre.ethers.getSigners();
  console.log("🔑 Approving as admin:", deployer.address);
  console.log("");

  const factory = await hre.ethers.getContractAt("CampaignFactory", FACTORY_ADDRESS);

  for (const organizer of ORGANIZERS_TO_APPROVE) {
    try {
      console.log(`\n📝 Processing: ${organizer}`);
      
      // Check if already approved
      const isApproved = await factory.approvedOrganizers(organizer);
      
      if (isApproved) {
        console.log(`   ✅ Already approved - skipping`);
        continue;
      }

      // Approve organizer
      console.log(`   ⏳ Approving...`);
      const tx = await factory.approveOrganizer(organizer);
      console.log(`   📤 TX sent: ${tx.hash}`);
      
      await tx.wait();
      console.log(`   ✅ Approved successfully!`);
      
    } catch (error) {
      console.error(`   ❌ Failed to approve ${organizer}:`, error.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Organizer approval complete!");
  console.log("=".repeat(60));
  console.log("\n💡 Organizers can now create campaigns with USDC donations.\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
