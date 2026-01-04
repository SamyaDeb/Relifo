/**
 * Test campaign creation to debug errors
 * Usage: ORGANIZER_ADDRESS=0x... npx hardhat run scripts/testCreateCampaign.js --network amoy
 */

const hre = require("hardhat");

async function main() {
  const organizerAddress = process.env.ORGANIZER_ADDRESS || process.argv[2];
  
  if (!organizerAddress) {
    console.error("❌ Please provide an organizer address");
    process.exit(1);
  }

  console.log("\n🧪 Testing Campaign Creation");
  console.log("============================");

  // Get deployed addresses
  const deployments = require("../deployments/amoy.json");
  const factoryAddress = deployments.contracts.CampaignFactory;
  
  console.log(`CampaignFactory: ${factoryAddress}`);

  // Get signer (should be the organizer)
  const [signer] = await hre.ethers.getSigners();
  console.log(`Signer Address: ${signer.address}`);
  
  if (signer.address.toLowerCase() !== organizerAddress.toLowerCase()) {
    console.warn(`⚠️  Warning: Signer (${signer.address}) doesn't match organizer (${organizerAddress})`);
    console.log("This test will use the signer's address\n");
  }

  // Get CampaignFactory contract
  const CampaignFactory = await hre.ethers.getContractAt(
    "CampaignFactory",
    factoryAddress
  );

  // Check if approved
  const isApproved = await CampaignFactory.isApprovedOrganizer(signer.address);
  console.log(`\n✓ Organizer approved: ${isApproved}`);
  
  if (!isApproved) {
    console.error("❌ Organizer is not approved. Cannot create campaign.");
    process.exit(1);
  }

  // Test campaign parameters
  const testCampaign = {
    title: "Test Flood Relief",
    description: "Testing campaign creation from script",
    goalAmount: hre.ethers.parseEther("100"), // 100 RELIEF tokens
    location: "Test City",
    disasterType: "flood"
  };

  console.log("\n📋 Campaign Parameters:");
  console.log("- Title:", testCampaign.title);
  console.log("- Description:", testCampaign.description);
  console.log("- Goal:", hre.ethers.formatEther(testCampaign.goalAmount), "RELIEF");
  console.log("- Location:", testCampaign.location);
  console.log("- Disaster Type:", testCampaign.disasterType);

  try {
    console.log("\n📤 Creating campaign...");
    
    const tx = await CampaignFactory.createCampaign(
      testCampaign.title,
      testCampaign.description,
      testCampaign.goalAmount,
      testCampaign.location,
      testCampaign.disasterType,
      {
        gasLimit: 3000000
      }
    );
    
    console.log(`Transaction Hash: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    const receipt = await tx.wait();
    
    console.log("\n✅ Campaign Created Successfully!");
    console.log("================================");
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Block Number: ${receipt.blockNumber}`);
    console.log(`Transaction: https://amoy.polygonscan.com/tx/${tx.hash}`);
    
    // Parse events to get campaign address
    const event = receipt.logs.find(log => {
      try {
        return CampaignFactory.interface.parseLog(log)?.name === 'CampaignCreated';
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = CampaignFactory.interface.parseLog(event);
      console.log(`Campaign Address: ${parsed.args.campaignAddress}`);
    }
    
  } catch (error) {
    console.error("\n❌ Error creating campaign:");
    console.error("============================");
    console.error("Error message:", error.message);
    
    if (error.reason) {
      console.error("Revert reason:", error.reason);
    }
    
    if (error.data) {
      console.error("Error data:", error.data);
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
