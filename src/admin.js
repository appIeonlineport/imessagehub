import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// =========================================================
// SUPABASE
// =========================================================

let supabase = null;

if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
}


// =========================================================
// DOM
// =========================================================

const adminLogoutBtn =
  document.getElementById("adminLogoutBtn");

const adminTableBody =
  document.getElementById("adminTableBody");

const adminEmptyState =
  document.getElementById("adminEmptyState");

const pendingCount =
  document.getElementById("pendingCount");

const approvedVolume =
  document.getElementById("approvedVolume");

const btnRefreshAdmin =
  document.getElementById("btnRefreshAdmin");

const toastContainer =
  document.getElementById("toastContainer");


// =========================================================
// TOAST
// =========================================================

function showToast(message, type = "info") {
  if (!toastContainer) return;

  const toast = document.createElement("div");

  toast.className =
    `toast-item show toast-${type}`;

  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3200);
}


// =========================================================
// ADMIN AUTHORIZATION
// =========================================================

async function verifyAdminAccess() {
  if (!supabase) {
    showToast(
      "Supabase configuration is missing.",
      "error"
    );
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

    // IMPORTANT:
    // Authorization comes from public.profiles,
    // not only frontend user metadata.

    const {
      data: profile,
      error: profileError
    } = await supabase
      .from("profiles")
      .select("id, email, role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Admin profile lookup error:",
        profileError
      );

      showToast(
        "Unable to verify admin account.",
        "error"
      );

      return false;
    }

    if (
      !profile ||
      profile.role !== "admin" ||
      profile.status !== "active"
    ) {
      showToast(
        "Admin access required.",
        "error"
      );

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 900);

      return false;
    }

    return true;

  } catch (error) {
    console.error(
      "Admin authorization error:",
      error
    );

    showToast(
      "Unable to verify admin access.",
      "error"
    );

    return false;
  }
}


// =========================================================
// ROUTE MANAGEMENT PANEL
// =========================================================

function createRouteManagementPanel() {

  if (
    document.getElementById(
      "routeManagementPanel"
    )
  ) {
    return;
  }

  const contentArea =
    document.querySelector(
      ".platform-content-area"
    );

  if (!contentArea) return;

  const panel =
    document.createElement("div");

  panel.id =
    "routeManagementPanel";

  panel.className =
    "panel";

  panel.style.marginBottom =
    "1.5rem";

  panel.innerHTML = `
    <div
      class="panel-header"
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:1rem;
      "
    >
      <div>
        <h3 class="panel-title">
          Route Management
        </h3>

        <p
          style="
            margin-top:4px;
            font-size:0.78rem;
            color:var(--text-secondary);
          "
        >
          Manage active messaging routes and pricing.
        </p>
      </div>

      <button
        id="btnRefreshRoutes"
        class="btn btn-secondary btn-sm"
        type="button"
      >
        Refresh Routes
      </button>
    </div>

    <div
      id="routesLoading"
      style="
        padding:1.25rem;
        color:var(--text-secondary);
        font-size:0.85rem;
      "
    >
      Loading routes...
    </div>

    <div
      id="routesList"
      style="
        display:flex;
        flex-direction:column;
        gap:0.75rem;
      "
    ></div>
  `;

  contentArea.insertBefore(
    panel,
    contentArea.firstChild
  );

  const refreshButton =
    document.getElementById(
      "btnRefreshRoutes"
    );

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      loadRoutes
    );
  }
}


// =========================================================
// LOAD ROUTES
// =========================================================

