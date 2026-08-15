import { createClient } from "@supabase/supabase-js";

// =========================================================
// SUPABASE
// =========================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabase = null;

if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  try {
    supabase = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );
  } catch (error) {
    console.error("Supabase initialization error:", error);
  }
}


// =========================================================
// DOM
// =========================================================

// Dashboard
const welcomeName = document.getElementById("welcomeName");
const welcomeEmail = document.getElementById("welcomeEmail");
const accountStatus = document.getElementById("accountStatus");
const walletBalance = document.getElementById("walletBalance");
const walletBalanceTop = document.getElementById("walletBalanceTop");
const accountRole = document.getElementById("accountRole");
const userId = document.getElementById("userId");
const createdAt = document.getElementById("createdAt");
const logoutButton = document.getElementById("logoutButton");
const dashboardMessage = document.getElementById("dashboardMessage");

const headerName = document.getElementById("headerName");
const headerAvatar = document.getElementById("headerAvatar");
const dashWelcomeId = document.getElementById("dashWelcomeId");
const dropdownUserTitle = document.getElementById("dropdownUserTitle");
const liveClockDisplay = document.getElementById("liveClockDisplay");


// Navigation
const menuItems = document.querySelectorAll("[data-view]");
const viewPanels = document.querySelectorAll(".view-panel");
const btnGetStarted = document.getElementById("btnGetStarted");


// User menu
const userMenuBtn = document.getElementById("userMenuBtn");
const userDropdownMenu = document.getElementById("userDropdownMenu");
const btnShowProfile = document.getElementById("btnShowProfile");
const btnOpenTopUpFromMenu =
  document.getElementById("btnOpenTopUpFromMenu");

const topbarBalanceBtn =
  document.getElementById("topbarBalanceBtn");

const btnSidebarTopUp =
  document.getElementById("btnSidebarTopUp");

const btnDashboardTopUp =
  document.getElementById("btnDashboardTopUp");


// Campaign
const campaignNumbersArea =
  document.getElementById("campaignNumbersArea");

const bulkFileInput =
  document.getElementById("bulkFileInput");

const btnTriggerUpload =
  document.getElementById("btnTriggerUpload");

const senderIdInput =
  document.getElementById("senderIdInput");

const mainMessageContent =
  document.getElementById("mainMessageContent");

const wordsAndItemsCounter =
  document.getElementById("wordsAndItemsCounter");

const btnSubmitCampaign =
  document.getElementById("btnSubmitCampaign");


// Route
const campaignRouteInput =
  document.getElementById("campaignRouteInput");

const routeCards =
  document.querySelectorAll(".route-card");

const routeRadios =
  document.querySelectorAll(
    'input[name="campaignRoute"]'
  );

const campaignSelectedRoute =
  document.getElementById("campaignSelectedRoute");

const campaignEstimatedCost =
  document.getElementById("campaignEstimatedCost");

const recipientCount =
  document.getElementById("recipientCount");

const recipientCountLarge =
  document.getElementById("recipientCountLarge");


// Outbox
const outboxRecordsTbody =
  document.getElementById("outboxRecordsTbody");

const outboxNoDataNotice =
  document.getElementById("outboxNoDataNotice");

const btnClearOutboxRecords =
  document.getElementById("btnClearOutboxRecords");

const btnFilterSearch =
  document.getElementById("btnFilterSearch");


// Payment history
const paymentHistoryList =
  document.getElementById("paymentHistoryList");


// Top-up
const topUpModal =
  document.getElementById("topUpModal");

const closeTopUpModal =
  document.getElementById("closeTopUpModal");

const cancelTopUpBtn =
  document.getElementById("cancelTopUpBtn");

const btnSubmitPaid =
  document.getElementById("btnSubmitPaid");

const copyUsdtAddressBtn =
  document.getElementById("copyUsdtAddressBtn");

const usdtWalletAddress =
  document.getElementById("usdtWalletAddress");

const usdtUserEmail =
  document.getElementById("usdtUserEmail");

const usdtTxHash =
  document.getElementById("usdtTxHash");

const usdtAmountDisplay =
  document.getElementById("usdtAmountDisplay");

const usdtTimer =
  document.getElementById("usdtTimer");


// Account
const accountModal =
  document.getElementById("accountModal");

const closeAccountModal =
  document.getElementById("closeAccountModal");

const closeAccountModalBtn =
  document.getElementById("closeAccountModalBtn");

