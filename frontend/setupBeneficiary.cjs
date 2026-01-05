#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Load service account key
const serviceAccountPath = path.join(__dirname, 'eibs-firebase-adminsdk.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Firebase service account file not found at:', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://eibs-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function setupBeneficiary() {
  const beneficiaryAddress = '0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A';
  const campaignAddress = '0xF003Fe6c9066A2e829c45F3e46d76af09CC60367';
  
  try {
    console.log('🔍 Checking beneficiary user document...\n');
    console.log('Beneficiary address:', beneficiaryAddress);
    
    // Get or create user document
    const userRef = db.collection('users').doc(beneficiaryAddress.toLowerCase());
    const userDoc = await userRef.get();
    
    if (userDoc.exists()) {
      console.log('👤 User document exists');
      console.log('Current data:', JSON.stringify(userDoc.data(), null, 2));
    } else {
      console.log('❌ User document does not exist - creating...');
    }
    
    // Find or create campaign document
    console.log('\n🔍 Checking campaign document...\n');
    
    const campaignsQuery = await db.collection('campaigns').where('blockchainAddress', '==', campaignAddress).limit(1).get();
    
    let campaignId;
    if (campaignsQuery.empty) {
      console.log('⚠️ No campaign found with blockchainAddress:', campaignAddress);
      console.log('Checking all campaigns...\n');
      
      const allCampaigns = await db.collection('campaigns').get();
      console.log(`Found ${allCampaigns.size} total campaigns:`);
      
      allCampaigns.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: "${data.title || 'Untitled'}" (blockchainAddress: ${data.blockchainAddress || 'NOT SET'})`);
      });
      
      if (allCampaigns.size > 0) {
        const firstCampaign = allCampaigns.docs[0];
        campaignId = firstCampaign.id;
        console.log(`\n📌 Using first campaign: ${campaignId}`);
        
        // Update that campaign with the blockchain address
        console.log(`📝 Updating campaign ${campaignId} with blockchainAddress...`);
        await firstCampaign.ref.update({
          blockchainAddress: campaignAddress
        });
        console.log('✅ Campaign updated');
      } else {
        console.log('❌ No campaigns exist - creating test campaign...');
        
        const newCampaignRef = await db.collection('campaigns').add({
          title: 'Emergency Medical Relief',
          description: 'Test campaign for beneficiary allocation',
          blockchainAddress: campaignAddress,
          organizer: '0xe4E6f890f04A077d39A8C4a1CB7D59Ac6825e76A',
          createdAt: new Date(),
          status: 'active',
          goalAmount: 5000,
          raisedAmount: 5000
        });
        
        campaignId = newCampaignRef.id;
        console.log('✅ Campaign created:', campaignId);
      }
    } else {
      campaignId = campaignsQuery.docs[0].id;
      console.log('✅ Campaign found:', campaignId);
      console.log('Campaign data:', JSON.stringify(campaignsQuery.docs[0].data(), null, 2));
    }
    
    // Update user document with campaignId
    console.log(`\n📝 Updating user document with campaignId: ${campaignId}...`);
    
    await userRef.set({
      role: 'beneficiary',
      polygonAddress: beneficiaryAddress,
      email: `beneficiary@eibs.test`,
      campaignId: campaignId,
      contractWalletAddress: null,
      allocatedAmount: 500,
      createdAt: new Date(),
      status: 'verified'
    }, { merge: true });
    
    console.log('✅ User document updated/created');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Setup Complete!');
    console.log('='.repeat(60));
    console.log(`Beneficiary: ${beneficiaryAddress}`);
    console.log(`Campaign: ${campaignId}`);
    console.log(`Campaign Blockchain Address: ${campaignAddress}`);
    console.log('\nUser can now access beneficiary dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

setupBeneficiary();