async function loadRoutes() {

  const loading =
    document.getElementById(
      "routesLoading"
    );

  const list =
    document.getElementById(
      "routesList"
    );

  if (!list) return;

  if (loading) {
    loading.textContent =
      "Loading routes...";
    loading.classList.remove(
      "hidden"
    );
  }

  list.innerHTML = "";

  try {

    const {
      data,
      error
    } = await supabase
      .from("routes")
      .select("*")
      .order("created_at", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    if (!Array.isArray(data) || data.length === 0) {

      list.innerHTML = `
        <div
          style="
            padding:1.25rem;
            border:1px dashed var(--border-color, #ddd);
            border-radius:12px;
            color:var(--text-secondary);
          "
        >
          No routes configured.
        </div>
      `;

      return;
    }

    data.forEach(
      (route) => {
        list.appendChild(
          createRouteRow(route)
        );
      }
    );

  } catch (error) {

    console.error(
      "Route loading error:",
      error
    );

    showToast(
      `Could not load routes: ${error.message}`,
      "error"
    );

  } finally {

    if (loading) {
      loading.classList.add(
        "hidden"
      );
    }
  }
}


// =========================================================
// ROUTE ROW
// =========================================================

function createRouteRow(route) {

  const row =
    document.createElement("div");

  row.style.display =
    "grid";

  row.style.gridTemplateColumns =
    "minmax(180px, 1fr) 120px 150px 110px";

  row.style.alignItems =
    "center";

  row.style.gap =
    "1rem";

  row.style.padding =
    "1rem";

  row.style.border =
    "1px solid var(--border-color, #e5e7eb)";

  row.style.borderRadius =
    "12px";

  row.style.background =
    "var(--card-bg, #fff)";


  // Route information

  const routeInfo =
    document.createElement("div");

  routeInfo.innerHTML = `
    <strong
      style="
        display:block;
        font-size:0.9rem;
      "
    >
      ${escapeHtml(route.name)}
    </strong>

    <span
      style="
        display:block;
        margin-top:3px;
        font-size:0.72rem;
        color:var(--text-secondary);
      "
    >
      ${escapeHtml(route.code)}
    </span>
  `;


  // Status

  const statusBox =
    document.createElement("div");

  const statusLabel =
    document.createElement("span");

  statusLabel.textContent =
    route.enabled
      ? "ACTIVE"
      : "DISABLED";

  statusLabel.style.display =
    "inline-flex";

  statusLabel.style.padding =
    "4px 8px";

  statusLabel.style.borderRadius =
    "999px";

  statusLabel.style.fontSize =
    "10px";

  statusLabel.style.fontWeight =
    "800";

  if (route.enabled) {
    statusLabel.style.background =
      "rgba(82,196,26,0.12)";

    statusLabel.style.color =
      "#389e0d";
  } else {
    statusLabel.style.background =
      "rgba(140,140,140,0.12)";

    statusLabel.style.color =
      "#777";
  }

  statusBox.appendChild(
    statusLabel
  );


  // Price

  const priceBox =
    document.createElement("div");

  priceBox.innerHTML = `
    <label
      style="
        display:block;
        margin-bottom:4px;
        font-size:10px;
        color:var(--text-secondary);
      "
    >
      Price / Message
    </label>
  `;

  const priceInput =
    document.createElement("input");

  priceInput.type =
    "number";

  priceInput.step =
    "0.001";

  priceInput.min =
    "0";

  priceInput.value =
    Number(route.price_per_message || 0)
      .toFixed(3);

  priceInput.style.width =
    "100%";

  priceInput.style.minHeight =
    "34px";

  priceInput.style.padding =
    "5px 8px";

  priceInput.style.borderRadius =
    "7px";

  priceInput.style.border =
    "1px solid var(--border-color, #ddd)";

  priceBox.appendChild(
    priceInput
  );


  // Toggle

  const toggleBox =
    document.createElement("div");

  const toggle =
    document.createElement("button");

  toggle.type =
    "button";

  toggle.textContent =
    route.enabled
      ? "Turn OFF"
      : "Turn ON";

  toggle.className =
    route.enabled
      ? "btn btn-secondary btn-sm"
      : "btn btn-primary btn-sm";

  toggle.style.width =
    "100%";

  toggle.addEventListener(
    "click",
    async () => {

      await updateRoute(
        route,
        {
          enabled:
            !route.enabled
        },
        toggle
      );

    }
  );

  toggleBox.appendChild(
    toggle
  );


  row.appendChild(
    routeInfo
  );

  row.appendChild(
    statusBox
  );

  row.appendChild(
    priceBox
  );

  row.appendChild(
    toggleBox
  );


  // Save price on Enter / blur

  priceInput.addEventListener(
    "change",
    async () => {

      const newPrice =
        Number.parseFloat(
          priceInput.value
        );

      if (
        !Number.isFinite(
          newPrice
        ) ||
        newPrice < 0
      ) {
        priceInput.value =
          Number(route.price_per_message || 0)
            .toFixed(3);

        showToast(
          "Please enter a valid route price.",
          "error"
        );

        return;
      }

      await updateRoute(
        route,
        {
          price_per_message:
            newPrice
        },
        priceInput
      );
    }
  );


  return row;
}


// =========================================================
// UPDATE ROUTE
// =========================================================

async function updateRoute(
  route,
  changes,
  control
) {

  if (control) {
    control.disabled = true;
  }

  try {

    const {
      data,
      error
    } = await supabase
      .from("routes")
      .update({
        ...changes,
        updated_at:
          new Date().toISOString()
      })
      .eq("id", route.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Route update returned no record."
      );
    }

    showToast(
      `${route.name} updated successfully.`,
      "success"
    );

    await loadRoutes();

  } catch (error) {

    console.error(
      "Route update error:",
      error
    );

    showToast(
      `Route update failed: ${error.message}`,
      "error"
    );

  } finally {

    if (control) {
      control.disabled = false;
    }
  }
}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// =========================================================
// TOP-UP REQUESTS
// =========================================================