const modalUserName =
  document.getElementById("modalUserName");

const modalUserEmail =
  document.getElementById("modalUserEmail");


// Success modal
const campaignSuccessModal =
  document.getElementById("campaignSuccessModal");

const successRecipientCount =
  document.getElementById("successRecipientCount");

const successRouteName =
  document.getElementById("successRouteName");

const successCampaignCost =
  document.getElementById("successCampaignCost");

const btnSuccessGoOutbox =
  document.getElementById("btnSuccessGoOutbox");

const btnSuccessClose =
  document.getElementById("btnSuccessClose");


// Toast
const toastContainer =
  document.getElementById("toastContainer");


// =========================================================
// STATE
// =========================================================

let currentUser = null;

let selectedTopUpAmount = 99;

let countdownInterval = null;

let parsedCampaignNumbers = [];

let currentWalletBalance = 0;


// Route prices
const ROUTES = {
  "Route A": 0.030,
  "Route B": 0.045
};


// =========================================================
// HELPERS
// =========================================================

function money(value) {
  const number = Number(value) || 0;
  return `$${number.toFixed(2)}`;
}


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


function openModal(modal) {
  if (modal) {
    modal.classList.remove("hidden");
  }
}


function closeModal(modal) {
  if (modal) {
    modal.classList.add("hidden");
  }
}


// =========================================================
// LIVE CLOCK
// =========================================================

function startLiveClock() {
  function updateClock() {
    const now = new Date();

    const pad = (value) =>
      String(value).padStart(2, "0");

    const formatted =
      `${now.getFullYear()}-` +
      `${pad(now.getMonth() + 1)}-` +
      `${pad(now.getDate())} ` +
      `${pad(now.getHours())}:` +
      `${pad(now.getMinutes())}:` +
      `${pad(now.getSeconds())}`;

    if (liveClockDisplay) {
      liveClockDisplay.textContent =
        formatted;
    }
  }

  updateClock();

  setInterval(updateClock, 1000);
}


// =========================================================
// NAVIGATION
// =========================================================

function switchView(targetViewId) {
  viewPanels.forEach((panel) => {
    panel.classList.add("hidden");
  });

  const target =
    document.getElementById(targetViewId);

  if (target) {
    target.classList.remove("hidden");
  }

  menuItems.forEach((item) => {
    const view =
      item.getAttribute("data-view");

    item.classList.toggle(
      "active",
      view === targetViewId
    );
  });

  if (targetViewId === "viewOutbox") {
    loadOutboxRecords();
  }

  if (targetViewId === "viewPaymentHistory") {
    loadPaymentHistory();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


menuItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();

    const view =
      item.getAttribute("data-view");

    if (view) {
      switchView(view);
    }
  });
});


if (btnGetStarted) {
  btnGetStarted.addEventListener(
    "click",
    () => {
      switchView("viewNewCampaign");
    }
  );
}


// =========================================================
// ROUTES
// =========================================================

function getSelectedRoute() {
  const selected =
    document.querySelector(
      'input[name="campaignRoute"]:checked'
    );

  if (selected) {
    return {
      name: selected.value,
      price:
        Number(
          selected.getAttribute("data-price")
        ) || ROUTES[selected.value] || 0
    };
  }

  const fallback =
    campaignRouteInput?.value || "Route A";

  return {
    name: fallback,
    price: ROUTES[fallback] || 0.030
  };
}


function updateRouteUI() {
  const route =
    getSelectedRoute();

  if (campaignRouteInput) {
    campaignRouteInput.value =
      route.name;
  }

  if (campaignSelectedRoute) {
    campaignSelectedRoute.textContent =
      route.name;
  }

  routeCards.forEach((card) => {
    const radio =
      card.querySelector(
        'input[name="campaignRoute"]'
      );

    card.classList.toggle(
      "active",
      Boolean(radio?.checked)
    );
  });

  updateCampaignCost();
}


routeRadios.forEach((radio) => {
  radio.addEventListener(
    "change",
    updateRouteUI
  );
});


routeCards.forEach((card) => {
  card.addEventListener(
    "click",
    () => {
      const radio =
        card.querySelector(
          'input[name="campaignRoute"]'
        );

      if (radio) {
        radio.checked = true;
        updateRouteUI();
      }
    }
  );
});


