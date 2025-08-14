// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdqQFNnBQ3qjTahZ2Y2uSzY-UHTMBp-JQ",
  authDomain: "gym-management-system-9897b.firebaseapp.com",
  projectId: "gym-management-system-9897b",
  storageBucket: "gym-management-system-9897b.appspot.com",
  messagingSenderId: "708891381431",
  appId: "1:708891381431:web:14c8c1190ec04363ea4732"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

console.log("✅ Firebase initialized successfully");
console.log("Firebase config:", {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain
});

// Optional: Firestore connection test (disabled in production for performance)
// Enable only during local development if needed
// const testConnection = async () => {
//   try {
//     console.log("Testing Firestore connection...");
//     const testDoc = doc(db, "test", "connection");
//     await setDoc(testDoc, { test: true, timestamp: new Date() });
//     console.log("✅ Firestore connection successful");
//     await deleteDoc(testDoc);
//   } catch (error) {
//     console.error("❌ Firestore connection failed:", error);
//   }
// };
// if (location.hostname === "localhost") {
//   testConnection();
// }