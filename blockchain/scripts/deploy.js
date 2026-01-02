const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment to Polygon Amoy Testnet...\n");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = deployer.address;
  console.log("📍 Deploying contracts with account:", deployerAddress);
  
  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "POL\n");

  if (balance < hre.ethers.parseEther("0.1")) {
    console.log("⚠️  WARNING: Low balance! You may need more POL from faucet.");
    console.log("Get POL from: https://faucet.polygon.technology\n");
  }

  // ==========================================
  // 1. Deploy ReliefToken
  // ==========================================
  console.log("📝 Deploying ReliefToken...");
  const ReliefToken = await hre.ethers.getContractFactory("ReliefToken");
  const reliefToken = await ReliefToken.deploy(deployerAddress);
  await reliefToken.waitForDeployment();
  const reliefTokenAddress = await reliefToken.getAddress();
  console.log("✅ ReliefToken deployed to:", reliefTokenAddress);
  console.log("   Max Supply: 10,000,000 RELIEF");
  console.log("   Initial holder:", deployerAddress, "\n");

  // ==========================================
  // 2. Deploy ReliefTokenSale
  // ==========================================
  console.log("📝 Deploying ReliefTokenSale...");
  const ReliefTokenSale = await hre.ethers.getContractFactory("ReliefTokenSale");
  const reliefTokenSale = await ReliefTokenSale.deploy(reliefTokenAddress, deployerAddress);
  await reliefTokenSale.waitForDeployment();
  const reliefTokenSaleAddress = await reliefTokenSale.getAddress();
  console.log("✅ ReliefTokenSale deployed to:", reliefTokenSaleAddress);
  console.log("   Exchange Rate: 1 POL = 1 RELIEF\n");

  // ==========================================
  // 3. Transfer tokens to ReliefTokenSale
  // ==========================================
  console.log("📝 Transferring RELIEF tokens to TokenSale contract...");
  const transferAmount = hre.ethers.parseEther("5000000"); // 5 million tokens
  const transferTx = await reliefToken.transfer(reliefTokenSaleAddress, transferAmount);
  await transferTx.wait();
  console.log("✅ Transferred 5,000,000 RELIEF to TokenSale contract\n");

  // ==========================================
  // 4. Deploy CampaignFactory
  // ==========================================
  console.log("📝 Deploying CampaignFactory...");
  const CampaignFactory = await hre.ethers.getContractFactory("CampaignFactory");
  const campaignFactory = await CampaignFactory.deploy(reliefTokenAddress, deployerAddress);
  await campaignFactory.waitForDeployment();
  const campaignFactoryAddress = await campaignFactory.getAddress();
  console.log("✅ CampaignFactory deployed to:", campaignFactoryAddress);
  console.log("   Admin:", deployerAddress, "\n");

  // ==========================================
  // 5. Get sample Campaign and BeneficiaryWallet ABIs
  // ==========================================
  console.log("📝 Getting Campaign and BeneficiaryWallet contract info...");
  const Campaign = await hre.ethers.getContractFactory("Campaign");
  const BeneficiaryWallet = await hre.ethers.getContractFactory("BeneficiaryWallet");
  console.log("✅ Contract factories prepared\n");

  // ==========================================
  // Summary
  // ==========================================
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=" .repeat(60));
  console.log("\n📋 CONTRACT ADDRESSES:\n");
  console.log("ReliefToken:           ", reliefTokenAddress);
  console.log("ReliefTokenSale:       ", reliefTokenSaleAddress);
  console.log("CampaignFactory:       ", campaignFactoryAddress);
  console.log("\n📋 NETWORK INFO:\n");
  console.log("Network:                Polygon Amoy Testnet");
  console.log("Chain ID:               80002");
  console.log("Deployer:              ", deployerAddress);
  console.log("Super Admin:           ", deployerAddress);
  console.log("\n💡 NEXT STEPS:\n");
  console.log("1. Save these addresses for frontend integration");
  console.log("2. Verify contracts on PolygonScan (optional)");
  console.log("3. Approve organizers using CampaignFactory");
  console.log("4. Test token purchase from ReliefTokenSale");
  console.log("\n🔗 View on PolygonScan:");
  console.log(`https://amoy.polygonscan.com/address/${reliefTokenAddress}`);
  console.log(`https://amoy.polygonscan.com/address/${reliefTokenSaleAddress}`);
  console.log(`https://amoy.polygonscan.com/address/${campaignFactoryAddress}`);
  console.log("\n" + "=" .repeat(60));

  // ==========================================
  // Save addresses to file
  // ==========================================
  const deploymentInfo = {
    network: "Polygon Amoy Testnet",
    chainId: 80002,
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: {
      ReliefToken: reliefTokenAddress,
      ReliefTokenSale: reliefTokenSaleAddress,
      CampaignFactory: campaignFactoryAddress
    }
  };

  // Save to JSON file
  const jsonPath = path.join(__dirname, "../deployments/amoy.json");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to: deployments/amoy.json");

  // Save to frontend
  const frontendPath = path.join(__dirname, "../../frontend/src/contracts/addresses.json");
  fs.mkdirSync(path.dirname(frontendPath), { recursive: true });
  fs.writeFileSync(frontendPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Contract addresses saved to: frontend/src/contracts/addresses.json");

  // Create markdown file
  const mdContent = `# 🎯 Relifo - Deployed Smart Contracts

**Network:** Polygon Amoy Testnet  
**Chain ID:** 80002  
**Deployed:** ${new Date().toLocaleString()}  
**Deployer:** ${deployerAddress}

---

## 📋 Contract Addresses

### 1. ReliefToken (ERC20)
\`\`\`
${reliefTokenAddress}
\`\`\`
- **Token Name:** Relief Token
- **Symbol:** RELIEF
- **Decimals:** 18
- **Total Supply:** 10,000,000 RELIEF
- **Features:** Mintable, Burnable, Pausable
- **View on PolygonScan:** [${reliefTokenAddress}](https://amoy.polygonscan.com/address/${reliefTokenAddress})

---

### 2. ReliefTokenSale
\`\`\`
${reliefTokenSaleAddress}
\`\`\`
- **Exchange Rate:** 1 POL = 1 RELIEF
- **Available Tokens:** 5,000,000 RELIEF
- **Min Purchase:** 0.01 POL
- **Max Purchase:** 10,000 POL
- **View on PolygonScan:** [${reliefTokenSaleAddress}](https://amoy.polygonscan.com/address/${reliefTokenSaleAddress})

---

### 3. CampaignFactory
\`\`\`
${campaignFactoryAddress}
\`\`\`
- **Admin:** ${deployerAddress}
- **Purpose:** Create and manage relief campaigns
- **Access:** Only approved organizers can create campaigns
- **View on PolygonScan:** [${campaignFactoryAddress}](https://amoy.polygonscan.com/address/${campaignFactoryAddress})

---

### 4. Campaign (Template)
- **Deployment:** Created dynamically by CampaignFactory
- **Purpose:** Individual campaign escrow with multisig
- **Features:** 
  - Accept donations
  - Distribute to beneficiaries
  - Track progress
  - Multisig control (organizer + admin)

---

### 5. BeneficiaryWallet (Template)
- **Deployment:** Created automatically when funds allocated
- **Purpose:** Restricted spending wallet for beneficiaries
- **Features:**
  - Category-based spending (Food, Medicine, Shelter, Education, Other)
  - Merchant approval system
  - Spending limits per category
  - Complete spending history

---

## 🔐 Super Admin Account
\`\`\`
${deployerAddress}
\`\`\`

**Responsibilities:**
- ✅ Own all deployed contracts
- ✅ Approve/revoke organizers
- ✅ Mint additional RELIEF tokens (if needed)
- ✅ Withdraw POL from token sale
- ✅ Emergency pause functionality

---

## 💡 How to Use

### For Donors:
1. **Buy RELIEF Tokens**
   - Send POL to ReliefTokenSale contract
   - Receive RELIEF tokens automatically (1:1 ratio)
   - Or call \`buyTokens()\` function

2. **Donate to Campaigns**
   - Approve RELIEF tokens for campaign contract
   - Call campaign's \`donate(amount)\` function
   - Track donations on-chain

### For Organizers:
1. **Get Approved**
   - Super admin calls \`approveOrganizer(yourAddress)\` on CampaignFactory

2. **Create Campaign**
   - Call \`createCampaign(title, description, goal, location, disasterType)\`
   - Receive campaign contract address
   - Share with donors

3. **Distribute Funds**
   - Review approved beneficiaries
   - Call \`allocateFunds(beneficiary, amount)\` on campaign
   - Beneficiary receives restricted wallet

### For Beneficiaries:
1. **Receive Funds**
   - Organizer allocates funds
   - BeneficiaryWallet created automatically
   - Check balance in wallet

2. **Spend Funds**
   - Only at approved merchants
   - Within category limits
   - Call \`spend(merchant, amount, category, description)\`

---

## 🔗 Important Links

- **Polygon Amoy Faucet:** https://faucet.polygon.technology
- **Polygon Amoy RPC:** https://rpc-amoy.polygon.technology
- **PolygonScan (Amoy):** https://amoy.polygonscan.com
- **Add Amoy to MetaMask:** 
  - Network Name: Polygon Amoy
  - RPC URL: https://rpc-amoy.polygon.technology
  - Chain ID: 80002
  - Currency Symbol: POL

---

## 🛠️ Contract Verification (Optional)

To verify contracts on PolygonScan:

\`\`\`bash
npx hardhat verify --network amoy ${reliefTokenAddress} "${deployerAddress}"
npx hardhat verify --network amoy ${reliefTokenSaleAddress} "${reliefTokenAddress}" "${deployerAddress}"
npx hardhat verify --network amoy ${campaignFactoryAddress} "${reliefTokenAddress}" "${deployerAddress}"
\`\`\`

---

## 📊 Token Distribution

- **ReliefTokenSale Contract:** 5,000,000 RELIEF (for donors to purchase)
- **Super Admin Reserve:** 5,000,000 RELIEF (for direct distribution if needed)
- **Total Supply:** 10,000,000 RELIEF

---

## ⚙️ Frontend Integration

Use these addresses in your frontend:

\`\`\`javascript
export const CONTRACTS = {
  reliefToken: "${reliefTokenAddress}",
  reliefTokenSale: "${reliefTokenSaleAddress}",
  campaignFactory: "${campaignFactoryAddress}",
  network: "amoy",
  chainId: 80002
};
\`\`\`

---

**Generated:** ${new Date().toLocaleString()}  
**Network:** Polygon Amoy Testnet (Chain ID: 80002)  
**Status:** ✅ All contracts deployed and operational
`;

  const mdPath = path.join(__dirname, "../DEPLOYED_CONTRACTS.md");
  fs.writeFileSync(mdPath, mdContent);
  console.log("💾 Deployment details saved to: DEPLOYED_CONTRACTS.md\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
