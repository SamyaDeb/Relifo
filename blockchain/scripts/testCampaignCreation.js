const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Campaign Creation...\n");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/amoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const campaignFactoryAddress = deployment.contracts.CampaignFactory;
  const reliefTokenAddress = deployment.contracts.ReliefToken;

  console.log("📍 CampaignFactory Address:", campaignFactoryAddress);
  console.log("📍 ReliefToken Address:", reliefTokenAddress);
  console.log();

  // Get signer (this will be the deployer/admin wallet)
  const [signer] = await hre.ethers.getSigners();
  console.log("👤 Signer Address:", signer.address);
  console.log();

  // We need to use the organizer's wallet, not the deployer's wallet
  // For testing, we'll use the organizer's private key from .env
  const organizerPrivateKey = process.env.ORGANIZER_PRIVATE_KEY;
  if (!organizerPrivateKey) {
    console.log("❌ ERROR: ORGANIZER_PRIVATE_KEY not found in .env");
    console.log("Please add: ORGANIZER_PRIVATE_KEY=0x...");
    process.exit(1);
  }

  const organizerWallet = new hre.ethers.Wallet(organizerPrivateKey, hre.ethers.provider);
  console.log("👤 Organizer Wallet:", organizerWallet.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(organizerWallet.address);
  console.log("💰 Organizer Balance:", hre.ethers.formatEther(balance), "POL");
  
  if (balance < hre.ethers.parseEther("0.01")) {
    console.log("⚠️  WARNING: Low balance! May need more POL.");
  }
  console.log();

  // Get CampaignFactory contract
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = CampaignFactory.attach(campaignFactoryAddress).connect(organizerWallet);

  try {
    // Check if organizer is approved
    const isApproved = await campaignFactory.approvedOrganizers(organizerWallet.address);
    console.log("✓ Checking approval status:", isApproved ? "✅ APPROVED" : "❌ NOT APPROVED");
    
    if (!isApproved) {
      console.log("\n❌ Organizer is not approved. Cannot create campaign.");
      console.log("Run: npx hardhat run scripts/approveOrganizer.js --network amoy");
      process.exit(1);
    }
    console.log();

    // Campaign parameters
    const title = "Test Campaign 2";
    const description = "Testing campaign creation with proper error handling";
    const goalAmount = hre.ethers.parseEther("100"); // 100 RELIEF
    const location = "Test City";
    const disasterType = "flood";

    console.log("📝 Campaign Parameters:");
    console.log("   Title:", title);
    console.log("   Description:", description);
    console.log("   Goal Amount:", hre.ethers.formatEther(goalAmount), "RELIEF");
    console.log("   Location:", location);
    console.log("   Disaster Type:", disasterType);
    console.log();

    // Estimate gas first
    console.log("⛽ Estimating gas...");
    try {
      const gasEstimate = await campaignFactory.createCampaign.estimateGas(
        title,
        description,
        goalAmount,
        location,
        disasterType
      );
      console.log("✅ Gas Estimate:", gasEstimate.toString());
      console.log();
    } catch (gasError) {
      console.log("❌ Gas estimation failed!");
      console.log("Error:", gasError.message);
      
      // Try to get the revert reason
      if (gasError.data) {
        console.log("Error data:", gasError.data);
      }
      if (gasError.reason) {
        console.log("Revert reason:", gasError.reason);
      }
      
      console.log("\nThis indicates the transaction would revert. Not attempting to send.");
      process.exit(1);
    }

    // Create campaign
    console.log("🚀 Creating campaign...");
    const tx = await campaignFactory.createCampaign(
      title,
      description,
      goalAmount,
      location,
      disasterType,
      {
        gasLimit: 5000000
      }
    );

    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log();

    // Parse logs to find campaign address
    const iface = campaignFactory.interface;
    let campaignAddress = null;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === "CampaignCreated") {
          campaignAddress = parsed.args.campaignAddress;
          console.log("🎉 Campaign Created!");
          console.log("   Address:", campaignAddress);
          console.log("   Organizer:", parsed.args.organizer);
          console.log("   Title:", parsed.args.title);
          console.log("   Goal:", hre.ethers.formatEther(parsed.args.goalAmount), "RELIEF");
          break;
        }
      } catch (e) {
        // Not our event, skip
      }
    }

    if (campaignAddress) {
      console.log();
      console.log("🔗 View on PolygonScan:");
      console.log(`https://amoy.polygonscan.com/address/${campaignAddress}`);
    }

    console.log();
    console.log("=" .repeat(60));
    console.log("✅ Campaign creation successful!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.log();
    console.log("❌ ERROR:", error.message);
    
    if (error.data) {
      console.log("Error data:", error.data);
    }
    if (error.reason) {
      console.log("Revert reason:", error.reason);
    }
    if (error.error) {
      console.log("Nested error:", error.error);
    }
    
    console.log();
    console.log("Stack trace:");
    console.log(error.stack);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
