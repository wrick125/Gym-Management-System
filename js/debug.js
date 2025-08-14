// js/debug.js
import { auth, db } from "../firebase.js";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// DOM elements
const debugOutput = document.getElementById("debugOutput");
const testFirebaseBtn = document.getElementById("testFirebase");
const resetLoadingBtn = document.getElementById("resetLoading");
const clearConsoleBtn = document.getElementById("clearConsole");

// Utility functions
const log = (message, type = "info") => {
  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry log-${type}`;
  logEntry.innerHTML = `
    <span class="log-time">${timestamp}</span>
    <span class="log-message">${message}</span>
  `;
  debugOutput.appendChild(logEntry);
  debugOutput.scrollTop = debugOutput.scrollHeight;
  console.log(`[${timestamp}] ${message}`);
};

// Test Firebase connection
testFirebaseBtn.addEventListener("click", async () => {
  log("Testing Firebase connection...", "info");
  
  try {
    // Test Firestore write
    const testDoc = doc(db, "test", "connection");
    await setDoc(testDoc, { 
      test: true, 
      timestamp: new Date().toISOString(),
      message: "Connection test"
    });
    log("✅ Firestore write successful", "success");
    
    // Test Firestore read
    const readDoc = await getDoc(testDoc);
    if (readDoc.exists()) {
      log("✅ Firestore read successful", "success");
    } else {
      log("❌ Firestore read failed - document not found", "error");
    }
    
    // Clean up test document
    await deleteDoc(testDoc);
    log("✅ Test document cleaned up", "success");
    
    log("🎉 Firebase connection test completed successfully!", "success");
    
  } catch (error) {
    log(`❌ Firebase connection test failed: ${error.message}`, "error");
    log(`Error code: ${error.code}`, "error");
    console.error("Firebase test error:", error);
  }
});

// Reset loading states
resetLoadingBtn.addEventListener("click", () => {
  log("Resetting loading states...", "warning");
  
  if (window.resetLoadingState) {
    window.resetLoadingState();
    log("✅ Loading states reset successfully", "success");
  } else {
    log("❌ resetLoadingState function not found", "error");
  }
});

// Clear console
clearConsoleBtn.addEventListener("click", () => {
  debugOutput.innerHTML = "";
  console.clear();
  log("Console cleared", "info");
});

// Initial debug information
log("Debug console initialized", "info");
log("Browser: " + navigator.userAgent, "info");
log("Current URL: " + window.location.href, "info");

// Check if Firebase is available
if (typeof auth !== 'undefined') {
  log("✅ Firebase Auth is available", "success");
} else {
  log("❌ Firebase Auth is not available", "error");
}

if (typeof db !== 'undefined') {
  log("✅ Firestore is available", "success");
} else {
  log("❌ Firestore is not available", "error");
}

// Check for common issues
setTimeout(() => {
  log("Checking for common issues...", "info");
  
  // Check if forms exist
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  
  if (!loginForm) {
    log("⚠️ Login form not found (expected on index.html)", "warning");
  }
  
  if (!registerForm) {
    log("⚠️ Register form not found (expected on index.html)", "warning");
  }
  
  // Check for loading states
  const loadingButtons = document.querySelectorAll('button[disabled]');
  if (loadingButtons.length > 0) {
    log(`⚠️ Found ${loadingButtons.length} disabled buttons (possible stuck loading state)`, "warning");
  }
  
}, 1000);

console.log("✅ Debug module loaded"); 