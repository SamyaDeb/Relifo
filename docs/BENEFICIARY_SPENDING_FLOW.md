# Beneficiary Spending with Merchants - Complete Flow

## Overview
This document outlines how beneficiaries can spend their allocated RELIEF tokens with registered merchants in the EIBS 2.0 system.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              BENEFICIARY SPENDING FLOW DIAGRAM               │
└─────────────────────────────────────────────────────────────┘

BENEFICIARY DASHBOARD
  ↓
1. Load Wallet & Balance
   ├─ Fetch from Firebase (beneficiary wallet address)
   ├─ Query blockchain for RELIEF balance
   └─ Display available RELIEF tokens
  ↓
2. Load Active Merchants
   ├─ Query Firebase for merchants (isActive: true)
   └─ Show merchant list with category & description
  ↓
3. Select Merchant & Amount
   ├─ Choose merchant from dropdown
   ├─ Enter spending amount
   ├─ Validate: amount ≤ balance
   └─ Show merchant details
  ↓
4. Execute Spending Transaction
   ├─ Estimate gas
   ├─ Send transfer tx to merchant wallet
   ├─ Confirm in MetaMask
   ├─ Wait for 2 block confirmations (~30-40 sec)
   └─ Get transaction receipt
  ↓
5. Record Transaction
   ├─ Save to Firebase
   ├─ Update beneficiary stats
   └─ Update merchant receiving records
  ↓
6. Show Confirmation
   ├─ Display success message
   ├─ Show transaction hash (clickable PolygonScan link)
   ├─ Update balance in real-time
   └─ Add to spending history table
```

## Implementation Flow

### 1. Frontend Components

**Location:** `frontend/src/pages/beneficiary/Dashboard.jsx`

**Key Features:**
- ✅ Real-time balance updates from blockchain
- ✅ Merchant list from Firebase
- ✅ Spending form with validation
- ✅ Transaction confirmation flow
- ✅ Spending history table
- ✅ PolygonScan links

**Key Functions:**
```javascript
fetchBeneficiaryData()    // Get wallet address
fetchBalance()            // Get RELIEF balance
fetchMerchants()          // Load active merchants
handleSpendWithMerchant() // Execute spending
```

### 2. Blockchain Interaction

**Contract:** ReliefToken (ERC-20)
**Function:** `transfer(to: address, amount: uint256)`
**Chain:** Polygon Amoy (80002)
**RPC:** Alchemy API

**Process:**
```javascript
// 1. Estimate gas
estimateContractGas({
  address: TOKEN_ADDRESS,
  abi: ReliefTokenABI,
  functionName: 'transfer',
  args: [merchantAddress, amountInWei]
})

// 2. Send transaction
walletClient.writeContract({
  address: TOKEN_ADDRESS,
  abi: ReliefTokenABI,
  functionName: 'transfer',
  args: [merchantAddress, amountInWei]
})

// 3. Wait for confirmation
publicClient.waitForTransactionReceipt({
  hash: txHash,
  confirmations: 2,
  timeout: 60000
})
```

### 3. Backend API

**Endpoints:**

#### Record Transaction
```
POST /api/transactions/record

Body:
{
  "beneficiaryAddress": "0x...",
  "merchantAddress": "0x...",
  "merchantName": "Shop A",
  "amount": "50",
  "transactionHash": "0x...",
  "blockNumber": 12345,
  "timestamp": "2025-01-06T10:00:00Z"
}

Response:
{
  "success": true,
  "message": "Transaction recorded",
  "transactionId": "..."
}
```

#### Get Beneficiary Spending History
```
GET /api/transactions/beneficiary/:walletAddress

Response:
{
  "success": true,
  "transactions": [
    {
      "id": "...",
      "merchantName": "Shop A",
      "amount": 50,
      "timestamp": "2025-01-06T10:00:00Z",
      "transactionHash": "0x...",
      "status": "confirmed"
    }
  ],
  "totalSpent": 150,
  "totalCount": 3
}
```

#### Get Merchant Receiving History
```
GET /api/transactions/merchant/:merchantAddress

Response:
{
  "success": true,
  "transactions": [...],
  "totalReceived": 2500,
  "totalCount": 50
}
```

### 4. Database Schema

**Firebase Collection: transactions**

```javascript
{
  id: "auto-generated",
  beneficiaryAddress: "0x..." (lowercase),
  merchantAddress: "0x..." (lowercase),
  merchantName: "Shop A",
  amount: 50,
  transactionHash: "0x...",
  blockNumber: "12345",
  status: "confirmed",
  type: "spending",
  timestamp: "2025-01-06T10:00:00Z",
  createdAt: serverTimestamp()
}
```

## Testing Guide

### Prerequisites
```
✅ Beneficiary wallet created and funded
✅ Merchant registered in Firebase
✅ Beneficiary has sufficient RELIEF tokens
✅ MetaMask connected to Polygon Amoy
✅ Backend running with transaction API
✅ Firebase configured
```

### Test Scenario 1: Basic Spending

**Steps:**
1. Open `http://localhost:5174/beneficiary`
2. Check wallet connected
3. View balance (should show RELIEF tokens)
4. Click dropdown to see merchants
5. Select a merchant
6. Enter amount (e.g., "10")
7. Click "💳 Spend with Merchant"
8. Confirm in MetaMask
9. Wait for 2 block confirmations (~30-40 sec)
10. Verify balance decreased
11. Check spending history

