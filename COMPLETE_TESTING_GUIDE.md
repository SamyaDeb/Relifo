# Complete Testing Guide - Relifo Platform
**Date:** January 4, 2026  
**Status:** All blockchain transactions fixed and ready for testing

## ✅ All Errors Fixed

### Fixed Issues
1. ✅ **Variable Redeclaration Error** - Admin Dashboard `publicClient` declared twice
2. ✅ **Missing chainId Parameter** - All 15 `getPublicClient()` calls across 7 files
3. ✅ **Build Successful** - No compilation errors
4. ✅ **All Imports Correct** - No missing dependencies

### Build Status
```
✓ built in 4.59s
✓ 1714 modules transformed
✓ No compilation errors
```

---

## 🧪 Complete Testing Flow

### Prerequisites
- ✅ MetaMask installed
- ✅ Connected to Polygon Amoy Testnet (Chain ID: 80002)
- ✅ Test wallets with POL for gas fees
- ✅ Frontend running: `cd frontend && npm run dev`

### Contract Addresses (Polygon Amoy)
```json
{
  "ReliefToken": "0x178C7cC74955a6051Af2411ee38e5061b05382D1",
  "ReliefTokenSale": "0x1a0ae74c55b43473151688055A57C2A1EdB51d25",
  "CampaignFactory": "0x7fd01153cA95C5B689D9d9df86c2a3898FF728C9"
}
```

### Admin Wallet
```
Deployer/Admin: 0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34
```

---

## 1️⃣ ADMIN WORKFLOW

### Test: Approve Organizer
**Wallet:** Admin wallet (`0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34`)

**Steps:**
1. ✅ Connect with admin wallet
2. ✅ Navigate to Admin Dashboard
3. ✅ Go to "Pending Approvals" tab
4. ✅ Find pending organizer
5. ✅ Click "Approve" button
6. ✅ **CHECK:** MetaMask opens with transaction
7. ✅ **CHECK:** Gas estimate shows (should be ~50,000-100,000 gas)
8. ✅ Confirm transaction in MetaMask
9. ✅ **CHECK:** Success message appears
10. ✅ **CHECK:** Transaction hash shown
11. ✅ **VERIFY:** Check on PolygonScan
12. ✅ **VERIFY:** Organizer status changes to "Approved"

**Expected Results:**
- Transaction succeeds
- Gas used: ~50,000-100,000
- Status updates in Firebase
- Organizer can now create campaigns

**Common Issues:**
- ❌ **"Wrong Network"** → Switch MetaMask to Polygon Amoy
- ❌ **"Insufficient funds"** → Add POL to admin wallet
- ❌ **"Transaction would fail"** → Check you're using admin wallet

---

### Test: Verify Merchant
**Wallet:** Admin wallet

**Steps:**
1. ✅ Navigate to Admin Dashboard → "Merchants" tab
2. ✅ Find pending merchant registration
3. ✅ Click "View Documents"
4. ✅ Review uploaded documents
5. ✅ Click "Verify on Blockchain"
6. ✅ **CHECK:** MetaMask opens
7. ✅ Confirm transaction
8. ✅ **CHECK:** Success message
9. ✅ **VERIFY:** Merchant status = "Verified"
10. ✅ **VERIFY:** Check `isVerifiedMerchant(address)` on contract

**Expected Results:**
- Merchant verified on blockchain
- Can now be approved by organizers
- Firebase status updated

---

## 2️⃣ ORGANIZER WORKFLOW

### Test: Create Campaign
**Wallet:** Approved organizer wallet

**Steps:**
1. ✅ Connect wallet
2. ✅ Navigate to Organizer Dashboard
3. ✅ Click "Create Campaign"
4. ✅ Fill in details:
   - Title: "Test Relief Campaign"
   - Description: "Testing campaign creation"
   - Goal: 100 RELIEF
   - Location: "Test City"
   - Disaster Type: "Flood"
5. ✅ Click "Create Campaign"
6. ✅ **CHECK:** Gas estimation runs
7. ✅ **CHECK:** MetaMask opens
8. ✅ Confirm transaction
9. ✅ **CHECK:** Wait for confirmation (30-60 seconds)
10. ✅ **CHECK:** Success message with campaign address
11. ✅ **VERIFY:** Campaign appears in list
12. ✅ **VERIFY:** Campaign has blockchain address

