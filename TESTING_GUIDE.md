# Testing Guide for Tasks 2.6 & 2.7

## Prerequisites
- ✅ Frontend running on http://localhost:5174
- ✅ MetaMask installed with Polygon Amoy network configured
- ✅ Test wallet with POL tokens for gas fees
- ✅ Contracts deployed to Polygon Amoy testnet

## Test Accounts Setup

### Super Admin
- Address: `0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34`
- Role: Can approve organizers and distribute RELIEF tokens
- Firebase: Should have `role: 'admin'`

### Test Organizer
- Use your MetaMask wallet
- Must be approved by admin first
- Firebase: Should have `role: 'organizer'` and `approved: true`

### Test Donor
- Can be any MetaMask wallet
- Needs RELIEF tokens (get from admin or token sale)
- Firebase: Should have `role: 'donor'`

## Contract Addresses (Polygon Amoy)
```
ReliefToken: 0x178C7cC74955a6051Af2411ee38e5061b05382D1
CampaignFactory: 0x7fd01153cA95C5B689D9d9df86c2a3898FF728C9
```

---

## TEST 1: Campaign Creation (Task 2.6)

### Setup
1. Open http://localhost:5174
2. Connect MetaMask
3. Login as organizer (must be approved)

### Test Steps
1. **Navigate to Organizer Dashboard**
   - Click "Create Campaign" button
   - Modal should open

2. **Fill Campaign Details**
   - Title: "Test Flood Relief Campaign"
   - Description: "Testing blockchain campaign creation"
   - Goal: 1000 (RELIEF tokens)
   - Location: "Test City"
   - Disaster Type: "Flood"
   - Click "Create Campaign on Blockchain"

3. **MetaMask Transaction Flow**
   - ✅ MetaMask popup appears
   - ✅ Transaction details show:
     * Contract: CampaignFactory (0x7fd0...)
     * Function: createCampaign
     * Gas estimate shown
   - ✅ Confirm transaction
   - ✅ Status shows "Waiting for confirmation..."

4. **Verify Success**
   - ✅ Success alert appears with campaign address
   - ✅ PolygonScan link shown
   - ✅ Campaign appears in dashboard
   - ✅ Modal closes

5. **Blockchain Verification**
   - Click PolygonScan link
   - ✅ Transaction confirmed
   - ✅ Contract deployment visible
   - ✅ Campaign address in logs

6. **Firebase Verification**
   - Open Firebase Console → Firestore
   - Check campaigns collection
   - ✅ New campaign document has:
     * `blockchainAddress`: "0x..."
     * `txHash`: "0x..."
     * `network`: "polygon-amoy"
     * `chainId`: 80002
     * `status`: "active"

### Expected Results
- ✅ Campaign deploys to blockchain in ~5-10 seconds
- ✅ Campaign address saved to Firebase
- ✅ No errors in browser console
- ✅ Transaction visible on PolygonScan

### Troubleshooting
- **"Not approved as organizer"**: Admin must approve your wallet first
- **Transaction fails**: Check you have POL tokens for gas
- **No MetaMask popup**: Check MetaMask is unlocked and on Polygon Amoy

---

## TEST 2: Get RELIEF Tokens

Before testing donations, you need RELIEF tokens.

### Option A: Buy from Token Sale (Recommended)
1. **Get the ReliefTokenSale address**
   - ReliefTokenSale: `0x1a0ae74c55b43473151688055A57C2A1EdB51d25`

2. **Buy tokens using MetaMask**
   - Open MetaMask
   - Send POL to ReliefTokenSale address with data field:
     ```
     Function: buyTokens()
     Amount: 1 POL (will receive 1 RELIEF)
     ```

3. **Or use console:**
   ```javascript
   // In browser console
   const tokenSale = await polygonService.getContract(
     '0x1a0ae74c55b43473151688055A57C2A1EdB51d25',
     ReliefTokenSaleABI
   );
   const tx = await tokenSale.write.buyTokens({ value: parseEther('1') });
   await waitForTransaction(tx);
   ```