if (campaignRouteInput) {
  campaignRouteInput.addEventListener(
    "change",
    () => {
      const selected =
        campaignRouteInput.value;

      const radio =
        document.querySelector(
          `input[name="campaignRoute"][value="${selected}"]`
        );

      if (radio) {
        radio.checked = true;
      }

      updateRouteUI();
    }
  );
}


// =========================================================
// RECIPIENT PARSING
// =========================================================

function parseInputNumbers(text) {
  if (!text) return [];

  const values =
    text.split(/[\n,;]+/);

  const cleaned =
    values
      .map((value) => value.trim())
      .filter(Boolean);

  /*
   * Keep the existing loose validation so that
   * international numbers with +, spaces or
   * country codes are accepted.
   */
  return cleaned.filter(
    (value) =>
      value.replace(/\D/g, "").length >= 7
  );
}


function updateRecipientCount() {
  parsedCampaignNumbers =
    parseInputNumbers(
      campaignNumbersArea?.value || ""
    );

  const count =
    parsedCampaignNumbers.length;

  if (recipientCount) {
    recipientCount.textContent =
      `${count} recipient${count === 1 ? "" : "s"}`;
  }

  if (recipientCountLarge) {
    recipientCountLarge.textContent =
      count.toString();
  }

  updateCampaignCost();
}


if (campaignNumbersArea) {
  campaignNumbersArea.addEventListener(
    "input",
    updateRecipientCount
  );
}


// =========================================================
// CAMPAIGN COST
// =========================================================

function calculateCampaignCost() {
  const route =
    getSelectedRoute();

  const count =
    parsedCampaignNumbers.length;

  return count * route.price;
}


function updateCampaignCost() {
  const route =
    getSelectedRoute();

  const cost =
    parsedCampaignNumbers.length *
    route.price;

  if (campaignEstimatedCost) {
    campaignEstimatedCost.textContent =
      money(cost);
  }
}


// =========================================================
// MESSAGE COUNTER
// =========================================================

function updateMessageCounter() {
  if (!mainMessageContent) return;

  const length =
    mainMessageContent.value.length;

  if (wordsAndItemsCounter) {
    wordsAndItemsCounter.textContent =
      `${length} / 160 characters`;
  }
}


if (mainMessageContent) {
  mainMessageContent.addEventListener(
    "input",
    updateMessageCounter
  );
}


// =========================================================
// FILE UPLOAD
// =========================================================

if (btnTriggerUpload && bulkFileInput) {

  btnTriggerUpload.addEventListener(
    "click",
    () => {
      bulkFileInput.click();
    }
  );


  bulkFileInput.addEventListener(
    "change",
    (event) => {

      const file =
        event.target.files?.[0];

      if (!file) return;

      const reader =
        new FileReader();

      reader.onload =
        (loadEvent) => {

          const content =
            String(
              loadEvent.target.result || ""
            );

          if (campaignNumbersArea) {
            campaignNumbersArea.value =
              content;
          }

          updateRecipientCount();

          showToast(
            `${parsedCampaignNumbers.length} recipients loaded from ${file.name}.`,
            "success"
          );
        };

      reader.onerror = () => {
        showToast(
          "Unable to read the selected file.",
          "error"
        );
      };

      reader.readAsText(file);

      // Allow the same file to be selected again.
      bulkFileInput.value = "";
    }
  );
}


// =========================================================
// WALLET
// =========================================================

function walletStorageKey() {
  return currentUser?.email
    ? `wallet_${currentUser.email}`
    : null;
}


