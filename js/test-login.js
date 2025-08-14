// js/test-login.js
import { auth, db } from "../firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// DOM elements
const testOutput = document.getElementById("testOutput");
const testAuthBtn = document.getElementById("testAuth");
const testFirestoreBtn = document.getElementById("testFirestore");
const testLoginBtn = document.getElementById("testLogin");
const quickLoginBtn = document.getElementById("quickLogin");
const createTestAccountBtn = document.getElementById("createTestAccount");

// Utility functions
const log = (message, type = "info") => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry log-${type}`;
  logEntry.innerHTML = `
    <span class="log-time">${timestamp}</span>
    <span class="log-message">${message}</span>
  `;
  testOutput.appendChild(logEntry);
  testOutput.scrollTop = testOutput.scrollHeight;
  console.log(`[${timestamp}] ${message}`);
};

const clearOutput = () => {
  testOutput.innerHTML = "";
};

// Test Firebase Auth
testAuthBtn.addEventListener("click", async () => {
  clearOutput();
  log("Testing Firebase Auth...", "info");
  
  try {
    // Test if auth is available
    if (!auth) {
      throw new Error("Firebase Auth not available");
    }
    
    log("✅ Firebase Auth is available", "success");
    log(`Auth domain: ${auth.config?.authDomain || 'Not set'}`, "info");
    
    // Test auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      log(`Auth state changed: ${user ? 'User logged in' : 'No user'}`, "info");
      unsubscribe();
    });
    
    log("✅ Auth state listener working", "success");
    
  } catch (error) {
    log(`❌ Firebase Auth test failed: ${error.message}`, "error");
    console.error("Auth test error:", error);
  }
});

// Test Firestore
testFirestoreBtn.addEventListener("click", async () => {
  clearOutput();
  log("Testing Firestore connection...", "info");
  
  try {
    // Test write
    const testDoc = doc(db, "test", "login-test");
    await setDoc(testDoc, { 
      test: true, 
      timestamp: new Date().toISOString(),
      message: "Login test"
    });
    log("✅ Firestore write successful", "success");
    
    // Test read
    const readDoc = await getDoc(testDoc);
    if (readDoc.exists()) {
      log("✅ Firestore read successful", "success");
    } else {
      log("❌ Firestore read failed - document not found", "error");
    }
    
    // Cleanup
    await deleteDoc(testDoc);
    log("✅ Test document cleaned up", "success");
    
    log("🎉 Firestore test completed successfully!", "success");
    
  } catch (error) {
    log(`❌ Firestore test failed: ${error.message}`, "error");
    log(`Error code: ${error.code}`, "error");
    console.error("Firestore test error:", error);
  }
});

// Test Login Process
testLoginBtn.addEventListener("click", async () => {
  clearOutput();
  log("Testing login process...", "info");
  
  const testEmail = document.getElementById("testEmail").value;
  const testPassword = document.getElementById("testPassword").value;
  
  if (!testEmail || !testPassword) {
    log("⚠️ Please enter email and password first", "warning");
    return;
  }
  
  try {
    log("Step 1: Attempting Firebase Auth sign in...", "info");
    const startTime = Date.now();
    
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    const authTime = Date.now() - startTime;
    
    log(`✅ Firebase Auth successful (${authTime}ms): ${userCredential.user.uid}`, "success");
    
    log("Step 2: Fetching user data from Firestore...", "info");
    const firestoreStart = Date.now();
    
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
    const firestoreTime = Date.now() - firestoreStart;
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      log(`✅ User data found (${firestoreTime}ms): ${userData.name} (${userData.role})`, "success");
      log(`Total login time: ${Date.now() - startTime}ms`, "success");
    } else {
      log("⚠️ User document not found in Firestore", "warning");
    }
    
    // Sign out after test
    await auth.signOut();
    log("✅ Test completed, signed out", "success");
    
  } catch (error) {
    log(`❌ Login test failed: ${error.message}`, "error");
    log(`Error code: ${error.code}`, "error");
    console.error("Login test error:", error);
  }
});

// Quick Login
quickLoginBtn.addEventListener("click", async () => {
  clearOutput();
  log("Starting quick login test...", "info");
  
  const testEmail = document.getElementById("testEmail").value;
  const testPassword = document.getElementById("testPassword").value;
  
  if (!testEmail || !testPassword) {
    log("⚠️ Please enter email and password", "warning");
    return;
  }
  
  // Add timeout
  const timeoutId = setTimeout(() => {
    log("❌ Login timed out after 10 seconds", "error");
  }, 10000);
  
  try {
    log("Attempting login...", "info");
    const startTime = Date.now();
    
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    log(`✅ Auth successful (${Date.now() - startTime}ms)`, "success");
    
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      log(`✅ Login successful! Welcome ${userData.name}`, "success");
      
      // Redirect to home page
      setTimeout(() => {
        window.location.href = "home.html";
      }, 2000);
      
    } else {
      log("⚠️ User data not found, but auth successful", "warning");
    }
    
  } catch (error) {
    log(`❌ Quick login failed: ${error.message}`, "error");
  } finally {
    clearTimeout(timeoutId);
  }
});

// Create Test Account
createTestAccountBtn.addEventListener("click", async () => {
  clearOutput();
  log("Creating test account...", "info");
  
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const role = document.getElementById("regRole").value;
  
  if (!name || !email || !password) {
    log("⚠️ Please fill all fields", "warning");
    return;
  }
  
  if (password.length < 6) {
    log("⚠️ Password must be at least 6 characters", "warning");
    return;
  }
  
  try {
    log("Step 1: Creating Firebase Auth user...", "info");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    log(`✅ Auth user created: ${userCredential.user.uid}`, "success");
    
    log("Step 2: Saving user data to Firestore...", "info");
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name: name,
      email: email,
      role: role,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });
    log("✅ User data saved to Firestore", "success");
    
    log(`🎉 Test account created successfully!`, "success");
    log(`Name: ${name}`, "info");
    log(`Email: ${email}`, "info");
    log(`Role: ${role}`, "info");
    
    // Auto-fill login form
    document.getElementById("testEmail").value = email;
    document.getElementById("testPassword").value = password;
    
    log("✅ Login form auto-filled with test credentials", "success");
    
    // Sign out after creation to prevent auto-redirect
    await auth.signOut();
    log("✅ Signed out, ready for login test", "success");
    
  } catch (error) {
    log(`❌ Account creation failed: ${error.message}`, "error");
    log(`Error code: ${error.code}`, "error");
    console.error("Account creation error:", error);
  }
});

// Initial test information
log("Login test console initialized", "info");
log("Use the buttons above to test different components", "info");

console.log("✅ Test login module loaded"); 