### Option B: Admin Distribution (Requires Admin Access)
- Wait for Task 2.8 implementation
- Admin can distribute tokens directly

### Verify Token Balance
1. Open MetaMask
2. Click "Import Tokens"
3. Enter ReliefToken address: `0x178C7cC74955a6051Af2411ee38e5061b05382D1`
4. Symbol: RELIEF
5. Decimals: 18
6. Should see your balance

---

## TEST 3: Donation Flow (Task 2.7)

### Setup
1. Ensure you have RELIEF tokens (from Test 2)
2. Login as donor
3. Campaign created (from Test 1) should be visible

### Test Steps

#### 3.1: View Campaigns
1. **Navigate to Donor Dashboard**
   - ✅ Active campaigns displayed
   - ✅ Shows campaign title, location, progress
   - ✅ Shows "Raised / Goal" in RELIEF tokens
   - ✅ Progress bar visible

#### 3.2: Open Donate Modal
1. **Click "Donate RELIEF Tokens" button**
   - ✅ Modal opens
   - ✅ Shows campaign details
   - ✅ Shows progress bar
   - ✅ Shows your RELIEF balance
   - ✅ Amount input field visible

#### 3.3: First-Time Donation (Requires Approval)
1. **Enter donation amount: 100**
   - ✅ Input accepts number
   
2. **Click "Donate RELIEF Tokens"**
   - ✅ Status: "Checking token allowance..."
   - ✅ First MetaMask popup appears (APPROVAL)
     * Contract: ReliefToken
     * Function: approve
     * Spender: Campaign address
     * Amount: 100 RELIEF
   - ✅ Confirm approval
   - ✅ Status: "Waiting for approval confirmation..."
   - ✅ Approval confirmed (~5-10 seconds)

3. **Automatic Donation Transaction**
   - ✅ Status: "Please confirm donation in MetaMask..."
   - ✅ Second MetaMask popup appears (DONATION)
     * Contract: Campaign
     * Function: donate
     * Amount: 100 RELIEF
   - ✅ Confirm donation
   - ✅ Status: "Waiting for donation confirmation..."
   - ✅ Donation confirmed (~5-10 seconds)
   - ✅ Status: "Updating database..."

4. **Verify Success**
   - ✅ Success alert shows:
     * "Successfully donated 100 RELIEF tokens!"
     * Transaction hash
     * PolygonScan link
   - ✅ Modal closes
   - ✅ Campaign raised amount updated in UI
   - ✅ Progress bar updated

#### 3.4: Second Donation (No Approval Needed)
1. **Click "Donate RELIEF Tokens" again**
2. **Enter amount: 50**
3. **Click donate**
   - ✅ Status skips approval (already approved)
   - ✅ Only one MetaMask popup (donation)
   - ✅ Faster process
   - ✅ Success!

#### 3.5: Verify Donation History
1. **Scroll to "My Donation History" section**
   - ✅ Shows both donations
   - ✅ Displays campaign title
   - ✅ Shows donation amounts
   - ✅ Shows dates
   - ✅ Shows "View on PolygonScan" links
   - ✅ Total donated stat updated

### Blockchain Verification

#### Check Transaction on PolygonScan
1. Click PolygonScan link from success alert
2. ✅ Transaction confirmed
3. ✅ Status: Success
4. ✅ Shows token transfer
5. ✅ Shows Campaign.donate() call

#### Check Campaign Balance
```javascript
// In browser console on Polygon Amoy
const campaign = await polygonService.getCampaignContract('CAMPAIGN_ADDRESS');
const raised = await campaign.read.totalRaised();
console.log('Campaign raised:', formatEther(raised), 'RELIEF');
```
- ✅ Matches total donations

