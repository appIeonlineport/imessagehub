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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function showAccessProblem(signedInEmail = "") {
  const main = document.querySelector(".platform-content-area");
  if (!main) return;

  main.innerHTML = `
    <div class="portal-card" style="max-width:720px;margin:40px auto;">
      <div class="portal-card-header">
        <div>
          <span class="eyebrow">ADMIN ACCESS</span>
          <h2>Admin account required</h2>
          <p>This browser is signed in with a non-admin account.</p>
        </div>
      </div>
      <div class="account-info-grid">
        <div class="account-info-item">
          <span>Signed-in email</span>
          <strong>${escapeHtml(signedInEmail || "No active session")}</strong>
        </div>
        <div class="account-info-item">
          <span>Authorized admin</span>
          <strong>${escapeHtml(PRIMARY_ADMIN_EMAIL)}</strong>
        </div>
      </div>
      <div class="modal-actions" style="margin-top:18px;">
        <button id="adminAccessSignOut" class="btn-primary" type="button">Sign out and use admin account</button>
      </div>
    </div>`;

  document.getElementById("adminAccessSignOut")?.addEventListener("click", async () => {
    try {
      await supabase?.auth.signOut();
    } finally {
      window.location.href = "index.html";
    }
  });
}

async function verifyAdminAccess() {
  if (!supabase) {
    showToast("Supabase configuration is missing.", "error");
    return false;
  }

  try {
    // getUser() verifies the current user with Supabase instead of trusting a stale local session.
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      window.location.replace("index.html");
      return false;
    }

    const email = normalizeEmail(user.email);
    const allowedEmail = normalizeEmail(PRIMARY_ADMIN_EMAIL);

    if (email === allowedEmail) {
      return true;
    }

    // Do not silently throw the user back to the customer dashboard.
    // Show exactly which account is signed in so access problems are obvious.
    showAccessProblem(email);
    return false;
  } catch (error) {
    console.error("Admin authorization error:", error);
    showToast("Unable to verify admin access.", "error");
    return false;
  }
}

function createRouteManagementPanel() {
  if (document.getElementById("routeManagementPanel")) return;

  const contentArea = document.querySelector(".platform-content-area");
  if (!contentArea) return;

  const panel = document.createElement("div");
  panel.id = "routeManagementPanel";
  panel.className = "panel";
  panel.innerHTML = `
    <div class="panel-header" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;">
      <div>
        <h3 class="panel-title">Route Management</h3>
        <p style="margin-top:4px;font-size:.78rem;color:#7b8798;">Manage messaging route availability and pricing.</p>
      </div>
      <button id="btnRefreshRoutes" class="btn-secondary" type="button">Refresh Routes</button>
    </div>
    <div id="routesLoading" style="padding:1rem;color:#7b8798;font-size:.8rem;">Loading routes...</div>
    <div id="routesList" style="display:flex;flex-direction:column;gap:.75rem;"></div>`;

  contentArea.insertBefore(panel, contentArea.firstChild);
  document.getElementById("btnRefreshRoutes")?.addEventListener("click", loadRoutes);
}

async function loadRoutes() {
  const loading = document.getElementById("routesLoading");
  const list = document.getElementById("routesList");
  if (!list || !supabase) return;

  if (loading) {
    loading.textContent = "Loading routes...";
    loading.classList.remove("hidden");
  }
  list.innerHTML = "";

  try {
    const { data, error } = await supabase
      .from("routes")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = `<div style="padding:1rem;border:1px dashed #d9e2ec;border-radius:12px;color:#7b8798;">No routes configured.</div>`;
      return;
    }

    data.forEach((route) => list.appendChild(createRouteRow(route)));
  } catch (error) {
    console.warn("Route loading unavailable:", error);
    list.innerHTML = `<div style="padding:1rem;border:1px dashed #d9e2ec;border-radius:12px;color:#7b8798;">Route controls are currently unavailable.</div>`;
  } finally {
    loading?.classList.add("hidden");
  }
}

