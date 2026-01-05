
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyApNCeGSsrhlCCgHhsS2OGYCdlNiz3K75s",
  authDomain: "insure-30715.firebaseapp.com",
  projectId: "insure-30715",
  storageBucket: "insure-30715.firebasestorage.app",
  messagingSenderId: "913828008756",
  appId: "1:913828008756:web:a6238a65ec5df8ecbc8b61",
  measurementId: "G-HZXD9M304T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Analytics is optional and might fail in some environments (like strict CORS or SSR)
let analytics;
try {
  analytics = getAnalytics(app);
} catch (e) {
  console.warn("Firebase Analytics could not be initialized", e);
}
export { analytics };
