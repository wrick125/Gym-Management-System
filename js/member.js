// js/member.js
import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit
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
  overlay.style.display = loading ? "flex" : "none";
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return formatDate(dateString);
};

// Build enhanced HTML table
const buildTable = (rows, headers) => {
  if (rows.length === 0) {
    return '<div class="empty-state"><i class="fas fa-inbox"></i><p>No data available</p></div>';
  }

  let html = '<div class="table-wrapper"><table><thead><tr>';
  headers.forEach(h => html += `<th>${h}</th>`);
  html += "</tr></thead><tbody>";
  
  rows.forEach(r => {
    html += "<tr>";
    r.forEach(c => html += `<td>${c ?? ""}</td>`);
    html += "</tr>";
  });
  
  html += "</tbody></table></div>";
  return html;
};

// Logout functionality
el("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "../index.html";
  } catch (error) {
    showAlert("Logout failed", "error");
  }
});

// Main authentication and data loading
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  setLoading(true);
  
  try {
    // Get user profile from users collection
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const profile = userDoc.exists() ? userDoc.data() : {};
    
    // Check if user is actually a member
    if (profile.role !== "member") {
      window.location.href = "../admin.html";
      return;
    }
    
    // Set member name
    el("memberName").textContent = profile.name || "Member";
    
    // Render profile
    renderProfile(profile);
    
    // Find member record by email
    let memberId = null;
    const memQ = query(collection(db, "members"), where("email", "==", profile.email || ""));
    const membersSnap = await getDocs(memQ);
    membersSnap.forEach(d => memberId = d.id);
    
    // Load all member-specific data
    await Promise.all([
      renderMembershipStatus(memberId),
      renderBills(memberId),
      renderNotifications(),
      renderDietPlan(memberId),
      renderStoreItems(),
      renderRecentActivity(memberId)
    ]);
    
  } catch (error) {
    console.error("Error loading member data:", error);
    showAlert("Error loading data", "error");
  } finally {
    setLoading(false);
  }
});

// Render profile information
function renderProfile(profile) {
  el("profile").innerHTML = `
    <div class="profile-details">
      <div class="profile-item">
        <i class="fas fa-user"></i>
        <div>
          <span class="label">Name</span>
          <span class="value">${profile.name || "Not set"}</span>
        </div>
      </div>
      <div class="profile-item">
        <i class="fas fa-envelope"></i>
        <div>
          <span class="label">Email</span>
          <span class="value">${profile.email || "Not set"}</span>
        </div>
      </div>
      <div class="profile-item">
        <i class="fas fa-user-tag"></i>
        <div>
          <span class="label">Role</span>
          <span class="value">${profile.role || "Member"}</span>
        </div>
      </div>
      <div class="profile-item">
        <i class="fas fa-calendar"></i>
        <div>
          <span class="label">Member Since</span>
          <span class="value">${profile.createdAt ? formatDate(profile.createdAt) : "Not available"}</span>
        </div>
      </div>
    </div>
  `;
}