async function fetchRequests() {

  if (!supabase) return;

  try {

    const {
      data,
      error
    } = await supabase
      .from("topup_requests")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    renderTable(
      Array.isArray(data)
        ? data
        : []
    );

  } catch (error) {

    console.error(
      "Top-up request error:",
      error
    );

    showToast(
      `Could not load payment requests: ${error.message}`,
      "error"
    );

  }
}


// =========================================================
// TOP-UP TABLE
// =========================================================

function renderTable(requests) {

  if (!adminTableBody) return;

  adminTableBody.innerHTML = "";

  let pending = 0;
  let totalApproved = 0;


  if (
    !Array.isArray(requests) ||
    requests.length === 0
  ) {

    if (adminEmptyState) {
      adminEmptyState.classList.remove(
        "hidden"
      );
    }

    if (pendingCount) {
      pendingCount.textContent =
        "0";
    }

    if (approvedVolume) {
      approvedVolume.textContent =
        "$0.00";
    }

    return;
  }


  if (adminEmptyState) {
    adminEmptyState.classList.add(
      "hidden"
    );
  }


  requests.forEach(
    (request) => {

      const status =
        String(
          request.status || "pending"
        )
        .trim()
        .toLowerCase();

      const amount =
        Number.parseFloat(
          request.amount || 0
        ) || 0;

      const isPaid =
        status === "paid";

      const isPending =
        status === "pending";


      if (isPending) {
        pending += 1;
      }

      if (isPaid) {
        totalApproved += amount;
      }


      const row =
        document.createElement("tr");


      // User

      const userCell =
        document.createElement("td");

      const strong =
        document.createElement("strong");

      strong.textContent =
        request.user_email || "N/A";

      userCell.appendChild(
        strong
      );


      // Amount

      const amountCell =
        document.createElement("td");

      amountCell.textContent =
        `$${amount.toFixed(2)}`;


      // Network

      const networkCell =
        document.createElement("td");

      const network =
        document.createElement("span");

      network.className =
        "status-pill";

      network.textContent =
        request.network || "TRC20";

      networkCell.appendChild(
        network
      );


      // Hash

      const txCell =
        document.createElement("td");

      const txWrapper =
        document.createElement("div");

      txWrapper.style.display =
        "flex";

      txWrapper.style.alignItems =
        "center";

      txWrapper.style.gap =
        "8px";


      const txCode =
        document.createElement("code");

      txCode.className =
        "code-pill";

      txCode.style.maxWidth =
        "180px";

      txCode.style.overflow =
        "hidden";

      txCode.style.textOverflow =
        "ellipsis";

      txCode.style.whiteSpace =
        "nowrap";

      txCode.textContent =
        request.tx_hash || "No Hash";


      const copyButton =
        document.createElement("button");

      copyButton.className =
        "btn-secondary";

      copyButton.type =
        "button";

      copyButton.textContent =
        "Copy";

      copyButton.addEventListener(
        "click",
        async () => {

          if (!request.tx_hash) {
            showToast(
              "No transaction hash available.",
              "info"
            );
            return;
          }

          try {

            await navigator.clipboard.writeText(
              request.tx_hash
            );

            showToast(
              "Transaction hash copied.",
              "success"
            );

          } catch (error) {

            showToast(
              "Could not copy transaction hash.",
              "error"
            );
          }
        }
      );


      txWrapper.appendChild(
        txCode
      );

      txWrapper.appendChild(
        copyButton
      );

      txCell.appendChild(
        txWrapper
      );


      // Date

      const dateCell =
        document.createElement("td");

      dateCell.textContent =
        new Date(
          request.created_at
        ).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          }
        );


      // Status

      const statusCell =
        document.createElement("td");

      const statusBadge =
        document.createElement("span");

      statusBadge.className =
        "status-pill";

      statusBadge.textContent =
        status.toUpperCase();

      if (isPaid) {
        statusBadge.classList.add(
          "status-success"
        );
      }

      statusCell.appendChild(
        statusBadge
      );


      // Action

      const actionCell =
        document.createElement("td");

      if (isPending) {

        const approveButton =
          document.createElement("button");

        approveButton.className =
          "btn-primary";

        approveButton.type =
          "button";

        approveButton.textContent =
          "Approve & Credit";

        approveButton.addEventListener(
          "click",
          async () => {
            await handleApprove(
              request,
              approveButton
            );
          }
        );

        actionCell.appendChild(
          approveButton
        );

      } else if (isPaid) {

        const approvedText =
          document.createElement("span");

        approvedText.textContent =
          "✓ Credited";

        approvedText.style.color =
          "#087548";

        approvedText.style.fontWeight =
          "800";

        actionCell.appendChild(
          approvedText
        );

      } else {

        actionCell.textContent =
          "—";
      }


      row.appendChild(
        userCell
      );

      row.appendChild(
        amountCell
      );

      row.appendChild(
        networkCell
      );

      row.appendChild(
        txCell
      );

      row.appendChild(
        dateCell
      );

      row.appendChild(
        statusCell
      );

      row.appendChild(
        actionCell
      );

      adminTableBody.appendChild(
        row
      );

    }
  );


  if (pendingCount) {
    pendingCount.textContent =
      String(pending);
  }

  if (approvedVolume) {
    approvedVolume.textContent =
      `$${totalApproved.toFixed(2)}`;
  }
}


