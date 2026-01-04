/**
 * ⚠️ IMPORTANT: Run this script in your BROWSER CONSOLE, not in terminal!
 * 
 * This script updates the beneficiary Firebase document with allocation data
 * to fix the dashboard showing "No Funds Allocated Yet"
 */

// 📋 INSTRUCTIONS TO RUN THIS SCRIPT:
// 1. Open your app in browser (http://localhost:5173 or http://localhost:5174)
// 2. Press F12 to open Developer Tools
// 3. Click on "Console" tab
// 4. Copy this ENTIRE file content and paste it into the console
// 5. Press Enter
// 6. Wait for success message
// 7. Refresh the beneficiary dashboard

(async function updateBeneficiaryData() {
  console.log('🔧 Starting beneficiary data update...');
  console.log('━'.repeat(60));
  
  const beneficiaryAddress = '0x120a2ec009895c4eb837c56bcb70d42fC37CcCeD';
  const contractWalletAddress = '0x4C286B083Ae68b764515BebBC13d7D8E378DE2e1';
  const allocatedAmount = 5; // 5 RELIEF tokens
  
  console.log('📍 Beneficiary Address:', beneficiaryAddress);
  console.log('💼 Contract Wallet:', contractWalletAddress);
  console.log('💰 Allocated Amount:', allocatedAmount, 'RELIEF');
  console.log('━'.repeat(60));
  
  try {
    // Import Firebase functions from your app
    const { db } = await import('./src/firebase/config.js');
    const { doc, updateDoc, getDoc, setDoc } = await import('firebase/firestore');
    
    console.log('\n📝 Checking for beneficiary document...');
    
    // Try both exact case and lowercase
    const addresses = [
      beneficiaryAddress,
      beneficiaryAddress.toLowerCase()
    ];
    
    let docRef = null;
    let docSnap = null;
    let foundAddress = null;
    
    for (const addr of addresses) {
      console.log(`  Trying address: ${addr}`);
      const ref = doc(db, 'users', addr);
      const snap = await getDoc(ref);
      
      if (snap.exists()) {
        docRef = ref;
        docSnap = snap;
        foundAddress = addr;
        console.log(`  ✅ Found document with ID: ${addr}`);
        break;
      } else {
        console.log(`  ❌ Not found with ID: ${addr}`);
      }
    }
    
    if (!docSnap || !docSnap.exists()) {
      console.log('\n❌ Beneficiary document not found in Firebase!');
      console.log('\n📝 MANUAL FIX REQUIRED:');
      console.log('━'.repeat(60));
      console.log('1. Go to Firebase Console: https://console.firebase.google.com');
      console.log('2. Select project: relifo-35b0a');
      console.log('3. Go to Firestore Database');
      console.log('4. Navigate to "users" collection');
      console.log(`5. Find document with ID: ${beneficiaryAddress}`);
      console.log('   (Try both exact case and lowercase)');
      console.log('\n6. Add/Update these fields:');
      console.log(`   contractWalletAddress: "${contractWalletAddress}"`);
      console.log(`   allocatedAmount: ${allocatedAmount}`);
      console.log('   updatedAt: (use "Add field" and select timestamp)');
      console.log('━'.repeat(60));
      return;
    }
    
    console.log('\n📄 Current document data:');
    const currentData = docSnap.data();
    console.log('  Status:', currentData.status);
    console.log('  Role:', currentData.role);
    console.log('  Campaign ID:', currentData.campaignId || 'Not set');
    console.log('  Contract Wallet:', currentData.contractWalletAddress || '❌ NOT SET');
    console.log('  Allocated Amount:', currentData.allocatedAmount || '❌ NOT SET');
    
    // Update the document
    console.log('\n🔄 Updating document...');
    await updateDoc(docRef, {
      contractWalletAddress: contractWalletAddress,
      allocatedAmount: allocatedAmount,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Document updated successfully!');
    
    // Verify the update
    console.log('\n🔍 Verifying update...');
    const verifySnap = await getDoc(docRef);
    const verifiedData = verifySnap.data();
    console.log('  Contract Wallet:', verifiedData.contractWalletAddress);
    console.log('  Allocated Amount:', verifiedData.allocatedAmount);
    
    console.log('\n' + '━'.repeat(60));
    console.log('🎉 SUCCESS! Beneficiary data updated in Firebase!');
    console.log('━'.repeat(60));
    console.log('\n👉 Next Steps:');
    console.log('1. Ask beneficiary to REFRESH their browser');
    console.log('2. Dashboard should now show allocated funds');
    console.log('3. Contract wallet address:', contractWalletAddress);
    console.log('4. Current balance should be 5 RELIEF');
    console.log('\n✨ Done!');
    
  } catch (error) {
    console.error('\n❌ Error updating beneficiary data:');
    console.error(error);
    console.log('\n📝 If error persists, update manually in Firebase Console:');
    console.log('━'.repeat(60));
    console.log('1. Firebase Console → Firestore → users collection');
    console.log(`2. Document ID: ${beneficiaryAddress}`);
    console.log('3. Add fields:');
    console.log(`   - contractWalletAddress: ${contractWalletAddress}`);
    console.log(`   - allocatedAmount: ${allocatedAmount}`);
    console.log('━'.repeat(60));
  }
})();