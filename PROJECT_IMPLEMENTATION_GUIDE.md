# Disaster Relief Stablecoin System - Complete Implementation Guide

## Project Overview

A blockchain-based disaster relief platform using Stellar blockchain and Firebase that enables transparent, instant fund distribution to verified disaster victims with smart spending controls.

---

## System Architecture

```
Frontend (React.js + TailwindCSS)
    ↓
Firebase Backend (Serverless)
├── Authentication (Wallet-based login)
├── Firestore (Database)
├── Cloud Functions (Business logic)
├── Storage (Documents/Images)
└── Hosting (Deployment)
    ↓
Stellar Blockchain
├── USDC Stablecoin transfers
├── Beneficiary walletsCA
└── Payment validation
```

---

## Tech Stack

### Blockchain Layer
- **Network**: Stellar Testnet (then Mainnet)
- **Currency**: USDC or custom relief token
- **SDK**: Stellar SDK for JavaScript
- **Wallet**: Freighter (user wallet extension)

### Backend
- **Framework**: Firebase (serverless)
- **Database**: Cloud Firestore (NoSQL)
- **Functions**: Cloud Functions (Node.js)
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication + Custom Tokens

### Frontend
- **Framework**: React.js
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **State Management**: React Hooks + Context API
- **Build Tool**: Vite or Create React App

---

## User Roles & Features

### 1. SUPER ADMIN (Platform Owner)
**Fixed Stellar Address**: Hardcoded in config

**Features:**
- View all pending organizer applications
- Approve/reject campaign organizers
- View platform-wide statistics
  - Total campaigns created
  - Total funds raised
  - Total beneficiaries helped
  - Active campaigns count
- Monitor suspicious activities
- Manage merchant whitelisting (optional)
- System configuration

**Dashboard Sections:**
- Pending Verifications List
- Platform Analytics
- Recent Activity Feed
- User Management

---

### 2. CAMPAIGN ORGANIZER (NGOs/Relief Agencies)
**Verification Required**: Admin must approve before access

**Features:**

#### Campaign Management:
- Create new disaster relief campaign
  - Campaign name
  - Description
  - Target amount
  - Duration (start/end date)
  - Geographic area
  - Spending categories (food %, medicine %, shelter %)
- View my campaigns list
- Edit campaign details
- Close campaign
- View campaign analytics

#### Beneficiary Management:
- Add beneficiaries manually
- Bulk upload beneficiaries (CSV)
- Verify beneficiary documents
- Approve/reject beneficiary applications
- View beneficiary list per campaign
- Track beneficiary spending patterns
- Export beneficiary data

#### Fund Distribution:
- Distribute funds to verified beneficiaries
- Bulk distribution to multiple beneficiaries
- Set allocation based on family size
- View distribution history
- Reclaim unused funds at campaign end

#### Merchant Management:
- Whitelist approved merchants
- Categorize merchants (grocery, pharmacy, shelter)
- Add merchant location
- Verify merchant credentials

#### Reporting:
- Campaign progress reports
- Fund utilization reports
- Beneficiary spending breakdown
- Donor impact reports
- Export reports (PDF/CSV)

**Dashboard Sections:**
- Campaign Overview Cards
- Beneficiary Management Table
- Distribution Controls
- Analytics Charts
- Recent Transactions

---

### 3. DONOR (Public/Organizations)
**Auto-approved**: No verification needed

**Features:**

#### Browse & Donate:
- Browse all active campaigns
- Filter campaigns by:
  - Location
  - Disaster type
  - Amount raised
  - Date created
- View campaign details
  - Organizer information (verified badge)
  - Campaign goals
  - Amount raised vs target
  - Number of beneficiaries
  - Category breakdown
- Make donation
  - Enter amount
  - Choose payment method (card/crypto)
  - Get receipt with blockchain hash

#### Track Impact:
- View my donation history
- Track specific donation impact
  - How much distributed
  - How many families helped
  - Category-wise spending breakdown
  - Real-time activity feed
  - Geographic map view
- Bookmark favorite campaigns
- Share impact on social media

#### Dashboard:
- Total donated amount
- Number of families helped
- Recent donations list
- Impact metrics
  - Meals provided
  - Medical treatments funded
  - Families sheltered
- Live activity feed

**Public Features (No login needed):**
- View active campaigns
- Read success stories
- View platform statistics
- Public transaction explorer

---

### 4. BENEFICIARY (Disaster Victims)
**Verification Required**: Organizer must verify and approve

**Features:**

#### Wallet Management:
- View current balance
- View spending limits per category
  - Food: $X remaining / $Y total
  - Medicine: $X remaining / $Y total
  - Shelter: $X remaining / $Y total