#### Check Your Token Balance
```javascript
const reliefToken = await polygonService.getReliefTokenContract();
const balance = await reliefToken.read.balanceOf(['YOUR_ADDRESS']);
console.log('Your balance:', formatEther(balance), 'RELIEF');
```
- ✅ Decreased by donation amount

### Firebase Verification

#### Check Campaign Document
1. Open Firebase Console → Firestore → campaigns
2. Find campaign by ID
3. ✅ `raised` field updated (e.g., 150)
4. ✅ Matches blockchain state

#### Check Donations Collection
1. Open Firebase Console → Firestore → donations
2. Find donations by your donorId
3. ✅ Two donation documents created
4. ✅ Each has:
   - `campaignId`
   - `campaignTitle`
   - `donorId`: your wallet address (lowercase)
   - `amount`: donation amount
   - `txHash`: transaction hash
   - `blockNumber`
   - `network`: "polygon-amoy"
   - `chainId`: 80002
   - `createdAt`: timestamp

### Expected Results
- ✅ First donation: 2 transactions (approve + donate)
- ✅ Subsequent donations: 1 transaction (donate only)
- ✅ Total time: ~10-20 seconds per donation
- ✅ UI updates immediately after confirmation
- ✅ No errors in browser console
- ✅ All data synced between blockchain and Firebase

### Edge Cases to Test

#### Test: Insufficient Balance
1. Try to donate more RELIEF than you have
2. ✅ Error alert: "Insufficient RELIEF token balance"

#### Test: Invalid Amount
1. Try to donate 0 or negative amount
2. ✅ Alert: "Please enter a valid amount"

#### Test: Transaction Rejection
1. Open donate modal
2. Click donate
3. Reject transaction in MetaMask
4. ✅ Error alert shown
5. ✅ Modal stays open
6. ✅ Can try again

#### Test: No Blockchain Address
1. Create campaign without blockchain deployment (manually in Firebase)
2. Try to donate
3. ✅ Error: "Campaign not deployed to blockchain"

---

## TEST 4: End-to-End Integration

### Complete Flow Test
1. **Admin Setup** (when Task 2.8 complete)
   - Admin distributes RELIEF tokens
   
2. **Organizer Creates Campaign**
   - ✅ Deploy campaign to blockchain
   - ✅ Save to Firebase
   - ✅ Verify on PolygonScan

3. **Donor Donates**
   - ✅ Check RELIEF balance
   - ✅ Approve tokens (first time)
   - ✅ Donate tokens
   - ✅ Verify transaction
   - ✅ See updated campaign progress

4. **Verify Consistency**
   - ✅ Blockchain state matches Firebase
   - ✅ UI shows correct data
   - ✅ All transactions on PolygonScan

---

## Common Issues & Solutions

### Issue: "Please connect your wallet"
- **Solution**: Click "Connect Wallet" in top-right, connect MetaMask

### Issue: "Wrong network"
- **Solution**: Switch MetaMask to Polygon Amoy testnet
  - Network Name: Polygon Amoy Testnet
  - RPC URL: https://rpc-amoy.polygon.technology
  - Chain ID: 80002
  - Currency Symbol: POL

### Issue: "Insufficient funds for gas"
- **Solution**: Get POL test tokens from faucet
  - https://faucet.polygon.technology/

### Issue: MetaMask popup doesn't appear
- **Solution**: 
  - Check MetaMask is unlocked
  - Click MetaMask icon to open
  - Look for pending transaction

### Issue: Transaction stuck pending
- **Solution**:
  - Wait 30-60 seconds
  - Check PolygonScan for status
  - If failed, check error message
  - May need to increase gas price

### Issue: Campaign not showing in donor dashboard
- **Solution**:
  - Check campaign status is "active" in Firebase
  - Refresh page
  - Check browser console for errors

---

## Performance Benchmarks