// Render membership status
async function renderMembershipStatus(memberId) {
  if (!memberId) {
    el("membershipStatus").innerHTML = `
      <div class="status-item inactive">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <span class="status-label">Status</span>
          <span class="status-value">No membership record found</span>
        </div>
      </div>
    `;
    return;
  }

  try {
    const memberDoc = await getDoc(doc(db, "members", memberId));
    if (memberDoc.exists()) {
      const member = memberDoc.data();
      const joinDate = new Date(member.joinDate);
      const now = new Date();
      const monthsDiff = (now.getFullYear() - joinDate.getFullYear()) * 12 + 
                        (now.getMonth() - joinDate.getMonth());
      
      el("membershipStatus").innerHTML = `
        <div class="status-item active">
          <i class="fas fa-check-circle"></i>
          <div>
            <span class="status-label">Status</span>
            <span class="status-value">Active</span>
          </div>
        </div>
        <div class="status-item">
          <i class="fas fa-calendar-alt"></i>
          <div>
            <span class="status-label">Join Date</span>
            <span class="status-value">${formatDate(member.joinDate)}</span>
          </div>
        </div>
        <div class="status-item">
          <i class="fas fa-clock"></i>
          <div>
            <span class="status-label">Duration</span>
            <span class="status-value">${monthsDiff} months</span>
          </div>
        </div>
        <div class="status-item">
          <i class="fas fa-phone"></i>
          <div>
            <span class="status-label">Phone</span>
            <span class="status-value">${member.phone || "Not provided"}</span>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading membership status:", error);
  }
}

// Render bills
async function renderBills(memberId) {
  if (!memberId) {
    el("myBills").innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice"></i><p>No bills available</p></div>';
    return;
  }

  try {
    const billsQ = query(
      collection(db, "bills"), 
      where("memberId", "==", memberId),
      orderBy("date", "desc")
    );
    const billsSnap = await getDocs(billsQ);
    const rows = [];
    
    billsSnap.forEach(d => {
      const b = d.data();
      const statusClass = b.status === 'paid' ? 'status-paid' : b.status === 'due' ? 'status-due' : 'status-overdue';
      rows.push([
        d.id,
        formatCurrency(b.amount),
        `<span class="status-badge ${statusClass}">${b.status}</span>`,
        b.receiptNo || "-",
        formatDate(b.date)
      ]);
    });
    
    el("myBills").innerHTML = buildTable(
      rows, 
      ["Bill ID", "Amount", "Status", "Receipt", "Date"]
    );
    
  } catch (error) {
    console.error("Error loading bills:", error);
    el("myBills").innerHTML = '<div class="error">Error loading bills</div>';
  }
}

// Render notifications
async function renderNotifications() {
  try {
    const notesQ = query(
      collection(db, "notifications"), 
      where("target", "==", "all"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const notesSnap = await getDocs(notesQ);
    const notifications = [];
    
    notesSnap.forEach(d => {
      const note = d.data();
      notifications.push({
        id: d.id,
        message: note.message,
        createdAt: note.createdAt?.toDate?.() || new Date()
      });
    });
    
    if (notifications.length === 0) {
      el("myNotifications").innerHTML = '<div class="empty-state"><i class="fas fa-bell"></i><p>No notifications</p></div>';
      return;
    }
    
    let html = '<div class="notifications-container">';
    notifications.forEach(note => {
      html += `
        <div class="notification-item">
          <div class="notification-content">
            <p>${note.message}</p>
            <span class="notification-time">${formatRelativeTime(note.createdAt)}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    el("myNotifications").innerHTML = html;
    
  } catch (error) {
    console.error("Error loading notifications:", error);
    el("myNotifications").innerHTML = '<div class="error">Error loading notifications</div>';
  }
}

// Render diet plan
async function renderDietPlan(memberId) {
  if (!memberId) {
    el("myDiet").innerHTML = '<div class="empty-state"><i class="fas fa-apple-alt"></i><p>No diet plan assigned</p></div>';
    return;
  }

  try {
    const dietDoc = await getDoc(doc(db, "diets", memberId));
    if (dietDoc.exists()) {
      const diet = dietDoc.data();
      el("myDiet").innerHTML = `
        <div class="diet-content">
          <div class="diet-text">
            <pre class="mono">${diet.plan}</pre>
          </div>
          <div class="diet-meta">
            <span class="diet-updated">Last updated: ${formatDate(diet.updatedAt)}</span>
          </div>
        </div>
      `;
    } else {
      el("myDiet").innerHTML = '<div class="empty-state"><i class="fas fa-apple-alt"></i><p>No diet plan assigned</p></div>';
    }
  } catch (error) {
    console.error("Error loading diet plan:", error);
    el("myDiet").innerHTML = '<div class="error">Error loading diet plan</div>';
  }
}

// Render store items
async function renderStoreItems() {
  try {
    const storeSnap = await getDocs(query(collection(db, "storeItems"), orderBy("name"), limit(20)));
    const items = [];
    
    storeSnap.forEach(d => {
      const item = d.data();
      items.push({
        id: d.id,
        name: item.name,
        price: item.price,
        stock: item.stock,
        description: item.description
      });
    });
    
    if (items.length === 0) {
      el("storeItems").innerHTML = '<div class="empty-state"><i class="fas fa-store"></i><p>No items available</p></div>';
      return;
    }
    
    let html = '<div class="store-items-grid">';
    items.forEach(item => {
      const stockClass = item.stock > 0 ? 'in-stock' : 'out-of-stock';
      html += `
        <div class="store-item">
          <div class="item-header">
            <h4>${item.name}</h4>
            <span class="item-price">${formatCurrency(item.price)}</span>
          </div>
          <div class="item-description">
            <p>${item.description || 'No description available'}</p>
          </div>
          <div class="item-footer">
            <span class="stock-status ${stockClass}">
              <i class="fas fa-${item.stock > 0 ? 'check' : 'times'}"></i>
              ${item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
            </span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    el("storeItems").innerHTML = html;
    
  } catch (error) {
    console.error("Error loading store items:", error);
    el("storeItems").innerHTML = '<div class="error">Error loading store items</div>';
  }
}

// Render recent activity
async function renderRecentActivity(memberId) {
  try {
    const activities = [];
    
    // Get recent bills
    if (memberId) {
      const billsQ = query(
        collection(db, "bills"), 
        where("memberId", "==", memberId),
        orderBy("date", "desc"),
        limit(5)
      );
      const billsSnap = await getDocs(billsQ);
      
      billsSnap.forEach(d => {
        const bill = d.data();
        activities.push({
          type: 'bill',
          title: `Bill ${bill.status === 'paid' ? 'paid' : 'created'}`,
          description: `${formatCurrency(bill.amount)} - ${bill.status}`,
          date: bill.date,
          icon: 'fas fa-file-invoice-dollar'
        });
      });
    }
    
    // Get recent notifications
    const notesQ = query(
      collection(db, "notifications"), 
      where("target", "==", "all"),
      orderBy("createdAt", "desc"),
      limit(3)
    );
    const notesSnap = await getDocs(notesQ);
    
    notesSnap.forEach(d => {
      const note = d.data();
      activities.push({
        type: 'notification',
        title: 'New notification',
        description: note.message.substring(0, 50) + (note.message.length > 50 ? '...' : ''),
        date: note.createdAt?.toDate?.() || new Date(),
        icon: 'fas fa-bell'
      });
    });
    
    // Sort by date
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (activities.length === 0) {
      el("recentActivity").innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No recent activity</p></div>';
      return;
    }
    
    let html = '<div class="activity-list-container">';
    activities.slice(0, 8).forEach(activity => {
      html += `
        <div class="activity-item">
          <div class="activity-icon">
            <i class="${activity.icon}"></i>
          </div>
          <div class="activity-content">
            <h4>${activity.title}</h4>
            <p>${activity.description}</p>
            <span class="activity-time">${formatRelativeTime(activity.date)}</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    el("recentActivity").innerHTML = html;
    
  } catch (error) {
    console.error("Error loading recent activity:", error);
    el("recentActivity").innerHTML = '<div class="error">Error loading activity</div>';
  }
}

// Quick Actions
el("contactSupportBtn")?.addEventListener("click", () => {
  showAlert("Support feature coming soon!", "info");
});

el("downloadReceiptBtn")?.addEventListener("click", () => {
  showAlert("Receipt download feature coming soon!", "info");
});

el("updateProfileBtn")?.addEventListener("click", () => {
  showAlert("Profile update feature coming soon!", "info");
});

console.log("✅ Member module loaded"); 