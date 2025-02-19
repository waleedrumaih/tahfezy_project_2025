import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc 
} from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyDtOU3LE0A0gUIiwye_u_JXIy9akwHWcoQ",
  authDomain: "tahfeezy-99291.firebaseapp.com",
  projectId: "tahfeezy-99291",
  storageBucket: "tahfeezy-99291.appspot.com",
  messagingSenderId: "301255934141",
  appId: "1:301255934141:web:a565f826498698dc1ef7d4",
  measurementId: "G-6MY4PRGGT6"
};

console.log('Firebase Config:', {
  apiKey: process.env.REACT_APP_API_KEY ? 'exists' : 'missing',
  authDomain: process.env.REACT_APP_AUTH_DOMAIN ? 'exists' : 'missing',
  projectId: process.env.REACT_APP_PROJECT_ID ? 'exists' : 'missing'
});

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize reCAPTCHA verifier
const initRecaptcha = () => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
      'size': 'invisible'
    }, auth);
  }
};

// Export everything
export { 
  db, 
  auth,
  googleProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  initRecaptcha,
  collection, 
  addDoc, 
  updateDoc,
  query, 
  where, 
  getDocs, 
  deleteDoc,
  doc,
  getDoc
};