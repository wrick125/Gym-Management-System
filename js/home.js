// js/home.js
import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// Utility functions
const el = (id) => document.getElementById(id);
const showAlert = (text, type = "success") => {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type}`;
  alertDiv.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
    ${text}
  `;
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
};

const setLoading = (loading) => {
  const overlay = el("loadingOverlay");
  if (!overlay) {
    console.error("Loading overlay not found");
    return;
  }
  
  overlay.style.display = loading ? "flex" : "none";
  console.log("Loading state set to:", loading);
};

// Manual reset function for debugging
const resetHomeLoading = () => {
  console.log("Manual reset of home loading state");
  setLoading(false);
};

// Make it available globally for debugging
window.resetHomeLoading = resetHomeLoading;

// Refresh functionality
el("refreshBtn")?.addEventListener("click", () => {
  console.log("Manual refresh requested");
  window.location.reload();
});

// Logout functionality
el("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "../index.html";
  } catch (error) {
    showAlert("Logout failed", "error");
  }
});

// Dashboard navigation
el("adminBtn")?.addEventListener("click", () => {
  window.location.href = "admin.html";
});

el("memberBtn")?.addEventListener("click", () => {
  window.location.href = "member.html";
});

// Authentication check with faster loading
onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user ? "User logged in" : "No user");
  
  if (!user) {
    console.log("No user found, redirecting to login");
    window.location.href = "../index.html";
    return;
  }

  console.log("User found, loading user data...");
  setLoading(true);

  // Shorter timeout for faster response
  const timeoutId = setTimeout(() => {
    console.error("Loading timeout - forcing reset");
    setLoading(false);
    showAlert("Loading timed out. Please refresh the page.", "error");
  }, 5000); // 5 second timeout

  try {
    console.log("Fetching user data from Firestore...");
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log("User data loaded:", userData);
      
      // Update user name immediately
      const userNameEl = el("userName");
      if (userNameEl) {
        userNameEl.textContent = userData.name || "User";
      }
      
      // Also update the welcome message
      updateWelcomeMessage(userData);
      
    } else {
      console.warn("User document not found in Firestore");
      const userNameEl = el("userName");
      if (userNameEl) {
        userNameEl.textContent = user.email || "User";
      }
      showAlert("User profile not found. Please contact administrator.", "warning");
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    
    // Show user email as fallback
    const userNameEl = el("userName");
    if (userNameEl) {
      userNameEl.textContent = user.email || "User";
    }
    
    showAlert("Error loading user data. Using email as fallback.", "warning");
  } finally {
    console.log("Loading completed, clearing timeout");
    clearTimeout(timeoutId);
    setLoading(false);
  }
});

// Function to update welcome message with user info
function updateWelcomeMessage(userData) {
  // Update header user name
  const userNameEl = el("userName");
  if (userNameEl) {
    userNameEl.textContent = userData.name || "User";
  }
  
  // Update welcome message
  const welcomeMessage = el("welcomeMessage");
  if (welcomeMessage) {
    welcomeMessage.innerHTML = `
      <p>Welcome back, <strong>${userData.name}</strong>!</p>
      <p>You are logged in as: <strong>${userData.role}</strong></p>
      <p>Please select your dashboard below:</p>
    `;
  }
  
  // Update detailed user info
  const userInfo = el("userInfo");
  if (userInfo) {
    userInfo.style.display = "block";
    
    const userNameDisplay = el("userNameDisplay");
    const userRoleDisplay = el("userRoleDisplay");
    const userEmailDisplay = el("userEmailDisplay");
    
    if (userNameDisplay) userNameDisplay.textContent = userData.name || "Not set";
    if (userRoleDisplay) userRoleDisplay.textContent = userData.role || "Not set";
    if (userEmailDisplay) userEmailDisplay.textContent = userData.email || "Not set";
  }
}

// Fallback: If loading takes too long, show the page anyway
setTimeout(() => {
  const overlay = el("loadingOverlay");
  if (overlay && overlay.style.display === "flex") {
    console.warn("Loading timeout fallback - showing page anyway");
    setLoading(false);
    showAlert("Page loaded with timeout. Some features may be limited.", "warning");
  }
}, 8000); // 8 second fallback (faster)

console.log("✅ Home module loaded"); 