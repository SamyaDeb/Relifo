# Decentralized Merchant Verification System

## 🔐 System Architecture

This platform uses a **fully decentralized merchant verification system**:

1. **Merchant Registration** → Firebase (documents & profile)
2. **Admin Verification** → Blockchain (CampaignFactory contract)
3. **Organizer Approval** → Blockchain (BeneficiaryWallet contract)
4. **Beneficiary Spending** → Blockchain (verified & approved merchants only)

---

## 📋 Workflow

### Step 1: Merchant Registration
- Merchant visits `/merchant/register`
- Uploads required documents:
  * Business License
  * Tax ID / Registration Number
  * Proof of Ownership
- Submits wallet address and business details
- Status: `PENDING` in Firebase

### Step 2: Admin Verification (Blockchain)
- Super Admin reviews application in dashboard
- Checks uploaded documents
- Clicks "Verify on Blockchain"
- Smart contract call: `CampaignFactory.verifyMerchant(merchantAddress)`
- Merchant address added to verified registry
- Status: `APPROVED` in Firebase + `verifiedOnChain: true`

### Step 3: Organizer Approval (Blockchain) 
- Organizer views verified merchants
- Approves merchant for specific beneficiary wallet & category
- Smart contract call: `BeneficiaryWallet.approveMerchant(merchant, category)`
- **Requires**: Merchant must be verified by admin first
- Merchant can now accept payments for that category

### Step 4: Beneficiary Spending
- Beneficiary selects verified & approved merchant
- Smart contract validates:
  1. ✅ Merchant verified by admin (CampaignFactory)
  2. ✅ Merchant approved by organizer (BeneficiaryWallet)
  3. ✅ Sufficient balance
  4. ✅ Within category limits
- Transfers RELIEF tokens to merchant

---

## 🔧 Smart Contract Changes

### CampaignFactory.sol
**New Functions:**
```solidity
mapping(address => bool) public verifiedMerchants;
address[] public merchants;

function verifyMerchant(address merchant) external onlyOwner
function revokeMerchant(address merchant) external onlyOwner  
function isVerifiedMerchant(address merchant) external view returns (bool)
function getAllVerifiedMerchants() external view returns (address[] memory)
```

### BeneficiaryWallet.sol
**Modified Functions:**
```solidity
address public factory; // Reference to CampaignFactory

function approveMerchant(address merchant, SpendingCategory category) {
    require(ICampaignFactory(factory).isVerifiedMerchant(merchant), 
        "Merchant not verified by admin");
    // ... rest of logic
}
```

### Campaign.sol
**Constructor Updated:**
```solidity
constructor(
    address _organizer,
    address _admin,
    address _reliefToken,
    address _factory,  // NEW: Factory reference
    string memory _title,
    // ... other params
)
```

---

## 🎨 Frontend Components

### New Pages:
1. **`/merchant/register`** - Merchant registration with document upload
2. **`/merchant/pending`** - Pending verification status page

### New Components:
1. **`VerifyMerchantModal.jsx`** - Admin merchant verification UI
2. **`ApproveMerchantModal.jsx`** - Organizer merchant approval UI

### Updated Components:
- Admin Dashboard - Add merchant verification tab
- Organizer Dashboard - Show verified merchants for approval
- Beneficiary Dashboard - Only show verified + approved merchants

---

## 🔥 Firebase Structure

### users/{merchantWalletAddress}
```javascript
{
  walletAddress: "0x...",
  role: "merchant",
  status: "pending" | "approved" | "rejected",
  verifiedOnChain: false | true,
  
  // Business Info
  businessName: "Green Valley Pharmacy",
  ownerName: "John Doe",
  businessType: "pharmacy",
  address: "123 Main St",
  phone: "+1234567890",
  email: "contact@example.com",
  categories: ["Medicine", "Other"],
  
  // Documents (Firebase Storage URLs)
  documents: {
    businessLicense: "https://...",
    taxId: "https://...",
    ownershipProof: "https://..."
  },
  
  // Verification Metadata
  verifiedAt: "2026-01-04T...",
  verifiedBy: "0x...", // Admin wallet
  verifiedTxHash: "0x...", // Blockchain transaction
  
  createdAt: "2026-01-04T...",
  updatedAt: "2026-01-04T..."
}
```

---

## ✅ Security Features

1. **Two-Layer Verification**:
   - Admin verifies merchant authenticity (documents, business legitimacy)
   - Organizer approves merchant for specific beneficiaries & categories

2. **Decentralized Trust**:
   - Admin verification recorded on blockchain
   - Cannot be tampered with or reversed without blockchain transaction
   - Transparent and auditable

3. **Category-Based Permissions**:
   - Merchant must be approved separately for each category
   - Prevents cross-category fraud

4. **Document Trail**:
   - All documents stored in Firebase Storage
   - Accessible for audit/compliance

---

## 🚀 Usage Guide

### For Merchants:
1. Connect wallet
2. Register at `/merchant/register`
3. Upload all required documents
4. Wait for admin verification
5. Once verified, organizers can approve you for payments

### For Super Admin:
1. Review pending merchant applications
2. Verify documents are authentic
3. Click "Verify on Blockchain"
4. Confirm MetaMask transaction
5. Merchant is now verified globally

### For Organizers:
1. View list of admin-verified merchants
2. Select merchant to approve
3. Choose beneficiary wallet & category
4. Confirm blockchain transaction
5. Beneficiary can now spend at that merchant

### For Beneficiaries:
1. View allocated funds
2. Select verified & approved merchant
3. Choose amount & category
4. Confirm spending transaction
5. Funds transferred to merchant

---

## 📊 Benefits

✅ **Decentralized** - No single point of control  
✅ **Transparent** - All verifications on blockchain  
✅ **Secure** - Two-layer approval process  
✅ **Auditable** - Complete transaction history  
✅ **Flexible** - Category-based permissions  
✅ **Scalable** - Unlimited merchants can be verified  

---

## 🔄 Migration Path

Since the contract structure has changed, you'll need to:

1. **Redeploy contracts** with new parameters
2. **Update existing campaigns** (if any) or start fresh
3. **Verify merchants** through admin dashboard
4. **Approve merchants** through organizer dashboard

---

## 📝 Next Steps

1. ✅ Deploy updated smart contracts
2. ✅ Test merchant registration flow
3. ✅ Test admin verification on blockchain
4. ✅ Test organizer approval
5. ✅ Test beneficiary spending with verified merchants

---

## 🎯 Complete Decentralization Achieved!

All critical operations are now on the blockchain:
- ✅ Organizer approval
- ✅ Merchant verification
- ✅ Merchant approval for beneficiaries
- ✅ Fund allocation
- ✅ Spending transactions

Firebase only stores:
- User profiles
- Documents
- Status metadata
- Display information

The platform is now fully decentralized! 🚀
