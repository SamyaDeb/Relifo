# Blockchain Scripts - Production Only

This folder contains only the **essential production scripts** needed for the Relifo platform.

## 📋 Scripts Overview

### 1. **deploy.js** - Contract Deployment
Deploy or update smart contracts to the blockchain.

**Usage:**
```bash
npx hardhat run scripts/deploy.js --network amoy
```

**When to use:**
- Initial contract deployment
- Contract updates/upgrades
- After modifying contract code

---

### 2. **approveMerchant.js** - Emergency Merchant Verification
Manually verify a merchant on-chain when needed (backup if frontend fails).

**Usage:**
```bash
MERCHANT_ADDRESS=0x... npx hardhat run scripts/approveMerchant.js --network amoy
```

**Example:**
```bash
MERCHANT_ADDRESS=0xe1Ef0d672482bF7F72de2fE011Cf48615DEfa1DC npx hardhat run scripts/approveMerchant.js --network amoy
```

**When to use:**
- Emergency merchant approval (if dashboard fails)
- Bulk merchant verification
- Testing merchant workflow

---

### 3. **approveOrganizer.js** - Emergency Organizer Approval
Manually approve an organizer on-chain when needed (backup if frontend fails).

**Usage:**
```bash
ORGANIZER_ADDRESS=0x... npx hardhat run scripts/approveOrganizer.js --network amoy
```

**Example:**
```bash
ORGANIZER_ADDRESS=0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A npx hardhat run scripts/approveOrganizer.js --network amoy
```

**When to use:**
- Emergency organizer approval (if dashboard fails)
- Bulk organizer approval
- Testing organizer workflow

---

## 🔑 Contract Addresses (Polygon Amoy)

```
ReliefToken:      0xc5740EF327ffaDAe587D463DC310023d7feAf119
ReliefTokenSale:  0x9C8B9Cd5d9853a590d19473Ba6cb0C32d7D554fC
CampaignFactory:  0xfbc48bA4C0F5bC16aF4563CAF056013EC2718569
Admin Wallet:     0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34
```

---

## ⚠️ Important Notes

- All scripts require `.env` file with `PRIVATE_KEY` of deployer account
- These scripts are **admin-only** operations
- Frontend dashboard handles most approvals automatically
- Use these scripts only for **emergency** or **bulk operations**
- Always test on testnet (Amoy) before mainnet

---

## 🗑️ Deleted Scripts

The following debugging/testing scripts were removed (available in git history if needed):
- check*.js (17 scripts) - Debugging scripts
- test*.js (6 scripts) - Testing scripts
- debug*.js (3 scripts) - Debug scripts
- list*.js (2 scripts) - List helper scripts
- testVerifyMerchant.js - Testing only

**Total deleted:** 21 scripts
**Remaining:** 3 essential production scripts

---

## 🚀 Recommended Workflow

### Normal Operation:
1. Use **admin dashboard** for merchant & organizer approvals
2. Use **deploy.js** for contract updates only

### Emergency/Bulk Operations:
1. Use **approveMerchant.js** or **approveOrganizer.js** scripts
2. Run from secure server with proper access controls

---

## 📞 Support

For issues or questions, refer to the main README in the project root.