async function calculateWalletBalance() {

  if (!currentUser) {
    return 0;
  }


  // Local wallet value has priority.
  const key =
    walletStorageKey();

  if (key) {
    const localValue =
      localStorage.getItem(key);

    if (
      localValue !== null &&
      localValue !== ""
    ) {
      const parsed =
        Number.parseFloat(localValue);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }


  /*
   * If no local balance exists, calculate approved
   * top-ups belonging to the current user.
   */
  if (supabase) {

    try {

      const { data, error } =
        await supabase
          .from("topup_requests")
          .select("amount,status")
          .eq(
            "user_id",
            currentUser.id
          )
          .in(
            "status",
            [
              "paid",
              "approved",
              "completed"
            ]
          );

      if (!error && Array.isArray(data)) {

        return data.reduce(
          (total, item) =>
            total +
            (Number(item.amount) || 0),
          0
        );
      }

    } catch (error) {

      console.warn(
        "Wallet lookup failed:",
        error
      );

    }
  }

  return 0;
}


function renderWalletBalance(balance) {

  currentWalletBalance =
    Number(balance) || 0;

  const formatted =
    money(currentWalletBalance);

  if (walletBalance) {
    walletBalance.textContent =
      formatted;
  }

  if (walletBalanceTop) {
    walletBalanceTop.textContent =
      formatted;
  }
}


async function refreshWalletBalance() {

  const balance =
    await calculateWalletBalance();

  renderWalletBalance(balance);
}


// =========================================================
// TOP-UP TIMER
// =========================================================

function startPaymentTimer() {

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  let totalSeconds =
    20 * 60;


  function updateTimer() {

    const mins =
      Math.floor(
        totalSeconds / 60
      );

    const secs =
      totalSeconds % 60;


    if (usdtTimer) {

      usdtTimer.textContent =
        `${String(mins).padStart(2, "0")}:` +
        `${String(secs).padStart(2, "0")}`;

    }


    if (totalSeconds <= 0) {

      clearInterval(
        countdownInterval
      );

      if (usdtTimer) {
        usdtTimer.textContent =
          "Expired";
      }

      return;
    }


    totalSeconds--;
  }


  updateTimer();

  countdownInterval =
    setInterval(
      updateTimer,
      1000
    );
}


function openTopUpModal() {

  openModal(topUpModal);

  if (usdtUserEmail && currentUser) {
    usdtUserEmail.value =
      currentUser.email || "";
  }

  startPaymentTimer();
}


if (topbarBalanceBtn) {
  topbarBalanceBtn.addEventListener(
    "click",
    openTopUpModal
  );
}

if (btnSidebarTopUp) {
  btnSidebarTopUp.addEventListener(
    "click",
    openTopUpModal
  );
}

if (btnDashboardTopUp) {
  btnDashboardTopUp.addEventListener(
    "click",
    openTopUpModal
  );
}

if (btnOpenTopUpFromMenu) {
  btnOpenTopUpFromMenu.addEventListener(
    "click",
    () => {
      openTopUpModal();

      if (userDropdownMenu) {
        userDropdownMenu.classList.add(
          "hidden"
        );
      }
    }
  );
}


if (closeTopUpModal) {
  closeTopUpModal.addEventListener(
    "click",
    () => closeModal(topUpModal)
  );
}


if (cancelTopUpBtn) {
  cancelTopUpBtn.addEventListener(
    "click",
    () => closeModal(topUpModal)
  );
}


// Top-up tiers
document
  .querySelectorAll(".tier-pill")
  .forEach((pill) => {

    pill.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".tier-pill")
          .forEach((item) => {
            item.classList.remove(
              "active"
            );
          });

        pill.classList.add("active");

        selectedTopUpAmount =
          Number(
            pill.getAttribute(
              "data-amount"
            )
          ) || 99;

        if (usdtAmountDisplay) {
          usdtAmountDisplay.textContent =
            money(selectedTopUpAmount);
        }

      }
    );

  });


// Copy wallet
if (
  copyUsdtAddressBtn &&
  usdtWalletAddress
) {

  copyUsdtAddressBtn.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard.writeText(
          usdtWalletAddress.value
        );

        const original =
          copyUsdtAddressBtn.textContent;

        copyUsdtAddressBtn.textContent =
          "Copied";

        showToast(
          "TRC20 wallet address copied.",
          "success"
        );

        setTimeout(() => {

          copyUsdtAddressBtn.textContent =
            original || "Copy";

        }, 1800);

      } catch (error) {

        showToast(
          "Could not copy wallet address.",
          "error"
        );

      }

    }
  );

}


