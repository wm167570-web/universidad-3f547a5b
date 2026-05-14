import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCXv_pbxc2yXgr_voMzFL6el6ipvDxDseg",
  authDomain: "academicopro-56462.firebaseapp.com",
  projectId: "academicopro-56462",
  storageBucket: "academicopro-56462.firebasestorage.app",
  messagingSenderId: "900131451639",
  appId: "1:900131451639:web:96461b5b5d3fb0ae5119f2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
