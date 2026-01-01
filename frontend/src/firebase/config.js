import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if API key is set
let app = null;
let db = null;
let analytics = null;
let functions = null;
let storage = null;

if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    analytics = getAnalytics(app);
    functions = getFunctions(app);
    storage = getStorage(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.warn('⚠️ Firebase initialization failed:', error.message);
  }
} else {
  console.warn('⚠️ Firebase not configured - Add credentials to .env file');
}

export { db, analytics, functions, storage };
export default app;
