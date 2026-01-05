const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    
    console.log("🧪 Testing Campaign Creation");
    console.log("=".repeat(60));
    console.log("Test account:", deployer.address);
    
    const fs = require('fs');
    const deployment = JSON.parse(fs.readFileSync('./deployments/amoy.json', 'utf8'));
    const factoryAddress = deployment.contracts.CampaignFactory;
    
    console.log("CampaignFactory:", factoryAddress);
    
    const CampaignFactory = await hre.ethers.getContractAt("CampaignFactory", factoryAddress);
    
    // Check approval
    const isApproved = await CampaignFactory.isApprovedOrganizer(deployer.address);
    console.log("\nOrganizer approved:", isApproved ? "✅ Yes" : "❌ No");
    
    if (!isApproved) {
        console.log("\n⚠️ Approving organizer first...");
        const approveTx = await CampaignFactory.approveOrganizer(deployer.address);
        await approveTx.wait();
        console.log("✅ Approved!");
    }
    
    // Create campaign
    console.log("\n📝 Creating test campaign...");
    const goalAmount = hre.ethers.parseEther("100");
    
    try {
        const tx = await CampaignFactory.createCampaign(
            "Test Campaign",
            "Testing campaign creation from script",
            goalAmount,
            "Test Location",
            "Flood"
        );
        
        console.log("Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("✅ Campaign created successfully!");
        console.log("Block:", receipt.blockNumber);
        console.log("Gas used:", receipt.gasUsed.toString());
        
        // Get campaign address from event
        const event = receipt.logs.find(log => {
            try {
                const parsed = CampaignFactory.interface.parseLog(log);
                return parsed && parsed.name === 'CampaignCreated';
            } catch {
                return false;
            }
        });
        
        if (event) {
            const parsedEvent = CampaignFactory.interface.parseLog(event);
            console.log("\n✅ Campaign deployed at:", parsedEvent.args.campaignAddress);
        }
        
    } catch (error) {
        console.error("\n❌ Campaign creation failed!");
        console.error("Error:", error.message);
        if (error.data) {
            console.error("Error data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
