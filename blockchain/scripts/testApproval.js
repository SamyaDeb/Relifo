const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Testing Admin Approval Transaction\n");

  // The organizer we're trying to approve
  const organizerToApprove = process.env.ORGANIZER_ADDRESS || "0x19B1dc625F682AF8D005B4405B65dFc342f8c912";

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/amoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const campaignFactoryAddress = deployment.contracts.CampaignFactory;
  const adminAddress = deployment.deployer;

  console.log("📍 CampaignFactory:", campaignFactoryAddress);
  console.log("👤 Admin (Deployer):", adminAddress);
  console.log("🎯 Organizer to approve:", organizerToApprove);
  console.log();

  // Get admin signer
  const [admin] = await hre.ethers.getSigners();
  console.log("🔑 Admin signer address:", admin.address);
  
  if (admin.address.toLowerCase() !== adminAddress.toLowerCase()) {
    console.log("⚠️  WARNING: Signer doesn't match deployer!");
    console.log("   Expected:", adminAddress);
    console.log("   Got:", admin.address);
  }
  console.log();

  // Check admin balance
  const balance = await hre.ethers.provider.getBalance(admin.address);
  console.log("💰 Admin balance:", hre.ethers.formatEther(balance), "POL");
  console.log();

  // Get CampaignFactory contract
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = CampaignFactory.attach(campaignFactoryAddress);

  try {
    // Check if admin is the owner
    const owner = await campaignFactory.owner();
    console.log("✓ CampaignFactory owner:", owner);
    console.log("  Is admin the owner?", owner.toLowerCase() === admin.address.toLowerCase() ? "✅ YES" : "❌ NO");
    
    if (owner.toLowerCase() !== admin.address.toLowerCase()) {
      console.log("\n❌ ERROR: Admin is not the owner of CampaignFactory!");
      console.log("Only the owner can approve organizers.");
      process.exit(1);
    }
    console.log();

    // Check if already approved
    const isApproved = await campaignFactory.approvedOrganizers(organizerToApprove);
    console.log("✓ Is organizer already approved?", isApproved ? "✅ YES" : "❌ NO");
    
    if (isApproved) {
      console.log("\n⚠️  Organizer is already approved!");
      console.log("The approval transaction would fail with 'Already approved' error.");
      console.log("\nTo test approval of a new organizer, use a different address.");
      process.exit(0);
    }
    console.log();

    // Try to estimate gas
    console.log("⚡ Estimating gas...");
    try {
      const gasEstimate = await campaignFactory.approveOrganizer.estimateGas(organizerToApprove);
      console.log("✅ Gas estimate:", gasEstimate.toString());
      console.log("   In Gwei:", hre.ethers.formatUnits(gasEstimate, "gwei"));
      console.log();
    } catch (gasError) {
      console.log("❌ Gas estimation FAILED!");
      console.log("Error:", gasError.message);
      
      if (gasError.reason) {
        console.log("Reason:", gasError.reason);
      }
      if (gasError.code) {
        console.log("Code:", gasError.code);
      }
      if (gasError.data) {
        console.log("Data:", gasError.data);
      }
      
      console.log("\nThis means the transaction WOULD FAIL if sent!");
      console.log("The frontend is getting the same error.");
      process.exit(1);
    }

    // Send the approval transaction
    console.log("🚀 Sending approval transaction...");
    const tx = await campaignFactory.approveOrganizer(organizerToApprove);
    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    console.log();

    // Verify approval
    const isNowApproved = await campaignFactory.approvedOrganizers(organizerToApprove);
    console.log("✓ Verification: Is approved?", isNowApproved ? "✅ YES" : "❌ NO");
    console.log();

    console.log("🔗 View on PolygonScan:");
    console.log(`https://amoy.polygonscan.com/tx/${tx.hash}`);
    console.log();

    console.log("=" .repeat(60));
    console.log("✅ Approval successful!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.log();
    console.log("❌ ERROR:", error.message);
    
    if (error.reason) {
      console.log("Reason:", error.reason);
    }
    if (error.code) {
      console.log("Code:", error.code);
    }
    if (error.data) {
      console.log("Data:", error.data);
    }
    if (error.error) {
      console.log("Nested error:", error.error);
    }
    
    console.log();
    console.log("Full error:");
    console.log(error);
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
