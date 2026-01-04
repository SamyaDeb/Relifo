/**
 * Update beneficiary Firebase document with wallet contract address
 * Run: node updateBeneficiaryWallet.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAaKC9r-hIeN0aNnqOTzLR8G90LL9wPOZk",
  authDomain: "relifo-35b0a.firebaseapp.com",
  projectId: "relifo-35b0a",
  storageBucket: "relifo-35b0a.firebasestorage.app",
  messagingSenderId: "1037743722356",
  appId: "1:1037743722356:web:c3e3a48bb66e4f54c12f57"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateBeneficiary() {
  const beneficiaryAddress = "0x120a2ec009895c4eb837c56bcb70d42fC37CcCeD";
  const contractWalletAddress = "0x4C286B083Ae68b764515BebBC13d7D8E378DE2e1";
  const allocatedAmount = 5;

  console.log('\n🔄 Updating beneficiary Firebase document...');
  console.log('Beneficiary Address:', beneficiaryAddress);
  console.log('Contract Wallet:', contractWalletAddress);
  console.log('Allocated Amount:', allocatedAmount, 'RELIEF\n');

  try {
    // First, check if document exists
    const beneficiaryRef = doc(db, 'users', beneficiaryAddress);
    const beneficiaryDoc = await getDoc(beneficiaryRef);

    if (!beneficiaryDoc.exists()) {
      console.error('❌ Beneficiary document not found!');
      console.log('\nTrying lowercase address...');
      
      const lowerRef = doc(db, 'users', beneficiaryAddress.toLowerCase());
      const lowerDoc = await getDoc(lowerRef);
      
      if (!lowerDoc.exists()) {
        console.error('❌ Document not found with lowercase either!');
        console.log('\nPlease check Firebase Console manually.');
        return;
      }
      
      // Update lowercase version
      console.log('✅ Found document with lowercase address');
      await updateDoc(lowerRef, {
        contractWalletAddress: contractWalletAddress,
        allocatedAmount: allocatedAmount,
        updatedAt: new Date().toISOString()
      });
      
      console.log('\n✅ Successfully updated beneficiary document!');
      console.log('Updated fields:');
      console.log('  - contractWalletAddress:', contractWalletAddress);
      console.log('  - allocatedAmount:', allocatedAmount);
      return;
    }

    // Document exists with exact case
    console.log('✅ Found beneficiary document');
    const currentData = beneficiaryDoc.data();
    console.log('\nCurrent data:');
    console.log('  - Status:', currentData.status);
    console.log('  - Role:', currentData.role);
    console.log('  - Campaign ID:', currentData.campaignId);
    console.log('  - Contract Wallet:', currentData.contractWalletAddress || 'NOT SET');
    console.log('  - Allocated Amount:', currentData.allocatedAmount || 'NOT SET');

    // Update the document
    await updateDoc(beneficiaryRef, {
      contractWalletAddress: contractWalletAddress,
      allocatedAmount: allocatedAmount,
      updatedAt: new Date().toISOString()
    });

    console.log('\n✅ Successfully updated beneficiary document!');
    console.log('Updated fields:');
    console.log('  - contractWalletAddress:', contractWalletAddress);
    console.log('  - allocatedAmount:', allocatedAmount);
    
    console.log('\n🎉 Done! The beneficiary dashboard should now show the allocated funds.');
    console.log('Ask the beneficiary to refresh their browser.');

  } catch (error) {
    console.error('\n❌ Error updating beneficiary:', error);
    console.error('Error details:', error.message);
  }

  process.exit(0);
}

updateBeneficiary();
