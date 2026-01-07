# 🌍 Relifo - Emergency & Disaster Relief Platform

[![Blockchain](https://img.shields.io/badge/Blockchain-Polygon-8247E5)](https://polygon.technology/)
[![Smart Contracts](https://img.shields.io/badge/Smart%20Contracts-Solidity-363636)](https://soliditylang.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> A transparent, blockchain-powered platform for disaster relief campaigns with multi-stakeholder coordination

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

**Relifo** is a decentralized disaster relief platform that brings transparency and accountability to emergency fundraising and fund distribution. By leveraging blockchain technology, we ensure that every donation reaches its intended beneficiaries through a secure, auditable system.

### Key Highlights

- 🔐 **Transparent Donations** - All transactions recorded on blockchain
- 👥 **Multi-Role System** - Admins, Organizers, Donors, Beneficiaries, and Merchants
- 💰 **Direct Fund Allocation** - Beneficiaries receive funds in dedicated wallets
- 🏪 **Merchant Integration** - Controlled spending at approved merchants
- 🪙 **Custom Token Economy** - RELIEF token for seamless transactions
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

### For Admins
- Approve campaign organizers
- Verify merchants
- Monitor platform activity
- Manage system configurations
- Ensure platform integrity

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  - User Dashboards  - Campaign Management  - Wallet UI      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Web3 / ethers.js
                     │
┌────────────────────▼────────────────────────────────────────┐
│                Blockchain Layer (Polygon)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ReliefToken  │  │CampaignFactory│  │   Campaign   │      │
│  │   (ERC20)    │  │              │  │   (Escrow)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────┐  ┌──────────────────────────────────┐   │
│  │TokenSale     │  │    BeneficiaryWallet            │   │
│  └──────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Backend Services (Node.js)                      │
│  - Authentication  - Database Sync  - Middleware            │
└─────────────────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                Firebase (Database)                           │
│  - User Management  - Campaign Data  - Transaction History  │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

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

1. **Clone the repository**

```bash
git clone https://github.com/SamyaDeb/EIBS-2.0.git
cd EIBS-2.0
```

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

```bash
cd frontend
npm run dev
```

The application will be available at `http://localhost:5173`

2. **Compile smart contracts**

```bash
cd blockchain
npx hardhat compile
```

3. **Run tests**

```bash
npx hardhat test
```

4. **Deploy contracts to testnet**

```bash
npx hardhat run scripts/deploy.js --network amoy
```

## 📜 Smart Contracts

### Deployed Contracts (Polygon Amoy Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **ReliefToken** | `0xA19dfE0a1fCDf819b073A36875374Db23B12A953` | ERC20 token for platform transactions |
| **ReliefTokenSale** | `0x875b8CCF98DC19901dC1A61684dAfad3439b8Fa8` | Token sale contract (1 POL = 1 RELIEF) |
| **CampaignFactory** | `0xB60eAe36f87F16D1BC1A7173F28FAf8061C531DE` | Creates and manages campaigns |

### Contract Overview

#### 1. ReliefToken.sol
- ERC20 token with 18 decimals
- Total supply: 10,000,000 RELIEF
- Features: Mintable, Burnable, Pausable
- Used for all platform transactions

#### 2. ReliefTokenSale.sol
- Exchange rate: 1 POL = 1 RELIEF
- Min purchase: 0.01 POL
- Max purchase: 10,000 POL
- Available tokens: 5,000,000 RELIEF

#### 3. CampaignFactory.sol
- Manages campaign creation
- Organizer approval system
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

- ✅ ReentrancyGuard on all critical functions
- ✅ Pausable contracts for emergency stops
- ✅ Role-based access control
- ✅ Multi-signature requirements
- ✅ Input validation
- ✅ Secure wallet integration
- ✅ Firebase authentication
- ✅ Transaction verification

## 🗺️ Roadmap

- [x] Core smart contracts
- [x] Multi-role dashboard system
- [x] Campaign creation and management
- [x] Beneficiary wallet system
- [x] Merchant integration
- [ ] Mobile application
- [ ] Multi-chain support
- [ ] Enhanced analytics dashboard
- [ ] Automated beneficiary verification
- [ ] Integration with disaster monitoring APIs
- [ ] Governance token system
- [ ] DAO for platform decisions

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