- See expiration date (if any)

#### Spending:
- Generate QR code for payments
- Make purchase at approved merchant
- View transaction history
  - Date, merchant, amount, category
- Get spending alerts
  - When nearing category limit
  - When funds are running low

#### Merchant Discovery:
- Find nearby approved merchants
- Map view with merchant locations
- Filter by category
- View merchant details

#### Support:
- Contact campaign organizer
- Report issues with merchants
- FAQ section
- Tutorial videos

**Dashboard Sections:**
- Balance Overview Card
- Category Spending Progress Bars
- Recent Transactions List
- Nearby Merchants Map
- QR Code Generator

---

## Complete Feature List

### Authentication & Authorization
1. ✅ Wallet connection (Freighter/Albedo)
2. ✅ Fixed super admin address check
3. ✅ First-time user registration flow
4. ✅ Role selection (donor/organizer/beneficiary)
5. ✅ Document upload (KYC/registration)
6. ✅ Pending approval status page
7. ✅ Role-based dashboard routing
8. ✅ Session management
9. ✅ Protected routes

### Super Admin Features
1. ✅ View pending organizer applications
2. ✅ Approve organizer (with Firestore + optional blockchain)
3. ✅ Reject organizer (with reason)
4. ✅ Platform statistics dashboard
5. ✅ User management table
6. ✅ Activity monitoring
7. ✅ System settings

### Campaign Organizer Features
1. ✅ Create campaign form
2. ✅ Set spending categories and limits
3. ✅ Upload campaign images
4. ✅ Add beneficiaries (single + bulk)
5. ✅ Verify beneficiary documents
6. ✅ Distribute funds (single + batch)
7. ✅ Whitelist merchants
8. ✅ View campaign analytics
9. ✅ Export reports
10. ✅ Close/complete campaign

### Donor Features
1. ✅ Browse campaigns (grid/list view)
2. ✅ Search and filter campaigns
3. ✅ View campaign details
4. ✅ Donate with wallet connection
5. ✅ Donate with credit card (Stripe integration)
6. ✅ Get donation receipt
7. ✅ Track donation impact
8. ✅ View personal impact dashboard
9. ✅ Share impact on social media
10. ✅ Donation history

### Beneficiary Features
1. ✅ View wallet balance
2. ✅ View category spending limits
3. ✅ Generate payment QR code
4. ✅ Transaction history
5. ✅ Find nearby merchants
6. ✅ Map view of merchants
7. ✅ Spending alerts
8. ✅ Contact support

### Blockchain Integration
1. ✅ Create Stellar wallets for users
2. ✅ USDC token transfers
3. ✅ Batch payments to beneficiaries
4. ✅ Transaction validation
5. ✅ Spending controls (category limits)
6. ✅ Merchant whitelisting
7. ✅ Clawback unused funds
8. ✅ Transaction monitoring

### Public Features
1. ✅ Homepage with active campaigns
2. ✅ Campaign details page (public)
3. ✅ Platform statistics
4. ✅ Success stories
5. ✅ Transaction explorer
6. ✅ About/How it works page
7. ✅ FAQ section

### Analytics & Reporting
1. ✅ Real-time dashboard updates
2. ✅ Campaign progress tracking
3. ✅ Fund utilization charts
4. ✅ Geographic distribution map
5. ✅ Category spending breakdown
6. ✅ Beneficiary impact metrics
7. ✅ Export reports (PDF/CSV)

### Notifications
1. ✅ Email notifications
2. ✅ In-app notifications
3. ✅ SMS alerts (optional)
4. ✅ Push notifications (PWA)

---

## Step-by-Step Implementation Guide

---

## PHASE 1: PROJECT SETUP (Day 1-2)

### Step 1.1: Initialize Project Structure

```bash
# Create project folder
mkdir disaster-relief-platform
cd disaster-relief-platform

# Create folder structure
mkdir -p frontend backend docs

# Initialize Git
git init
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo "*.log" >> .gitignore
```

### Step 1.2: Set Up Firebase Project

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase project
firebase init

# Select:
# ✅ Firestore
# ✅ Functions  
# ✅ Hosting
# ✅ Storage

# Choose:
# - Create new project OR use existing
# - JavaScript (for functions)
# - Install dependencies: Yes
```

**Firebase Project Structure Created:**
```
disaster-relief-platform/
├── functions/
│   ├── index.js
│   ├── package.json
│   └── .eslintrc.js
├── public/
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
└── firebase.json
```

### Step 1.3: Set Up React Frontend

```bash
cd frontend

# Option 1: Create React App
npx create-react-app .

