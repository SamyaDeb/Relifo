# 🚀 IIT HACKATHON - 3-DAY IMPLEMENTATION GUIDE
## Relifo: Disaster Relief Platform on Polygon

**Deadline:** 6th January 2025 (3 days from now!)  
**Blockchain:** Polygon Mumbai Testnet  
**Goal:** Working disaster relief platform with smart contracts

---

## 📋 PRE-HACKATHON CHECKLIST

### **Required Accounts & Tools:**
- ✅ MetaMask browser extension installed
- ✅ MetaMask account with Mumbai testnet configured
- ✅ Free Mumbai MATIC from faucet
- ✅ Node.js & npm installed
- ✅ VS Code or any code editor
- ✅ Git installed
- ✅ Your current Relifo project (Firebase already set up)

### **Get These Ready NOW:**
1. **Install MetaMask:** https://metamask.io/download/
2. **Add Mumbai Testnet to MetaMask:**
   - Network Name: Polygon Mumbai
   - RPC URL: https://rpc-mumbai.maticvigil.com
   - Chain ID: 80001
   - Currency Symbol: MATIC
3. **Get Free MATIC:** https://faucet.polygon.technology/
4. **Save Your Private Key:** MetaMask → Account Details → Export Private Key (you'll need this)

---

## 📅 DAY 1: January 3rd (TODAY) - Blockchain Setup & Smart Contracts

### ⏰ MORNING SESSION (9 AM - 1 PM): Environment Setup

#### **TASK 1.1: Install Hardhat & Dependencies** ⏱️ 15 minutes

**Step 1:** Open terminal and navigate to project:
```bash
cd "/Users/samya/Desktop/EIBS 2.0"
```

**Step 2:** Create blockchain directory:
```bash
mkdir blockchain
cd blockchain
```

**Step 3:** Initialize Node project:
```bash
npm init -y
```

**Step 4:** Install Hardhat and dependencies:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install --save-dev @openzeppelin/contracts dotenv
npm install --save ethers@5.7.2
```

**Step 5:** Initialize Hardhat:
```bash
npx hardhat init
```
- Select: **"Create a JavaScript project"**
- Press Enter for all defaults
- Say "Yes" to install dependencies

**Expected Result:** You should see `hardhat.config.js` file created

---

#### **TASK 1.2: Configure Hardhat for Polygon Mumbai** ⏱️ 10 minutes

**Step 1:** Create `.env` file in blockchain folder:
```bash
touch .env
```

**Step 2:** Add your private key to `.env`:
```
PRIVATE_KEY=your_metamask_private_key_here
POLYGONSCAN_API_KEY=optional_for_now
```

**Step 3:** Edit `hardhat.config.js` file:
- Replace entire contents with this configuration
- This sets up Mumbai testnet connection
- Configures Solidity compiler version

**Step 4:** Add `.env` to `.gitignore`:
```bash
echo ".env" >> .gitignore
```

**Testing:** Run this command to verify setup:
```bash
npx hardhat compile
```
Should show: "Compiled 0 Solidity files successfully"

---

#### **TASK 1.3: Create Smart Contract Structure** ⏱️ 10 minutes

**Step 1:** Create contracts directory:
```bash
mkdir -p contracts
mkdir -p scripts
mkdir -p test
```

**Step 2:** Remove sample files:
```bash
rm -f contracts/Lock.sol
rm -f scripts/deploy.js
rm -f test/Lock.js
```

**Step 3:** Your structure should be:
```
blockchain/
├── contracts/           (smart contracts go here)
├── scripts/            (deployment scripts)
├── test/               (tests)
├── .env                (your private key)
├── hardhat.config.js   (network configuration)
└── package.json
```

---

#### **TASK 1.4: Plan Your Smart Contracts** ⏱️ 30 minutes

**Read and Understand What We'll Build:**

**Contract 1: ReliefToken.sol**
- Purpose: ERC20 token for relief funds
- Features: Mint tokens, transfer, approve
- Total Supply: 10 million RELIEF tokens
- Owner: Super admin (deployer)

**Contract 2: CampaignFactory.sol**
- Purpose: Create new relief campaigns
- Features: Deploy campaign contracts, track all campaigns
- Access: Only approved organizers
- Storage: Campaign registry

**Contract 3: Campaign.sol**
- Purpose: Individual campaign escrow
- Features: Accept donations, distribute to beneficiaries, track progress
- Access: Campaign organizer + super admin (multisig)
- Storage: Donations, beneficiary allocations

**Contract 4: BeneficiaryWallet.sol**
- Purpose: Restricted spending wallet
- Features: Category-based spending limits, merchant verification
- Access: Beneficiary (owner)
- Storage: Spending history, restrictions

**How They Work Together:**
```
1. Super Admin deploys ReliefToken
2. Organizer uses CampaignFactory to create Campaign
3. Donors donate RELIEF tokens to Campaign
4. Organizer distributes from Campaign to BeneficiaryWallet
5. Beneficiary spends from BeneficiaryWallet to merchants
```

---

### ⏰ AFTERNOON SESSION (2 PM - 6 PM): Write Smart Contracts

#### **TASK 1.5: Create ReliefToken.sol** ⏱️ 30 minutes

**Step 1:** Create new file:
```bash
touch contracts/ReliefToken.sol
```

**Step 2:** Open `contracts/ReliefToken.sol` in VS Code

**Step 3:** Write the contract with these features:
- Inherits from OpenZeppelin ERC20 and Ownable
- Constructor mints 10 million tokens to deployer
- Only owner can mint more tokens
- Standard ERC20 transfer, approve, transferFrom

**Step 4:** Compile to check for errors:
```bash
npx hardhat compile
```

**Expected:** "Compiled 1 Solidity file successfully"

---

#### **TASK 1.6: Create CampaignFactory.sol** ⏱️ 45 minutes

**Step 1:** Create new file:
```bash
touch contracts/CampaignFactory.sol
```

**Step 2:** Write the contract with these features:
- State variables: reliefToken address, super admin, campaign counter
- Mapping: organizer address → campaign addresses
- Array: all campaigns
- Function: createCampaign(title, goal, location, disasterType)
  - Only approved organizers (check Firebase first)
  - Deploys new Campaign contract
  - Sets organizer and admin as signers
  - Stores campaign address
  - Emits CampaignCreated event
- Function: getCampaignsByOrganizer(address organizer)
- Function: getAllCampaigns()

**Step 3:** Compile:
```bash
npx hardhat compile
```

---

#### **TASK 1.7: Create Campaign.sol** ⏱️ 60 minutes

**Step 1:** Create new file:
```bash
touch contracts/Campaign.sol
```

**Step 2:** Write the contract with these features:

**State Variables:**
- Campaign details (title, goal, raised, organizer, admin, status)
- ReliefToken contract reference
- Beneficiaries mapping
- Donors mapping
- Multisig settings (2-of-2: organizer + admin)

**Constructor:**
- Initialize campaign details
- Set organizer and admin addresses
- Set ReliefToken address

**Functions:**
- donate(uint256 amount)
  - Transfer RELIEF from donor to campaign
  - Update raised amount
  - Store donor info
  - Emit Donation event
  
- allocateFunds(address beneficiary, uint256 amount)
  - Requires both organizer AND admin approval (multisig)
  - Transfer RELIEF from campaign to beneficiary
  - Update allocations
  - Emit FundsAllocated event

- approveFundsAllocation(address beneficiary, uint256 amount)
  - First signer proposes allocation
  - Second signer approves
  - Executes transfer when both signed

- getCampaignInfo()
  - Returns all campaign details
  
- getDonors()
- getBeneficiaries()

**Step 3:** Compile:
```bash
npx hardhat compile
```

---

#### **TASK 1.8: Create BeneficiaryWallet.sol** ⏱️ 45 minutes

**Step 1:** Create new file:
```bash
touch contracts/BeneficiaryWallet.sol
```

**Step 2:** Write the contract with these features:

**State Variables:**
- Owner (beneficiary address)
- ReliefToken contract
- Campaign address
- Spending categories enum (Food, Medicine, Shelter, Education, Other)
- Category limits mapping
- Spending history array
- Approved merchants mapping

**Constructor:**
- Set owner, token, campaign
- Initialize default category limits

**Functions:**
- spend(address merchant, uint256 amount, SpendingCategory category)
  - Check merchant is approved
  - Check within category limit
  - Transfer RELIEF to merchant
  - Record spending
  - Emit Spent event

- approveMerchant(address merchant, SpendingCategory category)
  - Only campaign organizer
  - Add merchant to approved list

- setCategoryLimit(SpendingCategory category, uint256 limit)
  - Only campaign organizer
  - Update category spending limit

- getBalance()
- getSpendingHistory()
- getRemainingInCategory(SpendingCategory category)

**Step 3:** Compile all contracts:
```bash
npx hardhat compile
```

**Expected:** "Compiled 4 Solidity files successfully"

---

### ⏰ EVENING SESSION (7 PM - 10 PM): Deploy Contracts

#### **TASK 1.9: Write Deployment Script** ⏱️ 30 minutes

**Step 1:** Create deployment script:
```bash
touch scripts/deploy.js
```

**Step 2:** Write deployment logic:
- Deploy ReliefToken first
- Get deployer address (super admin)
- Log ReliefToken address
- Deploy CampaignFactory with ReliefToken address
- Log CampaignFactory address
- Save addresses to a file for frontend use

**Step 3:** Create script to save deployed addresses:
```bash
touch scripts/saveAddresses.js
```

This will save contract addresses to `frontend/src/contracts/addresses.json`

---

#### **TASK 1.10: Deploy to Mumbai Testnet** ⏱️ 30 minutes

**Step 1:** Make sure you have Mumbai MATIC in your wallet

**Step 2:** Deploy contracts:
```bash
npx hardhat run scripts/deploy.js --network mumbai
```

**Step 3:** Save the output - you'll see:
```
ReliefToken deployed to: 0x...
CampaignFactory deployed to: 0x...
Deployment complete!
```

**Step 4:** Copy these addresses - you'll need them tomorrow!

**Step 5:** Verify contracts on PolygonScan (optional but impressive):
```bash
npx hardhat verify --network mumbai RELIEF_TOKEN_ADDRESS
npx hardhat verify --network mumbai CAMPAIGN_FACTORY_ADDRESS "RELIEF_TOKEN_ADDRESS"
```

---

#### **TASK 1.11: Test Contracts Locally** ⏱️ 30 minutes

**Step 1:** Create test file:
```bash
touch test/Campaign.test.js
```

**Step 2:** Write basic tests:
- Deploy ReliefToken
- Deploy Campaign
- Test donation
- Test fund allocation
- Test beneficiary spending

**Step 3:** Run tests:
```bash
npx hardhat test
```

**Expected:** All tests should pass ✅

---

### 🎯 DAY 1 CHECKLIST - Complete Before Sleep!

- ✅ Hardhat installed and configured
- ✅ Mumbai testnet set up in MetaMask
- ✅ 4 smart contracts written and compiled
- ✅ Contracts deployed to Mumbai testnet
- ✅ Contract addresses saved
- ✅ Basic tests written and passing
- ✅ Verified on PolygonScan (optional)

**Tomorrow:** We'll connect these contracts to your existing frontend!

---

## 📅 DAY 2: January 4th - Frontend Integration

### ⏰ MORNING SESSION (9 AM - 1 PM): MetaMask Connection

#### **TASK 2.1: Install Web3 Dependencies** ⏱️ 10 minutes

**Step 1:** Navigate to frontend:
```bash
cd /Users/samya/Desktop/EIBS\ 2.0/frontend
```

**Step 2:** Install ethers.js and wagmi (optional):
```bash
npm install ethers@5.7.2
npm install web3modal
```

**Step 3:** Create contract interfaces folder:
```bash
mkdir -p src/contracts
```

---

#### **TASK 2.2: Copy Contract ABIs** ⏱️ 15 minutes

**Step 1:** Navigate to blockchain folder:
```bash
cd /Users/samya/Desktop/EIBS\ 2.0/blockchain
```

**Step 2:** Copy ABI files to frontend:
```bash
cp artifacts/contracts/ReliefToken.sol/ReliefToken.json ../frontend/src/contracts/
cp artifacts/contracts/CampaignFactory.sol/CampaignFactory.json ../frontend/src/contracts/
cp artifacts/contracts/Campaign.sol/Campaign.json ../frontend/src/contracts/
cp artifacts/contracts/BeneficiaryWallet.sol/BeneficiaryWallet.json ../frontend/src/contracts/
```

**Step 3:** Create addresses configuration file:
`frontend/src/contracts/addresses.js`
- Store deployed contract addresses
- Export as constants

---

#### **TASK 2.3: Create Polygon Service** ⏱️ 45 minutes

**Step 1:** Create new service file:
```bash
touch src/services/polygonService.js
```

**Step 2:** Implement these functions:
- `connectWallet()` - Connect MetaMask
- `getWalletAddress()` - Get current account
- `switchToMumbai()` - Switch to Mumbai network
- `getReliefTokenContract()` - Return ReliefToken contract instance
- `getCampaignFactoryContract()` - Return CampaignFactory instance
- `getCampaignContract(address)` - Return Campaign instance
- `getBeneficiaryWalletContract(address)` - Return BeneficiaryWallet instance

**Step 3:** Add error handling for:
- MetaMask not installed
- Wrong network
- User rejected connection
- Insufficient balance

---

#### **TASK 2.4: Update Login Page** ⏱️ 30 minutes

**Step 1:** Open `src/pages/Login.jsx`

**Step 2:** Modify wallet connection:
- Replace Freighter with MetaMask
- Use `polygonService.connectWallet()` instead of `freighterService.getPublicKey()`
- Update button text: "Connect with MetaMask"
- Add Mumbai network check
- Update wallet icon (MetaMask fox logo)

**Step 3:** Update super admin check:
- Keep same super admin address check
- Change variable names from `publicKey` to `walletAddress`

**Step 4:** Test:
- Click "Connect with MetaMask"
- Should prompt MetaMask connection
- Should detect if you're super admin
- Should redirect to appropriate dashboard

---

#### **TASK 2.5: Update Register Page** ⏱️ 30 minutes

**Step 1:** Open `src/pages/Register.jsx`

**Step 2:** Update wallet connection:
- Replace Freighter with MetaMask
- Get wallet address from MetaMask
- Keep all form fields same (they work with any blockchain)

**Step 3:** Keep Firebase registration logic:
- Firebase still handles user data
- Wallet address is just the ID (like before)
- No blockchain calls during registration (contracts come later)

**Step 4:** Test:
- Register as organizer
- Should save to Firebase with MetaMask address
- Should redirect to pending approval

---

### ⏰ AFTERNOON SESSION (2 PM - 6 PM): Campaign Creation & Donations

#### **TASK 2.6: Update Organizer Dashboard - Campaign Creation** ⏱️ 90 minutes

**Step 1:** Open `src/pages/organizer/Dashboard.jsx`

**Step 2:** Update CreateCampaignModal - add blockchain deployment:

**When organizer clicks "Create Campaign":**
1. Get campaign details from form (keep existing form)
2. Call `CampaignFactory.createCampaign()` on blockchain
3. Wait for transaction confirmation
4. Get new campaign address from event
5. Save to Firebase (existing code) + add blockchain address
6. Show success message with blockchain transaction link

**Step 3:** Create new function `createCampaignOnChain()`:
- Get CampaignFactory contract
- Call createCampaign with form data
- Sign transaction with MetaMask
- Wait for confirmation
- Extract campaign address from event
- Return campaign address

**Step 4:** Update Firebase save to include:
```javascript
{
  // ... existing fields ...
  blockchainAddress: campaignAddress,
  txHash: transaction.hash,
  network: 'mumbai'
}
```

**Step 5:** Test:
- Create a campaign
- MetaMask should popup for signature
- Transaction should confirm
- Campaign should appear in dashboard
- Firebase should have blockchain address

---

#### **TASK 2.7: Update Donor Dashboard - Donations** ⏱️ 90 minutes

**Step 1:** Open `src/pages/donor/Dashboard.jsx`

**Step 2:** Add "Donate" button to each campaign card

**Step 3:** Create DonateModal component:
- Input: Amount to donate
- Show: Campaign details, current raised, goal
- Button: "Donate RELIEF Tokens"

**Step 4:** Implement donation flow:

**When donor clicks "Donate":**
1. Check if donor has RELIEF tokens (call `ReliefToken.balanceOf()`)
2. If no tokens → Show message: "Request RELIEF tokens from admin"
3. Check if allowance is sufficient (call `ReliefToken.allowance()`)
4. If not → Call `ReliefToken.approve(campaignAddress, amount)`
5. Call `Campaign.donate(amount)`
6. Wait for transaction confirmation
7. Update Firebase (increment raised amount)
8. Update UI to show new total
9. Show success message with transaction link

**Step 5:** Create helper function `checkAndApproveToken()`:
- Check balance
- Check allowance
- Request approval if needed
- Handle approval transaction

**Step 6:** Test:
- Browse campaigns
- Click "Donate"
- Enter amount
- Approve tokens (first time)
- Donate
- Check campaign balance updated
- Check donation recorded in Firebase

---

### ⏰ EVENING SESSION (7 PM - 10 PM): Fund Distribution

#### **TASK 2.8: Admin Distributes RELIEF Tokens** ⏱️ 45 minutes

**Step 1:** Open `src/pages/admin/Dashboard.jsx`

**Step 2:** Add "Distribute RELIEF" section:
- Input: Beneficiary address
- Input: Amount
- Button: "Send RELIEF Tokens"

**Step 3:** Implement token distribution:
```javascript
// When admin distributes tokens
const reliefToken = getReliefTokenContract();
await reliefToken.transfer(beneficiaryAddress, amount);
```

**Step 4:** Test:
- Login as super admin
- Distribute RELIEF to a test address
- Check recipient balance increased

---

#### **TASK 2.9: Organizer Allocates Funds to Beneficiaries** ⏱️ 90 minutes

**Step 1:** Open `src/pages/organizer/Dashboard.jsx`

**Step 2:** Add "Allocate Funds" button in Approved Beneficiaries tab

**Step 3:** Create AllocateFundsModal:
- Show: Beneficiary details
- Input: Amount to allocate
- Show: Campaign balance
- Button: "Propose Allocation" (for organizer)
- Button: "Approve Allocation" (for admin)

**Step 4:** Implement multisig allocation flow:

**Organizer proposes:**
1. Call `Campaign.proposeFundsAllocation(beneficiary, amount)`
2. Transaction signed by organizer
3. Status: "Pending Admin Approval"

**Admin approves:**
1. Call `Campaign.approveFundsAllocation(beneficiary, amount)`
2. Transaction signed by admin
3. Funds transfer to beneficiary
4. Update Firebase

**Step 5:** Alternative - Simple approach (for hackathon demo):
- Skip multisig complexity
- Organizer directly calls `allocateFunds()`
- Requires admin to also approve via Firebase
- Simpler but less secure (mention this in presentation)

**Step 6:** Test:
- Organizer allocates funds to approved beneficiary
- Check beneficiary wallet balance increased
- Check campaign balance decreased
- Check Firebase updated

---

### 🎯 DAY 2 CHECKLIST - Complete Before Sleep!

- ✅ MetaMask integrated into Login page
- ✅ Registration updated for MetaMask addresses
- ✅ Campaign creation deploys blockchain contract
- ✅ Donations transfer RELIEF tokens
- ✅ Admin can distribute RELIEF tokens
- ✅ Organizer can allocate funds to beneficiaries
- ✅ All blockchain transactions confirmed on Mumbai
- ✅ Firebase updated with blockchain data

**Tomorrow:** Testing, demo prep, and submission!

---

## 📅 DAY 3: January 5th - Testing & Submission

### ⏰ MORNING SESSION (9 AM - 1 PM): End-to-End Testing

#### **TASK 3.1: Create Test Accounts** ⏱️ 20 minutes

**Step 1:** Create 4 MetaMask accounts:
1. Super Admin (your main account)
2. Organizer Test Account
3. Donor Test Account
4. Beneficiary Test Account

**Step 2:** Send Mumbai MATIC to each:
- Each account needs ~0.5 MATIC for gas fees
- Transfer from your main account or use faucet

**Step 3:** Send RELIEF tokens to Donor account:
- Use admin account
- Transfer 1000 RELIEF to donor address

---

#### **TASK 3.2: Test Complete User Flow** ⏱️ 90 minutes

**Test Flow 1: Organizer Registration & Approval**
1. ✅ Connect as Organizer (MetaMask account #2)
2. ✅ Register as organizer with org name
3. ✅ Upload verification PDF
4. ✅ Redirected to pending approval page
5. ✅ Switch to Super Admin account
6. ✅ See organizer in admin dashboard
7. ✅ Approve organizer
8. ✅ Switch back to Organizer
9. ✅ Auto-redirected to organizer dashboard

**Test Flow 2: Campaign Creation**
1. ✅ As Organizer, click "Create Campaign"
2. ✅ Fill form: "Flood Relief Kerala", Goal: $50000, Location: Kerala
3. ✅ Click "Create Campaign"
4. ✅ MetaMask popup appears
5. ✅ Confirm transaction
6. ✅ Wait for confirmation
7. ✅ Campaign appears in dashboard
8. ✅ Check Mumbai PolygonScan - transaction confirmed
9. ✅ Campaign contract deployed

**Test Flow 3: Donation**
1. ✅ Switch to Donor account (MetaMask #3)
2. ✅ Login/Register as donor
3. ✅ See campaign "Flood Relief Kerala"
4. ✅ Click "Donate"
5. ✅ Enter 100 RELIEF
6. ✅ Click "Donate"
7. ✅ MetaMask popup for approval (first time)
8. ✅ Confirm approval
9. ✅ MetaMask popup for donation
10. ✅ Confirm donation
11. ✅ Success message shown
12. ✅ Campaign raised amount updated
13. ✅ Check campaign balance on blockchain

**Test Flow 4: Beneficiary Registration & Approval**
1. ✅ Switch to Beneficiary account (MetaMask #4)
2. ✅ Register as beneficiary
3. ✅ Select "Flood Relief Kerala" campaign
4. ✅ Write reason for funds
5. ✅ Upload verification PDF
6. ✅ Submit
7. ✅ Switch to Organizer account
8. ✅ See beneficiary in "Pending Beneficiaries" tab
9. ✅ Review application
10. ✅ Click "Approve"
11. ✅ Beneficiary moves to "Approved" tab

**Test Flow 5: Fund Allocation**
1. ✅ As Organizer, go to "Approved Beneficiaries"
2. ✅ Click "Allocate Funds" for beneficiary
3. ✅ Enter 50 RELIEF
4. ✅ Confirm allocation
5. ✅ MetaMask popup
6. ✅ Transaction confirmed
7. ✅ Check beneficiary balance increased
8. ✅ Check campaign balance decreased

**Test Flow 6: Beneficiary Spending (if time permits)**
1. ✅ As Beneficiary, see allocated funds
2. ✅ Create merchant account (another MetaMask)
3. ✅ Organizer approves merchant
4. ✅ Beneficiary spends 10 RELIEF at merchant
5. ✅ Transaction confirmed
6. ✅ Spending recorded

---

#### **TASK 3.3: Fix Any Bugs** ⏱️ 60 minutes

**Common Issues to Check:**

**Issue 1: MetaMask not connecting**
- Solution: Check network is Mumbai
- Solution: Refresh page and try again

**Issue 2: Transaction fails**
- Check: Do you have enough MATIC?
- Check: Do you have enough RELIEF tokens?
- Check: Is allowance approved?
- Check: Is beneficiary approved first?

**Issue 3: Data not updating**
- Check: Firebase realtime listeners working?
- Check: Transaction confirmed before updating UI?

**Issue 4: Wrong network**
- Add automatic network switching
- Show clear error message

**Fix and Re-test** until all flows work smoothly!

---

### ⏰ AFTERNOON SESSION (2 PM - 6 PM): Demo Preparation

#### **TASK 3.4: Create Demo Video** ⏱️ 90 minutes

**Step 1:** Prepare Demo Script (15 mins)

**Demo Script Template:**
```
[Introduction - 30 seconds]
"Hello! I'm presenting Relifo - a blockchain-based disaster relief platform
that ensures transparent fund distribution using Polygon blockchain."

[Problem Statement - 30 seconds]
"Traditional relief funds lack transparency. Donors don't know where money goes.
Organizers struggle with accountability. Beneficiaries have no spending controls."

[Solution Overview - 45 seconds]
"Relifo solves this with 4 smart contracts on Polygon:
1. ReliefToken - ERC20 token for relief funds
2. CampaignFactory - Create verified campaigns
3. Campaign - Escrow with multisig approval
4. BeneficiaryWallet - Spending restrictions"

[Live Demo - 4 minutes]
1. "Let me show you the admin dashboard..."
   - Approve an organizer
   
2. "Now as an organizer, I'll create a campaign..."
   - Create "Flood Relief" campaign
   - Show MetaMask transaction
   - Show campaign on PolygonScan
   
3. "Here's a donor making a contribution..."
   - Donate 100 RELIEF tokens
   - Show balance update in real-time
   
4. "Organizer approves a beneficiary..."
   - Show pending beneficiary
   - Approve them
   
5. "Finally, allocate funds to beneficiary..."
   - Allocate 50 RELIEF
   - Show multisig approval
   - Beneficiary receives funds

[Tech Stack - 30 seconds]
"Built with React, Firebase, Polygon, Hardhat, Solidity, TailwindCSS"

[Conclusion - 30 seconds]
"Relifo brings transparency and accountability to disaster relief.
Every transaction is on-chain. Every penny is tracked. Thank you!"
```

**Step 2:** Record Demo (45 mins)
- Use OBS Studio or Loom
- Show clear screen
- Speak clearly and confidently
- Show both UI and blockchain transactions
- Keep it under 5 minutes

**Step 3:** Edit Video (30 mins)
- Add intro slide with project name
- Add captions if possible
- Add tech stack slide at end
- Export in 1080p

---

#### **TASK 3.5: Deploy Frontend** ⏱️ 45 minutes

**Step 1:** Choose deployment platform:
- Option 1: Vercel (Recommended - easiest)
- Option 2: Netlify
- Option 3: Firebase Hosting

**Step 2: Deploy to Vercel:**

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from frontend folder
cd frontend
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? relifo-disaster-relief
# - Directory? ./
# - Build command? npm run build
# - Output directory? dist

# Production deployment
vercel --prod
```

**Step 3:** Configure environment variables on Vercel:
- Add all Firebase config vars
- Add contract addresses
- Add network settings

**Step 4:** Test deployed site:
- Visit provided URL
- Test MetaMask connection
- Test one complete flow
- Fix any issues

---

#### **TASK 3.6: Prepare README** ⏱️ 30 minutes

**Step 1:** Create comprehensive README.md in project root

**Include these sections:**
1. **Project Title & Tagline**
   - "Relifo - Transparent Disaster Relief on Polygon"

2. **Problem Statement**
   - Current issues with traditional relief

3. **Solution**
   - How blockchain solves it

4. **Tech Stack**
   - Frontend: React, TailwindCSS, Firebase
   - Blockchain: Polygon, Solidity, Hardhat, OpenZeppelin
   - Wallet: MetaMask

5. **Smart Contracts**
   - List 4 contracts with addresses
   - Link to PolygonScan

6. **Features**
   - Role-based access control
   - Campaign creation with blockchain escrow
   - Transparent donations
   - Multisig fund distribution
   - Spending restrictions
   - Real-time updates

7. **Setup Instructions**
   - How to run locally
   - How to deploy contracts
   - Environment variables needed

8. **Demo**
   - Link to live demo
   - Link to video demo

9. **Future Enhancements**
   - Stellar integration
   - Mobile app
   - Analytics dashboard

10. **Team**
    - Your name and details

---

### ⏰ EVENING SESSION (7 PM - 10 PM): Final Polish & Submission

#### **TASK 3.7: Code Cleanup** ⏱️ 45 minutes

**Step 1:** Remove console.logs
```bash
# Search for console.log in frontend
grep -r "console.log" frontend/src/
# Remove or comment them out
```

**Step 2:** Add comments to smart contracts
- Add NatSpec comments to all functions
- Explain complex logic
- Document events

**Step 3:** Format code
```bash
cd frontend
npm run format  # if you have prettier
```

**Step 4:** Check for unused imports
- Remove unused imports in React files
- Remove unused contract files

---

#### **TASK 3.8: Prepare Presentation Slides** ⏱️ 60 minutes

**Create 8-10 slides:**

**Slide 1: Title**
- Project name: Relifo
- Tagline: Transparent Disaster Relief on Polygon
- Your name, university

**Slide 2: Problem**
- Lack of transparency in relief funds
- No accountability for organizers
- Beneficiaries can misuse funds
- Donors don't know impact

**Slide 3: Solution**
- Blockchain-based platform
- Smart contracts for transparency
- Role-based access control
- Spending restrictions

**Slide 4: Architecture**
- Frontend (React + Firebase)
- Smart Contracts (Polygon)
- User roles diagram

**Slide 5: Smart Contracts**
- ReliefToken (ERC20)
- CampaignFactory
- Campaign (Multisig Escrow)
- BeneficiaryWallet

**Slide 6: Key Features**
- Transparent donations
- Real-time tracking
- Multisig approval
- Category-based spending

**Slide 7: Tech Stack**
- Blockchain: Polygon Mumbai
- Contracts: Solidity, Hardhat
- Frontend: React, TailwindCSS
- Backend: Firebase
- Wallet: MetaMask

**Slide 8: Demo Screenshots**
- Dashboard screenshots
- Transaction on PolygonScan
- MetaMask integration

**Slide 9: Impact & Future**
- Transparency increases donations
- Accountability reduces fraud
- Future: Multi-chain, mobile app

**Slide 10: Thank You**
- Links: GitHub, demo, video
- Contact info

---

#### **TASK 3.9: Submit to Hackathon** ⏱️ 30 minutes

**Step 1:** Gather all submission materials:
- ✅ GitHub repository link (make it public!)
- ✅ Live demo URL (Vercel link)
- ✅ Demo video link (YouTube/Loom)
- ✅ Presentation slides (PDF)
- ✅ README with setup instructions
- ✅ Contract addresses on PolygonScan

**Step 2:** Create submission document:
```
PROJECT: Relifo - Disaster Relief on Polygon

DESCRIPTION:
A blockchain-based disaster relief platform that brings transparency
and accountability to relief fund distribution using Polygon smart contracts.

LIVE DEMO: https://relifo-disaster-relief.vercel.app

VIDEO DEMO: [Your YouTube link]

GITHUB: https://github.com/SamyaDeb/Relifo

SMART CONTRACTS (Polygon Mumbai):
- ReliefToken: 0x...
- CampaignFactory: 0x...
- Campaign: 0x...
- BeneficiaryWallet: 0x...

TECH STACK:
Frontend: React, TailwindCSS, Firebase
Blockchain: Polygon, Solidity, Hardhat
Wallet: MetaMask

KEY FEATURES:
- Role-based access (Admin, Organizer, Donor, Beneficiary)
- Blockchain-based campaign escrow
- Transparent on-chain donations
- Multisig fund distribution
- Category-based spending restrictions
- Real-time Firebase updates

TEAM: [Your Name]
```

**Step 3:** Fill submission form carefully
**Step 4:** Double-check all links work
**Step 5:** Submit before deadline!
**Step 6:** Celebrate! 🎉

---

### 🎯 DAY 3 CHECKLIST - Submission Ready!

- ✅ All user flows tested and working
- ✅ Bugs fixed
- ✅ Demo video recorded (under 5 minutes)
- ✅ Frontend deployed to Vercel
- ✅ README comprehensive
- ✅ Presentation slides ready
- ✅ Code cleaned and commented
- ✅ All contracts verified on PolygonScan
- ✅ Submission materials prepared
- ✅ Submitted before deadline!

---

## 🚀 POST-IIT HACKATHON: Adding Stellar (Jan 7-24)

### **Why Add Stellar After IIT?**
- Show multi-chain capability for Stellar hackathon
- Demonstrate platform flexibility
- More impressive final product

### **What Changes:**
1. **Keep Polygon Code** - Don't delete anything!
2. **Add Stellar Services** - Create parallel stellar/ folder
3. **Add Blockchain Selector** - Let users choose Polygon OR Stellar
4. **Reuse Frontend** - Same UI, different backend

### **Implementation Steps:**

**Week 1 (Jan 7-13): Stellar Setup**
- Create Stellar asset (RELIEF token on Stellar)
- Write Stellar service functions (no smart contracts!)
- Add Freighter wallet support alongside MetaMask
- Create blockchain selector in UI

**Week 2 (Jan 14-20): Integration**
- Implement Stellar donation flow
- Implement Stellar fund distribution
- Test both chains side-by-side

**Week 3 (Jan 21-24): Stellar Hackathon Prep**
- Highlight Stellar-specific benefits (lower fees, faster)
- Show multi-chain architecture
- Record new demo showing both chains
- Submit to Stellar hackathon

---

## 🆘 EMERGENCY BACKUP PLANS

### **If You're Running Out of Time:**

**Priority 1 (Must Have for Demo):**
- ✅ MetaMask connection working
- ✅ ReliefToken deployed
- ✅ Campaign creation (even simple version)
- ✅ One donation working
- ✅ Basic admin approval

**Priority 2 (Nice to Have):**
- ✅ Fund allocation to beneficiaries
- ✅ Multisig approval
- ✅ Spending restrictions

**Priority 3 (Skip if Needed):**
- ❌ BeneficiaryWallet contract (can add post-hackathon)
- ❌ Merchant approvals
- ❌ Complex spending categories

### **If Polygon is Too Complex:**
- **Option A:** Demo on Hardhat local network (no testnet deployment)
- **Option B:** Pre-deploy contracts, just show interaction
- **Option C:** Use mock contracts with hardcoded responses

### **If Smart Contracts Fail:**
- **Option A:** Show contract code + explain in presentation
- **Option B:** Use Remix IDE to deploy and show transactions
- **Option C:** Screenshot PolygonScan transactions as proof

---

## 📊 COMMON ERRORS & SOLUTIONS

### **Error 1: "Nonce too high"**
**Solution:** Reset MetaMask account
- Settings → Advanced → Reset Account

### **Error 2: "Insufficient funds for gas"**
**Solution:** Get more Mumbai MATIC from faucet

### **Error 3: "Contract not deployed"**
**Solution:** Check if contract address is correct in addresses.js

### **Error 4: "Transaction reverted"**
**Solution:**
- Check if you approved token allowance
- Check if you have enough tokens
- Check if all requirements met in contract

### **Error 5: "Wrong network"**
**Solution:** Switch MetaMask to Mumbai testnet manually

### **Error 6: "Cannot read property of undefined"**
**Solution:** Contract might not be loaded yet, add loading state

---

## ✅ FINAL PRE-SUBMISSION CHECKLIST

**GitHub:**
- ✅ All code committed and pushed
- ✅ Repository is PUBLIC
- ✅ README is comprehensive
- ✅ .env files NOT committed
- ✅ Clear folder structure

**Smart Contracts:**
- ✅ All 4 contracts compiled
- ✅ Deployed to Mumbai testnet
- ✅ Addresses saved and documented
- ✅ Verified on PolygonScan
- ✅ Functions working as expected

**Frontend:**
- ✅ Deployed to Vercel/Netlify
- ✅ MetaMask integration working
- ✅ All pages accessible
- ✅ Responsive design
- ✅ No console errors

**Demo Materials:**
- ✅ Video under 5 minutes
- ✅ Clear audio and video
- ✅ Shows end-to-end flow
- ✅ Highlights blockchain integration

**Presentation:**
- ✅ 8-10 slides
- ✅ Problem clearly stated
- ✅ Solution well explained
- ✅ Tech stack visible
- ✅ Demo screenshots included

**Submission Form:**
- ✅ All fields filled correctly
- ✅ All links working
- ✅ Contract addresses correct
- ✅ Submitted before deadline

---

## 🎯 SUCCESS METRICS

**You've succeeded if:**
- ✅ Users can connect with MetaMask
- ✅ Organizers can create campaigns on blockchain
- ✅ Donors can donate RELIEF tokens
- ✅ Transactions appear on PolygonScan
- ✅ Firebase and blockchain data sync
- ✅ Demo video shows complete flow
- ✅ Project submitted on time

---

## 💡 PRESENTATION TIPS

**During Presentation:**
1. **Start Strong:** Problem statement in 30 seconds
2. **Show, Don't Tell:** Live demo beats slides
3. **Highlight Blockchain:** Show PolygonScan transactions
4. **Be Honest:** If something doesn't work, explain what it should do
5. **Know Your Contracts:** Be ready to explain any function
6. **Mention Future:** "This is v1, we plan to add X, Y, Z"
7. **Practice:** Run through demo 3 times before presenting

**Questions You Might Get:**
- Q: "Why Polygon?"
  - A: Low fees, fast, EVM compatible, good for hackathon demo
  
- Q: "Why not just use a database?"
  - A: Transparency, immutability, trustless verification
  
- Q: "How do you prevent fraud?"
  - A: Multisig approvals, spending restrictions, on-chain verification
  
- Q: "What's the gas cost?"
  - A: ~$0.01-0.05 per transaction on Mumbai, scalable to mainnet
  
- Q: "How do beneficiaries cash out?"
  - A: Partner with local merchants, crypto-to-fiat services

---

## 🎉 YOU'VE GOT THIS!

**Remember:**
- ✅ You already have 60% built (frontend, Firebase)
- ✅ Smart contracts are just 40% more work
- ✅ 3 days is enough if you focus
- ✅ Polygon makes blockchain simple
- ✅ The concept is strong

**Stay Calm:**
- Take breaks every 2 hours
- Sleep well each night
- Don't panic if something breaks
- Ask for help if stuck
- Keep the end goal in mind

**You're building something meaningful:**
- Real-world problem
- Blockchain solution
- Social impact
- Technical excellence

**Good luck! Make it happen! 🚀**

---

**START NOW: Day 1, Task 1.1 - Install Hardhat!**
