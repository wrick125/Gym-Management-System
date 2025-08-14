// js/admin.js
import { auth, db } from "../firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit,
  startAfter,
  startAt,
  endAt,
  getCountFromServer
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
  if (loading) {
    // Safety auto-hide in case of stuck states
    clearTimeout(window.__adminLoadingTimeout);
    window.__adminLoadingTimeout = setTimeout(() => {
      overlay.style.display = "none";
      console.warn("Loading overlay auto-hidden after timeout");
    }, 6000);
  } else {
    clearTimeout(window.__adminLoadingTimeout);
  }
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
    day: 'numeric'
  });
};

// Simple debounce utility
function debounce(fn, wait = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), wait);
  };
}

// Build enhanced HTML table
const buildTable = (rows, headers, actions = null) => {
  if (rows.length === 0) {
    return '<div class="empty-state"><i class="fas fa-inbox"></i><p>No data available</p></div>';
  }

  let html = '<div class="table-wrapper"><table><thead><tr>';
  headers.forEach(h => html += `<th>${h}</th>`);
  if (actions) html += '<th>Actions</th>';
  html += "</tr></thead><tbody>";
  
  rows.forEach((r, index) => {
    html += "<tr>";
    r.forEach(c => html += `<td>${c ?? ""}</td>`);
    if (actions) {
      html += `<td class="actions">${actions(index, r)}</td>`;
    }
    html += "</tr>";
  });
  
  html += "</tbody></table></div>";
  return html;
};

// CSV downloader
const downloadCSV = (filename, rows) => {
  const csv = rows.map(r => 
    r.map(c => `"${String(c ?? "").replaceAll('"','""')}"`).join(",")
  ).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
};

// Authentication check
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../index.html";
    return;
  }

  // Ensure overlay is hidden; we'll load sections progressively
  setLoading(false);

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
      window.location.href = "../member.html";
      return;
    }

    // Set admin name
    el("adminName").textContent = userDoc.data().name || "Admin";

    // Load sections in background (non-blocking)
    loadDashboardStats().catch(console.error);
    renderMembers().catch(console.error);
    renderBills().catch(console.error);
    renderStore().catch(console.error);
    loadPackages().catch(console.error);
    loadMembersForSelects().catch(console.error);
    
  } catch (err) {
    console.error("Auth error:", err);
    showAlert("Authentication error", "error");
  }
});

// Logout
el("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "../index.html";
  } catch (error) {
    showAlert("Logout failed", "error");
  }
});

