import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Default config for development/initialization
// This will be overwritten by firebase-applet-config.json if it exists
let firebaseConfig = {
  apiKey: "TODO",
  authDomain: "TODO",
  projectId: "TODO",
  storageBucket: "TODO",
  messagingSenderId: "TODO",
  appId: "TODO"
};

try {
  // @ts-ignore
  const config = await import('../firebase-applet-config.json');
  firebaseConfig = config.default;
} catch (e) {
  console.warn("Firebase config not found, using defaults. Please set up Firebase in the UI.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
