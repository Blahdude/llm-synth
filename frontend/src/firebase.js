import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDbT60pGOIIxiUW_tF4znvtaUpwVXndVLk",
  authDomain: "llmsynth.firebaseapp.com",
  projectId: "llmsynth",
  storageBucket: "llmsynth.firebasestorage.app",
  messagingSenderId: "970225381498",
  appId: "1:970225381498:web:f24efee186d21d23b6cbc3",
  measurementId: "G-2CDSX6C6E7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };