import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, listAll, deleteObject } from 'firebase/storage';

// Firebase config from your .env
const firebaseConfig = {
  apiKey: "AIzaSyA6pVDDazH-jpWnYmIUYhM62E7jGi-NXSA",
  authDomain: "relifo-7fffd.firebaseapp.com",
  projectId: "relifo-7fffd",
  storageBucket: "relifo-7fffd.firebasestorage.app",
  messagingSenderId: "179208968872",
  appId: "1:179208968872:web:d6c399e133ffbb65b3009d",
  measurementId: "G-MGZD2XJLC5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

async function clearCollection(collectionName) {
  console.log(`🗑️  Clearing ${collectionName}...`);
  const snapshot = await getDocs(collection(db, collectionName));
  const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, collectionName, document.id)));
  await Promise.all(deletePromises);
  console.log(`✅ Deleted ${snapshot.docs.length} documents from ${collectionName}`);
}

async function clearStorage() {
  console.log('🗑️  Clearing verification documents from Storage...');
  try {
    const storageRef = ref(storage, 'verification-documents');
    const fileList = await listAll(storageRef);
    
    // Delete all files in all subdirectories
    for (const folderRef of fileList.prefixes) {
      const files = await listAll(folderRef);
      const deletePromises = files.items.map(fileRef => deleteObject(fileRef));
      await Promise.all(deletePromises);
      console.log(`✅ Deleted ${files.items.length} files from ${folderRef.fullPath}`);
    }
  } catch (error) {
    console.log('⚠️  Storage clearing skipped (may be empty):', error.message);
  }
}

async function resetDatabase() {
  console.log('🚀 Starting database reset...\n');
  
  try {
    // Clear all user collections
    await clearCollection('users');
    await clearCollection('donor_profile');
    await clearCollection('organizer_profile');
    await clearCollection('beneficiary_profile');
    await clearCollection('campaigns');
    
    // Clear storage
    await clearStorage();
    
    console.log('\n✅ Database reset complete! Your website is now clean.');
    console.log('You can now register new users from scratch.');
    
  } catch (error) {
    console.error('❌ Error resetting database:', error);
  }
  
  process.exit(0);
}

resetDatabase();
