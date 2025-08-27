import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBzNcd_MbwBhR-JvZrtFTjbTTLqI4PyKEY",
  authDomain: "cravecartauth.firebaseapp.com",
  projectId: "cravecartauth",
  storageBucket: "cravecartauth.firebasestorage.app",
  messagingSenderId: "932036084192",
  appId: "1:932036084192:web:ec8faacc02528f8936ab85",
  measurementId: "G-SY8DX083PP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Enable phone authentication for testing
auth.settings.appVerificationDisabledForTesting = true; // Set to true for testing

export default app; 