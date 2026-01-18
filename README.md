# 🌍 Relifo - Emergency & Disaster Relief Platform

[![Blockchain](https://img.shields.io/badge/Blockchain-Polygon-8247E5)](https://polygon.technology/)
[![Audit Trail](https://img.shields.io/badge/Audit-WeilChain-00D9FF)](https://www.unweil.me/)
[![Smart Contracts](https://img.shields.io/badge/Smart%20Contracts-Solidity-363636)](https://soliditylang.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A transparent, blockchain-powered platform for disaster relief campaigns with dual-chain architecture: Polygon for transactions and WeilChain for immutable audit trails

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Smart Contracts](#smart-contracts)
- [User Roles](#user-roles)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

**Relifo** is a decentralized disaster relief platform that brings transparency and accountability to emergency fundraising and fund distribution. By leveraging a **dual-blockchain architecture** (Polygon + WeilChain), we ensure that every donation reaches its intended beneficiaries through a secure, auditable, and immutable system.

### 🎨 Dual-Chain Architecture

- **Polygon Amoy Testnet** - Handles all financial transactions, campaign management, and fund distribution using USDC stablecoin
- **WeilChain Testnet** - Maintains an immutable audit trail of all transactions for enhanced transparency and compliance

### Key Highlights

- 🔐 **Transparent Donations** - All transactions recorded on dual blockchains
- 🔍 **Immutable Audit Trail** - WeilChain provides tamper-proof transaction history
- 💵 **USDC Stablecoin** - Stable value for reliable aid distribution (6 decimals)
- 👥 **Multi-Role System** - Admins, Organizers, Donors, Beneficiaries, and Merchants
- 💰 **Direct Fund Allocation** - Beneficiaries receive funds in dedicated wallets
- 🏪 **Merchant Integration** - Controlled spending at approved merchants
- ✅ **Verified Badges** - Visual indicators for WeilChain-verified transactions
- 📊 **Real-time Tracking** - Monitor campaign progress and fund distribution

## ✨ Features

### For Donors
- Browse active disaster relief campaigns
- Make secure donations using cryptocurrency
- Track donation history and impact
- Transparent view of fund utilization
- Real-time campaign updates

### For Organizers
- Create and manage relief campaigns
- Set fundraising goals and campaign details
- Approve beneficiaries for fund distribution
- Allocate funds to verified beneficiaries
- Monitor campaign performance

### For Beneficiaries
- Receive allocated funds in dedicated wallet
- Spend funds at approved merchants
- View transaction history
- Secure wallet management

### For Merchants
- Accept payments from beneficiaries
- Get approved to participate in relief programs
- Track transaction records
- Real-time payment processing

### ForDual-Chain Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                      │
│  - Multi-Role Dashboards  - Campaign Management  - Wallet UI       │
│  - WeilChain Audit Stats  - Verified Transaction Badges            │
└─────────────┬──────────────────────────────────┬────────────────────┘
              │                                  │
              │ ethers.js v6 (Polygon)           │ @weilliptic/weil-sdk
              │                                  │
┌─────────────▼──────────────────────┐  ┌────────▼─────────────────────┐
│   Polygon Amoy Testnet (Chain 1)   │  │  WeilChain Testnet (Chain 2) │
│                                     │  │                              │
│  ┌────────────────────────────┐    │  │  ┌────────────────────────┐ │
│  │ USDC Token (6 decimals)    │    │  │  │ AuditTrail Contract    │ │
│  │ 0x8B0180f2101c8260d499...   │    │  │  │ aaaaaasm...s5udqu      │ │
│  └────────────────────────────┘    │  │  │ (POD_364bd4c...)       │ │
│                                     │  │  └────────────────────────┘ │
│  ┌────────────────────────────┐    │  │                              │
│  │ CampaignFactory            │    │  │  Functions:                  │
│  │ 0xb5f9972A84AE63a609f...   │    │  │  - log_transaction()         │
│  └────────────────────────────┘    │  │  - verify_transaction()      │
│                                     │  │  - get_stats()               │
│  ┌────────────────────────────┐    │  │  - get_entry_by_tx_hash()    │
│  │ TestnetUSDCSwap            │    │  │  - get_recent_entries()      │
│  │ 0xd102058765F3F3771cb2...   │    │  │                              │
│  └────────────────────────────┘    │  └──────────────────────────────┘
│                                     │             │
│  Campaign Contracts (Dynamic)       │             │ Audit Trail Logs
│  BeneficiaryWallet (Dynamic)       │             │ (Immutable)
└─────────────────────────────────────┘             │
              │                                     │
              │                                     │
┌─────────────▼─────────────────────────────────────▼──────────────────┐
│                    Backend Services (Node.js)                        │
│  - Authentication  - Database Sync  - WeilChain Integration          │
│  - Transaction Logging  - Audit Service  - Middleware                │
└─────────────┬────────────────────────────────────────────────────────┘
              │
┌─────────────▼────────────────────────────────────────────────────────┐
│                     Firebase Firestore (Database)                    │
│  - User Management  - Campaign Data  - Transaction History           │
│  - WeilChain Metadata  - Bene with hooks
- **Vite 7.3.0** - Lightning-fast build tool and dev server
- **TailwindCSS** - Utility-first styling framework
- **React Router Dom** - Client-side routing
- **Wagmi** - Ethereum React hooks for wallet integration
- **RainbowKit** - Beautiful wallet connection UI
- **Ethers.js 6.16** - Polygon blockchain interaction
- **@weilliptic/weil-sdk 1.0.1** - WeilChain integration
- **Firebase 11.1** - Authentication & Firestore database
- **React Hot Toast** - Notification system

### Blockchain (Polygon)
- **Solidity 0.8.20** - Smart contract language
- **Hardhat** - Development environment and testing
- **OpenZeppelin Contracts 5.1** - Secure, audited contract templates
- **Ethers.js 6.16** - Blockchain interaction library
- **TypeChain** - TypeScript bindings for contracts
- **Polygon Amoy Testnet** - Testnet deployment (Chain ID: 80002)
- **USDC Token** - Stablecoin standard (6 decimals)

### Blockchain (WeilChain)
- **Rust** - Smart contract development language
- **WebAssembly (WASM)** - Contract compilation target
- **WIDL** - WeilChain Interface Definition Language
- **@weilliptic/weil-sdk** - JavaScript/TypeScript SDK
- **WeilChain Testnet** - Audit trail deployment
- **POD Architecture** - Distributed consensus pods

### Backend
- **Node.js 18+** - Runtime environment
- **Firebase Admin SDK** - Backend services
- **Firebase Firestore** - NoSQL database
- **Firebase Authentication** - User management
- **Express.js** - API framework (middleware)
### Frontend
- **React 19.2** - UI framework
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **React Router** - Navigation
- **Wagmi** - Ethereum React hooks
- **RainbowKit** - Wallet connection
- **Firebase** - Authentication & database
- **Stellar SDK** - Cross-chain compatibility

### Blockchain
- **Solidity 0.8.20** - Smart contract language
- **Hardhat** - Development environment
- **OpenZeppelin** - Secure contract templates
- **Ethers.js 6.16** - Blockchain interaction
- **TypeChain** - TypeScript bindings
- **Polygon Amoy** - Testnet deployment

### Backend
- **Node.js** - Runtime environment
- **Express.js** - API framework
- **Firebase Admin** - Backend services

## 🚀 Getting Started

### Prerequisites

```bash
node >= 18.0.0
npm >= 9.0.0
```

### Installation
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# WeilChain Configuration
VITE_WEILCHAIN_SENTINEL_URL=https://sentinel.unweil.me
VITE_WEILCHAIN_AUDIT_CONTRACT=aaaaaasmrquobjshwok2uyfz7gcgg6dbuhvusublvgyrimskqkwws5udqu
VITE_WEILCHAIN_SIGNER_KEY=your_weilchain_private_key_for_logging
```

**Note:** See [.env.example](frontend/.env.example) for complete configuration template

2. **Install blockchain dependencies**

```bash
cd blockchain
npm install
```

3. **Install frontend dependencies**

```bash
cd ../frontend
npm install
```

4. **Configure environment variables**

Create `.env` file in the `blockchain` directory:

```env
POLYGON_AMOY_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

Create `.env` file in the `frontend` directory:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Running the Application

1. **Start the frontend development server**
🔷 Polygon Amoy Testnet Contracts

**Network:** Polygon Amoy Testnet  
**Chain ID:** 80002  
**Currency:** USDC (6 decimals)  
**Deployed:** January 15, 2026  
**Explorer:** [Polygon Amoy Scan](https://amoy.polygonscan.com/)

| Contract | Address | Purpose |
|----------|---------|---------|
| **USDC Token** | `0x8B0180f2101c8260d49339abfEe87927412494B4` | Stablecoin for all transactions (6 decimals) |
| **CampaignFactory** | `0xb5f9972A84AE63a609f253f4137640406540D9f2` | Creates and manages relief campaigns |
| **TestnetUSDCSwap** | `0xd102058765F3F3771cb2DDf6C543D0A14B97543E` | POL ↔ USDC swap for testing |
| **Campaign** | Dynamic | Individual campaign contracts (created by factory) |
| **BeneficiaryWallet** | Dynamic | Personal wallets for beneficiaries (auto-created) |

**View Deployments:** [blockchain/deployments/amoy.json](blockchain/deployments/amoy.json)
Polygon Contracts

##### 1. USDC Token Contract
- **Standard:** ERC20 with 6 decimals
- **Purpose:** Stablecoin for all financial transactions
- **Stability:** Pegged to US Dollar (1 USDC = $1)
- **Usage:** Donations, beneficiary allocations, merchant payments

##### 2. CampaignFactory.sol
- **Purpose:** Central factory for campaign deployment
- **Features:**
  - Organizer approval system (admin-controlled)
  - Campaign creation with USDC
  - Campaign registry and management
  - Access control
- **Admin:** 0x74E36d4A7b33057e3928CE4bf4C8C53A93361C34

##### 3. Campaign.sol (Template - Deployed Per Campaign)
- **Purpose:** Individual campaign escrow and management
- **Features:**
  - Accept USDC donations
  - Multi-signature security (organizer + admin)
  - Beneficiary management
  - Fund allocation to beneficiary wallets
  - Goal tracking and campaign status
  - Emergency withdrawal controls
- **Deployment:** Automatic via CampaignFactory

##### 4. BeneficiaryWallet.sol (Template - Auto-created)
- **Purpose:** Restricted spending wallet for aid recipients
- **Features:**
  - Category-based spending (Food, Medicine, Shelter, Education, Other)
  - Merchant approval system
  - USDC balance management
  - Complete transaction history
  - Spending limits per category
- **Creation:** Automatic when organizer allocates funds

##### 5. TestnetUSDCSwap.sol
- **Purpose:** Testing utility for POL ↔ USDC conversion
- **Exchange Rate:** Configurable (default 1:1)
- **Usage:** Convert testnet POL to USDC for testing donations

#### WeilChain Contract

##### AuditTrail Contract (Rust/WASM)
- **Purpose:** Immutable audit log for all Polygon transactions
- **Language:** Rust compiled to WebAssembly
- **Features:**
  - `log_transaction()` - Record transaction details
  - `verify_transaction()` - Check if transaction exists
  - `get_entry_by_tx_hash()` - Retrieve full audit entry
  - `get_stats()` - Global statistics (total transactions, amount)
  - `get_recent_entries()` - Query recent audit logs
- **Data Stored:**
  - Polygon transaction hash
  - Transaction type (Donation, Allocation, Spending)
  - Amount in USDC
  - From/To addresses
  - Campaign ID and metadata
  - Timestamp and block number
- **Benefits:**
  - Tamper-proof audit trail
  - Cross-chain verification
  - CoComplete Application Workflow

### 1. Campaign Creation Flow
```
1. User registers as Organizer on platform
2. Admin approves organizer wallet address
   → CampaignFactory.approveOrganizer(address)
3. Organizer creates campaign with details:
   - Title, description, goal amount (USDC)
   - Location, beneficiary count, deadline
4. Campaign contract deployed on Polygon
   → CampaignFactory.createCampaign(...)
5. Campaign data stored in Firebase
6. Campaign appears on donor dashboard
```

### 2. Donation Flow (Dual-Chain)
```
POLYGON CHAIN:
1. Donor browses active campaigns
2. Donor connects wallet (MetaMask/RainbowKit)
3. Donor approves USDC spending
   → USDC.approve(campaignAddress, amount)
4. Donor makes donation
   → Campaign.donate(usdcAmount)
5. Campaign raised amount updated on Polygon

WEILCHAIN AUDIT:
6. Frontend logs transaction to WeilChain
   → AuditTrail.log_transaction(polygonTxHash, ...)
7. Transaction recorded on WeilChain audit log
8. Verified badge displayed on UI
9. Transaction appears in audit statistics
```

### 3. Fund Distribution Flow
```
1. Organizer adds beneficiaries to campaign
   - Beneficiary details + wallet address
2. Admin/Organizer verifies beneficiaries
3. Organizer allocates funds to beneficiaries
   → Campaign.allocateToBeneficiary(beneficiaryAddress, amount)
4. BeneficiaryWallet contract auto-deployed
5. USDC transferred to BeneficiaryWallet
6. Allocation logged to WeilChain
   → AuditTrail.log_transaction(..., "Allocation")
7. Beneficiary can view balance and spend
```

### 4. Merchant Transaction Flow (Dual-Chain)
```
SETUP:
1. Merchant registers on platform
2. Admin verifies and approves merchant
3. Merchant added to approved list

TRANSACTION:
POLYGON CHAIN:
4. Beneficiary selects merchant and category
5. Beneficiary initiates payment
   → BeneficiaryWallet.spendAtMerchant(merchantAddress, amount, category)
6. USDC transferred to merchant
7. Transaction recorded in wallet history

WEILCHAIN AUDIT:
8. Spending logged to WeilChain
   → AuditTrail.log_transaction(..., "Spending")
9. Merchant transaction verified
10. Audit entry created with spending details
11. Statistics updated (total amount tracked)
```

### 5. Verification & Audit Flow
```
1. User views transaction on dashboard
2. WeilChain badge displayed if logged
3. User clicks badge or "Verify" button
4. Frontend queries WeilChain
   → AuditTrail.verify_transaction(polygonTxHash)
5. Audit entry details displayed:
   - Entry ID, transaction type
   - Amount in USDC
   - Timestamp, block number
   - Campaign metadata
6. User can export audit report
7. Third parties can independently verify on WeilChain
```

### 6. Cross-Chain Verification Flow
```
PUBLIC VERIFICATION (No wallet required):
1. Anyone gets Polygon transaction hash
2. Visit WeilChain test page: /weilchain-test
3. Enter Polygon tx hash in verification field
4. System queries WeilChain audit contract
5. Results displayed:
   ✅ Verified - Transaction exists with full details
   ⚠️ Not Found - Transaction not logged
   ❌ Error - Connection or query issue
6. Proof of immutable audit trail provided
- Campaign template deployment
- Admin controls

#### 4. Campaign.sol
- Individual campaign escrow
- Multi-signature security
- Donation tracking
- Beneficiary allocation
- Fund distribution logic

#### 5. BeneficiaryWallet.sol
- Personal wallet for beneficiaries
- Merchant payment processing
- Spending controls
- Transaction history

## 👥 User Roles

### 1. Admin (Super Admin)
- Approve/reject organizers
- Verify merchants
- System-wide monitoring
- Platform configuration

### 2. Organizer (Campaign Manager)
- Create relief campaigns
- Set campaign goals and details
- Approve beneficiaries
- Allocate funds to beneficiaries
- Monitor campaign progress

### 3. Donor (Contributor)
- Browse campaigns
- Make donations
- Track contributions
- View impact metrics

### 4. Beneficiary (Aid Recipient)
- Receive allocated funds
- Spend at approved merchants
- View wallet balance
- Track transactions

### 5. Merchant (Service Provider)
- Accept beneficiary payments
- Process transactions
- View sales history
- Participate in relief programs

## 📱 Application Workflow

### Campaign Creation Flow
```
1. Organizer applies for approval → Admin approves
2. Organizer creates campaign with details
3. Campaign deployed on blockchain
4. Campaign appears on donor dashboard
```

### Donation Flow
```
1. Donor browses active campaigns
2. Donor connects wallet
3. Donor makes donation
4. Transaction recorded on blockchain
5. Campaign raised amount updated
```

### Fund Distribution Flow
```
1. Organizer adds beneficiaries to campaign
2. Admin/Organizer verifies beneficiaries
3. Organizer allocates funds to beneficiaries
4. Beneficiary wallet receives tokens
5. Beneficiary can spend at approved merchants
```

### Merchant Transaction Flow
```
1. Merchant applies → Admin approves
2. Beneficiary selects merchant
3. Beneficiary initiates payment
4. Merchant approves transaction
5. Tokens transferred to merchant
```

## 🧪 Testing

### Run Smart Contract Tests

```bash
cd blockchain
npx hardhat test
```

### Test Coverage

```bash
npx hardhat coverage
```

### Manual Testing Scripts

```bash
# Check campaign data
node scripts/checkCampaignBeneficiaries.js

# Test donation flow
node scripts/testDonation.js

# Verify beneficiary
node scripts/verifyBeneficiary.js

# Allocate funds
node scripts/allocateFunds.js
```

## 📦 Deployment

### Smart Contract Deployment

1. Configure network in `hardhat.config.js`
2. Set environment variables
3. Run deployment script:

```bash
npx hardhat run scripts/deploy.js --network amoy
```

### Frontend Deployment

```bash
cd frontend
npm run build
```

The build output will be in the `dist` directory.

## 🔐 Security Features

### Polygon Smart Contract Security
- ✅ **ReentrancyGuard** on all critical transfer functions
- ✅ **Pausable** contracts for emergency stops
- ✅ **Role-based Access Control** (Ownable, organizer approvals)
- ✅ **Multi-signature** requirements for campaign actions
- ✅ **Input validation** and bounds checking
- ✅ **OpenZeppelin** audited contract templates
- ✅ **Secure wallet integration** via RainbowKit/Wagmi

### WeilChain Audit Security
- ✅ **Immutable logs** - Cannot be altered after recording
- ✅ **Duplicate prevention** - Same transaction hash cannot be logged twice
- ✅ **Cross-chain verification** - Independent audit trail
- ✅ **Public verification** - Anyone can verify transactions
- ✅ **BFT consensus** - Byzantine Fault Tolerant network
- ✅ **WASM sandboxing** - Isolated contract execution

### Application Security
- ✅ **Firebase Authentication** with secure session management
- ✅ **Environment variables** for sensitive configuration
- ✅ **HTTPS/TLS** for all API communications
- ✅ **Transaction verification** before display
- ✅ **Error handling** and user feedback
- ✅ **Frontend validation** before blockchain submission

## 🗺️ Roadmap

### ✅ Phase 1: Core Platform (Completed)
- [x] Polygon smart contracts (USDC-based)
- [x] Multi-role dashboard system
- [x] Campaign creation and management
- [x] Beneficiary wallet system
- [x] Merchant integration
- [x] Firebase authentication and database
- [x] Responsive UI with TailwindCSS

### ✅ Phase 2: WeilChain Integration (Completed)
- [x] WeilChain audit contract (Rust/WASM)
- [x] Dual-chain architecture implementation
- [x] Transaction logging service
- [x] Verification badges and UI components
- [x] Audit statistics dashboard
- [x] Cross-chain verification system

### 🔄 Phase 3: Testing & Optimization (In Progress)
- [x] Complete test suite for smart contracts
- [x] WeilChain integration testing page
- [ ] End-to-end user flow testing
- [ ] Performance optimization
- [ ] Security audit (third-party)
- [ ] Load testing for concurrent users

### 📋 Phase 4: Advanced Features (Planned)
- [ ] Mobile application (React Native)
- [ ] Multi-chain support (Ethereum, BSC)
- [ ] Enhanced analytics dashboard with charts
- [ ] Automated beneficiary verification (KYC)
- [ ] Integration with disaster monitoring APIs
- [ � Support & Contact

### Technical Support
- **GitHub Issues:** [Open an Issue](https://github.com/SamyaDeb/EIBS-2.0/issues)
- **Documentation:** See `/docs` folder for detailed guides
- **WeilChain Support:** https://www.unweil.me/support

### Network Information
- Project: Emergency & Disaster Relief Platform (Relifo)
- Year: 2026

## 🙏 Acknowledgments

- **OpenZeppelin** - Secure smart contract framework
- **Polygon Technology** - Scalable blockchain infrastructure  
- **WeilChain/Weilliptic** - Immutable audit trail blockchain
- **Firebase** - Authentication and database services
- **Vite & React** - Modern frontend development tools
- **Hardhat** - Ethereum development environment
- **The Open Source Community** - For continuous innovation

## 💡 Key Innovations

1. **Dual-Chain Architecture** - First relief platform combining transaction layer (Polygon) with audit layer (WeilChain)
2. **USDC Stablecoin** - Eliminates volatility risk for aid recipients
3. **Immutable Audit Trail** - Cross-chain verification ensures transparency
4. **Category-based Spending** - Beneficiaries have controlled wallets with merchant restrictions
5. **Verified Badges** - Visual indicators show WeilChain-verified transactions
6. **Real-time Statistics** - Live audit stats from blockchain, not databases

## 🌟 Show Your Support

If you find this project useful for humanitarian causes, please:
- ⭐ Star this repository
- 🍴 Fork and contribute
- 📢 Share with NGOs and relief organizations
- 💬 Provide feedback and suggestions

---

**Built with ❤️ for disaster relief, humanitarian aid, and transparent philanthropy**

**Dual-Chain Powered by:**
- 🔷 **Polygon** - Fast, low-cost transactions
- 🔷 **WeilChain** - Immutable audit trail

**Status:** ✅ Testnet Deployment Complete | 🚀 Ready for Testing
AUDIT_CONTRACT = "aaaaaasmrquobjshwok2uyfz7gcgg6dbuhvusublvgyrimskqkwws5udqu"
POD = "POD_364bd4c435aa46bc8c48f92268daeadc"
```

## 📚 Documentation

- **[DEPLOYED_CONTRACTS.md](blockchain/DEPLOYED_CONTRACTS.md)** - Complete Polygon contract addresses and details
- **[WEILCHAIN_REFERENCE.md](WEILCHAIN_REFERENCE.md)** - WeilChain SDK and contract documentation
- **[PROJECT_FLOW_DOCUMENTATION.md](PROJECT_FLOW_DOCUMENTATION.md)** - Detailed project architecture and flow
- **[USER_FLOWS_FOR_CLONE.md](USER_FLOWS_FOR_CLONE.md)** - User journey documentation
- **[WEILCHAIN_AUDIT_TRAIL_IMPLEMENTATION.md](WEILCHAIN_AUDIT_TRAIL_IMPLEMENTATION.md)** - Audit system implementation guide

## 🎮 Quick Start Guide

### For Local Testing

1. **Get Testnet Tokens**
   ```bash
   # Get Polygon Amoy POL from faucet
   https://faucet.polygon.technology/
   
   # Swap POL to USDC using TestnetUSDCSwap contract
   # Or contact admin for direct USDC transfer
   ```

2. **Test the Platform**
   ```bash
   # Access the application
   http://localhost:5173
   
   # Test WeilChain verification
   http://localhost:5173/weilchain-test
   ```

3. **User Roles Setup**
   - **Admin:** Contact deployer for admin access
   - **Organizer:** Register and wait for admin approval
   - **Donor:** Connect wallet and start donating
   - **Beneficiary:** Added by organizer after campaign creation
   - **Merchant:** Register and wait for admin verification

### Test Scenarios

#### Scenario 1: Create and Fund a Campaign
```bash
1. Login as approved organizer
2. Create new campaign with goal (e.g., 1000 USDC)
3. Login as donor
4. Donate to campaign
5. Check WeilChain verification badge
6. View audit stats
```

#### Scenario 2: Distribute Funds to Beneficiaries
```bash
1. Login as organizer
2. Add beneficiary to campaign
3. Allocate funds (e.g., 100 USDC)
4. Login as beneficiary
5. View BeneficiaryWallet balance
6. Check allocation logged on WeilChain
```

#### Scenario 3: Beneficiary Spending
```bash
1. Admin approves merchant
2. Login as beneficiary
3. Spend at approved merchant
4. Check transaction on dashboard
5. Verify spending on WeilChain
6. View audit trail
```

## 🔍 Verify Transactions

### On Polygon
```
https://amoy.polygonscan.com/tx/[TRANSACTION_HASH]
```

### On WeilChain
1. Visit: `http://localhost:5173/weilchain-test`
2. Enter Polygon transaction hash
3. Click "Verify"
4. View complete audit entry

### Using SDK
```javascript
import { verifyTransactionOnWeilChain } from './services/weilchainAuditService';

const isVerified = await verifyTransactionOnWeilChain('0x...');
console.log(isVerified); // true/false
```tifications for campaign updates
- [ ] QR code payments for beneficiaries

### 🚀 Phase 5: Governance & DAO (Future)
- [ ] Governance token system
- [ ] DAO for platform decisions
- [ ] Community-driven organizer approval
- [ ] Staking mechanism for platform participation
- [ ] Decentralized dispute resolution

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Samya Deb**
- GitHub: [@SamyaDeb](https://github.com/SamyaDeb)

## 🙏 Acknowledgments

- OpenZeppelin for secure smart contract templates
- Polygon for scalable blockchain infrastructure
- Firebase for backend services
- The open-source community

## 📞 Support

For support, please:
- Open an issue on GitHub
- Contact: [Your Email]

## 🌟 Show Your Support

If you find this project useful, please give it a ⭐️!

---

**Built with ❤️ for disaster relief and humanitarian aid**
