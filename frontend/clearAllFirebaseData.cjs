/**
 * Clear all Firebase data to start fresh
 * Run with: node clearAllData.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

// Firebase config - same as frontend
const firebaseConfig = {
  apiKey: "AIzaSyCJKG-VE6MCSIe3kA2evbzpS2MmyBcqIrg",
  authDomain: "eibs-48bb9.firebaseapp.com",
  projectId: "eibs-48bb9",
  storageBucket: "eibs-48bb9.firebasestorage.app",
  messagingSenderId: "441363074286",
  appId: "1:441363074286:web:c9b8af620ed37d2a6c9c3a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearCollection(collectionName) {
  console.log(`\n🗑️  Clearing ${collectionName}...`);
  
  try {
    const collRef = collection(db, collectionName);
    const snapshot = await getDocs(collRef);
    
    if (snapshot.empty) {
      console.log(`   ✅ ${collectionName} is already empty`);
      return 0;
    }
    
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, collectionName, docSnap.id));
      count++;
    }
    
    console.log(`   ✅ Deleted ${count} documents from ${collectionName}`);
    return count;
  } catch (error) {
    console.error(`   ❌ Error clearing ${collectionName}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log("🚀 Clearing all Firebase data...\n");
  console.log("=".repeat(50));
  
  // Collections to clear
  const collections = [
    'users',
    'campaigns', 
    'donations',
    'beneficiaries',
    'merchants',
    'transactions',
    'allocations',
    'applications',
    'notifications'
  ];
  
  let totalDeleted = 0;
  
  for (const coll of collections) {
    const deleted = await clearCollection(coll);
    totalDeleted += deleted;
  }
  
  console.log("\n" + "=".repeat(50));
  console.log(`🎉 COMPLETE! Deleted ${totalDeleted} total documents`);
  console.log("=".repeat(50));
  console.log("\n💡 Your Firebase database is now empty.");
  console.log("   You can start testing with fresh data.\n");
  
  process.exit(0);
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