// =========================================================
// APPROVE TOP-UP
// =========================================================

async function handleApprove(
  request,
  button
) {

  const id =
    request.id;

  const amount =
    Number.parseFloat(
      request.amount || 0
    ) || 0;


  if (!id || amount <= 0) {
    showToast(
      "Invalid payment request.",
      "error"
    );
    return;
  }


  if (button) {
    button.disabled = true;
    button.textContent =
      "Approving...";
  }


  try {

    const {
      data: updated,
      error
    } = await supabase
      .from("topup_requests")
      .update({
        status: "paid",
        approved_at:
          new Date().toISOString()
      })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .single();


    if (error) {
      throw error;
    }


    if (!updated) {
      throw new Error(
        "Payment was already processed or no longer pending."
      );
    }


    showToast(
      `Payment of $${amount.toFixed(2)} approved.`,
      "success"
    );

    await fetchRequests();

  } catch (error) {

    console.error(
      "Payment approval error:",
      error
    );

    showToast(
      `Approval failed: ${error.message}`,
      "error"
    );

    if (button) {
      button.disabled = false;
      button.textContent =
        "Approve & Credit";
    }
  }
}


// =========================================================
// LOGOUT
// =========================================================

if (adminLogoutBtn) {

  adminLogoutBtn.addEventListener(
    "click",
    async () => {

      try {
        if (supabase) {
          await supabase.auth.signOut();
        }
      } finally {
        window.location.href =
          "index.html";
      }

    }
  );
}


// =========================================================
// REFRESH
// =========================================================

if (btnRefreshAdmin) {

  btnRefreshAdmin.addEventListener(
    "click",
    async () => {

      btnRefreshAdmin.disabled =
        true;

      btnRefreshAdmin.textContent =
        "Refreshing...";

      try {

        await Promise.all([
          fetchRequests(),
          loadRoutes()
        ]);

        showToast(
          "Admin data refreshed.",
          "success"
        );

      } finally {

        btnRefreshAdmin.disabled =
          false;

        btnRefreshAdmin.textContent =
          "Refresh";
      }
    }
  );
}


// =========================================================
// INITIALIZE
// =========================================================

async function initializeAdmin() {

  const authorized =
    await verifyAdminAccess();

  if (!authorized) {
    return;
  }

  createRouteManagementPanel();

  await Promise.all([
    fetchRequests(),
    loadRoutes()
  ]);


  if (supabase) {

    supabase.auth.onAuthStateChange(
      (event, session) => {

        if (
          event === "SIGNED_OUT" ||
          !session
        ) {
          window.location.href =
            "index.html";
        }

      }
    );

  }
}


initializeAdmin();
