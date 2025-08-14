// auth.js
import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// DOM elements
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const tabBtns = document.querySelectorAll(".tab-btn");
const messageEl = document.getElementById("message");

// Global variables
let isRegistering = false;
let isLoggingIn = false;

// Utility functions
const showMessage = (text, type = "error") => {
  messageEl.textContent = text;
  messageEl.className = `message ${type} show`;
  setTimeout(() => {
    messageEl.classList.remove("show");
  }, 5000);
};

const setLoading = (form, loading) => {
  const btn = form.querySelector("button[type='submit']");
  if (!btn) {
    console.error("Submit button not found in form");
    return;
  }
  
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    console.log("Loading state set to true for", form.id);
  } else {
    btn.disabled = false;
    if (form === loginForm) {
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
    } else {
      btn.innerHTML = '<i class="fas fa-user-plus"></i> Register';
    }
    console.log("Loading state set to false for", form.id);
  }
};

const clearForms = () => {
  loginForm.reset();
  registerForm.reset();
};

// Manual reset function for debugging
const resetLoadingState = () => {
  console.log("Manual reset of loading states");
  isRegistering = false;
  isLoggingIn = false;
  setLoading(registerForm, false);
  setLoading(loginForm, false);
};

// Make it available globally for debugging
window.resetLoadingState = resetLoadingState;

// Tab switching
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const targetTab = btn.dataset.tab;
    
    // Update active tab button
    tabBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    // Show/hide forms
    if (targetTab === "login") {
      loginForm.classList.add("active");
      registerForm.classList.remove("active");
    } else {
      registerForm.classList.add("active");
      loginForm.classList.remove("active");
    }
    
    // Clear message
    messageEl.classList.remove("show");
  });
});

// Register functionality
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (isRegistering) return; // Prevent multiple submissions
  
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const role = document.getElementById("reg-role").value;

  // Validation
  if (!name || !email || !password || !role) {
    showMessage("Please fill in all fields", "warning");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters", "warning");
    return;
  }

  if (!email.includes("@")) {
    showMessage("Please enter a valid email address", "warning");
    return;
  }

  isRegistering = true;
  setLoading(registerForm, true);

  // Add timeout to prevent infinite loading
  const timeoutId = setTimeout(() => {
    if (isRegistering) {
      console.error("Registration timeout - forcing reset");
      isRegistering = false;
      setLoading(registerForm, false);
      showMessage("Registration timed out. Please try again.", "error");
    }
  }, 30000); // 30 second timeout

  try {
    console.log("Starting registration process...");
    
    // Create user account
    console.log("Creating Firebase Auth user...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("Firebase Auth user created successfully:", userCredential.user.uid);
    
    // Save user data to Firestore
    console.log("Saving user data to Firestore...");
    const userData = {
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    await setDoc(doc(db, "users", userCredential.user.uid), userData);
    console.log("User data saved to Firestore successfully");

    showMessage("✅ Registration successful! You can now log in.", "success");
    
    // Sign out the user after registration to prevent auto-redirect
    console.log("Signing out user after registration...");
    await signOut(auth);
    console.log("User signed out successfully");
    
    // Clear form
    registerForm.reset();
    
    // Switch to login tab after a short delay
    setTimeout(() => {
      document.querySelector('[data-tab="login"]').click();
      // Pre-fill email in login form
      document.getElementById("login-email").value = email;
      document.getElementById("login-role").value = role;
    }, 1000);
    
  } catch (error) {
    console.error("Registration error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    let errorMessage = "Registration failed. Please try again.";
    
    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "This email is already registered. Please login instead.";
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address.";
        break;
      case "auth/weak-password":
        errorMessage = "Password is too weak. Please choose a stronger password.";
        break;
      case "auth/network-request-failed":
        errorMessage = "Network error. Please check your internet connection.";
        break;
      case "permission-denied":
        errorMessage = "Database permission denied. Please check Firebase rules.";
        break;
      case "unavailable":
        errorMessage = "Service temporarily unavailable. Please try again.";
        break;
      default:
        errorMessage = `Registration failed: ${error.message}`;
    }
    
    showMessage(errorMessage, "error");
  } finally {
    console.log("Registration process completed, resetting loading state...");
    clearTimeout(timeoutId); // Clear the timeout
    isRegistering = false;
    setLoading(registerForm, false);
  }
});

// Login functionality
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (isLoggingIn) return; // Prevent multiple submissions
  
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const selectedRole = document.getElementById("login-role").value;

  // Validation
  if (!email || !password) {
    showMessage("Please enter both email and password", "warning");
    return;
  }

  // Role validation is now optional - we'll auto-detect if not selected
  const useAutoDetect = !selectedRole;

  isLoggingIn = true;
  setLoading(loginForm, true);

  // Add timeout to prevent infinite loading
  const timeoutId = setTimeout(() => {
    if (isLoggingIn) {
      console.error("Login timeout - forcing reset");
      isLoggingIn = false;
      setLoading(loginForm, false);
      showMessage("Login timed out. Please try again.", "error");
    }
  }, 15000); // 15 second timeout

  try {
    console.log("Starting login process...");
    console.log("Email:", email);
    console.log("Selected role:", selectedRole);
    
    // Sign in user
    console.log("Attempting Firebase Auth sign in...");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Firebase Auth successful:", userCredential.user.uid);
    
    // Redirect immediately after auth; fetch/update profile in background
    console.log("Auth OK, redirecting immediately to home page...");
    showMessage("✅ Login successful! Redirecting...", "success");
    setTimeout(() => {
      window.location.href = "home.html";
    }, 300);

    // Fire-and-forget profile fetch and lastLogin update (non-blocking)
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Optional role mismatch warning only in console to avoid blocking UX
          if (!useAutoDetect && userData.role !== selectedRole) {
            console.warn(`Role mismatch: stored=${userData.role}, selected=${selectedRole}`);
          }
          await setDoc(doc(db, "users", userCredential.user.uid), {
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } else {
          console.warn("User document not found during background update");
        }
      } catch (bgErr) {
        console.warn("Background profile update failed:", bgErr);
      }
    })();
    
  } catch (error) {
    console.error("Login error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    
    let errorMessage = "Login failed. Please try again.";
    
    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "No account found with this email. Please register first.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password. Please try again.";
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      case "auth/network-request-failed":
        errorMessage = "Network error. Please check your internet connection.";
        break;
      case "permission-denied":
        errorMessage = "Database permission denied. Please check Firebase rules.";
        break;
      case "unavailable":
        errorMessage = "Service temporarily unavailable. Please try again.";
        break;
      default:
        errorMessage = `Login failed: ${error.message}`;
    }
    
    showMessage(errorMessage, "error");
  } finally {
    console.log("Login process completed, clearing timeout and resetting loading state...");
    clearTimeout(timeoutId);
    isLoggingIn = false;
    setLoading(loginForm, false);
  }
});

// Check authentication state on page load (only for already logged in users)
onAuthStateChanged(auth, (user) => {
  // Only redirect if user is already logged in and we're not in the middle of registration/login
  if (user && !isRegistering && !isLoggingIn) {
    // Redirect to home page instead of specific dashboards
    window.location.href = "home.html";
  }
});

console.log("✅ Authentication module loaded"); 