### Task 2.6: Campaign Creation
- MetaMask confirmation: ~2-3 seconds
- Blockchain confirmation: ~5-10 seconds
- Firebase save: ~1 second
- **Total: ~8-14 seconds**

### Task 2.7: First Donation
- Approval transaction: ~5-10 seconds
- Donation transaction: ~5-10 seconds
- Firebase update: ~1 second
- **Total: ~11-21 seconds**

### Task 2.7: Subsequent Donations
- Donation transaction: ~5-10 seconds
- Firebase update: ~1 second
- **Total: ~6-11 seconds**

---

## Success Criteria

### Task 2.6 ✅
- ✅ Organizer can create campaigns
- ✅ Campaigns deploy to Polygon Amoy blockchain
- ✅ Campaign address extracted from transaction
- ✅ Data saved to Firebase with blockchain metadata
- ✅ PolygonScan links work
- ✅ No errors in production

### Task 2.7 ✅
- ✅ Donor can view active campaigns
- ✅ Donor can donate RELIEF tokens
- ✅ Token approval flow works
- ✅ Donation transactions complete successfully
- ✅ Firebase updated with raised amounts
- ✅ Donation history shows all donations
- ✅ PolygonScan verification available
- ✅ UI updates in real-time

---

## Next Steps

After successful testing:

1. **Task 2.8**: Admin token distribution
   - Admin dashboard to transfer RELIEF tokens
   
2. **Task 2.9**: Organizer fund allocation
   - Allocate funds to beneficiaries
   - Create BeneficiaryWallet contracts

3. **Day 3**: Final testing and demo preparation
   - End-to-end testing
   - Demo video recording
   - Deployment to production
   - Submission before Jan 6th deadline

---

## Test Results Log

### Test Session: [DATE/TIME]
- Tester: [NAME]
- Wallet: [ADDRESS]

#### Task 2.6 Results
- [ ] Campaign creation: PASS / FAIL
- [ ] Blockchain deployment: PASS / FAIL
- [ ] Firebase save: PASS / FAIL
- [ ] PolygonScan verification: PASS / FAIL
- Notes: 

#### Task 2.7 Results
- [ ] View campaigns: PASS / FAIL
- [ ] Token approval: PASS / FAIL
- [ ] First donation: PASS / FAIL
- [ ] Second donation: PASS / FAIL
- [ ] Donation history: PASS / FAIL
- [ ] PolygonScan verification: PASS / FAIL
- Notes:

#### Integration Results
- [ ] End-to-end flow: PASS / FAIL
- [ ] Blockchain consistency: PASS / FAIL
- [ ] Firebase consistency: PASS / FAIL
- Notes:

---

## Debugging Tools

### Browser Console Commands

```javascript
// Get current network
const chainId = await polygonService.getCurrentChainId();
console.log('Chain ID:', chainId); // Should be 80002

// Check RELIEF balance
const reliefToken = await polygonService.getReliefTokenContract();
const balance = await reliefToken.read.balanceOf(['YOUR_ADDRESS']);
console.log('RELIEF Balance:', formatEther(balance));

// Check campaign state
const campaign = await polygonService.getCampaignContract('CAMPAIGN_ADDRESS');
const raised = await campaign.read.totalRaised();
const goal = await campaign.read.goal();
console.log('Raised:', formatEther(raised), '/ Goal:', formatEther(goal));

// Check token allowance
const allowance = await reliefToken.read.allowance(['YOUR_ADDRESS', 'CAMPAIGN_ADDRESS']);
console.log('Allowance:', formatEther(allowance));
```

### Check Firebase Data
```javascript
// In browser console
import { db } from './firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const campaignsSnap = await getDocs(collection(db, 'campaigns'));
campaignsSnap.forEach(doc => console.log(doc.id, doc.data()));

const donationsSnap = await getDocs(collection(db, 'donations'));
donationsSnap.forEach(doc => console.log(doc.id, doc.data()));
```

---

**Good luck with testing! 🚀**