// Dashboard Statistics
async function loadDashboardStats() {
  try {
    const [membersCountSnap, billsCountSnap, itemsCountSnap, paidBillsSnap] = await Promise.all([
      getCountFromServer(query(collection(db, "members"))),
      getCountFromServer(query(collection(db, "bills"))),
      getCountFromServer(query(collection(db, "storeItems"))),
      getDocs(query(collection(db, "bills"), where("status", "==", "paid"), limit(1000)))
    ]);

    const totalMembers = membersCountSnap.data().count;
    const totalBills = billsCountSnap.data().count;
    const totalItems = itemsCountSnap.data().count;
    
    let totalRevenue = 0;
    paidBillsSnap.forEach(d => {
      const bill = d.data();
      totalRevenue += bill.amount || 0;
    });

    el("totalMembers").textContent = totalMembers;
    el("totalBills").textContent = totalBills;
    el("totalRevenue").textContent = formatCurrency(totalRevenue);
    el("totalItems").textContent = totalItems;
    
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

// Load packages for dropdowns
async function loadPackages() {
  try {
    const packagesSnap = await getDocs(query(collection(db, "packages"), orderBy("name")));
    const packageSelects = [el("m-package")];
    
    packageSelects.forEach(select => {
      if (select) {
        select.innerHTML = '<option value="">Select Package</option>';
        packagesSnap.forEach(doc => {
          const pkg = doc.data();
          const option = document.createElement("option");
          option.value = doc.id;
          option.textContent = `${pkg.name} - ${formatCurrency(pkg.price)}`;
          select.appendChild(option);
        });
      }
    });
  } catch (error) {
    console.error("Error loading packages:", error);
  }
}

// Load members for dropdowns
async function loadMembersForSelects() {
  try {
    const membersSnap = await getDocs(query(collection(db, "members"), orderBy("name"), limit(200)));
    const memberSelects = [el("b-memberId"), el("d-memberId")];
    
    memberSelects.forEach(select => {
      if (select) {
        select.innerHTML = '<option value="">Select Member</option>';
        membersSnap.forEach(doc => {
          const member = doc.data();
          const option = document.createElement("option");
          option.value = doc.id;
          option.textContent = `${member.name} (${member.email})`;
          select.appendChild(option);
        });
      }
    });
  } catch (error) {
    console.error("Error loading members:", error);
  }
}

// Members CRUD
el("addMemberBtn")?.addEventListener("click", async () => {
  const member = {
    name: el("m-name").value.trim(),
    email: el("m-email").value.trim(),
    phone: el("m-phone").value.trim(),
    joinDate: el("m-join").value || new Date().toISOString().slice(0,10),
    packageId: el("m-package").value.trim() || null,
    status: "active",
    createdAt: new Date().toISOString()
  };

  if (!member.name || !member.email) {
    showAlert("Name and Email are required", "error");
    return;
  }

  setLoading(true);
  try {
    // Duplicate email check
    const dupQ = query(collection(db, "members"), where("email", "==", member.email));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      showAlert("Email already exists for another member", "error");
      setLoading(false);
      return;
    }
    const id = crypto.randomUUID();
    await setDoc(doc(db, "members", id), member);
    showAlert("Member added successfully");
    // Hide overlay immediately; refresh UI without blocking
    setLoading(false);
    Promise.all([renderMembers(), loadMembersForSelects(), loadDashboardStats()]).catch(console.error);
    
    // Clear form
    el("m-name").value = "";
    el("m-email").value = "";
    el("m-phone").value = "";
    el("m-join").value = "";
    el("m-package").value = "";
    
  } catch (error) {
    showAlert(error.message, "error");
    setLoading(false);
  }
});

el("updateMemberBtn")?.addEventListener("click", async () => {
  const id = el("m-id").value.trim();
  if (!id) {
    showAlert("Provide member ID to update", "error");
    return;
  }

  setLoading(true);
  try {
    const ref = doc(db, "members", id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      showAlert("Member not found", "error");
      return;
    }

    const patch = {
      name: el("m-name").value.trim() || snap.data().name,
      email: el("m-email").value.trim() || snap.data().email,
      phone: el("m-phone").value.trim() || snap.data().phone,
      joinDate: el("m-join").value || snap.data().joinDate,
      packageId: el("m-package").value.trim() || snap.data().packageId,
      updatedAt: new Date().toISOString()
    };

    await setDoc(ref, patch, { merge: true });
    showAlert("Member updated successfully");
    setLoading(false);
    Promise.all([renderMembers(), loadMembersForSelects()]).catch(console.error);
    
  } catch (error) {
    showAlert(error.message, "error");
    setLoading(false);
  }
});

el("deleteMemberBtn")?.addEventListener("click", async () => {
  const id = el("m-id").value.trim();
  if (!id) {
    showAlert("Provide member ID to delete", "error");
    return;
  }

  if (!confirm("Are you sure you want to delete this member?")) return;

  setLoading(true);
  try {
    await deleteDoc(doc(db, "members", id));
    showAlert("Member deleted successfully");
    setLoading(false);
    Promise.all([renderMembers(), loadMembersForSelects(), loadDashboardStats()]).catch(console.error);
    
  } catch (error) {
    showAlert(error.message, "error");
    setLoading(false);
  }
});

// Pagination state for members
let membersPageSize = 25;
let membersLastDoc = null;
let membersFirstDoc = null;
let membersPage = 1;
let membersSearchTerm = "";
let membersStatusFilter = "";

async function renderMembers(direction = "initial") {
  try {
    const base = collection(db, "members");
    let q;
    const searchActive = Boolean(membersSearchTerm);
    if (searchActive) {
      // Prefix search on name or email
      if (membersSearchTerm.includes("@")) {
        q = query(base, orderBy("email"), startAt(membersSearchTerm), endAt(membersSearchTerm + "\uf8ff"), limit(membersPageSize));
      } else {
        q = query(base, orderBy("name"), startAt(membersSearchTerm), endAt(membersSearchTerm + "\uf8ff"), limit(membersPageSize));
      }
      membersPage = 1;
    } else {
      q = query(base, orderBy("name"), limit(membersPageSize));
      if (direction === "next" && membersLastDoc) {
        q = query(base, orderBy("name"), startAfter(membersLastDoc), limit(membersPageSize));
        membersPage += 1;
      } else if (direction === "prev") {
        const upto = (membersPage - 2) * membersPageSize;
        let cursor = null;
        if (upto > 0) {
          let tempQ = query(base, orderBy("name"), limit(upto));
          const tempSnap = await getDocs(tempQ);
          const docsArr = tempSnap.docs;
          cursor = docsArr[docsArr.length - 1];
        }
        q = cursor
          ? query(base, orderBy("name"), startAfter(cursor), limit(membersPageSize))
          : query(base, orderBy("name"), limit(membersPageSize));
        membersPage = Math.max(1, membersPage - 1);
      } else {
        membersPage = 1;
      }
    }

    const snap = await getDocs(q);
    membersFirstDoc = snap.docs[0] || null;
    membersLastDoc = snap.docs[snap.docs.length - 1] || null;
    const rows = [];
    
    snap.forEach(d => {
      const m = d.data();
      if (membersStatusFilter && (m.status || "active") !== membersStatusFilter) {
        return;
      }
      rows.push([
        d.id,
        m.name,
        m.email,
        m.phone || "-",
        formatDate(m.joinDate),
        m.packageId || "-",
        m.status || "active"
      ]);
    });

    const actions = (index, row) => `
      <button onclick="editMember('${row[0]}')" class="btn-small btn-warning">
        <i class="fas fa-edit"></i>
      </button>
      <button onclick="deleteMember('${row[0]}')" class="btn-small danger">
        <i class="fas fa-trash"></i>
      </button>
    `;

    el("membersTable").innerHTML = buildTable(
      rows, 
      ["ID", "Name", "Email", "Phone", "Join Date", "Package", "Status"],
      actions
    );

    const info = el("membersPageInfo");
    if (info) info.textContent = searchActive ? `Search results` : `Page ${membersPage}`;
    // Disable paging controls during search
    el("membersNext")?.toggleAttribute("disabled", searchActive);
    el("membersPrev")?.toggleAttribute("disabled", searchActive || membersPage === 1);
    
  } catch (error) {
    console.error("Error rendering members:", error);
    el("membersTable").innerHTML = '<div class="error">Error loading members</div>';
  }
}

// Packages CRUD
el("addPackageBtn")?.addEventListener("click", async () => {
  const data = {
    name: el("p-name").value.trim(),
    price: Number(el("p-price").value || 0),
    durationMonths: Number(el("p-duration").value || 1),
    description: el("p-description").value.trim(),
    createdAt: new Date().toISOString()
  };

  if (!data.name) {
    showAlert("Package name required", "error");
    return;
  }

  setLoading(true);
  try {
    const id = crypto.randomUUID();
    await setDoc(doc(db, "packages", id), data);
    showAlert("Package added successfully");
    await loadPackages();
    
    // Clear form
    el("p-name").value = "";
    el("p-price").value = "";
    el("p-duration").value = "";
    el("p-description").value = "";
    
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    setLoading(false);
  }
});

el("deletePackageBtn")?.addEventListener("click", async () => {
  const id = el("p-id").value.trim();
  if (!id) {
    showAlert("Provide package ID to delete", "error");
    return;
  }

  if (!confirm("Are you sure you want to delete this package?")) return;

  setLoading(true);
  try {
    await deleteDoc(doc(db, "packages", id));
    showAlert("Package deleted successfully");
    await loadPackages();
    
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    setLoading(false);
  }
});

// Bills CRUD
el("createBillBtn")?.addEventListener("click", async () => {
  const data = {
    memberId: el("b-memberId").value.trim(),
    amount: Number(el("b-amount").value || 0),
    receiptNo: el("b-receipt").value.trim(),
    status: el("b-status").value,
    date: new Date().toISOString(),
    createdAt: serverTimestamp()
  };

  if (!data.memberId || !data.amount) {
    showAlert("Member ID and amount required", "error");
    return;
  }
  if (data.amount <= 0) {
    showAlert("Amount must be greater than 0", "error");
    return;
  }
  if (data.receiptNo) {
    const dup = await getDocs(query(collection(db, "bills"), where("receiptNo", "==", data.receiptNo), limit(1)));
    if (!dup.empty) {
      showAlert("Receipt number already exists", "error");
      return;
    }
  }

  setLoading(true);
  try {
    await addDoc(collection(db, "bills"), data);
    showAlert("Bill created successfully");
    setLoading(false);
    Promise.all([renderBills(), loadDashboardStats()]).catch(console.error);
    
    // Clear form
    el("b-memberId").value = "";
    el("b-amount").value = "";
    el("b-receipt").value = "";
    el("b-status").value = "paid";
    
  } catch (error) {
    showAlert(error.message, "error");
    setLoading(false);
  }
});

// Pagination state for bills
let billsPageSize = 25;
let billsLastDoc = null;
let billsPage = 1;
let billsSearchTerm = "";
let billsStatusFilter = "";

async function renderBills(direction = "initial") {
  try {
    const base = collection(db, "bills");
    let q = query(base, orderBy("date", "desc"), limit(billsPageSize));
    if (direction === "next" && billsLastDoc) {
      q = query(base, orderBy("date", "desc"), startAfter(billsLastDoc), limit(billsPageSize));
      billsPage += 1;
    } else if (direction === "prev") {
      const upto = (billsPage - 2) * billsPageSize;
      let cursor = null;
      if (upto > 0) {
        let tempQ = query(base, orderBy("date", "desc"), limit(upto));
        const tempSnap = await getDocs(tempQ);
        const docsArr = tempSnap.docs;
        cursor = docsArr[docsArr.length - 1];
      }
      q = cursor
        ? query(base, orderBy("date", "desc"), startAfter(cursor), limit(billsPageSize))
        : query(base, orderBy("date", "desc"), limit(billsPageSize));
      billsPage = Math.max(1, billsPage - 1);
    } else {
      billsPage = 1;
    }

    const snap = await getDocs(q);
    billsLastDoc = snap.docs[snap.docs.length - 1] || null;
    const rows = [];
    
    snap.forEach(d => {
      const b = d.data();
      const row = [
        d.id,
        b.memberId,
        formatCurrency(b.amount),
        b.status,
        b.receiptNo || "-",
        formatDate(b.date)
      ];
      if (billsStatusFilter && b.status !== billsStatusFilter) return;
      if (billsSearchTerm) {
        const term = billsSearchTerm.toLowerCase();
        const matches =
          String(row[0]).toLowerCase().includes(term) ||
          String(row[1]).toLowerCase().includes(term) ||
          String(b.receiptNo || "-").toLowerCase().includes(term);
        if (!matches) return;
      }
      rows.push(row);
    });

    el("billsTable").innerHTML = buildTable(
      rows, 
      ["ID", "Member ID", "Amount", "Status", "Receipt", "Date"]
    );

    const info = el("billsPageInfo");
    if (info) info.textContent = `Page ${billsPage}`;
    
  } catch (error) {
    console.error("Error rendering bills:", error);
    el("billsTable").innerHTML = '<div class="error">Error loading bills</div>';
  }
}

// Notifications
el("sendNotificationBtn")?.addEventListener("click", async () => {
  const message = el("n-message").value.trim();
  if (!message) {
    showAlert("Enter message", "error");
    return;
  }

  setLoading(true);
  try {
    await addDoc(collection(db, "notifications"), {
      target: el("n-target").value,
      message,
      createdAt: serverTimestamp()
    });
    showAlert("Notification sent successfully");
    el("n-message").value = "";
    
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    setLoading(false);
  }
});

// Store CRUD
el("addStoreItemBtn")?.addEventListener("click", async () => {
  const data = {
    name: el("s-name").value.trim(),
    price: Number(el("s-price").value || 0),
    stock: Number(el("s-stock").value || 0),
    description: el("s-description").value.trim(),
    createdAt: new Date().toISOString()
  };

  if (!data.name) {
    showAlert("Item name required", "error");
    return;
  }

  setLoading(true);
  try {
    const id = crypto.randomUUID();
    await setDoc(doc(db, "storeItems", id), data);
    showAlert("Item added successfully");
    setLoading(false);
    renderStore().catch(console.error);
    
    // Clear form
    el("s-name").value = "";
    el("s-price").value = "";
    el("s-stock").value = "";
    el("s-description").value = "";
    
  } catch (error) {
    showAlert(error.message, "error");
    setLoading(false);
  }
});

el("deleteStoreItemBtn")?.addEventListener("click", async () => {
  const id = el("s-id").value.trim();
  if (!id) {
    showAlert("Provide item ID to delete", "error");
    return;
  }

  if (!confirm("Are you sure you want to delete this item?")) return;

  setLoading(true);
  try {
    await deleteDoc(doc(db, "storeItems", id));
    showAlert("Item deleted successfully");
    setLoading(false);
    renderStore().catch(console.error);
    
  } catch (error) {
    showAlert(error.message, "error");
    setLoading(false);
  }
});

// Store pagination state
let storePageSize = 25;
let storeLastDoc = null;
let storePage = 1;

async function renderStore(direction = "initial") {
  try {
    const base = collection(db, "storeItems");
    let q = query(base, orderBy("name"), limit(storePageSize));
    if (direction === "next" && storeLastDoc) {
      q = query(base, orderBy("name"), startAfter(storeLastDoc), limit(storePageSize));
      storePage += 1;
    } else if (direction === "prev") {
      const upto = (storePage - 2) * storePageSize;
      let cursor = null;
      if (upto > 0) {
        let tempQ = query(base, orderBy("name"), limit(upto));
        const tempSnap = await getDocs(tempQ);
        const docsArr = tempSnap.docs;
        cursor = docsArr[docsArr.length - 1];
      }
      q = cursor
        ? query(base, orderBy("name"), startAfter(cursor), limit(storePageSize))
        : query(base, orderBy("name"), limit(storePageSize));
      storePage = Math.max(1, storePage - 1);
    } else {
      storePage = 1;
    }

    const snap = await getDocs(q);
    storeLastDoc = snap.docs[snap.docs.length - 1] || null;
    const rows = [];
    
    snap.forEach(d => {
      const s = d.data();
      rows.push([
        d.id,
        s.name,
        formatCurrency(s.price),
        s.stock,
        s.description || "-"
      ]);
    });

    el("storeList").innerHTML = buildTable(
      rows, 
      ["ID", "Name", "Price", "Stock", "Description"]
    );

    const info = el("storePageInfo");
    if (info) info.textContent = `Page ${storePage}`;
    
  } catch (error) {
    console.error("Error rendering store:", error);
    el("storeList").innerHTML = '<div class="error">Error loading store items</div>';
  }
}

// Diet Plans
el("saveDietBtn")?.addEventListener("click", async () => {
  const memberId = el("d-memberId").value.trim();
  const plan = el("d-plan").value.trim();
  
  if (!memberId || !plan) {
    showAlert("Member ID and plan required", "error");
    return;
  }

  setLoading(true);
  try {
    await setDoc(doc(db, "diets", memberId), { 
      plan, 
      updatedAt: new Date().toISOString() 
    });
    showAlert("Diet plan saved successfully");
    setLoading(false);
    el("d-plan").value = "";
    
  } catch (error) {
    showAlert(error.message, "error");
    setLoading(false);
  }
});

// Export Functions
el("exportMembersBtn")?.addEventListener("click", async () => {
  setLoading(true);
  try {
    const snap = await getDocs(collection(db, "members"));
    const rows = [["ID", "Name", "Email", "Phone", "Join Date", "Package", "Status"]];
    
    snap.forEach(d => {
      const m = d.data();
      rows.push([
        d.id, 
        m.name, 
        m.email, 
        m.phone || "", 
        m.joinDate, 
        m.packageId || "", 
        m.status || "active"
      ]);
    });
    
    downloadCSV("members.csv", rows);
    showAlert("Members exported successfully");
    
  } catch (error) {
    showAlert("Export failed", "error");
  } finally {
    setLoading(false);
  }
});

el("exportBillsBtn")?.addEventListener("click", async () => {
  setLoading(true);
  try {
    const snap = await getDocs(collection(db, "bills"));
    const rows = [["ID", "Member ID", "Amount", "Status", "Receipt", "Date"]];
    
    snap.forEach(d => {
      const b = d.data();
      rows.push([
        d.id, 
        b.memberId, 
        b.amount, 
        b.status, 
        b.receiptNo || "", 
        b.date
      ]);
    });
    
    downloadCSV("bills.csv", rows);
    showAlert("Bills exported successfully");
    
  } catch (error) {
    showAlert("Export failed", "error");
  } finally {
    setLoading(false);
  }
});

el("exportPackagesBtn")?.addEventListener("click", async () => {
  setLoading(true);
  try {
    const snap = await getDocs(collection(db, "packages"));
    const rows = [["ID", "Name", "Price", "Duration (months)", "Description"]];
    
    snap.forEach(d => {
      const p = d.data();
      rows.push([
        d.id, 
        p.name, 
        p.price, 
        p.durationMonths, 
        p.description || ""
      ]);
    });
    
    downloadCSV("packages.csv", rows);
    showAlert("Packages exported successfully");
    
  } catch (error) {
    showAlert("Export failed", "error");
  } finally {
    setLoading(false);
  }
});

el("exportStoreBtn")?.addEventListener("click", async () => {
  setLoading(true);
  try {
    const snap = await getDocs(collection(db, "storeItems"));
    const rows = [["ID", "Name", "Price", "Stock", "Description"]];
    
    snap.forEach(d => {
      const s = d.data();
      rows.push([
        d.id, 
        s.name, 
        s.price, 
        s.stock, 
        s.description || ""
      ]);
    });
    
    downloadCSV("store_items.csv", rows);
    showAlert("Store items exported successfully");
    
  } catch (error) {
    showAlert("Export failed", "error");
  } finally {
    setLoading(false);
  }
});

// Global functions for table actions
window.editMember = async (id) => {
  try {
    const d = await getDoc(doc(db, "members", id));
    if (d.exists()) {
      const member = d.data();
      el("m-id").value = id;
      el("m-name").value = member.name;
      el("m-email").value = member.email;
      el("m-phone").value = member.phone || "";
      el("m-join").value = member.joinDate;
      el("m-package").value = member.packageId || "";
    }
  } catch (error) {
    showAlert("Error loading member data", "error");
  }
};

window.deleteMember = async (id) => {
  if (confirm("Are you sure you want to delete this member?")) {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "members", id));
      showAlert("Member deleted successfully");
      await Promise.all([renderMembers(), loadMembersForSelects(), loadDashboardStats()]);
    } catch (error) {
      showAlert("Delete failed", "error");
    } finally {
      setLoading(false);
    }
  }
};

// Pagination controls wiring
el("membersNext")?.addEventListener("click", () => renderMembers("next"));
el("membersPrev")?.addEventListener("click", () => renderMembers("prev"));
el("billsNext")?.addEventListener("click", () => renderBills("next"));
el("billsPrev")?.addEventListener("click", () => renderBills("prev"));
el("storeNext")?.addEventListener("click", () => renderStore("next"));
el("storePrev")?.addEventListener("click", () => renderStore("prev"));

// Search/filter wiring
el("memberSearch")?.addEventListener("input", debounce((e) => {
  membersSearchTerm = (e.target?.value || "").trim().toLowerCase();
  renderMembers("initial");
}, 300));

el("memberFilter")?.addEventListener("change", (e) => {
  membersStatusFilter = (e.target?.value || "").trim();
  renderMembers("initial");
});

el("billSearch")?.addEventListener("input", debounce((e) => {
  billsSearchTerm = (e.target?.value || "").trim().toLowerCase();
  renderBills("initial");
}, 300));

el("billFilter")?.addEventListener("change", (e) => {
  billsStatusFilter = (e.target?.value || "").trim();
  renderBills("initial");
});

console.log("✅ Admin module loaded"); 