**Expected Results:**
- Campaign created on blockchain
- Campaign address stored in Firebase
- Campaign appears in donor dashboard
- Beneficiaries can be added

**Common Issues:**
- ❌ **"Not approved organizer"** → Admin must approve first
- ❌ **"Gas estimation failed"** → Check wallet connected and network correct

---

### Test: Add Beneficiary
**Steps:**
1. ✅ View created campaign
2. ✅ Click "Add Beneficiary"
3. ✅ Enter beneficiary wallet address
4. ✅ Submit
5. ✅ **VERIFY:** Beneficiary added to campaign
6. ✅ **VERIFY:** Beneficiary can see campaign in their dashboard

---

### Test: Allocate Funds to Beneficiary
**Prerequisites:** Campaign must have donations

**Steps:**
1. ✅ Navigate to campaign details
2. ✅ Click "Allocate Funds"
3. ✅ Select beneficiary from dropdown
4. ✅ Enter amount (e.g., 10 RELIEF)
5. ✅ **CHECK:** Available balance shows correctly
6. ✅ Click "Allocate"
7. ✅ **CHECK:** Network validation runs
8. ✅ **CHECK:** Contract existence verified
9. ✅ **CHECK:** Organizer permission validated
10. ✅ **CHECK:** MetaMask opens
11. ✅ Confirm transaction
12. ✅ **CHECK:** Transaction verified on blockchain immediately
13. ✅ **CHECK:** Success message
14. ✅ **VERIFY:** Beneficiary balance updated
15. ✅ **VERIFY:** Campaign allocated amount updated

**Expected Results:**
- Funds allocated on blockchain
- BeneficiaryWallet created if first allocation
- Beneficiary sees allocated amount
- Can spend at approved merchants

**Common Issues:**
- ❌ **"Insufficient balance"** → Campaign needs donations first
- ❌ **"Not organizer"** → Must use campaign creator wallet
- ❌ **"Transaction not found"** → Fixed! Should work now

---

### Test: Approve Merchant for Beneficiary
**Steps:**
1. ✅ Navigate to beneficiary details
2. ✅ Click "Approve Merchant"
3. ✅ Enter merchant address (must be verified by admin first)
4. ✅ Enter merchant name
5. ✅ Select category (Food, Medicine, etc.)
6. ✅ **CHECK:** MetaMask opens
7. ✅ Confirm transaction
8. ✅ **CHECK:** Merchant approved
9. ✅ **VERIFY:** Beneficiary can spend at this merchant

---

## 3️⃣ DONOR WORKFLOW

### Test: Buy RELIEF Tokens
**Wallet:** Any donor wallet with POL

**Steps:**
1. ✅ Connect wallet
2. ✅ Navigate to Donor Dashboard
3. ✅ Click "Buy Tokens"
4. ✅ Enter amount (e.g., 100 POL)
5. ✅ **CHECK:** Token amount calculated (rate: 1000 RELIEF per POL)
6. ✅ Click "Buy Tokens"
7. ✅ **CHECK:** MetaMask opens with correct POL amount
8. ✅ Confirm transaction
9. ✅ **CHECK:** Success message
10. ✅ **VERIFY:** RELIEF balance updated
11. ✅ **VERIFY:** Transaction on PolygonScan

**Expected Results:**
- Tokens received: 100 POL × 1000 = 100,000 RELIEF
- Balance shows in dashboard
- Can donate to campaigns

---

### Test: Donate to Campaign
**Prerequisites:** Must have RELIEF tokens

**Steps:**
1. ✅ View available campaigns
2. ✅ Click "Donate" on a campaign
3. ✅ Enter donation amount (e.g., 50 RELIEF)
4. ✅ **CHECK:** Balance validation
5. ✅ Click "Donate"
6. ✅ **CHECK:** Allowance checked
7. ✅ **If needed:** Approve tokens first (MetaMask)
8. ✅ **CHECK:** Approve transaction confirmed
9. ✅ **CHECK:** Second MetaMask for donation
10. ✅ Confirm donation transaction
11. ✅ **CHECK:** Success message
12. ✅ **VERIFY:** Campaign raised amount updated
13. ✅ **VERIFY:** Donation appears in history
14. ✅ **VERIFY:** Both transactions on PolygonScan

