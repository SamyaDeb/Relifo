# 🔧 QUICK FIX FOR YOUR CAMPAIGN

## Problem
Your campaign in Firebase has `campaignId` but is missing the `blockchainAddress` field.

## Solution (Choose ONE):

### Option 1: Manual Fix in Firebase Console (FASTEST - 2 minutes)

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com
   - Select project: `relifo-35b0a`

2. **Navigate to your campaign**
   - Click "Firestore Database" in left menu
   - Click "campaigns" collection
   - Find your campaign document (look for the title)

3. **Add the missing field**
   - Click on your campaign document
   - Look for existing field called `blockchainAddress` or `txHash`
   - If `blockchainAddress` is missing:
     - Click "Add field" button
     - Field name: `blockchainAddress`
     - Field type: `string`
     - Field value: Copy from the organizer dashboard or from the txHash on PolygonScan
   - Click "Update"

4. **Verify**
   - Refresh your beneficiary dashboard
   - Check browser console (F12) for: "✅ Campaign loaded"
   - Look for: "📍 Campaign blockchain address: 0x..."

---

### Option 2: Create New Campaign (CLEANEST - 5 minutes)

1. **Login as Organizer**
2. **Create a new campaign** 
   - The code is now fixed to automatically save `blockchainAddress`
3. **Register beneficiary again** to the new campaign
4. **Allocate funds** to the beneficiary

---

### Option 3: Get Campaign Address from Transaction

If you don't know the blockchain address:

1. **Find your campaign creation transaction**
   - Go to organizer dashboard
   - Look for campaign creation confirmation
   - Or check MetaMask transaction history

2. **View on PolygonScan**
   - Click the PolygonScan link
   - Look for "Contract Creation" or "To:" field
   - Copy that address (starts with 0x...)

3. **Add to Firebase** (use Option 1 steps above)

---

## After Fix: What Should Happen

### In Browser Console (F12):
```
🔍 Beneficiary Dashboard - Loading data for address: 0x...
✅ Campaign loaded: Your Campaign Name
📍 Campaign blockchain address: 0x4371048766c46aba1c26c40e3ab89155fcf18e88
🔗 Loading from blockchain with address: 0x4371...
💼 Beneficiary Wallet from blockchain: 0x4C28...
💰 Wallet balance from blockchain: 0.02 RELIEF
✅ Using blockchain data
```

### On Dashboard:
- Debug panel shows: Campaign Address: 0x4371...
- Total Allocated: 0.02 RELIEF (green)
- Current Balance: 0.02 RELIEF (blue)
- Spend button is enabled

---

## Still Not Working?

Run this command to check blockchain state:
```bash
cd blockchain
npx hardhat run scripts/checkBeneficiaryWallet.js --network amoy YOUR_BENEFICIARY_ADDRESS
```

This will show:
- If wallet exists on blockchain
- Actual balance
- Campaign address

Then check if that campaign address matches what's in Firebase!
