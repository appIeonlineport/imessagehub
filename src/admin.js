import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const PRIMARY_ADMIN_EMAIL = "indiatryme@gmail.com";

let supabase = null;
if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}

const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminTableBody = document.getElementById("adminTableBody");
const adminEmptyState = document.getElementById("adminEmptyState");
const pendingCount = document.getElementById("pendingCount");
const approvedVolume = document.getElementById("approvedVolume");
const btnRefreshAdmin = document.getElementById("btnRefreshAdmin");
const toastContainer = document.getElementById("toastContainer");

function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast-item show toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function verifyAdminAccess() {
  if (!supabase) {
    showToast("Supabase configuration is missing.", "error");
    return false;
  }

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      window.location.href = "index.html";
      return false;
    }

    const user = session.user;
    const email = String(user.email || "").trim().toLowerCase();

    // Primary admin account is authenticated by Supabase and explicitly allowed.
    // Database RLS still controls privileged writes such as top-up approval.
    if (email === PRIMARY_ADMIN_EMAIL) {
      return true;
    }

    // Additional admins can be granted access through public.profiles.
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profileError && profile?.role === "admin" && profile?.status === "active") {
        return true;
      }
    } catch (profileError) {
      console.warn("Admin profile lookup failed:", profileError);
    }

    showToast("Admin access required.", "error");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 900);
    return false;
  } catch (error) {
    console.error("Admin authorization error:", error);
    showToast("Unable to verify admin access.", "error");
    return false;
  }
}

async function fetchRequests() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from("topup_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderTable(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Top-up request error:", error);
    showToast(`Could not load payment requests: ${error.message}`, "error");
  }
}

function renderTable(requests) {
  if (!adminTableBody) return;

  adminTableBody.innerHTML = "";
  let pending = 0;
  let totalApproved = 0;

  if (!Array.isArray(requests) || requests.length === 0) {
    adminEmptyState?.classList.remove("hidden");
    if (pendingCount) pendingCount.textContent = "0";
    if (approvedVolume) approvedVolume.textContent = "$0.00";
    return;
  }

  adminEmptyState?.classList.add("hidden");

  requests.forEach((request) => {
    const status = String(request.status || "pending").trim().toLowerCase();
    const amount = Number.parseFloat(request.amount || 0) || 0;
    const isPending = status === "pending";
    const isPaid = ["paid", "approved", "completed"].includes(status);

    if (isPending) pending += 1;
    if (isPaid) totalApproved += amount;

    const row = document.createElement("tr");

    const userCell = document.createElement("td");
    userCell.innerHTML = `<strong>${escapeHtml(request.user_email || "N/A")}</strong>`;

    const amountCell = document.createElement("td");
    amountCell.textContent = `$${amount.toFixed(2)}`;

    const networkCell = document.createElement("td");
    networkCell.innerHTML = `<span class="status-pill">${escapeHtml(request.network || "TRC20")}</span>`;

    const txCell = document.createElement("td");
    const txWrap = document.createElement("div");
    txWrap.style.display = "flex";
    txWrap.style.alignItems = "center";
    txWrap.style.gap = "8px";

    const txCode = document.createElement("code");
    txCode.className = "code-pill";
    txCode.style.maxWidth = "190px";
    txCode.style.overflow = "hidden";
    txCode.style.textOverflow = "ellipsis";
    txCode.style.whiteSpace = "nowrap";
    txCode.textContent = request.tx_hash || "No Hash";

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "btn-secondary";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", async () => {
      try {
        if (!request.tx_hash) throw new Error("No transaction hash");
        await navigator.clipboard.writeText(request.tx_hash);
        showToast("Transaction hash copied.", "success");
      } catch {
        showToast("Could not copy transaction hash.", "error");
      }
    });

    txWrap.append(txCode, copyButton);
    txCell.appendChild(txWrap);

    const dateCell = document.createElement("td");
    dateCell.textContent = formatDate(request.created_at);

    const statusCell = document.createElement("td");
    const statusBadge = document.createElement("span");
    statusBadge.className = `status-pill ${isPaid ? "status-success" : ""}`;
    statusBadge.textContent = status.toUpperCase();
    statusCell.appendChild(statusBadge);

    const actionCell = document.createElement("td");

    if (isPending) {
      const approveButton = document.createElement("button");
      approveButton.type = "button";
      approveButton.className = "btn-primary";
      approveButton.textContent = "Approve & Credit";
      approveButton.addEventListener("click", () => handleApprove(request, approveButton));
      actionCell.appendChild(approveButton);
    } else if (isPaid) {
      const approvedText = document.createElement("span");
      approvedText.textContent = "✓ Credited";
      approvedText.style.color = "#087548";
      approvedText.style.fontWeight = "800";
      actionCell.appendChild(approvedText);
    } else {
      actionCell.textContent = "—";
    }

    row.append(userCell, amountCell, networkCell, txCell, dateCell, statusCell, actionCell);
    adminTableBody.appendChild(row);
  });

  if (pendingCount) pendingCount.textContent = String(pending);
  if (approvedVolume) approvedVolume.textContent = `$${totalApproved.toFixed(2)}`;
}

async function handleApprove(request, button) {
  const id = request.id;
  const amount = Number.parseFloat(request.amount || 0) || 0;

  if (!id || amount <= 0) {
    showToast("Invalid payment request.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Approving...";

  try {
    const { data: updated, error } = await supabase
      .from("topup_requests")
      .update({
        status: "paid",
        approved_at: new Date().toISOString()
      })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new Error("Payment was already processed or is no longer pending.");

    showToast(`Payment of $${amount.toFixed(2)} approved and credited.`, "success");
    await fetchRequests();
  } catch (error) {
    console.error("Payment approval error:", error);
    showToast(`Approval failed: ${error.message}`, "error");
    button.disabled = false;
    button.textContent = "Approve & Credit";
  }
}

adminLogoutBtn?.addEventListener("click", async () => {
  try {
    await supabase?.auth.signOut();
  } finally {
    window.location.href = "index.html";
  }
});

btnRefreshAdmin?.addEventListener("click", async () => {
  btnRefreshAdmin.disabled = true;
  const original = btnRefreshAdmin.textContent;
  btnRefreshAdmin.textContent = "Refreshing...";
  try {
    await fetchRequests();
    showToast("Admin data refreshed.", "success");
  } finally {
    btnRefreshAdmin.disabled = false;
    btnRefreshAdmin.textContent = original || "Refresh Queue";
  }
});

async function initializeAdmin() {
  const authorized = await verifyAdminAccess();
  if (!authorized) return;

  await fetchRequests();

  supabase?.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      window.location.href = "index.html";
    }
  });
}

initializeAdmin();
