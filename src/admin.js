import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// =========================================================
// DOM
// =========================================================

const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const adminTableBody = document.getElementById("adminTableBody");
const adminEmptyState = document.getElementById("adminEmptyState");

const pendingCount = document.getElementById("pendingCount");
const approvedVolume = document.getElementById("approvedVolume");

const btnRefreshAdmin = document.getElementById("btnRefreshAdmin");
const toastContainer = document.getElementById("toastContainer");


// =========================================================
// TOAST
// =========================================================

function showToast(message, type = "info") {
  if (!toastContainer) return;

  const toast = document.createElement("div");

  toast.className = `toast-item show toast-${type}`;
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
// SUPABASE
// =========================================================

let supabase = null;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error("Supabase configuration is missing.");
  showToast(
    "Supabase configuration is missing.",
    "error"
  );
} else {
  try {
    supabase = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
  } catch (error) {
    console.error(
      "Admin Supabase initialization error:",
      error
    );

    showToast(
      "Unable to initialize Supabase.",
      "error"
    );
  }
}


// =========================================================
// ADMIN AUTHORIZATION
// =========================================================

async function verifyAdminAccess() {
  if (!supabase) {
    return false;
  }

  try {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        "Admin session error:",
        sessionError
      );

      showToast(
        "Unable to verify your session.",
        "error"
      );

      return false;
    }

    // No logged-in user
    if (!session?.user) {
      window.location.href = "index.html";
      return false;
    }

    const user = session.user;

    const role =
      user.user_metadata?.role ||
      user.app_metadata?.role ||
      "";

    const normalizedRole =
      String(role).trim().toLowerCase();

    /*
      Accept common admin role values.

      IMPORTANT:
      This is only the frontend gate.
      Supabase RLS/database policies should also
      protect the actual admin data in production.
    */

    const isAdmin =
      normalizedRole === "admin" ||
      normalizedRole === "superadmin" ||
      normalizedRole === "master_admin" ||
      normalizedRole === "masteradmin";

    if (!isAdmin) {
      console.warn(
        "Unauthorized admin access attempt:",
        user.email
      );

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
// FETCH REQUESTS
// =========================================================

async function fetchRequests() {
  let requests = [];

  // -------------------------------------------------------
  // Supabase
  // -------------------------------------------------------

  if (supabase) {
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
        console.warn(
          "Supabase top-up request error:",
          error
        );

        showToast(
          "Could not load live Supabase requests. Showing demo records.",
          "info"
        );
      } else if (Array.isArray(data)) {
        requests = data;
      }

    } catch (error) {
      console.error(
        "Supabase request lookup failed:",
        error
      );
    }
  }


  // -------------------------------------------------------
  // LocalStorage demo fallback
  // -------------------------------------------------------

  try {
    const localRequests = JSON.parse(
      localStorage.getItem(
        "imessagehub_topups"
      ) || "[]"
    );

    if (Array.isArray(localRequests)) {

      const ids = new Set(
        requests.map((request) => request.id)
      );

      for (const localRequest of localRequests) {

        if (!ids.has(localRequest.id)) {
          requests.push(localRequest);
        }

      }
    }

  } catch (error) {
    console.warn(
      "Local top-up records could not be read:",
      error
    );
  }


  // Newest first
  requests.sort((a, b) => {
    return (
      new Date(b.created_at || 0) -
      new Date(a.created_at || 0)
    );
  });

  renderTable(requests);
}


// =========================================================
// RENDER TABLE
// =========================================================