**Expected Results:**
- Two transactions (approve + donate)
- Campaign balance increases
- Donation recorded in Firebase
- Can view on PolygonScan

---

## 4️⃣ BENEFICIARY WORKFLOW

### Test: View Allocated Balance
**Wallet:** Beneficiary wallet (must be added to campaign)

**Steps:**
1. ✅ Connect wallet
2. ✅ Navigate to Beneficiary Dashboard
3. ✅ **CHECK:** Campaign info loads
4. ✅ **CHECK:** Allocated amount shows
5. ✅ **CHECK:** Current balance shows
6. ✅ **CHECK:** Wallet address shows
7. ✅ **VERIFY:** Amount matches blockchain

**Expected Results:**
- Real-time blockchain data
- Correct balance
- Wallet contract address shown

---

### Test: Spend Funds at Merchant
**Prerequisites:** 
- Funds allocated
- Merchant approved by organizer

**Steps:**
1. ✅ Click "Spend Funds"
2. ✅ Enter merchant address
3. ✅ Enter amount (must be ≤ allocated)
4. ✅ Enter description
5. ✅ Select category (must match approved category)
6. ✅ Click "Spend"
7. ✅ **CHECK:** Merchant approval verified
8. ✅ **CHECK:** Balance checked
9. ✅ **CHECK:** Gas estimation
10. ✅ **CHECK:** MetaMask opens
11. ✅ Confirm transaction
12. ✅ **CHECK:** Success message
13. ✅ **VERIFY:** Balance decreased
14. ✅ **VERIFY:** Spending record created
15. ✅ **VERIFY:** Transaction on PolygonScan

**Expected Results:**
- Spending recorded on blockchain
- Balance updated
- Merchant receives notification
- Full transaction history

**Common Issues:**
- ❌ **"Merchant not approved"** → Organizer must approve first
- ❌ **"Insufficient balance"** → Check allocated amount
- ❌ **"Wrong category"** → Must match approved category

---

## 5️⃣ MERCHANT WORKFLOW

### Test: Register as Merchant
**Wallet:** New merchant wallet

**Steps:**
1. ✅ Connect wallet
2. ✅ Navigate to Merchant Registration
3. ✅ Fill business details:
   - Business Name
   - Business Type
   - Registration Number
   - Categories (select multiple)
4. ✅ Upload documents:
   - Business License
   - Tax Certificate
   - Identity Document
5. ✅ Submit registration
6. ✅ **CHECK:** Documents uploaded to Firebase Storage
7. ✅ **CHECK:** Status = "Pending Verification"
8. ✅ **VERIFY:** Admin can see pending merchant
9. ✅ Wait for admin verification
10. ✅ **VERIFY:** Status changes to "Verified" after admin approval

**Expected Results:**
- Registration saved in Firebase
- Documents accessible by admin
- Verified on blockchain by admin
- Can receive payments from beneficiaries

---

## 🔍 VERIFICATION CHECKLIST

