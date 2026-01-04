# Merchant Approval Required - Quick Fix Guide

## 🚨 ISSUE
**Error:** "BeneficiaryWallet: Merchant not approved for this category"

**Reason:** Before a beneficiary can spend relief funds, the campaign organizer must approve each merchant for specific spending categories. This is a **security feature** to prevent fraud.

---

## 📋 CURRENT SITUATION

**Beneficiary:**
- Address: `0x8365B37Fb0bCc12935a3D913124A5831A234512A`
- Wallet Contract: `0x0C8E19e91952E2954eea3f479E1E85728DfEbb2F`
- Allocated Funds: `0.04 RELIEF`
- Status: ✅ Funds allocated successfully

**Merchant (trying to spend at):**
- Address: `0x3ae5f0da6031f1b974904c55b84a6ab205e9d1dd`
- Name: "food" (from your test)
- Category: Food (0)
- Status: ❌ NOT APPROVED

**Campaign:**
- Contract: `0x4371048766c46aBa1c26c40E3ab89155fcf18e88`
- Organizer: `0x19B1dc625F682AF8D005B4405B65dFc342f8c912` ⚠️

---

## ✅ SOLUTION OPTIONS

### Option 1: Use Hardhat Script (FASTEST)

1. **Switch to organizer wallet in your `.env` file:**
   ```bash
   cd blockchain
   ```

2. **Update `.env` with organizer's private key:**
   ```
   DEPLOYER_PRIVATE_KEY=<organizer_wallet_private_key>
   ```
   The organizer is: `0x19B1dc625F682AF8D005B4405B65dFc342f8c912`

3. **Run the approval script:**
   ```bash
   npx hardhat run scripts/approveMerchant.js --network amoy
   ```

   The script is already configured with:
   - Beneficiary Wallet: `0x0C8E19e91952E2954eea3f479E1E85728DfEbb2F`
   - Merchant: `0x3ae5f0da6031f1b974904c55b84a6ab205e9d1dd`
   - Category: Food (0)

4. **Wait ~1 minute** for blockchain confirmation

5. **Test spending** from beneficiary dashboard

---

### Option 2: Use Frontend (Better UX)

1. **Connect organizer wallet** (`0x19B1dc625F682AF8D005B4405B65dFc342f8c912`) in MetaMask

2. **Go to Organizer Dashboard**

3. **Click on approved beneficiaries** section

4. **Find the beneficiary** (0x8365B37...)

5. **Click "Approve Merchant"** button (will be added)

6. **Fill in the form:**
   - Merchant Name: "Local Food Store"
   - Merchant Address: `0x3ae5f0da6031f1b974904c55b84a6ab205e9d1dd`
   - Category: Food

7. **Confirm transaction** in MetaMask

8. **Wait for confirmation**

9. **Test spending** from beneficiary dashboard

---

## 🔧 WHAT WAS FIXED

### ✅ Frontend Changes

1. **Beneficiary Dashboard** (`frontend/src/pages/beneficiary/Dashboard.jsx`)
   - Added merchant approval check before spending
   - Shows clear error message if merchant not approved
   - Improved error handling with specific messages
   - Fixed spend function to pass all 4 required parameters:
     * merchantAddress
     * amount (in wei)
     * categoryIndex (0-5)
     * description (merchant name + category)

2. **ApproveMerchantModal Component** (NEW)
   - Created `frontend/src/components/ApproveMerchantModal.jsx`
   - Organizers can approve merchants through UI
   - Checks if merchant already approved
   - Real-time transaction feedback
   - PolygonScan links for transactions

3. **Scripts Created**
   - `blockchain/scripts/approveMerchant.js` - Approve merchant via CLI
   - `blockchain/scripts/checkWalletOrganizer.js` - Check wallet details

---

## 📝 SPENDING WORKFLOW (After Merchant Approval)

### For Beneficiaries:
1. ✅ **Get approved** by organizer → DONE
2. ✅ **Receive fund allocation** → DONE (0.04 RELIEF)
3. ⏳ **Wait for merchant approval** → NEED ORGANIZER
4. 💰 **Spend at approved merchant** → READY AFTER APPROVAL

### For Organizers:
1. ✅ **Approve beneficiaries** → DONE
2. ✅ **Allocate funds** → DONE
3. ⏳ **Approve merchants** → NEED TO DO THIS
4. 👀 **Monitor spending** → After merchant approval

---

## 🎯 NEXT STEPS

1. **Identify which wallet has organizer private key**
   - Organizer address: `0x19B1dc625F682AF8D005B4405B65dFc342f8c912`
   - This wallet created the campaign
   - Should be in your MetaMask or saved somewhere

2. **Choose approval method:**
   - **CLI:** Update `.env` → Run script → 2 minutes total
   - **UI:** Connect wallet → Use dashboard → 5 minutes total

3. **After approval:**
   - Try spending again from beneficiary dashboard
   - Should work immediately after blockchain confirmation

---

## 🔍 VERIFY MERCHANT APPROVAL

Check if merchant is approved:
```javascript
// In browser console or script
const isApproved = await publicClient.readContract({
  address: '0x0C8E19e91952E2954eea3f479E1E85728DfEbb2F', // Beneficiary Wallet
  abi: BeneficiaryWalletABI.abi,
  functionName: 'isMerchantApproved',
  args: ['0x3ae5f0da6031f1b974904c55b84a6ab205e9d1dd', 0], // merchant, category
});
console.log('Merchant approved:', isApproved);
```

---

## 📊 SPENDING CATEGORIES

```javascript
0 = Food
1 = Medicine
2 = Shelter
3 = Education
4 = Clothing
5 = Other
```

Merchants must be approved **separately for each category** they'll provide.

Example:
- "Local Food Store" → Approved for Food (0)
- "City Pharmacy" → Approved for Medicine (1)
- "Clothing Outlet" → Approved for Clothing (4)

---

## ⚠️ IMPORTANT NOTES

1. **Only the campaign organizer** can approve merchants (security feature)

2. **Merchants must be approved** before beneficiaries can spend

3. **Approval is per category** - same merchant needs separate approvals for Food vs Medicine

4. **This is intentional** - prevents beneficiaries from sending funds to random addresses

5. **Current status:**
   - ✅ Smart contracts working correctly
   - ✅ Allocation system working
   - ✅ Frontend error handling improved
   - ⏳ Just need organizer to approve merchant

---

## 🎉 AFTER MERCHANT APPROVAL

Once the merchant is approved, the beneficiary will be able to:
- ✅ Spend up to their allocated amount (0.04 RELIEF)
- ✅ See transaction history
- ✅ Track spending by category
- ✅ Get instant PolygonScan links
- ✅ Real-time balance updates

**Platform will be 100% functional! 🚀**