function renderTable(requests) {

  if (!adminTableBody) return;

  adminTableBody.innerHTML = "";

  let pending = 0;
  let totalApproved = 0;


  if (!Array.isArray(requests) || requests.length === 0) {

    if (adminEmptyState) {
      adminEmptyState.classList.remove("hidden");
    }

    if (pendingCount) {
      pendingCount.textContent = "0";
    }

    if (approvedVolume) {
      approvedVolume.textContent = "$0.00";
    }

    return;
  }


  if (adminEmptyState) {
    adminEmptyState.classList.add("hidden");
  }


  requests.forEach((request) => {

    const status =
      String(request.status || "pending")
        .trim()
        .toLowerCase();

    const isPaid =
      status === "paid" ||
      status === "approved" ||
      status === "completed";

    const isPending =
      status === "pending";

    const amount =
      Number.parseFloat(
        request.amount || 0
      ) || 0;


    if (isPending) {
      pending += 1;
    }

    if (isPaid) {
      totalApproved += amount;
    }


    const row =
      document.createElement("tr");


    // -----------------------------------------------------
    // User
    // -----------------------------------------------------

    const userCell =
      document.createElement("td");

    const userStrong =
      document.createElement("strong");

    userStrong.textContent =
      request.user_email || "N/A";

    userCell.appendChild(userStrong);


    // -----------------------------------------------------
    // Amount
    // -----------------------------------------------------

    const amountCell =
      document.createElement("td");

    amountCell.textContent =
      `$${amount.toFixed(2)}`;


    // -----------------------------------------------------
    // Network
    // -----------------------------------------------------

    const networkCell =
      document.createElement("td");

    const networkBadge =
      document.createElement("span");

    networkBadge.className =
      "status-pill";

    networkBadge.textContent =
      request.network || "TRC20";

    networkCell.appendChild(
      networkBadge
    );


    // -----------------------------------------------------
    // TX HASH
    // -----------------------------------------------------

    const txCell =
      document.createElement("td");

    const txWrapper =
      document.createElement("div");

    txWrapper.style.display = "flex";
    txWrapper.style.alignItems = "center";
    txWrapper.style.gap = "8px";


    const txCode =
      document.createElement("code");

    txCode.className = "code-pill";

    txCode.style.maxWidth = "180px";
    txCode.style.overflow = "hidden";
    txCode.style.textOverflow = "ellipsis";
    txCode.style.whiteSpace = "nowrap";

    txCode.textContent =
      request.tx_hash || "No Hash";


    const copyButton =
      document.createElement("button");

    copyButton.className =
      "btn-secondary";

    copyButton.type = "button";

    copyButton.textContent = "Copy";

    copyButton.style.minHeight = "32px";
    copyButton.style.padding = "0 9px";
    copyButton.style.fontSize = "10px";


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

          console.error(
            "Clipboard error:",
            error
          );

          showToast(
            "Could not copy transaction hash.",
            "error"
          );
        }
      }
    );


    txWrapper.appendChild(txCode);
    txWrapper.appendChild(copyButton);

    txCell.appendChild(txWrapper);


    // -----------------------------------------------------
    // Date
    // -----------------------------------------------------

    const dateCell =
      document.createElement("td");

    const createdDate =
      new Date(
        request.created_at ||
        Date.now()
      );

    dateCell.textContent =
      createdDate.toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      );


    // -----------------------------------------------------
    // Status
    // -----------------------------------------------------

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

    } else {

      statusBadge.style.background =
        "#fff8e6";

      statusBadge.style.color =
        "#9a6700";
    }

    statusCell.appendChild(
      statusBadge
    );


    // -----------------------------------------------------
    // Action
    // -----------------------------------------------------

    const actionCell =
      document.createElement("td");


    if (isPending) {

      const approveButton =
        document.createElement("button");

      approveButton.className =
        "btn-primary";

      approveButton.type = "button";

      approveButton.textContent =
        "Approve & Credit";

      approveButton.style.minHeight =
        "36px";

      approveButton.style.padding =
        "0 11px";

      approveButton.style.fontSize =
        "10px";


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

      approvedText.style.fontSize =
        "11px";

      approvedText.style.fontWeight =
        "800";

      actionCell.appendChild(
        approvedText
      );

    } else {

      actionCell.textContent =
        "—";
    }


    // -----------------------------------------------------
    // Assemble row
    // -----------------------------------------------------

    row.appendChild(userCell);
    row.appendChild(amountCell);
    row.appendChild(networkCell);
    row.appendChild(txCell);
    row.appendChild(dateCell);
    row.appendChild(statusCell);
    row.appendChild(actionCell);

    adminTableBody.appendChild(row);

  });


  if (pendingCount) {
    pendingCount.textContent =
      pending.toString();
  }

  if (approvedVolume) {
    approvedVolume.textContent =
      `$${totalApproved.toFixed(2)}`;
  }
}


