import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./eibs-firebase-adminsdk.json', 'utf-8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://eibs-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

async function updateCampaigns() {
  try {
    console.log('📋 Fetching all campaigns...');
    
    const campaignRef = db.collection('campaigns');
    const snapshot = await campaignRef.get();
    
    console.log(`Found ${snapshot.size} campaigns\n`);
    
    let updated = 0;
    
    for (const doc of snapshot.docs) {
      const campaign = doc.data();
      
      console.log(`Campaign: ${campaign.title || 'Unknown'}`);
      console.log(`  Document ID: ${doc.id}`);
      console.log(`  Current blockchainAddress: ${campaign.blockchainAddress || 'NOT SET'}`);
      
      // If missing blockchainAddress, this is a problem - need to know the campaign contract address
      if (!campaign.blockchainAddress && !campaign.contractAddress) {
        console.log(`  ⚠️ WARNING: No blockchain address found!`);
      }
    }
    
    // Manually update the test campaign
    const testCampaignAddress = '0xF003Fe6c9066A2e829c45F3e46d76af09CC60367';
    
    console.log('\n🔧 Updating campaigns with known blockchain address...');
    
    const updates = await campaignRef.where('title', '==', 'Emergency Medical Relief').limit(1).get();
    
    for (const doc of updates.docs) {
      console.log(`\n✏️ Updating: ${doc.data().title}`);
      await doc.ref.update({
        blockchainAddress: testCampaignAddress
      });
      console.log(`✅ Updated with blockchain address: ${testCampaignAddress}`);
      updated++;
    }
    
    if (updated === 0) {
      console.log('\n⚠️ No campaigns matched. Showing all campaigns:');
      const allCampaigns = await campaignRef.get();
      for (const doc of allCampaigns.docs) {
        const data = doc.data();
        console.log(`  - "${data.title}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

updateCampaigns();