// Submit top-up
if (btnSubmitPaid) {

  btnSubmitPaid.addEventListener(
    "click",
    async () => {

      const txHash =
        usdtTxHash?.value.trim() || "";

      if (!txHash) {

        showToast(
          "Please enter the TRC20 transaction hash.",
          "error"
        );

        usdtTxHash?.focus();

        return;
      }


      if (!currentUser) {

        showToast(
          "Your account session has expired.",
          "error"
        );

        return;
      }


      btnSubmitPaid.disabled = true;

      btnSubmitPaid.textContent =
        "Submitting...";


      const newRequest = {

        id:
          typeof crypto?.randomUUID ===
          "function"
            ? crypto.randomUUID()
            : `req_${Date.now()}`,

        user_id:
          currentUser.id,

        user_email:
          currentUser.email || "",

        amount:
          selectedTopUpAmount,

        network:
          "TRC20",

        wallet_address:
          usdtWalletAddress?.value || "",

        tx_hash:
          txHash,

        status:
          "pending",

        created_at:
          new Date().toISOString()

      };


      let savedToSupabase = false;


      if (supabase) {

        try {

          const { error } =
            await supabase
              .from("topup_requests")
              .insert([
                newRequest
              ]);

          if (!error) {
            savedToSupabase = true;
          } else {
            console.error(
              "Top-up insert error:",
              error
            );
          }

        } catch (error) {

          console.error(
            "Top-up insert exception:",
            error
          );

        }

      }


      // Keep local request history for the current browser.
      try {

        const existing =
          JSON.parse(
            localStorage.getItem(
              "imessagehub_topups"
            ) || "[]"
          );

        existing.unshift(
          newRequest
        );

        localStorage.setItem(
          "imessagehub_topups",
          JSON.stringify(existing)
        );

      } catch (error) {

        console.warn(
          "Local top-up storage failed:",
          error
        );

      }


      closeModal(topUpModal);

      if (usdtTxHash) {
        usdtTxHash.value = "";
      }

      btnSubmitPaid.disabled = false;

      btnSubmitPaid.textContent =
        "PAID";


      showToast(
        savedToSupabase
          ? "Payment submitted for verification."
          : "Payment request saved.",
        "success"
      );


      await loadPaymentHistory();

    }
  );

}


// =========================================================
// PAYMENT HISTORY
// =========================================================

