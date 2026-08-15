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
const headerAvatar = document.getElementById("headerAvatar");
const dashWelcomeId = document.getElementById("dashWelcomeId");
const dropdownUserTitle = document.getElementById("dropdownUserTitle");
const liveClockDisplay = document.getElementById("liveClockDisplay");

const menuItems = document.querySelectorAll("[data-view]");
const viewPanels = document.querySelectorAll(".view-panel");
const btnGetStarted = document.getElementById("btnGetStarted");

const userMenuBtn = document.getElementById("userMenuBtn");
const userDropdownMenu = document.getElementById("userDropdownMenu");
const btnShowProfile = document.getElementById("btnShowProfile");
const btnOpenTopUpFromMenu =
  document.getElementById("btnOpenTopUpFromMenu");
const topbarBalanceBtn =
  document.getElementById("topbarBalanceBtn");
const btnSidebarTopUp =
  document.getElementById("btnSidebarTopUp");

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

const campaignProgressBox =
  document.getElementById("campaignProgressBox");
const campaignProgressText =
  document.getElementById("campaignProgressText");
const campaignProgressPercent =
  document.getElementById("campaignProgressPercent");
const campaignProgressBarFill =
  document.getElementById("campaignProgressBarFill");

const outboxRecordsTbody =
  document.getElementById("outboxRecordsTbody");
const outboxNoDataNotice =
  document.getElementById("outboxNoDataNotice");
const btnClearOutboxRecords =
  document.getElementById("btnClearOutboxRecords");
const btnFilterSearch =
  document.getElementById("btnFilterSearch");

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

const toastContainer =
  document.getElementById("toastContainer");

// =========================================================
// STATE
// =========================================================

let currentUser = null;
let selectedTopUpAmount = 99.0;
let countdownInterval = null;

let parsedCampaignNumbers = [];

let availableRoutes = [];
let selectedRoute = null;

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
// HELPERS
// =========================================================

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSelectedRoutePrice() {
  return Number(
    selectedRoute?.price_per_message || 0
  );
}

function getEstimatedCampaignCost() {
  return (
    parsedCampaignNumbers.length *
    getSelectedRoutePrice()
  );
}

// =========================================================
// LIVE CLOCK
// =========================================================

