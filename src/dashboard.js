import { createClient } from "@supabase/supabase-js";

// Environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// DOM Elements
const welcomeName = document.getElementById("welcomeName");
const welcomeEmail = document.getElementById("welcomeEmail");
const accountStatus = document.getElementById("accountStatus");
const walletBalance = document.getElementById("walletBalance");
const accountRole = document.getElementById("accountRole");
const userId = document.getElementById("userId");
const createdAt = document.getElementById("createdAt");
const logoutButton = document.getElementById("logoutButton");
const dashboardMessage = document.getElementById("dashboardMessage");

const headerName = document.getElementById("headerName");
const headerRole = document.getElementById("headerRole");
const headerAvatar = document.getElementById("headerAvatar");
const welcomeAvatar = document.getElementById("welcomeAvatar");
const profileFullName = document.getElementById("profileFullName");
const profileEmail = document.getElementById("profileEmail");
const copyUserIdBtn = document.getElementById("copyUserIdBtn");
const mobileToggleBtn = document.getElementById("mobileToggleBtn");
const sidebar = document.getElementById("sidebar");
const toastContainer = document.getElementById("toastContainer");

function showToast(message) {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = "toast-item show";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    return dateStr;
  }
}

function getInitials(name) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Supabase Init
let supabase = null;
if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (err) {
    console.error("Supabase init error:", err);
  }
}

async function initDashboard() {
  if (!supabase) {
    if (dashboardMessage) {
      dashboardMessage.textContent = "Supabase configuration missing.";
      dashboardMessage.className = "dashboard-alert error";
      dashboardMessage.classList.remove("hidden");
    }
    return;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      window.location.href = "index.html";
      return;
    }

    const user = session.user;
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User";
    const emailStr = user.email || "N/A";
    const userIdStr = user.id || "N/A";
    const formattedDate = formatDate(user.created_at);
    const roleStr = user.user_metadata?.role || "User";
    const walletStr = user.user_metadata?.wallet_balance || "$0.00";
    const initials = getInitials(fullName);

    // Populate required IDs
    if (welcomeName) welcomeName.textContent = fullName;
    if (welcomeEmail) welcomeEmail.textContent = emailStr;
    if (accountStatus) accountStatus.textContent = "ACTIVE";
    if (walletBalance) walletBalance.textContent = walletStr;
    if (accountRole) accountRole.textContent = roleStr;
    if (userId) userId.textContent = userIdStr;
    if (createdAt) createdAt.textContent = formattedDate;

    // Populate UI helpers
    if (profileFullName) profileFullName.textContent = fullName;
    if (profileEmail) profileEmail.textContent = emailStr;
    if (headerName) headerName.textContent = fullName;
    if (headerRole) headerRole.textContent = roleStr;
    if (headerAvatar) headerAvatar.textContent = initials;
    if (welcomeAvatar) welcomeAvatar.textContent = initials;

    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" || !newSession) {
        window.location.href = "index.html";
      }
    });
  } catch (err) {
    console.error("Error loading dashboard:", err);
  }
}

// Sign out
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      if (supabase) await supabase.auth.signOut();
    } finally {
      window.location.href = "index.html";
    }
  });
}

// Copy User ID
if (copyUserIdBtn && userId) {
  copyUserIdBtn.addEventListener("click", async () => {
    const text = userId.textContent;
    if (!text || text.includes("Loading")) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("User ID copied to clipboard!");
    } catch (e) {
      console.warn("Copy failed:", e);
    }
  });
}

// Mobile sidebar toggle
if (mobileToggleBtn && sidebar) {
  mobileToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

initDashboard();
