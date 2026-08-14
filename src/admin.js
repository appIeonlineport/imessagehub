import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

let supabase = null;
if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (err) {
    console.error("Admin Supabase init error:", err);
  }
}

async function fetchRequests() {
  let requests = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("topup_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        requests = data;
      }
    } catch (e) {
      console.warn("Supabase table lookup error:", e);
    }
  }

  try {
    const localRequests = JSON.parse(localStorage.getItem("imessagehub_topups") || "[]");
    const ids = new Set(requests.map((r) => r.id));
    for (const lr of localRequests) {
      if (!ids.has(lr.id)) {
        requests.push(lr);
      }
    }
  } catch (e) {}

  renderTable(requests);
}

function renderTable(requests) {
  if (!adminTableBody) return;
  adminTableBody.innerHTML = "";

  let pending = 0;
  let totalPaid = 0;

  if (!requests || requests.length === 0) {
    if (adminEmptyState) adminEmptyState.classList.remove("hidden");
    if (pendingCount) pendingCount.textContent = "0";
    if (approvedVolume) approvedVolume.textContent = "$0.00";
    return;
  }

  if (adminEmptyState) adminEmptyState.classList.add("hidden");

  requests.forEach((req) => {
    const isPaid = req.status === "paid";
    const amountVal = parseFloat(req.amount || 99);

    if (isPaid) {
      totalPaid += amountVal;
    } else if (req.status === "pending") {
      pending += 1;
    }

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong style="color: #fff;">${req.user_email || "N/A"}</strong>
      </td>
      <td style="color: var(--neon-cyan); font-weight: 800;">$${amountVal.toFixed(2)}</td>
      <td><span class="tag-status" style="color: #ff9500; border-color: rgba(255,149,0,0.3);">${req.network || "TRC20"}</span></td>
      <td>
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <code class="code-pill" style="max-width: 180px;">${req.tx_hash || "No Hash"}</code>
          <button class="btn-icon copy-tx" data-tx="${req.tx_hash || ''}" title="Copy Hash">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">
        ${new Date(req.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
      </td>
      <td>
        <span class="status-pill ${isPaid ? 'status-active' : ''}" style="${!isPaid ? 'background: rgba(255,149,0,0.15); color: #ff9500; border: 1px solid rgba(255,149,0,0.3);' : ''}">
          ${req.status.toUpperCase()}
        </span>
      </td>
      <td>
        ${
          !isPaid
            ? `<button class="btn btn-primary btn-sm approve-btn" data-id="${req.id}" data-user="${req.user_id}" data-email="${req.user_email}" data-amount="${amountVal}">
                <span>Approve & Credit</span>
               </button>`
            : `<span style="color: var(--neon-green); font-size: 0.8rem; font-weight: 700;">✓ Credited</span>`
        }
      </td>
    `;
    adminTableBody.appendChild(row);
  });

  if (pendingCount) pendingCount.textContent = pending.toString();
  if (approvedVolume) approvedVolume.textContent = `$${totalPaid.toFixed(2)}`;

  document.querySelectorAll(".approve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const userEmail = btn.getAttribute("data-email");
      const amount = parseFloat(btn.getAttribute("data-amount"));

      btn.disabled = true;
      btn.textContent = "Crediting...";

      await markAsPaid(id, userEmail, amount);
    });
  });

  document.querySelectorAll(".copy-tx").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tx = btn.getAttribute("data-tx");
      if (tx) {
        navigator.clipboard.writeText(tx);
        showToast("TxID hash copied!");
      }
    });
  });
}

async function markAsPaid(id, userEmail, amount) {
  if (supabase) {
    try {
      await supabase
        .from("topup_requests")
        .update({ status: "paid", approved_at: new Date().toISOString() })
        .eq("id", id);
    } catch (e) {
      console.warn("Supabase update error:", e);
    }
  }

  try {
    const local = JSON.parse(localStorage.getItem("imessagehub_topups") || "[]");
    const updated = local.map((r) => (r.id === id ? { ...r, status: "paid" } : r));
    localStorage.setItem("imessagehub_topups", JSON.stringify(updated));

    const currentBalance = parseFloat(localStorage.getItem(`wallet_${userEmail}`) || "0");
    const newBal = currentBalance + amount;
    localStorage.setItem(`wallet_${userEmail}`, newBal.toFixed(2));
  } catch (e) {}

  showToast(`Approved! Added $${amount.toFixed(2)} to ${userEmail}`, "success");
  await fetchRequests();
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener("click", async () => {
    if (supabase) await supabase.auth.signOut();
    window.location.href = "index.html";
  });
}

if (btnRefreshAdmin) {
  btnRefreshAdmin.addEventListener("click", () => {
    fetchRequests();
    showToast("Requests queue refreshed.");
  });
}

fetchRequests();