function renderPaymentHistory(records) {

  if (!paymentHistoryList) {
    return;
  }

  paymentHistoryList.innerHTML = "";


  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {

    paymentHistoryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">$</div>
        <h3>No payments yet</h3>
        <p>
          Your submitted top-up requests will appear here.
        </p>
      </div>
    `;

    return;
  }


  records.forEach((record) => {

    const status =
      String(
        record.status || "pending"
      ).toLowerCase();


    const statusLabel =
      status.toUpperCase();


    const amount =
      Number(record.amount) || 0;


    const date =
      new Date(
        record.created_at ||
        Date.now()
      );


    const item =
      document.createElement("div");

    item.className =
      "payment-history-item";


    item.innerHTML = `
      <div class="payment-history-main">
        <strong>${money(amount)}</strong>
        <span>USDT ${record.network || "TRC20"}</span>
      </div>

      <div class="payment-history-tx">
        <span>TxID</span>
        <code>${record.tx_hash || "—"}</code>
      </div>

      <div class="payment-history-date">
        ${date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        })}
      </div>

      <span class="status-pill ${status === "paid" || status === "approved" || status === "completed"
        ? "status-success"
        : ""}">
        ${statusLabel}
      </span>
    `;


    paymentHistoryList.appendChild(
      item
    );

  });

}


async function loadPaymentHistory() {

  let records = [];


  if (supabase && currentUser) {

    try {

      const { data, error } =
        await supabase
          .from("topup_requests")
          .select("*")
          .eq(
            "user_id",
            currentUser.id
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );

      if (!error && Array.isArray(data)) {
        records = data;
      }

    } catch (error) {

      console.warn(
        "Payment history lookup failed:",
        error
      );

    }

  }


  // Local fallback / merge
  try {

    const local =
      JSON.parse(
        localStorage.getItem(
          "imessagehub_topups"
        ) || "[]"
      );


    if (Array.isArray(local)) {

      const ids =
        new Set(
          records.map(
            (item) => item.id
          )
        );


      local.forEach((item) => {

        if (
          !ids.has(item.id) &&
          (
            !currentUser ||
            item.user_id ===
              currentUser.id
          )
        ) {
          records.push(item);
        }

      });

    }

  } catch (error) {
    console.warn(
      "Local payment history failed:",
      error
    );
  }


  records.sort(
    (a, b) =>
      new Date(
        b.created_at || 0
      ) -
      new Date(
        a.created_at || 0
      )
  );


  renderPaymentHistory(records);
}


// =========================================================
// OUTBOX
// =========================================================

function outboxStorageKey() {

  return currentUser?.email
    ? `outbox_${currentUser.email}`
    : "outbox_default";

}


async function loadOutboxRecords() {

  let records = [];


  // Local records
  try {

    records =
      JSON.parse(
        localStorage.getItem(
          outboxStorageKey()
        ) || "[]"
      );

  } catch (error) {

    records = [];

  }


  // Optional Supabase records
  if (supabase && currentUser) {

    try {

      const { data, error } =
        await supabase
          .from("campaign_messages")
          .select("*")
          .eq(
            "user_id",
            currentUser.id
          )
          .order(
            "created_at",
            {
              ascending: false
            }
          );


      if (
        !error &&
        Array.isArray(data)
      ) {

        const existingIds =
          new Set(
            records.map(
              (record) =>
                record.msg_id ||
                record.id
            )
          );


        data.forEach((item) => {

          const identifier =
            item.msg_id ||
            item.id;

          if (
            !existingIds.has(
              identifier
            )
          ) {

            records.push({
              id:
                item.msg_id ||
                item.id,

              recipient:
                item.recipient,

              body:
                item.body,

              route:
                item.route ||
                item.sender_id ||
                "Route A",

              cost:
                Number(item.cost) ||
                0,

              sender:
                item.sender_id ||
                "iMessage-Direct",

              time:
                item.created_at,

              status:
                item.status ||
                "Submitted"
            });

          }

        });

      }

    } catch (error) {

      console.warn(
        "Outbox Supabase lookup failed:",
        error
      );

    }

  }


  renderOutboxRecords(records);
}


function renderOutboxRecords(records) {

  if (!outboxRecordsTbody) {
    return;
  }


  outboxRecordsTbody.innerHTML = "";


  if (
    !Array.isArray(records) ||
    records.length === 0
  ) {

    if (outboxNoDataNotice) {
      outboxNoDataNotice.classList.remove(
        "hidden"
      );
    }

    return;
  }


  if (outboxNoDataNotice) {
    outboxNoDataNotice.classList.add(
      "hidden"
    );
  }


  records.forEach((record) => {

    const row =
      document.createElement("tr");


    const route =
      record.route ||
      "Route A";


    const cost =
      Number(record.cost) || 0;


    const status =
      record.status ||
      "Submitted";


    const sender =
      record.sender ||
      "iMessage-Direct";


    const time =
      record.time ||
      record.created_at ||
      new Date().toISOString();


    row.innerHTML = `
      <td>
        <span class="outbox-id">
          ${record.id || "—"}
        </span>
      </td>

      <td>
        Messaging
      </td>

      <td>
        <strong>${route}</strong>
      </td>

      <td>
        ${money(cost)}
      </td>

      <td>
        <span class="status-pill status-success">
          ${status}
        </span>
      </td>

      <td>
        <strong>${record.recipient || "—"}</strong>
      </td>

      <td>
        ${sender}
      </td>

      <td>
        ${formatDateTime(time)}
      </td>

      <td>
        <span class="outbox-state">
          SUBMITTED
        </span>
      </td>
    `;


    outboxRecordsTbody.appendChild(
      row
    );

  });

}


function formatDateTime(value) {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }


  return date.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
}


function saveRecordToOutbox(
  recipient,
  text,
  route,
  cost,
  sender
) {

  const key =
    outboxStorageKey();


  let records = [];


  try {

    records =
      JSON.parse(
        localStorage.getItem(
          key
        ) || "[]"
      );

  } catch (error) {

    records = [];

  }


  const record = {

    id:
      "MSG-" +
      Math.random()
        .toString(36)
        .slice(2, 10)
        .toUpperCase(),

    recipient,

    body:
      text,

    route,

    cost,

    sender,

    time:
      new Date().toISOString(),

    status:
      "Submitted"

  };


  records.unshift(
    record
  );


  localStorage.setItem(
    key,
    JSON.stringify(records)
  );


  return record;
}


// =========================================================
// CAMPAIGN SUBMISSION
// =========================================================

async function saveCampaignToSupabase(
  recipient,
  message,
  route,
  cost,
  sender,
  record
) {

  if (
    !supabase ||
    !currentUser
  ) {
    return false;
  }


  try {

    const { error } =
      await supabase
        .from("campaign_messages")
        .insert([
          {
            user_id:
              currentUser.id,

            user_email:
              currentUser.email || "",

            msg_id:
              record.id,

            recipient,

            body:
              message,

            sender_id:
              sender,

            channel:
              "APNs",

            status:
              "Submitted",

            route_id:
              route,

            cost:

              Number(cost) || 0
          }
        ]);


    if (error) {

      console.warn(
        "Campaign Supabase save failed:",
        error
      );

      return false;
    }


    return true;

  } catch (error) {

    console.warn(
      "Campaign Supabase save exception:",
      error
    );

    return false;
  }
}


async function submitCampaign() {

  parsedCampaignNumbers =
    parseInputNumbers(
      campaignNumbersArea?.value || ""
    );


  const message =
    mainMessageContent?.value.trim() || "";


  if (
    parsedCampaignNumbers.length === 0
  ) {

    showToast(
      "Please enter or upload at least one recipient number.",
      "error"
    );

    campaignNumbersArea?.focus();

    return;
  }


  if (!message) {

    showToast(
      "Message content is required.",
      "error"
    );

    mainMessageContent?.focus();

    return;
  }


  const route =
    getSelectedRoute();


  const totalCost =
    calculateCampaignCost();


  if (
    currentWalletBalance <
    totalCost
  ) {

    showToast(
      `Insufficient balance. Required ${money(totalCost)}, available ${money(currentWalletBalance)}.`,
      "error"
    );

    return;
  }


  if (!btnSubmitCampaign) {
    return;
  }


  btnSubmitCampaign.disabled =
    true;


  const originalText =
    btnSubmitCampaign.innerHTML;


  btnSubmitCampaign.innerHTML =
    `
      <span class="button-loading-spinner"></span>
      Preparing submission...
    `;


  try {

    /*
     * This is intentionally a simulation:
     * no messaging provider/API is called.
     */

    for (
      const recipient
      of parsedCampaignNumbers
    ) {

      const record =
        saveRecordToOutbox(
          recipient,
          message,
          route.name,
          route.price,
          senderIdInput?.value.trim() ||
            "iMessage-Direct"
        );


      await saveCampaignToSupabase(
        recipient,
        message,
        route.name,
        route.price,
        senderIdInput?.value.trim() ||
          "iMessage-Direct",
        record
      );

    }


    /*
     * For the local wallet experience,
     * reserve the calculated campaign amount.
     */
    const newBalance =
      Math.max(
        0,
        currentWalletBalance -
          totalCost
      );


    const key =
      walletStorageKey();


    if (key) {

      localStorage.setItem(
        key,
        newBalance.toFixed(2)
      );

    }


    renderWalletBalance(
      newBalance
    );


    if (successRecipientCount) {
      successRecipientCount.textContent =
        parsedCampaignNumbers.length;
    }


    if (successRouteName) {
      successRouteName.textContent =
        route.name;
    }


    if (successCampaignCost) {
      successCampaignCost.textContent =
        money(totalCost);
    }


    closeModal(
      document.getElementById(
        "topUpModal"
      )
    );


    openModal(
      campaignSuccessModal
    );


    await loadOutboxRecords();


  } catch (error) {

    console.error(
      "Campaign submission error:",
      error
    );

    showToast(
      "Unable to submit campaign.",
      "error"
    );

  } finally {

    btnSubmitCampaign.disabled =
      false;

    btnSubmitCampaign.innerHTML =
      originalText;

  }

}


if (btnSubmitCampaign) {

  btnSubmitCampaign.addEventListener(
    "click",
    submitCampaign
  );

}


// =========================================================
// SUCCESS MODAL
// =========================================================

if (btnSuccessClose) {

  btnSuccessClose.addEventListener(
    "click",
    () => {
      closeModal(
        campaignSuccessModal
      );
    }
  );

}


if (btnSuccessGoOutbox) {

  btnSuccessGoOutbox.addEventListener(
    "click",
    () => {

      closeModal(
        campaignSuccessModal
      );

      switchView(
        "viewOutbox"
      );

    }
  );

}


// =========================================================
// CLEAR OUTBOX
// =========================================================

if (btnClearOutboxRecords) {

  btnClearOutboxRecords.addEventListener(
    "click",
    async () => {

      const confirmed =
        window.confirm(
          "Clear all campaign records for this account?"
        );


      if (!confirmed) {
        return;
      }


      try {

        localStorage.removeItem(
          outboxStorageKey()
        );

        await loadOutboxRecords();

        showToast(
          "Outbox records cleared.",
          "success"
        );

      } catch (error) {

        showToast(
          "Could not clear outbox.",
          "error"
        );

      }

    }
  );

}


if (btnFilterSearch) {

  btnFilterSearch.addEventListener(
    "click",
    async () => {

      await loadOutboxRecords();

      showToast(
        "Outbox refreshed.",
        "success"
      );

    }
  );

}


// =========================================================
// ACCOUNT MODAL
// =========================================================

if (btnShowProfile) {

  btnShowProfile.addEventListener(
    "click",
    () => {

      openModal(
        accountModal
      );

      if (userDropdownMenu) {
        userDropdownMenu.classList.add(
          "hidden"
        );
      }

    }
  );

}


if (closeAccountModal) {

  closeAccountModal.addEventListener(
    "click",
    () => {
      closeModal(
        accountModal
      );
    }
  );

}


if (closeAccountModalBtn) {

  closeAccountModalBtn.addEventListener(
    "click",
    () => {
      closeModal(
        accountModal
      );
    }
  );

}


// =========================================================
// USER DROPDOWN
// =========================================================

if (
  userMenuBtn &&
  userDropdownMenu
) {

  userMenuBtn.addEventListener(
    "click",
    (event) => {

      event.stopPropagation();

      userDropdownMenu.classList.toggle(
        "hidden"
      );

    }
  );


  document.addEventListener(
    "click",
    () => {

      userDropdownMenu.classList.add(
        "hidden"
      );

    }
  );


  userDropdownMenu.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
    }
  );

}


// =========================================================
// AUTH / USER INITIALIZATION
// =========================================================

async function initDashboard() {

  startLiveClock();


  if (!supabase) {

    console.error(
      "Supabase is not configured."
    );

    return;
  }


  try {

    const {
      data: {
        session
      },
      error
    } =
      await supabase.auth.getSession();


    if (
      error ||
      !session
    ) {

      window.location.href =
        "index.html";

      return;
    }


    currentUser =
      session.user;


    const fullName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "User";


    const email =
      currentUser.email ||
      "N/A";


    const uid =
      currentUser.id ||
      "N/A";


    const role =
      currentUser.user_metadata?.role ||
      currentUser.app_metadata?.role ||
      "consumer";


    const accountCode =
      "0016C" +
      (
        uid
          .replace(/\D/g, "")
          .slice(0, 3) ||
        "136"
      );


    // User details
    if (welcomeName) {
      welcomeName.textContent =
        fullName;
    }


    if (welcomeEmail) {
      welcomeEmail.textContent =
        email;
    }


    if (accountRole) {
      accountRole.textContent =
        role;
    }


    if (headerName) {
      headerName.textContent =
        accountCode;
    }


    if (dashWelcomeId) {
      dashWelcomeId.textContent =
        accountCode;
    }


    if (dropdownUserTitle) {
      dropdownUserTitle.textContent =
        accountCode;
    }


    if (modalUserName) {
      modalUserName.textContent =
        `${fullName} (${accountCode})`;
    }


    if (modalUserEmail) {
      modalUserEmail.textContent =
        email;
    }


    if (usdtUserEmail) {
      usdtUserEmail.value =
        email;
    }


    if (headerAvatar) {
      headerAvatar.textContent =
        fullName
          .charAt(0)
          .toUpperCase();
    }


    if (userId) {
      userId.textContent =
        uid;
    }


    if (createdAt) {

      createdAt.textContent =
        formatDateTime(
          currentUser.created_at
        );

    }


    if (accountStatus) {
      accountStatus.textContent =
        "ACTIVE";
    }


    await refreshWalletBalance();

    updateRecipientCount();

    updateMessageCounter();

    updateRouteUI();

    await loadOutboxRecords();

    await loadPaymentHistory();


    // Session listener
    supabase.auth.onAuthStateChange(
      (event, newSession) => {

        if (
          event === "SIGNED_OUT" ||
          !newSession
        ) {

          window.location.href =
            "index.html";

        }

      }
    );


  } catch (error) {

    console.error(
      "Dashboard initialization error:",
      error
    );

    if (dashboardMessage) {

      dashboardMessage.textContent =
        "Unable to load your account.";

      dashboardMessage.classList.remove(
        "hidden"
      );

    }

  }

}


// =========================================================
// LOGOUT
// =========================================================

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      try {

        if (supabase) {
          await supabase.auth.signOut();
        }

      } catch (error) {

        console.error(
          "Logout error:",
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
// INITIALIZE
// =========================================================

initDashboard();
