import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDH1v1SlkJPKWa70hjbm5-sUvVxOBx0eYA",
  authDomain: "eibs-d8b62.firebaseapp.com",
  projectId: "eibs-d8b62",
  storageBucket: "eibs-d8b62.firebasestorage.app",
  messagingSenderId: "449910664850",
  appId: "1:449910664850:web:c0a15e93cceee3a2b51494",
  measurementId: "G-E41FLRMGB6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteCollection(collectionName) {
  console.log(`\n🗑️  Deleting ${collectionName} collection...`);
  const querySnapshot = await getDocs(collection(db, collectionName));
  let count = 0;
  
  for (const document of querySnapshot.docs) {
    await deleteDoc(doc(db, collectionName, document.id));
    count++;
    console.log(`   ✅ Deleted ${collectionName}/${document.id}`);
  }
  
  console.log(`✅ Deleted ${count} documents from ${collectionName}`);
  return count;
}

async function clearAllData() {
  console.log('🚀 Starting Firebase data cleanup...\n');
  console.log('⚠️  WARNING: This will delete ALL data from Firebase!');
  
  try {
    // Delete all collections
    const collections = ['users', 'campaigns', 'donations', 'transactions'];
    let totalDeleted = 0;
    
    for (const collectionName of collections) {
      const deleted = await deleteCollection(collectionName);
      totalDeleted += deleted;
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CLEANUP COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Total documents deleted: ${totalDeleted}`);
    console.log('\nYou can now test the full flow from scratch!');
    console.log('\n📝 Next steps:');
    console.log('1. Register as organizer');
    console.log('2. Create new campaign');
    console.log('3. Register as beneficiary');
    console.log('4. Approve beneficiary');
    console.log('5. Allocate funds');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    process.exit(1);
  }
}

clearAllData();