function createRouteRow(route) {
  const row = document.createElement("div");
  row.style.cssText = "display:grid;grid-template-columns:minmax(180px,1fr) 120px 150px 110px;align-items:center;gap:1rem;padding:1rem;border:1px solid #e5ebf3;border-radius:12px;background:#fff;";

  const info = document.createElement("div");
  info.innerHTML = `<strong style="display:block;font-size:.9rem;">${escapeHtml(route.name)}</strong><span style="display:block;margin-top:3px;font-size:.72rem;color:#7b8798;">${escapeHtml(route.code)}</span>`;

  const status = document.createElement("span");
  status.className = `status-pill ${route.enabled ? "status-success" : ""}`;
  status.textContent = route.enabled ? "ACTIVE" : "DISABLED";

  const price = document.createElement("input");
  price.type = "number";
  price.min = "0";
  price.step = "0.001";
  price.value = Number(route.price_per_message || 0).toFixed(3);
  price.className = "portal-input";
  price.style.minHeight = "38px";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = route.enabled ? "btn-secondary" : "btn-primary";
  toggle.textContent = route.enabled ? "Turn OFF" : "Turn ON";

  price.addEventListener("change", async () => {
    const value = Number.parseFloat(price.value);
    if (!Number.isFinite(value) || value < 0) {
      showToast("Enter a valid route price.", "error");
      price.value = Number(route.price_per_message || 0).toFixed(3);
      return;
    }
    await updateRoute(route.id, { price_per_message: value }, price);
  });

  toggle.addEventListener("click", async () => {
    await updateRoute(route.id, { enabled: !route.enabled }, toggle);
  });

  row.append(info, status, price, toggle);
  return row;
}

async function updateRoute(id, changes, control) {
  if (!supabase) return;
  if (control) control.disabled = true;

  try {
    const { error } = await supabase
      .from("routes")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
    showToast("Route updated successfully.", "success");
    await loadRoutes();
  } catch (error) {
    showToast(`Route update failed: ${error.message}`, "error");
  } finally {
    if (control) control.disabled = false;
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
    const statusText = String(request.status || "pending").trim().toLowerCase();
    const amount = Number.parseFloat(request.amount || 0) || 0;
    const isPending = statusText === "pending";
    const isPaid = ["paid", "approved", "completed"].includes(statusText);

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
    txWrap.style.cssText = "display:flex;align-items:center;gap:8px;";

    const txCode = document.createElement("code");
    txCode.className = "code-pill";
    txCode.style.cssText = "max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
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
    statusCell.innerHTML = `<span class="status-pill ${isPaid ? "status-success" : ""}">${escapeHtml(statusText.toUpperCase())}</span>`;

    const actionCell = document.createElement("td");
    if (isPending) {
      const approve = document.createElement("button");
      approve.type = "button";
      approve.className = "btn-primary";
      approve.textContent = "Approve & Credit";
      approve.addEventListener("click", () => handleApprove(request, approve));
      actionCell.appendChild(approve);
    } else if (isPaid) {
      actionCell.innerHTML = `<span style="color:#087548;font-weight:800;">✓ Credited</span>`;
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
  if (!supabase) return;

  const amount = Number.parseFloat(request.amount || 0) || 0;
  if (!request.id || amount <= 0) {
    showToast("Invalid payment request.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Approving...";

  try {
    const { data, error } = await supabase
      .from("topup_requests")
      .update({
        status: "paid",
        approved_at: new Date().toISOString()
      })
      .eq("id", request.id)
      .eq("status", "pending")
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("Payment request is no longer pending.");

    showToast(`Payment of $${amount.toFixed(2)} approved.`, "success");
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
    await Promise.all([fetchRequests(), loadRoutes()]);
    showToast("Admin data refreshed.", "success");
  } finally {
    btnRefreshAdmin.disabled = false;
    btnRefreshAdmin.textContent = original || "Refresh Queue";
  }
});

async function initializeAdmin() {
  const authorized = await verifyAdminAccess();
  if (!authorized) return;

  createRouteManagementPanel();
  await Promise.all([fetchRequests(), loadRoutes()]);

  supabase?.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      window.location.replace("index.html");
    }
  });
}

initializeAdmin();