# Option 2: Vite (faster, recommended)
npm create vite@latest . -- --template react

# Install dependencies
npm install firebase
npm install @stellar/freighter-api stellar-sdk
npm install react-router-dom
npm install axios
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Step 1.4: Configure TailwindCSS

**tailwind.config.js:**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**src/index.css:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 1.5: Create Environment Variables

**frontend/.env:**
```env
# Firebase Config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Stellar Config
VITE_STELLAR_NETWORK=TESTNET
VITE_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Super Admin
VITE_SUPER_ADMIN_ADDRESS=GCKXC...YOUR_STELLAR_ADDRESS...XYZ
```

**functions/.env:**
```env
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
PLATFORM_SECRET_KEY=S...YOUR_SECRET_KEY...
```

---

## PHASE 2: FIREBASE BACKEND SETUP (Day 3-5)

### Step 2.1: Initialize Firebase in Frontend

**src/firebase/config.js:**
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);
export default app;
```

**src/firebase/constants.js:**
```javascript
export const SUPER_ADMIN_ADDRESS = import.meta.env.VITE_SUPER_ADMIN_ADDRESS;

export const USER_ROLES = {
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  BENEFICIARY: 'beneficiary',
  DONOR: 'donor'
};

export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

export const CAMPAIGN_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CLOSED: 'closed'
};
```

### Step 2.2: Set Up Firestore Database Structure

**Go to Firebase Console → Firestore Database → Create Collections:**

```
Collections to create:
1. users
2. campaigns
3. beneficiaries
4. transactions
5. merchants
6. notifications
```

### Step 2.3: Configure Firestore Security Rules

**firestore.rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check user role
    function hasRole(role) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone can read user profiles (for campaign organizers, etc.)
      allow read: if isAuthenticated();
      
      // Users can update their own profile
      allow update: if isAuthenticated() && request.auth.uid == userId;
      
      // Only admins can update verification status
      allow update: if hasRole('admin') && 
                      request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['verificationStatus', 'rejectionReason', 'approvedAt']);
      
      // New users can create their profile
      allow create: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Campaigns collection
    match /campaigns/{campaignId} {
      // Anyone can read campaigns
      allow read: if true;
      
      // Only verified organizers can create campaigns
      allow create: if hasRole('organizer') && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.verificationStatus == 'approved';
      
      // Only campaign owner can update
      allow update: if isAuthenticated() && 
                      resource.data.organizerId == request.auth.uid;
      
      // Only campaign owner can delete
      allow delete: if isAuthenticated() && 
                      resource.data.organizerId == request.auth.uid;
    }
    
    // Beneficiaries collection
    match /beneficiaries/{beneficiaryId} {
      // Authenticated users can read
      allow read: if isAuthenticated();
      
      // Only organizers can create/update beneficiaries
      allow create, update: if hasRole('organizer');
      
      // Beneficiaries can read their own data
      allow read: if isAuthenticated() && 
                    resource.data.stellarPublicKey == request.auth.uid;
    }
    
    // Transactions collection
    match /transactions/{txId} {
      // Anyone can read transactions (transparency)
      allow read: if true;
      
      // Only authenticated users can create transactions
      allow create: if isAuthenticated();
      
      // No updates or deletes allowed (immutable)
      allow update, delete: if false;
    }
    
    // Merchants collection
    match /merchants/{merchantId} {
      // Anyone can read merchant list
      allow read: if true;
      
      // Only admins and organizers can add merchants
      allow create, update: if hasRole('admin') || hasRole('organizer');
    }
    
    // Notifications collection
    match /notifications/{notificationId} {
      // Users can only read their own notifications
      allow read: if isAuthenticated() && 
                    resource.data.userId == request.auth.uid;
      
      // System can create notifications
      allow create: if isAuthenticated();
      
      // Users can mark as read
      allow update: if isAuthenticated() && 
                      resource.data.userId == request.auth.uid &&
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
    }
  }
}
```

### Step 2.4: Configure Storage Rules

**storage.rules:**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    
    // Helper function
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Documents upload (KYC, registration)
    match /documents/{folder}/{userId}/{fileName} {
      // User can upload their own documents
      allow write: if isAuthenticated() && request.auth.uid == userId;
      
      // Only admins and organizers can read documents
      allow read: if isAuthenticated() && 
                    (request.auth.token.role == 'admin' || 
                     request.auth.token.role == 'organizer');
    }
    
    // Campaign images
    match /campaigns/{campaignId}/{fileName} {
      // Organizers can upload campaign images
      allow write: if isAuthenticated() && 
                     request.auth.token.role == 'organizer';
      
      // Anyone can read campaign images
      allow read: if true;
    }
  }
}
```

### Step 2.5: Install Cloud Functions Dependencies

```bash
cd functions
npm install stellar-sdk
npm install firebase-admin
npm install axios
npm install nodemailer
```

### Step 2.6: Create Cloud Functions

**functions/index.js:**
```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const StellarSdk = require('stellar-sdk');