// =========================================================
// APPROVE REQUEST
// =========================================================

async function handleApprove(
  request,
  button
) {

  const id = request.id;

  const userEmail =
    request.user_email || "";

  const amount =
    Number.parseFloat(
      request.amount || 0
    ) || 0;


  if (!id) {
    showToast(
      "Invalid top-up request.",
      "error"
    );

    return;
  }


  if (!userEmail) {
    showToast(
      "User email is missing.",
      "error"
    );

    return;
  }


  if (amount <= 0) {
    showToast(
      "Invalid top-up amount.",
      "error"
    );

    return;
  }


  if (button) {
    button.disabled = true;
    button.textContent = "Approving...";
  }


  // -------------------------------------------------------
  // 1. Update Supabase
  // -------------------------------------------------------

  let supabaseUpdated = false;

  if (supabase) {

    try {

      const {
        error
      } = await supabase
        .from("topup_requests")
        .update({
          status: "paid",
          approved_at:
            new Date().toISOString()
        })
        .eq("id", id);


      if (error) {

        console.error(
          "Supabase approval error:",
          error
        );

        /*
          IMPORTANT:
          We do NOT silently pretend that
          the Supabase update succeeded.
        */

        showToast(
          `Supabase approval failed: ${error.message}`,
          "error"
        );

        if (button) {
          button.disabled = false;
          button.textContent =
            "Approve & Credit";
        }

        return;
      }


      supabaseUpdated = true;

    } catch (error) {

      console.error(
        "Supabase approval exception:",
        error
      );

      showToast(
        "Could not approve request in Supabase.",
        "error"
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          "Approve & Credit";
      }

      return;
    }
  }


  // -------------------------------------------------------
  // 2. Demo localStorage update
  // -------------------------------------------------------

  try {

    const localRequests =
      JSON.parse(
        localStorage.getItem(
          "imessagehub_topups"
        ) || "[]"
      );


    const updatedRequests =
      Array.isArray(localRequests)
        ? localRequests.map((item) => {

            if (item.id !== id) {
              return item;
            }

            return {
              ...item,
              status: "paid",
              approved_at:
                new Date().toISOString()
            };

          })
        : [];


    localStorage.setItem(
      "imessagehub_topups",
      JSON.stringify(
        updatedRequests
      )
    );


    // -----------------------------------------------------
    // Demo wallet credit
    // -----------------------------------------------------

    const currentBalance =
      Number.parseFloat(
        localStorage.getItem(
          `wallet_${userEmail}`
        ) || "0"
      ) || 0;


    const newBalance =
      currentBalance + amount;


    localStorage.setItem(
      `wallet_${userEmail}`,
      newBalance.toFixed(2)
    );


  } catch (error) {

    console.error(
      "Demo wallet update error:",
      error
    );

    showToast(
      "Payment approved, but demo wallet update failed.",
      "error"
    );

    return;
  }


  // -------------------------------------------------------
  // Success
  // -------------------------------------------------------

  const successMessage =
    supabaseUpdated
      ? `Approved $${amount.toFixed(2)} for ${userEmail}.`
      : `Demo credit added: $${amount.toFixed(2)} for ${userEmail}.`;


  showToast(
    successMessage,
    "success"
  );


  await fetchRequests();
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

      } catch (error) {

        console.error(
          "Admin logout error:",
          error
        );

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

      btnRefreshAdmin.disabled = true;
      btnRefreshAdmin.textContent =
        "Refreshing...";

      try {

        await fetchRequests();

        showToast(
          "Verification queue refreshed.",
          "success"
        );

      } finally {

        btnRefreshAdmin.disabled = false;
        btnRefreshAdmin.textContent =
          "Refresh Queue";
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

  await fetchRequests();


  // Keep admin page protected if session changes
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
