import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "AIzaSyDc4qsqJohqtFhz6Bjo7htQzlueByBabTc",
  authDomain: "bussinesstax.firebaseapp.com",
  projectId: "bussinesstax",
  storageBucket: "bussinesstax.firebasestorage.app",
  messagingSenderId: "62877617878",
  appId: "1:62877617878:web:c579ee2bb46a0227054377",
  measurementId: "G-976HNZ3XMB"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);