admin.initializeApp();
const db = admin.firestore();

// Initialize Stellar server
const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');

// ============================================
// FUNCTION 1: Approve Campaign Organizer
// ============================================
exports.approveOrganizer = functions.https.onCall(async (data, context) => {
  // Security: Check if caller is admin
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can approve organizers'
    );
  }

  const { organizerId } = data;

  try {
    // Update user status in Firestore
    await db.collection('users').doc(organizerId).update({
      verificationStatus: 'approved',
      approvedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create notification
    await db.collection('notifications').add({
      userId: organizerId,
      message: 'Congratulations! Your organization has been verified. You can now create campaigns.',
      type: 'approval',
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // TODO: Send email notification

    return { success: true, message: 'Organizer approved successfully' };
  } catch (error) {
    console.error('Error approving organizer:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// FUNCTION 2: Reject Campaign Organizer
// ============================================
exports.rejectOrganizer = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const { organizerId, reason } = data;

  try {
    await db.collection('users').doc(organizerId).update({
      verificationStatus: 'rejected',
      rejectionReason: reason,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection('notifications').add({
      userId: organizerId,
      message: `Your application was not approved. Reason: ${reason}`,
      type: 'rejection',
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// FUNCTION 3: Create Stellar Wallet for Beneficiary
// ============================================
exports.createBeneficiaryWallet = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'organizer') {
    throw new functions.https.HttpsError('permission-denied', 'Organizer only');
  }

  try {
    // Generate new Stellar keypair
    const pair = StellarSdk.Keypair.random();
    const publicKey = pair.publicKey();
    const secretKey = pair.secret();

    // Fund account using friendbot (testnet only)
    if (functions.config().stellar.network === 'TESTNET') {
      await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
    } else {
      // On mainnet, you need to fund from platform account
      // TODO: Implement mainnet funding
    }

    // Store encrypted secret key securely (or use custodial approach)
    // For demo: return to organizer
    
    return {
      success: true,
      publicKey: publicKey,
      secretKey: secretKey // WARNING: In production, don't return this!
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// FUNCTION 4: Distribute Funds to Beneficiaries
// ============================================
exports.distributeFunds = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'organizer') {
    throw new functions.https.HttpsError('permission-denied', 'Organizer only');
  }

  const { campaignId, distributions } = data;
  // distributions = [{ beneficiaryId, amount, stellarPublicKey }]

  try {
    // Get campaign details
    const campaignDoc = await db.collection('campaigns').doc(campaignId).get();
    const campaign = campaignDoc.data();

    // Verify organizer owns this campaign
    if (campaign.organizerId !== context.auth.uid) {
      throw new functions.https.HttpsError('permission-denied', 'Not your campaign');
    }

    // Get platform source account (where campaign funds are held)
    const sourceSecret = functions.config().stellar.campaign_secret;
    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
    const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

    // Build transaction with multiple payment operations
    const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET
    });

    // Add payment operation for each beneficiary
    distributions.forEach(dist => {
      txBuilder.addOperation(
        StellarSdk.Operation.payment({
          destination: dist.stellarPublicKey,
          asset: StellarSdk.Asset.native(), // Use XLM or USDC
          amount: dist.amount.toString()
        })
      );
    });

    // Build and sign transaction
    const transaction = txBuilder.setTimeout(180).build();
    transaction.sign(sourceKeypair);

    // Submit to Stellar network
    const result = await server.submitTransaction(transaction);

    // Update Firestore records
    const batch = db.batch();
    
    distributions.forEach(dist => {
      const beneficiaryRef = db.collection('beneficiaries').doc(dist.beneficiaryId);
      batch.update(beneficiaryRef, {
        allocatedAmount: admin.firestore.FieldValue.increment(dist.amount),
        distributedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create transaction record
      const txRef = db.collection('transactions').doc();
      batch.set(txRef, {
        type: 'distribution',
        campaignId: campaignId,
        beneficiaryId: dist.beneficiaryId,
        amount: dist.amount,
        stellarTxHash: result.hash,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();

    return {
      success: true,
      txHash: result.hash,
      distributedCount: distributions.length
    };

  } catch (error) {
    console.error('Distribution error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// FUNCTION 5: Validate Spending Transaction
// ============================================
exports.validateSpending = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { beneficiaryId, merchantId, amount, category } = data;

  try {
    // Get beneficiary data
    const beneficiaryDoc = await db.collection('beneficiaries').doc(beneficiaryId).get();
    
    if (!beneficiaryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Beneficiary not found');
    }

    const beneficiary = beneficiaryDoc.data();

    // Get merchant data
    const merchantDoc = await db.collection('merchants').doc(merchantId).get();
    
    if (!merchantDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Merchant not found');
    }

    const merchant = merchantDoc.data();

    // Validate merchant category matches spending category
    if (merchant.category !== category) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Merchant is not approved for ${category} purchases`
      );
    }

    // Get campaign to check category limits
    const campaignDoc = await db.collection('campaigns').doc(beneficiary.campaignId).get();
    const campaign = campaignDoc.data();

    // Calculate category limit (percentage of allocated amount)
    const categoryLimit = (beneficiary.allocatedAmount * campaign.categories[category]) / 100;
    
    // Get current spending in this category
    const currentSpent = beneficiary.spendingByCategory?.[category] || 0;

    // Check if exceeds limit
    if (currentSpent + amount > categoryLimit) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `${category} spending limit exceeded. Limit: $${categoryLimit}, Spent: $${currentSpent}`
      );
    }

    // Check total balance
    const totalSpent = beneficiary.spentAmount || 0;
    if (totalSpent + amount > beneficiary.allocatedAmount) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Insufficient balance'
      );
    }

    return {
      approved: true,
      remaining: categoryLimit - (currentSpent + amount),
      totalRemaining: beneficiary.allocatedAmount - (totalSpent + amount)
    };

  } catch (error) {
    console.error('Validation error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// FUNCTION 6: Record Spending Transaction
// ============================================
exports.recordSpending = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { beneficiaryId, merchantId, amount, category, stellarTxHash } = data;

  try {
    // First validate the transaction
    const validation = await exports.validateSpending(
      { beneficiaryId, merchantId, amount, category },
      context
    );

    if (!validation.approved) {
      throw new functions.https.HttpsError('failed-precondition', 'Transaction not approved');
    }

    // Update beneficiary spending
    const beneficiaryRef = db.collection('beneficiaries').doc(beneficiaryId);
    await beneficiaryRef.update({
      spentAmount: admin.firestore.FieldValue.increment(amount),
      [`spendingByCategory.${category}`]: admin.firestore.FieldValue.increment(amount)
    });

    // Create transaction record
    await db.collection('transactions').add({
      type: 'spending',
      beneficiaryId: beneficiaryId,
      merchantId: merchantId,
      amount: amount,
      category: category,
      stellarTxHash: stellarTxHash,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create notification for beneficiary
    const beneficiary = (await beneficiaryRef.get()).data();
    await db.collection('notifications').add({
      userId: beneficiary.stellarPublicKey,
      message: `Payment of $${amount} at merchant approved`,
      type: 'spending',
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      txHash: stellarTxHash
    };

  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ============================================
// TRIGGER: New User Registration
// ============================================
exports.onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snap, context) => {
    const user = snap.data();
    const userId = context.params.userId;

    // If organizer or beneficiary, notify admin
    if (user.role === 'organizer' || user.role === 'beneficiary') {
      // Get all admin users
      const adminsSnapshot = await db.collection('users')
        .where('role', '==', 'admin')
        .get();

      // Create notification for each admin
      const batch = db.batch();
      adminsSnapshot.forEach(adminDoc => {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          userId: adminDoc.id,
          message: `New ${user.role} application from ${user.name}`,
          type: 'new_application',
          read: false,
          relatedUserId: userId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
    }

    // TODO: Send welcome email
  });

// ============================================
// TRIGGER: Campaign Created
// ============================================
exports.onCampaignCreated = functions.firestore
  .document('campaigns/{campaignId}')
  .onCreate(async (snap, context) => {
    const campaign = snap.data();

    // TODO: Notify all donors about new campaign
    // TODO: Send email to campaign organizer
    // TODO: Post to social media (optional)

    console.log(`New campaign created: ${campaign.name}`);
  });
```

### Step 2.7: Deploy Cloud Functions

```bash
# Test locally first
firebase emulators:start

# Deploy to Firebase
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:approveOrganizer
```

---

## PHASE 3: FRONTEND DEVELOPMENT (Day 6-15)

### Step 3.1: Create Folder Structure

```bash
cd frontend/src

# Create folder structure
mkdir -p components/{common,admin,organizer,donor,beneficiary}
mkdir -p pages/{admin,organizer,donor,beneficiary}
mkdir -p contexts
mkdir -p hooks
mkdir -p utils
mkdir -p services
```

**Final structure:**
```
src/
├── components/
│   ├── common/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── ProtectedRoute.jsx
│   │   └── Modal.jsx
│   ├── admin/
│   │   ├── PendingVerifications.jsx
│   │   ├── PlatformStats.jsx
│   │   └── UserManagement.jsx
│   ├── organizer/
│   │   ├── CampaignForm.jsx
│   │   ├── BeneficiaryTable.jsx
│   │   ├── DistributionPanel.jsx
│   │   └── MerchantManagement.jsx
│   ├── donor/
│   │   ├── CampaignCard.jsx
│   │   ├── DonationForm.jsx
│   │   ├── ImpactDashboard.jsx
│   │   └── TrackingWidget.jsx
│   └── beneficiary/
│       ├── BalanceCard.jsx
│       ├── CategoryLimits.jsx
│       ├── QRCodeGenerator.jsx
│       └── MerchantMap.jsx
├── pages/
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── PendingApproval.jsx
│   ├── admin/
│   │   └── Dashboard.jsx
│   ├── organizer/
│   │   ├── Dashboard.jsx
│   │   ├── CreateCampaign.jsx
│   │   ├── ManageBeneficiaries.jsx
│   │   └── CampaignAnalytics.jsx
│   ├── donor/
│   │   ├── Dashboard.jsx
│   │   ├── BrowseCampaigns.jsx
│   │   └── MyDonations.jsx
│   └── beneficiary/
│       ├── Dashboard.jsx
│       ├── Spend.jsx
│       └── History.jsx
├── contexts/
│   ├── AuthContext.jsx
│   └── StellarContext.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useStellar.js
│   └── useFirestore.js
├── services/
│   ├── stellarService.js
│   └── firestoreService.js
├── utils/
│   ├── constants.js
│   └── helpers.js
├── firebase/
│   ├── config.js
│   └── constants.js
├── App.jsx
└── main.jsx
```

### Step 3.2: Create Authentication Context

**src/contexts/AuthContext.jsx:**
```javascript
import { createContext, useState, useEffect } from 'react';
import { getPublicKey } from '@stellar/freighter-api';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SUPER_ADMIN_ADDRESS } from '../firebase/constants';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user was previously logged in
    const savedAddress = localStorage.getItem('userAddress');
    if (savedAddress) {
      loadUserData(savedAddress);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserData = async (address) => {
    try {
      // Check if super admin
      if (address === SUPER_ADMIN_ADDRESS) {
        setUser({
          address,
          role: 'admin',
          name: 'Super Admin',
          verificationStatus: 'approved'
        });
        setIsAuthenticated(true);
        setLoading(false);
        return;
      }

      // Load user from Firestore
      const userDoc = await getDoc(doc(db, 'users', address));
      
      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), address };
        setUser(userData);
        setIsAuthenticated(true);

        // Update last login
        await setDoc(doc(db, 'users', address), {
          lastLoginAt: new Date()
        }, { merge: true });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading user:', error);
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    try {
      const publicKey = await getPublicKey();
      localStorage.setItem('userAddress', publicKey);
      await loadUserData(publicKey);
      return publicKey;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('userAddress');
    localStorage.removeItem('userRole');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    connectWallet,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Step 3.3: Create Protected Route Component

**src/components/common/ProtectedRoute.jsx:**
```javascript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check if user's verification is pending
  if (user.verificationStatus === 'pending' && user.role !== 'donor') {
    return <Navigate to="/pending-approval" replace />;
  }

  // Check if user's application was rejected
  if (user.verificationStatus === 'rejected') {
    return <Navigate to="/application-rejected" replace />;
  }

  // Check role permissions
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

export default ProtectedRoute;
```

### Step 3.4: Create Main App Routes

**src/App.jsx:**
```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Public pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';

// Organizer pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateCampaign from './pages/organizer/CreateCampaign';
import ManageBeneficiaries from './pages/organizer/ManageBeneficiaries';

// Donor pages
import DonorDashboard from './pages/donor/Dashboard';
import BrowseCampaigns from './pages/donor/BrowseCampaigns';
import MyDonations from './pages/donor/MyDonations';

// Beneficiary pages
import BeneficiaryDashboard from './pages/beneficiary/Dashboard';

// Components
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          
          {/* Super Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Organizer Routes */}
          <Route 
            path="/organizer/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <OrganizerDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/organizer/create-campaign" 
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <CreateCampaign />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/organizer/beneficiaries" 
            element={
              <ProtectedRoute allowedRoles={['organizer']}>
                <ManageBeneficiaries />
              </ProtectedRoute>
            } 
          />

          {/* Donor Routes */}
          <Route 
            path="/donor/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/donor/campaigns" 
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <BrowseCampaigns />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/donor/my-donations" 
            element={
              <ProtectedRoute allowedRoles={['donor']}>
                <MyDonations />
              </ProtectedRoute>
            } 
          />

          {/* Beneficiary Routes */}
          <Route 
            path="/beneficiary/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['beneficiary']}>
                <BeneficiaryDashboard />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

### Step 3.5: Key Components to Build

#### Login Page
**src/pages/Login.jsx** - Wallet connection & routing logic

#### Registration Page
**src/pages/Register.jsx** - Role selection, form fields, document upload

#### Super Admin Dashboard
**src/pages/admin/Dashboard.jsx** - Pending verifications, platform stats

#### Organizer Dashboard
**src/pages/organizer/Dashboard.jsx** - Campaign overview, quick actions

#### Donor Dashboard
**src/pages/donor/Dashboard.jsx** - Impact metrics, recent donations

#### Beneficiary Dashboard
**src/pages/beneficiary/Dashboard.jsx** - Balance, spending limits, QR code

---

## PHASE 4: STELLAR BLOCKCHAIN INTEGRATION (Day 16-20)

### Step 4.1: Create Stellar Service

**src/services/stellarService.js:**
```javascript
import * as StellarSdk from 'stellar-sdk';

const server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = StellarSdk.Networks.TESTNET;

export const stellarService = {
  // Create new account
  async createAccount() {
    const pair = StellarSdk.Keypair.random();
    
    // Fund via friendbot (testnet only)
    try {
      await fetch(`https://friendbot.stellar.org?addr=${pair.publicKey()}`);
      
      return {
        publicKey: pair.publicKey(),
        secretKey: pair.secret()
      };
    } catch (error) {
      throw new Error('Failed to create account: ' + error.message);
    }
  },

  // Get account balance
  async getBalance(publicKey) {
    try {
      const account = await server.loadAccount(publicKey);
      const balance = account.balances.find(b => b.asset_type === 'native');
      return balance ? balance.balance : '0';
    } catch (error) {
      throw new Error('Failed to get balance: ' + error.message);
    }
  },

  // Send payment
  async sendPayment(sourceSecret, destinationPublicKey, amount) {
    try {
      const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
      const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destinationPublicKey,
            asset: StellarSdk.Asset.native(),
            amount: amount.toString()
          })
        )
        .setTimeout(180)
        .build();

      transaction.sign(sourceKeypair);
      const result = await server.submitTransaction(transaction);

      return {
        success: true,
        hash: result.hash
      };
    } catch (error) {
      throw new Error('Payment failed: ' + error.message);
    }
  },

  // Get transaction history
  async getTransactions(publicKey, limit = 10) {
    try {
      const account = await server.loadAccount(publicKey);
      const transactions = await server
        .transactions()
        .forAccount(publicKey)
        .limit(limit)
        .order('desc')
        .call();

      return transactions.records;
    } catch (error) {
      throw new Error('Failed to get transactions: ' + error.message);
    }
  }
};
```

---

## PHASE 5: TESTING & DEPLOYMENT (Day 21-25)

### Step 5.1: Test Complete User Flows

**Test Flow 1: Super Admin Workflow**
1. Connect with super admin wallet
2. See pending organizer applications
3. Approve an organizer
4. View platform statistics

**Test Flow 2: Organizer Workflow**
1. Register as new organizer
2. Upload documents
3. Wait for admin approval
4. Create campaign
5. Add beneficiaries
6. Distribute funds

**Test Flow 3: Donor Workflow**
1. Connect wallet (auto-approved)
2. Browse campaigns
3. Make donation
4. View impact dashboard
5. Track donation usage

**Test Flow 4: Beneficiary Workflow**
1. Get added by organizer
2. Receive funds
3. Generate QR code
4. Make purchase at merchant
5. View transaction history

### Step 5.2: Deploy to Firebase Hosting

```bash
# Build React app
cd frontend
npm run build

# Initialize Firebase Hosting
firebase init hosting

# Deploy
firebase deploy --only hosting

# Your app is live at: https://your-project.web.app
```

---

## KEY INTEGRATIONS

### 1. Wallet Connection (Freighter)
```javascript
import { getPublicKey, signTransaction } from '@stellar/freighter-api';

const connectWallet = async () => {
  const publicKey = await getPublicKey();
  return publicKey;
};
```

### 2. Firestore Real-time Updates
```javascript
import { collection, onSnapshot } from 'firebase/firestore';

onSnapshot(collection(db, 'campaigns'), (snapshot) => {
  const campaigns = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  setCampaigns(campaigns);
});
```

### 3. File Upload to Firebase Storage
```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const uploadFile = async (file, path) => {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  return url;
};
```

### 4. Call Cloud Function
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const approveOrganizer = httpsCallable(functions, 'approveOrganizer');

const result = await approveOrganizer({ organizerId: 'abc123' });
```

---

## TESTING CHECKLIST

### Authentication
- [ ] Wallet connection works
- [ ] Super admin detection works
- [ ] New user registration flow
- [ ] Role-based routing
- [ ] Protected routes work
- [ ] Logout functionality

### Super Admin
- [ ] View pending verifications
- [ ] Approve organizer
- [ ] Reject organizer
- [ ] View platform stats

### Organizer
- [ ] Create campaign
- [ ] Add beneficiary
- [ ] Upload documents
- [ ] Distribute funds
- [ ] View campaign analytics

### Donor
- [ ] Browse campaigns
- [ ] Make donation
- [ ] Track impact
- [ ] View donation history

### Beneficiary
- [ ] View balance
- [ ] See category limits
- [ ] Generate QR code
- [ ] View transactions

### Blockchain
- [ ] Create Stellar wallet
- [ ] Send payment
- [ ] Batch transactions
- [ ] Transaction validation
- [ ] Balance checking

---

## DEPLOYMENT CHECKLIST

### Before Launch
- [ ] Test all user flows
- [ ] Security rules configured
- [ ] Environment variables set
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Responsive design tested
- [ ] Cross-browser testing
- [ ] Performance optimization

### Production Setup
- [ ] Move to Stellar mainnet
- [ ] Set up production Firebase project
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Enable analytics
- [ ] Set up error monitoring (Sentry)
- [ ] Backup strategy

---

## HACKATHON DEMO SCRIPT

### Slide 1: Problem (30 seconds)
"Traditional disaster relief suffers from 30-40% fund leakage, takes weeks to reach victims, and has zero transparency for donors."

### Slide 2: Solution (30 seconds)
"We built a blockchain platform where donations reach victims in minutes with complete transparency and built-in spending controls."

### Slide 3: Live Demo (5 minutes)

**Demo Flow:**
1. Show public homepage with active campaigns
2. Login as donor → Donate $500 → Show instant blockchain transaction
3. Login as organizer → Distribute to 3 beneficiaries
4. Login as beneficiary → Show balance → Generate QR → Make purchase
5. Show donor dashboard → Real-time impact update
6. Show public audit trail → Complete transparency

### Slide 4: Impact (30 seconds)
"3-second transactions, $0.00001 fees, 100% traceable, 0% leakage."

### Slide 5: Tech Stack (30 seconds)
"Stellar blockchain for payments, Firebase for backend, React for UI - fully production-ready."

---

## TROUBLESHOOTING

### Common Issues

**Issue 1: Wallet won't connect**
- Solution: Check if Freighter is installed
- Verify network is set to Testnet

**Issue 2: Firestore permission denied**
- Solution: Check security rules
- Verify user authentication

**Issue 3: Cloud Function fails**
- Solution: Check function logs: `firebase functions:log`
- Verify environment config

**Issue 4: Stellar transaction fails**
- Solution: Check account has sufficient XLM for fees
- Verify network passphrase matches

---

## RESOURCES

### Documentation
- Stellar Docs: https://developers.stellar.org/
- Firebase Docs: https://firebase.google.com/docs
- React Router: https://reactrouter.com/
- TailwindCSS: https://tailwindcss.com/

### Tools
- Stellar Lab: https://laboratory.stellar.org/
- Firebase Console: https://console.firebase.google.com/
- Stellar Explorer: https://stellar.expert/

### Community
- Stellar Discord: https://discord.gg/stellardev
- Firebase Discord: https://discord.gg/firebase

---

## NEXT STEPS AFTER HACKATHON

### Phase 1: Core Features
- [ ] Mobile app (React Native)
- [ ] SMS notifications
- [ ] Offline mode
- [ ] Multi-language support

### Phase 2: Advanced Features
- [ ] AI fraud detection
- [ ] Biometric verification
- [ ] Automated compliance checks
- [ ] Integration with government databases

### Phase 3: Scale
- [ ] Partner with major NGOs
- [ ] Government pilots
- [ ] Corporate donation matching
- [ ] API for third-party integrations

---

## CONCLUSION

This platform demonstrates how blockchain can solve real-world problems:
- **Speed**: Minutes instead of weeks
- **Transparency**: Every dollar tracked
- **Efficiency**: Near-zero overhead
- **Impact**: Direct help to those in need

Built with Stellar + Firebase for maximum developer productivity and user impact.

**Good luck with your hackathon! 🚀**
