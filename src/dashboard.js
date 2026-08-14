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

// Modals
const composeModal = document.getElementById("composeModal");
const topUpModal = document.getElementById("topUpModal");
const apiDocsModal = document.getElementById("apiDocsModal");
const btnQuickCompose = document.getElementById("btnQuickCompose");
const btnEmptyCompose = document.getElementById("btnEmptyCompose");
const closeComposeModal = document.getElementById("closeComposeModal");
const cancelComposeBtn = document.getElementById("cancelComposeBtn");
const composeForm = document.getElementById("composeForm");

const btnTopUp = document.getElementById("btnTopUp");
const closeTopUpModal = document.getElementById("closeTopUpModal");
const cancelTopUpBtn = document.getElementById("cancelTopUpBtn");
const confirmTopUpBtn = document.getElementById("confirmTopUpBtn");

const btnViewDocs = document.getElementById("btnViewDocs");
const navApi = document.getElementById("navApi");
const closeApiDocsModal = document.getElementById("closeApiDocsModal");
const closeApiDocsBtn = document.getElementById("closeApiDocsBtn");

const simulatorBubbleContainer = document.getElementById("simulatorBubbleContainer");
const totalDispatched = document.getElementById("totalDispatched");
let dispatchedCount = 0;

function showToast(message) {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = "toast-item show";
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3200);
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

// Supabase Initialization
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
      dashboardMessage.textContent = "Supabase environment configuration missing.";
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

    if (welcomeName) welcomeName.textContent = fullName;
    if (welcomeEmail) welcomeEmail.textContent = emailStr;
    if (accountStatus) accountStatus.textContent = "ACTIVE";
    if (walletBalance) walletBalance.textContent = walletStr;
    if (accountRole) accountRole.textContent = roleStr;
    if (userId) userId.textContent = userIdStr;
    if (createdAt) createdAt.textContent = formattedDate;

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
    console.error("Error initializing dashboard session:", err);
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
      showToast("Supabase User ID copied to clipboard!");
    } catch (e) {
      console.warn("Copy error:", e);
    }
  });
}

// Mobile sidebar toggle
if (mobileToggleBtn && sidebar) {
  mobileToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

// Modal Functions
function openModal(modal) {
  if (modal) modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (modal) modal.classList.add("hidden");
}

// Compose Modal
if (btnQuickCompose) btnQuickCompose.addEventListener("click", () => openModal(composeModal));
if (btnEmptyCompose) btnEmptyCompose.addEventListener("click", () => openModal(composeModal));
if (closeComposeModal) closeComposeModal.addEventListener("click", () => closeModal(composeModal));
if (cancelComposeBtn) cancelComposeBtn.addEventListener("click", () => closeModal(composeModal));

// Top Up Modal
if (btnTopUp) btnTopUp.addEventListener("click", () => openModal(topUpModal));
if (closeTopUpModal) closeTopUpModal.addEventListener("click", () => closeModal(topUpModal));
if (cancelTopUpBtn) cancelTopUpBtn.addEventListener("click", () => closeModal(topUpModal));
if (confirmTopUpBtn) confirmTopUpBtn.addEventListener("click", () => {
  closeModal(topUpModal);
  showToast("Gateway checkout initialized for message credits.");
});

// API Docs Modal
if (btnViewDocs) btnViewDocs.addEventListener("click", () => openModal(apiDocsModal));
if (navApi) navApi.addEventListener("click", (e) => { e.preventDefault(); openModal(apiDocsModal); });
if (closeApiDocsModal) closeApiDocsModal.addEventListener("click", () => closeModal(apiDocsModal));
if (closeApiDocsBtn) closeApiDocsBtn.addEventListener("click", () => closeModal(apiDocsModal));

// Dispatch Message Simulator
if (composeForm) {
  composeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const recipient = document.getElementById("composeRecipient")?.value;
    const text = document.getElementById("composeText")?.value;
    if (!text) return;

    closeModal(composeModal);
    composeForm.reset();

    if (simulatorBubbleContainer) {
      const bubble = document.createElement("div");
      bubble.className = "imessage-bubble outgoing";
      bubble.innerHTML = `
        <p class="bubble-text">${text}</p>
        <span class="bubble-meta">Delivered to ${recipient || 'recipient'} • Just now</span>
      `;
      simulatorBubbleContainer.appendChild(bubble);
      simulatorBubbleContainer.scrollTop = simulatorBubbleContainer.scrollHeight;
    }

    dispatchedCount += 1;
    if (totalDispatched) totalDispatched.textContent = dispatchedCount.toString();
    showToast("iMessage dispatched successfully via Apple APNs!");
  });
}

// Credit Tier Selection
document.querySelectorAll(".credit-tier-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".credit-tier-card").forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
  });
});

initDashboard();
