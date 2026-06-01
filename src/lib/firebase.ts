import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCXv_pbxc2yXgr_voMzfL6el6ipvDxDseg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "academicopro-56462.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "academicopro-56462",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "academicopro-56462.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "900131451639",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:900131451639:web:96461b5b5d3fb0ae5119f2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