function startLiveClock() {
  function update() {
    const now = new Date();

    const pad = (n) =>
      n.toString().padStart(2, "0");

    const formatted =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
      `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    if (liveClockDisplay) {
      liveClockDisplay.textContent = formatted;
    }
  }

  update();

  setInterval(update, 1000);
}

// =========================================================
// VIEW SWITCHING
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

  menuItems.forEach((menu) => {
    menu.classList.toggle(
      "active",
      menu.getAttribute("data-view") ===
        targetViewId
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

menuItems.forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();

    const viewId =
      button.getAttribute("data-view");

    if (viewId) {
      switchView(viewId);
    }
  });
});

if (btnGetStarted) {
  btnGetStarted.addEventListener(
    "click",
    () => switchView("viewNewCampaign")
  );
}

// =========================================================
// PAYMENT TIMER
// =========================================================

function startPaymentTimer() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  let totalSeconds = 20 * 60;

  function updateDisplay() {
    const mins =
      Math.floor(totalSeconds / 60);

    const secs =
      totalSeconds % 60;

    if (usdtTimer) {
      usdtTimer.textContent =
        `${mins.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`;
    }

    if (totalSeconds <= 0) {
      clearInterval(countdownInterval);

      if (usdtTimer) {
        usdtTimer.textContent = "Expired";
      }

      return;
    }

    totalSeconds--;
  }

  updateDisplay();

  countdownInterval =
    setInterval(updateDisplay, 1000);
}

// =========================================================
// DASHBOARD INIT
// =========================================================

async function initDashboard() {
  startLiveClock();

  if (!supabase) {
    return;
  }

  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error || !session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    const fullName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "User";

    const emailStr =
      currentUser.email || "N/A";

    const userIdStr =
      currentUser.id || "N/A";

    const roleStr =
      currentUser.user_metadata?.role ||
      "consumer";

    const cachedBalance =
      localStorage.getItem(
        `wallet_${emailStr}`
      );

    const walletStr = cachedBalance
      ? `$${parseFloat(cachedBalance).toFixed(2)}`
      : currentUser.user_metadata
          ?.wallet_balance ||
        "$0.00";

    const accountCode =
      "0016C" +
      (
        userIdStr
          .replace(/\D/g, "")
          .slice(0, 3) || "136"
      );

    if (welcomeName) {
      welcomeName.textContent = fullName;
    }

    if (welcomeEmail) {
      welcomeEmail.textContent = emailStr;
    }

    if (walletBalance) {
      walletBalance.textContent = walletStr;
    }

    const walletBalanceTop =
      document.getElementById(
        "walletBalanceTop"
      );

    if (walletBalanceTop) {
      walletBalanceTop.textContent =
        walletStr;
    }

    if (accountRole) {
      accountRole.textContent = roleStr;
    }

    if (headerName) {
      headerName.textContent =
        accountCode;
    }

    if (headerAvatar) {
      headerAvatar.textContent =
        fullName
          .charAt(0)
          .toUpperCase();
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
        emailStr;
    }

    if (usdtUserEmail) {
      usdtUserEmail.value =
        emailStr;
    }

    if (createdAt) {
      createdAt.textContent =
        currentUser.created_at
          ? new Date(
              currentUser.created_at
            ).toLocaleString()
          : "—";
    }

    if (userId) {
      userId.textContent =
        userIdStr;
    }

    loadOutboxRecords();

    await loadCampaignRoutes();

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
      "Dashboard error:",
      error
    );
  }
}

// =========================================================
// ROUTES
// =========================================================

async function loadCampaignRoutes() {
  if (!supabase) return;

  try {
    const {
      data,
      error
    } = await supabase
      .from("routes")
      .select(
        "id, name, code, price_per_message, enabled"
      )
      .eq("enabled", true)
      .order("created_at", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    availableRoutes =
      Array.isArray(data)
        ? data
        : [];

    if (
      availableRoutes.length === 0
    ) {
      selectedRoute = null;
      renderRouteSelector();
      updateCampaignSummary();

      showToast(
        "No messaging routes are currently available.",
        "error"
      );

      return;
    }

    if (
      !selectedRoute ||
      !availableRoutes.some(
        (route) =>
          route.id ===
          selectedRoute.id
      )
    ) {
      selectedRoute =
        availableRoutes[0];
    } else {
      selectedRoute =
        availableRoutes.find(
          (route) =>
            route.id ===
            selectedRoute.id
        ) || availableRoutes[0];
    }

    renderRouteSelector();
    updateCampaignSummary();

  } catch (error) {
    console.error(
      "Route loading error:",
      error
    );

    showToast(
      "Unable to load messaging routes.",
      "error"
    );
  }
}

// =========================================================
// ROUTE SELECTOR
// =========================================================

function renderRouteSelector() {
  const campaignForm =
    document.querySelector(
      "#viewNewCampaign .campaign-form"
    );

  if (!campaignForm) return;

  let routeSection =
    document.getElementById(
      "campaignRouteSection"
    );

  if (!routeSection) {
    routeSection =
      document.createElement("div");

    routeSection.id =
      "campaignRouteSection";

    routeSection.className =
      "form-section";

    campaignForm.insertBefore(
      routeSection,
      campaignForm.firstChild
    );
  }

  routeSection.innerHTML = "";

  const label =
    document.createElement("label");

  label.className =
    "portal-label";

  label.textContent =
    "Messaging Route";

  const select =
    document.createElement("select");

  select.id =
    "campaignRouteSelect";

  select.className =
    "portal-input";

  if (
    availableRoutes.length === 0
  ) {
    const option =
      document.createElement("option");

    option.value = "";

    option.textContent =
      "No routes available";

    select.appendChild(option);

    select.disabled = true;

  } else {

    availableRoutes.forEach(
      (route) => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          route.id;

        option.textContent =
          `${route.name} — $${Number(
            route.price_per_message
          ).toFixed(3)} / message`;

        if (
          selectedRoute &&
          selectedRoute.id ===
            route.id
        ) {
          option.selected = true;
        }

        select.appendChild(
          option
        );
      }
    );

    select.addEventListener(
      "change",
      () => {

        selectedRoute =
          availableRoutes.find(
            (route) =>
              route.id ===
              select.value
          ) || null;

        updateCampaignSummary();
      }
    );
  }

  routeSection.appendChild(label);
  routeSection.appendChild(select);

  const routeInfo =
    document.createElement("div");

  routeInfo.id =
    "campaignRouteInfo";

  routeInfo.style.marginTop =
    "8px";

  routeInfo.style.fontSize =
    "12px";

  routeInfo.style.color =
    "var(--text-secondary, #6b7280)";

  routeSection.appendChild(
    routeInfo
  );

  updateCampaignSummary();
}

// =========================================================
// LIVE CAMPAIGN SUMMARY
// =========================================================

function updateCampaignSummary() {
  const routeInfo =
    document.getElementById(
      "campaignRouteInfo"
    );

  const campaignForm =
    document.querySelector(
      "#viewNewCampaign .campaign-form"
    );

  if (!campaignForm) return;

  const recipientCount =
    parsedCampaignNumbers.length;

  const price =
    getSelectedRoutePrice();

  const estimatedCost =
    getEstimatedCampaignCost();

  if (routeInfo) {

    if (!selectedRoute) {
      routeInfo.textContent =
        "Select a messaging route to continue.";
    } else {
      routeInfo.textContent =
        `${recipientCount} recipient${
          recipientCount === 1
            ? ""
            : "s"
        } × $${price.toFixed(3)} = $${estimatedCost.toFixed(3)}`;
    }
  }

  let summary =
    document.getElementById(
      "campaignLiveSummary"
    );

  if (!summary) {

    summary =
      document.createElement("div");

    summary.id =
      "campaignLiveSummary";

    summary.style.marginTop =
      "4px";

    summary.style.marginBottom =
      "12px";

    summary.style.padding =
      "16px";

    summary.style.borderRadius =
      "12px";

    summary.style.border =
      "1px solid var(--border-color, #e5e7eb)";

    summary.style.background =
      "rgba(255,255,255,0.04)";

    const submitButton =
      document.getElementById(
        "btnSubmitCampaign"
      );

    if (submitButton) {
      campaignForm.insertBefore(
        summary,
        submitButton
      );
    } else {
      campaignForm.appendChild(
        summary
      );
    }
  }

  if (!selectedRoute) {

    summary.innerHTML = `
      <div style="
        display:flex;
        align-items:center;
        gap:10px;
      ">
        <strong>
          Select a route
        </strong>

        <span style="
          font-size:12px;
          color:var(--text-secondary, #6b7280);
        ">
          Choose the messaging route before submitting.
        </span>
      </div>
    `;

    return;
  }

  summary.innerHTML = `
    <div style="
      display:grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap:16px;
    ">

      <div>
        <div style="
          font-size:10px;
          font-weight:700;
          letter-spacing:.06em;
          color:var(--text-secondary, #6b7280);
          margin-bottom:5px;
        ">
          ROUTE
        </div>

        <strong style="font-size:14px;">
          ${escapeHtml(
            selectedRoute.name
          )}
        </strong>

        <div style="
          margin-top:2px;
          font-size:11px;
          color:var(--text-secondary, #6b7280);
        ">
          ${escapeHtml(
            selectedRoute.code
          )}
        </div>
      </div>

      <div>
        <div style="
          font-size:10px;
          font-weight:700;
          letter-spacing:.06em;
          color:var(--text-secondary, #6b7280);
          margin-bottom:5px;
        ">
          RECIPIENTS
        </div>

        <strong style="font-size:18px;">
          ${recipientCount}
        </strong>
      </div>

      <div>
        <div style="
          font-size:10px;
          font-weight:700;
          letter-spacing:.06em;
          color:var(--text-secondary, #6b7280);
          margin-bottom:5px;
        ">
          ESTIMATED COST
        </div>

        <strong style="font-size:18px;">
          $${estimatedCost.toFixed(3)}
        </strong>
      </div>

    </div>
  `;
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
}

// =========================================================
// MODALS
// =========================================================

function openModal(modal) {
  if (modal) {
    modal.classList.remove(
      "hidden"
    );
  }
}

function closeModal(modal) {
  if (modal) {
    modal.classList.add(
      "hidden"
    );
  }
}

function handleOpenTopUp() {
  openModal(topUpModal);
  startPaymentTimer();
}

if (topbarBalanceBtn) {
  topbarBalanceBtn.addEventListener(
    "click",
    handleOpenTopUp
  );
}

if (btnSidebarTopUp) {
  btnSidebarTopUp.addEventListener(
    "click",
    handleOpenTopUp
  );
}

if (btnOpenTopUpFromMenu) {
  btnOpenTopUpFromMenu.addEventListener(
    "click",
    handleOpenTopUp
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

if (btnShowProfile) {
  btnShowProfile.addEventListener(
    "click",
    () => openModal(accountModal)
  );
}

if (closeAccountModal) {
  closeAccountModal.addEventListener(
    "click",
    () => closeModal(accountModal)
  );
}

if (closeAccountModalBtn) {
  closeAccountModalBtn.addEventListener(
    "click",
    () => closeModal(accountModal)
  );
}

// =========================================================
// COPY USDT
// =========================================================

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

        copyUsdtAddressBtn.textContent =
          "Copied!";

        showToast(
          "TRC20 address copied.",
          "success"
        );

        setTimeout(() => {
          copyUsdtAddressBtn.textContent =
            "Copy";
        }, 2000);

      } catch (error) {

        showToast(
          "Could not copy address.",
          "error"
        );
      }
    }
  );
}

// =========================================================
// TOP-UP TIERS
// =========================================================

document
  .querySelectorAll(".tier-pill")
  .forEach((pill) => {

    pill.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(
            ".tier-pill"
          )
          .forEach((item) => {
            item.classList.remove(
              "active"
            );
          });

        pill.classList.add(
          "active"
        );

        selectedTopUpAmount =
          parseFloat(
            pill.getAttribute(
              "data-amount"
            )
          );

        if (usdtAmountDisplay) {
          usdtAmountDisplay.textContent =
            `$${selectedTopUpAmount.toFixed(2)}`;
        }
      }
    );
  });

// =========================================================
// TOP-UP SUBMISSION
// =========================================================

if (btnSubmitPaid) {

  btnSubmitPaid.addEventListener(
    "click",
    async () => {

      const txHash =
        usdtTxHash
          ? usdtTxHash.value.trim()
          : "";

      const email =
        usdtUserEmail
          ? usdtUserEmail.value.trim()
          : currentUser?.email || "";

      if (!txHash) {

        alert(
          "Please enter your TRC20 Transaction Hash / TxID."
        );

        if (usdtTxHash) {
          usdtTxHash.focus();
        }

        return;
      }

      if (!currentUser) {
        showToast(
          "Your session has expired.",
          "error"
        );

        return;
      }

      btnSubmitPaid.disabled =
        true;

      btnSubmitPaid.textContent =
        "Submitting...";

      const newRequest = {
        id:
          crypto.randomUUID
            ? crypto.randomUUID()
            : `req_${Date.now()}`,

        user_id:
          currentUser.id,

        user_email:
          email,

        amount:
          selectedTopUpAmount,

        network:
          "TRC20",

        wallet_address:
          usdtWalletAddress?.value ||
          "TWhUtsbWiR3gQE6yi9CirRQSR1zKAR9FJd",

        tx_hash:
          txHash,

        status:
          "pending",

        created_at:
          new Date().toISOString()
      };

      try {

        if (!supabase) {
          throw new Error(
            "Supabase is not configured."
          );
        }

        const {
          error
        } = await supabase
          .from("topup_requests")
          .insert([newRequest]);

        if (error) {
          throw error;
        }

        closeModal(
          topUpModal
        );

        if (usdtTxHash) {
          usdtTxHash.value = "";
        }

        showToast(
          "Payment submitted. Awaiting account approval.",
          "success"
        );

      } catch (error) {

        console.error(
          "Top-up submission error:",
          error
        );

        showToast(
          `Payment submission failed: ${error.message}`,
          "error"
        );

      } finally {

        btnSubmitPaid.disabled =
          false;

        btnSubmitPaid.textContent =
          "PAID";
      }
    }
  );
}

// =========================================================
// CAMPAIGN NUMBERS
// =========================================================

function parseInputNumbers(text) {
  if (!text) return [];

  const lines =
    text.split(/[\n,;]+/);

  return lines
    .map((line) =>
      line.trim()
    )
    .filter(
      (line) =>
        line.length >= 7
    );
}

if (campaignNumbersArea) {

  campaignNumbersArea.addEventListener(
    "input",
    () => {

      parsedCampaignNumbers =
        parseInputNumbers(
          campaignNumbersArea.value
        );

      updateCampaignSummary();
    }
  );
}

// =========================================================
// FILE UPLOAD
// =========================================================

if (
  btnTriggerUpload &&
  bulkFileInput
) {

  btnTriggerUpload.addEventListener(
    "click",
    () => bulkFileInput.click()
  );

  bulkFileInput.addEventListener(
    "change",
    (event) => {

      const file =
        event.target.files[0];

      if (!file) return;

      const reader =
        new FileReader();

      reader.onload =
        (readerEvent) => {

          const content =
            readerEvent.target.result;

          if (
            campaignNumbersArea
          ) {

            campaignNumbersArea.value =
              content;

            parsedCampaignNumbers =
              parseInputNumbers(
                content
              );

            updateCampaignSummary();

            showToast(
              `Loaded ${file.name} — ${parsedCampaignNumbers.length} recipients detected.`,
              "success"
            );
          }
        };

      reader.readAsText(file);
    }
  );
}

// =========================================================
// MESSAGE COUNTER
// =========================================================

if (
  mainMessageContent &&
  wordsAndItemsCounter
) {

  mainMessageContent.addEventListener(
    "input",
    () => {

      const text =
        mainMessageContent.value;

      const len =
        text.length;

      const words =
        text
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .length;

      wordsAndItemsCounter.textContent =
        `${words} / 160 words | 1 items (${len} chars)`;
    }
  );
}

// =========================================================
// CAMPAIGN SUBMISSION
// =========================================================

if (btnSubmitCampaign) {

  btnSubmitCampaign.addEventListener(
    "click",
    async () => {

      parsedCampaignNumbers =
        parseInputNumbers(
          campaignNumbersArea?.value ||
            ""
        );

      const msg =
        mainMessageContent
          ?.value
          .trim();

      // Route required

      if (!selectedRoute) {

        showToast(
          "Please select a messaging route.",
          "error"
        );

        return;
      }

      // Recipients required

      if (
        parsedCampaignNumbers.length ===
        0
      ) {

        alert(
          "Please enter or upload at least one phone number."
        );

        campaignNumbersArea?.focus();

        return;
      }

      // Message required

      if (!msg) {

        alert(
          "Message content is required."
        );

        mainMessageContent?.focus();

        return;
      }

      const routePrice =
        getSelectedRoutePrice();

      const total =
        parsedCampaignNumbers.length;

      const estimatedCost =
        total * routePrice;

      btnSubmitCampaign.disabled =
        true;

      if (campaignProgressBox) {
        campaignProgressBox.classList.remove(
          "hidden"
        );
      }

      let sent = 0;

      const progressInterval =
        setInterval(() => {

          sent +=
            Math.max(
              1,
              Math.floor(
                total / 10
              )
            );

          if (sent > total) {
            sent = total;
          }

          const pct =
            Math.floor(
              (sent / total) *
                100
            );

          if (
            campaignProgressPercent
          ) {
            campaignProgressPercent.textContent =
              `${pct}%`;
          }

          if (
            campaignProgressText
          ) {
            campaignProgressText.textContent =
              `Dispatching ${sent} / ${total}...`;
          }

          if (
            campaignProgressBarFill
          ) {
            campaignProgressBarFill.style.width =
              `${pct}%`;
          }

          if (sent >= total) {

            clearInterval(
              progressInterval
            );

            parsedCampaignNumbers.forEach(
              (number) => {

                saveRecordToOutbox(
                  number,
                  msg,
                  selectedRoute,
                  routePrice
                );
              }
            );

            setTimeout(() => {

              if (
                campaignProgressBox
              ) {
                campaignProgressBox.classList.add(
                  "hidden"
                );
              }

              btnSubmitCampaign.disabled =
                false;

              showToast(
                `Campaign submitted for ${total} recipients.`,
                "success"
              );

              switchView(
                "viewOutbox"
              );

            }, 500);
          }

        }, 120);
    }
  );
}

// =========================================================
// OUTBOX
// =========================================================

function loadOutboxRecords() {

  const email =
    currentUser?.email ||
    "default";

  let records = [];

  try {
    records =
      JSON.parse(
        localStorage.getItem(
          `outbox_${email}`
        ) || "[]"
      );
  } catch (error) {
    records = [];
  }

  if (!outboxRecordsTbody) {
    return;
  }

  outboxRecordsTbody.innerHTML =
    "";

  if (
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

  records.forEach(
    (record) => {

      const routeName =
        record.routeName ||
        "Route";

      const routeCode =
        record.routeCode ||
        "—";

      const cost =
        Number(
          record.cost ||
            record.routePrice ||
            0
        );

      const tr =
        document.createElement("tr");

      tr.innerHTML = `
        <td>
          <span style="
            font-family:var(--font-mono);
            color:#1890ff;
          ">
            ${escapeHtml(record.id)}
          </span>
        </td>

        <td>
          Campaign
        </td>

        <td>
          <strong>
            ${escapeHtml(routeName)}
          </strong>

          <div style="
            color:#8c8c8c;
            font-size:.72rem;
            margin-top:2px;
          ">
            ${escapeHtml(routeCode)}
          </div>
        </td>

        <td>
          $${cost.toFixed(3)}
        </td>

        <td>
          <span style="
            color:#52c41a;
            font-weight:700;
          ">
            Success / Delivered
          </span>
        </td>

        <td>
          <strong>
            ${escapeHtml(record.recipient)}
          </strong>
        </td>

        <td>
          ${escapeHtml(
            record.sender ||
              "iMessage-Direct"
          )}
        </td>

        <td style="
          color:#8c8c8c;
          font-size:.8rem;
        ">
          ${escapeHtml(record.time)}
        </td>

        <td>
          <span style="
            background:rgba(82,196,26,.1);
            color:#52c41a;
            padding:2px 6px;
            border-radius:4px;
            font-weight:700;
            font-size:.75rem;
          ">
            SENT
          </span>
        </td>
      `;

      outboxRecordsTbody.appendChild(
        tr
      );
    }
  );
}

// =========================================================
// SAVE OUTBOX RECORD
// =========================================================

function saveRecordToOutbox(
  recipient,
  text,
  route,
  routePrice
) {

  const email =
    currentUser?.email ||
    "default";

  let records = [];

  try {

    records =
      JSON.parse(
        localStorage.getItem(
          `outbox_${email}`
        ) || "[]"
      );

    if (!Array.isArray(records)) {
      records = [];
    }

  } catch (error) {
    records = [];
  }

  const randomId =
    "1" +
    Math.floor(
      10000000 +
        Math.random() *
          90000000
    );

  const now =
    new Date();

  const pad =
    (number) =>
      number
        .toString()
        .padStart(2, "0");

  const timeStr =
    `${now.getFullYear()}-${pad(
      now.getMonth() + 1
    )}-${pad(
      now.getDate()
    )} ${pad(
      now.getHours()
    )}:${pad(
      now.getMinutes()
    )}:${pad(
      now.getSeconds()
    )}`;

  records.unshift({
    id: randomId,

    recipient,

    body: text,

    time: timeStr,

    status: "Success",

    routeId:
      route?.id || null,

    routeName:
      route?.name ||
      "Route",

    routeCode:
      route?.code ||
      "—",

    routePrice:
      Number(routePrice || 0),

    cost:
      Number(routePrice || 0),

    sender:
      senderIdInput?.value ||
      "iMessage-Direct"
  });

  localStorage.setItem(
    `outbox_${email}`,
    JSON.stringify(records)
  );

  loadOutboxRecords();
}

// =========================================================
// OUTBOX CLEAR
// =========================================================

if (btnClearOutboxRecords) {

  btnClearOutboxRecords.addEventListener(
    "click",
    () => {

      const email =
        currentUser?.email ||
        "default";

      localStorage.removeItem(
        `outbox_${email}`
      );

      loadOutboxRecords();

      showToast(
        "Outbox records cleared.",
        "success"
      );
    }
  );
}

// =========================================================
// OUTBOX REFRESH
// =========================================================

if (btnFilterSearch) {

  btnFilterSearch.addEventListener(
    "click",
    () => {

      loadOutboxRecords();

      showToast(
        "Outbox records refreshed.",
        "success"
      );
    }
  );
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

      } finally {

        window.location.href =
          "index.html";
      }
    }
  );
}

// =========================================================
// START
// =========================================================

initDashboard();