**Expected Output:**
```
=== Spending Transaction ===
Beneficiary address: 0x...
Merchant: Shop A
Merchant address: 0x...
Amount: 10 RELIEF
📊 Estimating gas...
✅ Gas estimate: 50000
💰 Sending spending transaction...
✅ Spending tx sent: 0x...
✅ Spending confirmed at block: 12345
📝 Transaction recorded in database
```

### Test Scenario 2: Multiple Merchants

**Steps:**
1. Repeat spending with different merchants
2. Verify each transaction is recorded
3. Check totals are correct
4. View spending history showing all transactions

### Test Scenario 3: Balance Validation

**Steps:**
1. Try to spend more than balance
2. Button should be disabled
3. Error message should show
4. Cannot proceed with transaction

### Test Scenario 4: Merchant Receiving

**Steps:**
1. Spend with merchant (e.g., 50 RELIEF)
2. Query `/api/transactions/merchant/:address`
3. Verify transaction appears in merchant's receiving history
4. Check `totalReceived` increased

## Console Logs to Monitor

```javascript
// Beneficiary Data Load
📋 Beneficiary data: { walletAddress: "0x..." }
💰 Balance fetched: 500.0 RELIEF

// Merchants Load
🏪 Merchants loaded: 5

// Transaction Recording
=== Spending Transaction ===
Beneficiary address: 0x...
Merchant: Shop A
Amount: 10 RELIEF
📊 Estimating gas...
✅ Gas estimate: 50000
💰 Sending spending transaction...
✅ Spending tx sent: 0x...
✅ Spending confirmed at block: 12345
📝 Transaction recorded in database

// History Load
📜 Transaction history loaded: 3
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Wallet not connected" | MetaMask not connected | Connect MetaMask |
| "Insufficient balance" | Tokens < amount | Reduce amount or request more |
| "Merchant not found" | Refresh needed | Reload page |
| "Transaction failed" | Gas/network issue | Retry in 1-2 minutes |
| "Timeout" | Network too slow | Check connection |

## Blockchain Verification

To verify spending on PolygonScan:

```
1. Get transaction hash from UI
2. Visit: https://amoy.polygonscan.com/tx/{hash}
3. Check:
   - From: Beneficiary wallet
   - To: Merchant wallet
   - Value: RELIEF tokens
   - Function: transfer()
```

## Architecture Diagram

```
┌────────────────────────────────────────────────────┐
│        FRONTEND (React/Wagmi)                      │
│  Dashboard.jsx - Beneficiary Spending              │
│  ├─ useAccount() - Get beneficiary address         │
│  ├─ useWalletClient() - MetaMask connection        │
│  ├─ usePublicClient() - Read balance               │
│  └─ Firebase - Real-time data                      │
└────────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────────┐
│        BLOCKCHAIN (Polygon Amoy)                   │
│  ReliefToken.transfer()                            │
│  ├─ Sender: Beneficiary wallet                     │
│  ├─ Receiver: Merchant wallet                      │
│  └─ Amount: RELIEF tokens                          │
└────────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────────┐
│        BACKEND API (Node.js/Express)               │
│  /api/transactions/record                          │
│  ├─ Save transaction to Firebase                   │
│  ├─ Record transaction hash & block #              │
│  └─ Update beneficiary & merchant stats            │
└────────────────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────────────────┐
│        DATABASE (Firebase)                         │
│  Collections:                                      │
│  ├─ beneficiaries - Wallet & balance info          │
│  ├─ merchants - Merchant details                   │
│  └─ transactions - All spending records            │
└────────────────────────────────────────────────────┘
```

## File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   └── beneficiary/
│   │       └── Dashboard.jsx          ✨ NEW
│   └── contracts/
│       └── MerchantRegistry.json       ✨ NEW

backend/
├── routes/
│   └── transactions.js                ✨ NEW
└── middleware/
    └── auth.js                        ✨ NEW

docs/
└── BENEFICIARY_SPENDING_FLOW.md       ✨ NEW
```

## Future Enhancements

- [ ] Spending limits per transaction
- [ ] Merchant categories filtering
- [ ] Transaction export to CSV/PDF
- [ ] Email receipts
- [ ] QR code verification
- [ ] Batch spending to multiple merchants
- [ ] Spending analytics dashboard
- [ ] Merchant ratings & reviews
- [ ] Spending approval workflow
- [ ] Transaction scheduling

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify blockchain transaction on PolygonScan
3. Check Firebase records in console
4. Review error handling section above

---

**Status:** ✅ Ready for testing  
**Last Updated:** January 6, 2025  
**Tested on:** Polygon Amoy (80002)
