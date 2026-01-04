/**
 * Script to update existing campaign documents with blockchainAddress field
 * Run this in browser console when logged in as organizer
 */

// Import Firebase modules (make sure you're on a page where these are available)
import { db } from './firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

async function updateCampaignsWithBlockchainAddress() {
  console.log('🔧 Starting campaign update...');
  
  try {
    // Get all campaigns
    const campaignsRef = collection(db, 'campaigns');
    const snapshot = await getDocs(campaignsRef);
    
    console.log(`Found ${snapshot.size} campaigns`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const campaignDoc of snapshot.docs) {
      const data = campaignDoc.data();
      
      // Check if blockchainAddress is missing but we have it under another field
      if (!data.blockchainAddress && data.contractAddress) {
        console.log(`Updating campaign ${campaignDoc.id}: ${data.title}`);
        await updateDoc(doc(db, 'campaigns', campaignDoc.id), {
          blockchainAddress: data.contractAddress
        });
        updated++;
      } else if (data.blockchainAddress) {
        console.log(`✓ Campaign ${campaignDoc.id} already has blockchainAddress`);
        skipped++;
      } else {
        console.warn(`⚠️ Campaign ${campaignDoc.id} has no blockchain address at all!`);
      }
    }
    
    console.log('━'.repeat(60));
    console.log('✅ Update complete!');
    console.log(`Updated: ${updated} campaigns`);
    console.log(`Skipped: ${skipped} campaigns (already correct)`);
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error updating campaigns:', error);
  }
}

// Run the update
updateCampaignsWithBlockchainAddress();