### Blockchain Verification (PolygonScan)
For each transaction, verify on [Polygon Amoy Explorer](https://amoy.polygonscan.com):

1. ✅ Transaction hash exists
2. ✅ Status: Success (green checkmark)
3. ✅ From address matches your wallet
4. ✅ To address matches contract
5. ✅ Gas used reasonable (<200,000 for most operations)
6. ✅ Event logs present (FundsAllocated, Transfer, etc.)

### Firebase Verification
Check Firebase Console:

1. ✅ User status updated
2. ✅ Campaign created with blockchain address
3. ✅ Donations recorded
4. ✅ Spending records created
5. ✅ Merchant verification status updated

---

## 🐛 Common Issues & Solutions

### Issue: "Transaction Hash not found on PolygonScan"
**Status:** ✅ FIXED
**Solution:** Added chainId parameter to all getPublicClient calls

### Issue: "Cannot redeclare publicClient"
**Status:** ✅ FIXED
**Solution:** Removed duplicate declaration in Admin Dashboard

### Issue: "Please connect your wallet"
**Solution:** 
1. Check MetaMask installed
2. Click "Connect Wallet"
3. Approve connection in MetaMask

### Issue: "Wrong Network"
**Solution:**
1. Open MetaMask
2. Switch to Polygon Amoy Testnet
3. Chain ID: 80002
4. RPC: https://rpc-amoy.polygon.technology

### Issue: "Insufficient funds for gas"
**Solution:**
1. Get POL tokens from [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Amoy Testnet"
3. Enter wallet address
4. Request POL

### Issue: "Transaction taking too long"
**Solution:**
- Amoy testnet can be slow (1-5 minutes normal)
- Check transaction on PolygonScan
- Wait for confirmation
- Don't refresh page

---

## 📊 Expected Gas Costs (Polygon Amoy)

| Operation | Gas Used | POL Cost (approx) |
|-----------|----------|-------------------|
| Approve Organizer | ~70,000 | 0.001 POL |
| Create Campaign | ~1,200,000 | 0.015 POL |
| Verify Merchant | ~65,000 | 0.001 POL |
| Allocate Funds | ~200,000 | 0.003 POL |
| Approve Merchant | ~90,000 | 0.001 POL |
| Buy Tokens | ~60,000 | 0.001 POL |
| Approve Tokens | ~50,000 | 0.0007 POL |
| Donate | ~85,000 | 0.001 POL |
| Spend Funds | ~120,000 | 0.002 POL |

---

## ✅ Testing Completion Checklist

### Admin Functions
- [ ] Approve Organizer (blockchain)
- [ ] Verify Merchant (blockchain)
- [ ] View all users
- [ ] View all campaigns
- [ ] Pause/Resume campaigns

### Organizer Functions
- [ ] Create Campaign (blockchain)
- [ ] Add Beneficiary
- [ ] Allocate Funds (blockchain)
- [ ] Approve Merchant for Beneficiary (blockchain)
- [ ] View campaign analytics

### Donor Functions
- [ ] Buy RELIEF Tokens (blockchain)
- [ ] Donate to Campaign (blockchain)
- [ ] View donation history
- [ ] View campaign details

### Beneficiary Functions
- [ ] View allocated balance (blockchain read)
- [ ] Spend at approved merchant (blockchain)
- [ ] View spending history
- [ ] Check merchant approvals

### Merchant Functions
- [ ] Register with documents
- [ ] Wait for admin verification
- [ ] Receive payments from beneficiaries

---

## 🎯 Success Criteria

### Platform Ready When:
1. ✅ All blockchain transactions complete successfully
2. ✅ Transaction hashes visible on PolygonScan
3. ✅ Firebase data synced with blockchain
4. ✅ All user roles functioning
5. ✅ Real-time updates working
6. ✅ Error messages clear and helpful
7. ✅ No console errors
8. ✅ Build completes successfully

---

## 📞 Support & Debugging

### Enable Debug Logging
Open browser console (F12) to see detailed logs:
- 🔍 Network validation
- 📤 Transaction submission
- ✅ Blockchain confirmations
- 📊 Balance updates
- 🔗 Contract interactions

### Key Console Messages
- ✅ `Transaction sent! Hash: 0x...`
- ✅ `Transaction confirmed`
- ✅ `Chain ID validated: 80002`
- ✅ `Contract exists at address`
- ❌ `Wrong Network` - Switch to Polygon Amoy
- ❌ `Gas estimation failed` - Check permissions

### Test Wallet Setup
For comprehensive testing, create 5 test wallets:
1. **Admin Wallet** - Approve organizers, verify merchants
2. **Organizer Wallet** - Create campaigns, allocate funds
3. **Donor Wallet 1** - Buy tokens, donate
4. **Beneficiary Wallet** - Receive and spend funds
5. **Merchant Wallet** - Register, receive payments

---

## 🚀 Final Steps Before Production

1. [ ] Complete all test scenarios
2. [ ] Verify all transactions on PolygonScan
3. [ ] Check Firebase data integrity
4. [ ] Review console for any warnings
5. [ ] Test on different browsers
6. [ ] Test mobile responsiveness
7. [ ] Update WalletConnect Project ID in `wagmiConfig.js`
8. [ ] Deploy to production environment
9. [ ] Update contract addresses for mainnet
10. [ ] Conduct final security audit

---

**Testing Started:** January 4, 2026  
**All Errors Fixed:** ✅  
**Build Status:** ✅ Successful  
**Ready for Testing:** ✅ YES  

Good luck with testing! 🎉
