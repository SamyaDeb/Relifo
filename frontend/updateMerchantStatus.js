const admin = require('firebase-admin');

// Initialize Firebase Admin (you may need to add service account)
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function updateMerchantStatus() {
  const merchantWallet = '0x71eaa648b2a276521C19C6b2ccecA29eD0Ae0c46';
  
  // Find the user with this wallet address
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('walletAddress', '==', merchantWallet).get();
  
  if (snapshot.empty) {
    console.log('No user found with wallet:', merchantWallet);
    return;
  }
  
  for (const doc of snapshot.docs) {
    console.log('Updating user:', doc.id, doc.data().name);
    await doc.ref.update({ status: 'approved' });
    console.log('✅ Status updated to approved');
  }
  
  process.exit(0);
}

updateMerchantStatus().catch(console.error);
