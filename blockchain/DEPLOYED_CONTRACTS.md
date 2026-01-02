# 🎯 Relifo - Deployed Smart Contracts

**Network:** Polygon Amoy Testnet  
**Chain ID:** 80002  
**Deployed:** 1/2/2026, 9:47:03 PM  
**Deployer:** 0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34

---

## 📋 Contract Addresses

### 1. ReliefToken (ERC20)
```
0x178C7cC74955a6051Af2411ee38e5061b05382D1
```
- **Token Name:** Relief Token
- **Symbol:** RELIEF
- **Decimals:** 18
- **Total Supply:** 10,000,000 RELIEF
- **Features:** Mintable, Burnable, Pausable
- **View on PolygonScan:** [0x178C7cC74955a6051Af2411ee38e5061b05382D1](https://amoy.polygonscan.com/address/0x178C7cC74955a6051Af2411ee38e5061b05382D1)

---

### 2. ReliefTokenSale
```
0x1a0ae74c55b43473151688055A57C2A1EdB51d25
```
- **Exchange Rate:** 1 POL = 1 RELIEF
- **Available Tokens:** 5,000,000 RELIEF
- **Min Purchase:** 0.01 POL
- **Max Purchase:** 10,000 POL
- **View on PolygonScan:** [0x1a0ae74c55b43473151688055A57C2A1EdB51d25](https://amoy.polygonscan.com/address/0x1a0ae74c55b43473151688055A57C2A1EdB51d25)

---

### 3. CampaignFactory
```
0x7fd01153cA95C5B689D9d9df86c2a3898FF728C9
```
- **Admin:** 0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34
- **Purpose:** Create and manage relief campaigns
- **Access:** Only approved organizers can create campaigns
- **View on PolygonScan:** [0x7fd01153cA95C5B689D9d9df86c2a3898FF728C9](https://amoy.polygonscan.com/address/0x7fd01153cA95C5B689D9d9df86c2a3898FF728C9)

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
```
0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34
```

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
   - Or call `buyTokens()` function

2. **Donate to Campaigns**
   - Approve RELIEF tokens for campaign contract
   - Call campaign's `donate(amount)` function
   - Track donations on-chain

### For Organizers:
1. **Get Approved**
   - Super admin calls `approveOrganizer(yourAddress)` on CampaignFactory

2. **Create Campaign**
   - Call `createCampaign(title, description, goal, location, disasterType)`
   - Receive campaign contract address
   - Share with donors

3. **Distribute Funds**
   - Review approved beneficiaries
   - Call `allocateFunds(beneficiary, amount)` on campaign
   - Beneficiary receives restricted wallet

### For Beneficiaries:
1. **Receive Funds**
   - Organizer allocates funds
   - BeneficiaryWallet created automatically
   - Check balance in wallet

2. **Spend Funds**
   - Only at approved merchants
   - Within category limits
   - Call `spend(merchant, amount, category, description)`

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

```bash
npx hardhat verify --network amoy 0x178C7cC74955a6051Af2411ee38e5061b05382D1 "0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34"
npx hardhat verify --network amoy 0x1a0ae74c55b43473151688055A57C2A1EdB51d25 "0x178C7cC74955a6051Af2411ee38e5061b05382D1" "0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34"
npx hardhat verify --network amoy 0x7fd01153cA95C5B689D9d9df86c2a3898FF728C9 "0x178C7cC74955a6051Af2411ee38e5061b05382D1" "0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34"
```

---

## 📊 Token Distribution

- **ReliefTokenSale Contract:** 5,000,000 RELIEF (for donors to purchase)
- **Super Admin Reserve:** 5,000,000 RELIEF (for direct distribution if needed)
- **Total Supply:** 10,000,000 RELIEF

---

## ⚙️ Frontend Integration

Use these addresses in your frontend:

```javascript
export const CONTRACTS = {
  reliefToken: "0x178C7cC74955a6051Af2411ee38e5061b05382D1",
  reliefTokenSale: "0x1a0ae74c55b43473151688055A57C2A1EdB51d25",
  campaignFactory: "0x7fd01153cA95C5B689D9d9df86c2a3898FF728C9",
  network: "amoy",
  chainId: 80002
};
```

---

**Generated:** 1/2/2026, 9:47:04 PM  
**Network:** Polygon Amoy Testnet (Chain ID: 80002)  
**Status:** ✅ All contracts deployed and operational
