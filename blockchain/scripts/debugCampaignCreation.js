const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Debugging Campaign Creation\n");

  // Load deployment addresses
  const deploymentPath = path.join(__dirname, "../deployments/amoy.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const campaignFactoryAddress = deployment.contracts.CampaignFactory;
  const organizerAddress = "0x19B1dc625F682AF8D005B4405B65dFc342f8c912";

  console.log("📍 CampaignFactory:", campaignFactoryAddress);
  console.log("👤 Organizer:", organizerAddress);
  console.log();

  // Get provider
  const provider = hre.ethers.provider;

  // Get CampaignFactory contract (read-only, no signer needed)
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = CampaignFactory.attach(campaignFactoryAddress);

  // Check approval
  const isApproved = await campaignFactory.approvedOrganizers(organizerAddress);
  console.log("✓ Organizer approved:", isApproved ? "✅ YES" : "❌ NO");
  
  if (!isApproved) {
    console.log("\n❌ Organizer not approved. Cannot proceed.");
    process.exit(1);
  }
  console.log();

  // Campaign parameters (same as frontend)
  const title = "Kerala";
  const description = "Affected People";
  const goalAmount = hre.ethers.parseEther("100"); // 100 RELIEF
  const location = "Kerala";
  const disasterType = "flood";

  console.log("📝 Campaign Parameters:");
  console.log("   Title:", title);
  console.log("   Description:", description);
  console.log("   Goal:", hre.ethers.formatEther(goalAmount), "RELIEF");
  console.log("   Location:", location);
  console.log("   Disaster Type:", disasterType);
  console.log();

  // Try to encode the call and send it
  console.log("⚡ Testing transaction with eth_call...");
  try {
    // Encode the function call
    const calldata = campaignFactory.interface.encodeFunctionData('createCampaign', [
      title,
      description,
      goalAmount,
      location,
      disasterType
    ]);

    console.log("   Encoded calldata length:", calldata.length);

    // Try to call it using provider.call
    const result = await provider.call({
      to: campaignFactoryAddress,
      from: organizerAddress,
      data: calldata
    });
    
    // Decode the result
    const decodedResult = campaignFactory.interface.decodeFunctionResult('createCampaign', result);
    const campaignAddress = decodedResult[0];
    
    console.log("✅ Transaction would succeed!");
    console.log("   Campaign would be deployed at:", campaignAddress);
    console.log();
    console.log("🎉 No errors found - the campaign creation should work!");
    console.log();
    console.log("This means the issue is likely:");
    console.log("1. Frontend not sending the transaction correctly");
    console.log("2. MetaMask connection issues");
    console.log("3. RPC provider issues");
    console.log("4. Wrong network/chain ID");
    
  } catch (error) {
    console.log("❌ Transaction would FAIL!");
    console.log();
    console.log("Error message:", error.message);
    
    if (error.reason) {
      console.log("Revert reason:", error.reason);
    }
    
    if (error.data) {
      console.log("Error data:", error.data);
      
      // Try to decode the error
      try {
        const iface = campaignFactory.interface;
        const decodedError = iface.parseError(error.data);
        if (decodedError) {
          console.log("Decoded error:", decodedError);
        }
      } catch (e) {
        // Couldn't decode
      }
    }

    // Try to extract more details
    if (error.error) {
      console.log("Nested error:", error.error);
    }

    console.log();
    console.log("Full error object:");
    console.log(JSON.stringify(error, null, 2));
    
    process.exit(1);
  }

  // Additional checks
  console.log("📊 Additional Checks:");
  
  // Check reliefToken
  const reliefToken = await campaignFactory.reliefToken();
  console.log("   ReliefToken address:", reliefToken);
  console.log("   Is zero address:", reliefToken === "0x0000000000000000000000000000000000000000" ? "❌ YES (ERROR!)" : "✅ NO");
  
  // Check owner
  const owner = await campaignFactory.owner();
  console.log("   Owner/Admin address:", owner);
  console.log("   Is zero address:", owner === "0x0000000000000000000000000000000000000000" ? "❌ YES (ERROR!)" : "✅ NO");
  
  // Check organizer's ETH balance
  const balance = await provider.getBalance(organizerAddress);
  console.log("   Organizer POL balance:", hre.ethers.formatEther(balance));
  console.log("   Has enough for gas:", balance > hre.ethers.parseEther("0.01") ? "✅ YES" : "⚠️ LOW");
  
  console.log();
  console.log("=" .repeat(60));
  console.log("✅ Debug complete!");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
