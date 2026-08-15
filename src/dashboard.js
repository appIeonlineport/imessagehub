import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (error) {
    console.error("Supabase initialization error:", error);
  }
}

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const welcomeName = $("welcomeName");
const welcomeEmail = $("welcomeEmail");
const accountStatus = $("accountStatus");
const walletBalance = $("walletBalance");
const walletBalanceTop = $("walletBalanceTop");
const accountRole = $("accountRole");
const userId = $("userId");
const createdAt = $("createdAt");
const logoutButton = $("logoutButton");
const dashboardMessage = $("dashboardMessage");
const headerName = $("headerName");
const headerAvatar = $("headerAvatar");
const dashWelcomeId = $("dashWelcomeId");
const dropdownUserTitle = $("dropdownUserTitle");
const liveClockDisplay = $("liveClockDisplay");

const menuItems = $$('[data-view]');
const viewPanels = $$(".view-panel");
const btnGetStarted = $("btnGetStarted");

const userMenuBtn = $("userMenuBtn");
const userDropdownMenu = $("userDropdownMenu");
const profileButtons = $$('[id="btnShowProfile"]');
const btnOpenTopUpFromMenu = $("btnOpenTopUpFromMenu");
const topbarBalanceBtn = $("topbarBalanceBtn");
const btnSidebarTopUp = $("btnSidebarTopUp");
const btnDashboardTopUp = $("btnDashboardTopUp");

const campaignNumbersArea = $("campaignNumbersArea");
const bulkFileInput = $("bulkFileInput");
const btnTriggerUpload = $("btnTriggerUpload");
const senderIdInput = $("senderIdInput");
const mainMessageContent = $("mainMessageContent");
const wordsAndItemsCounter = $("wordsAndItemsCounter");
const btnSubmitCampaign = $("btnSubmitCampaign");

const campaignRouteInput = $("campaignRouteInput");
const routeCards = $$(".route-card");
const routeRadios = $$('input[name="campaignRoute"]');
const campaignSelectedRoute = $("campaignSelectedRoute");
const campaignEstimatedCost = $("campaignEstimatedCost");
const recipientCount = $("recipientCount");
const recipientCountLarge = $("recipientCountLarge");

const outboxRecordsTbody = $("outboxRecordsTbody");
const outboxNoDataNotice = $("outboxNoDataNotice");
const btnClearOutboxRecords = $("btnClearOutboxRecords");
const btnFilterSearch = $("btnFilterSearch");
const paymentHistoryList = $("paymentHistoryList");

const topUpModal = $("topUpModal");
const closeTopUpModal = $("closeTopUpModal");
const cancelTopUpBtn = $("cancelTopUpBtn");
const btnSubmitPaid = $("btnSubmitPaid");
const copyUsdtAddressBtn = $("copyUsdtAddressBtn");
const usdtWalletAddress = $("usdtWalletAddress");
const usdtUserEmail = $("usdtUserEmail");
const usdtTxHash = $("usdtTxHash");
const usdtAmountDisplay = $("usdtAmountDisplay");
const usdtTimer = $("usdtTimer");

const accountModal = $("accountModal");
const closeAccountModal = $("closeAccountModal");
const closeAccountModalBtn = $("closeAccountModalBtn");
const modalUserName = $("modalUserName");
const modalUserEmail = $("modalUserEmail");

const campaignSuccessModal = $("campaignSuccessModal");
const successRecipientCount = $("successRecipientCount");
const successRouteName = $("successRouteName");
const successCampaignCost = $("successCampaignCost");
const btnSuccessGoOutbox = $("btnSuccessGoOutbox");
const btnSuccessClose = $("btnSuccessClose");
const toastContainer = $("toastContainer");

let currentUser = null;
let selectedTopUpAmount = 99;
let countdownInterval = null;
let parsedCampaignNumbers = [];
let currentWalletBalance = 0;

const ROUTES = {
  "Route A": 0.03,
  "Route B": 0.045
};

function money(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast-item show toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

function openModal(modal) {
  modal?.classList.remove("hidden");
}

function closeModal(modal) {
  modal?.classList.add("hidden");
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function startLiveClock() {
  const update = () => {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    if (liveClockDisplay) {
      liveClockDisplay.textContent =
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    }
  };
  update();
  setInterval(update, 1000);
}

async function switchView(targetViewId) {
  viewPanels.forEach((panel) => panel.classList.add("hidden"));
  $(targetViewId)?.classList.remove("hidden");

  menuItems.forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-view") === targetViewId);
  });

  if (targetViewId === "viewOutbox") await loadOutboxRecords();
  if (targetViewId === "viewPaymentHistory") {
    await loadPaymentHistory();
    await refreshWalletBalance();
  }
  if (targetViewId === "viewDashboard") await refreshWalletBalance();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

menuItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    const view = item.getAttribute("data-view");
    if (view) switchView(view);
  });
});

btnGetStarted?.addEventListener("click", () => switchView("viewNewCampaign"));

function getSelectedRoute() {
  const selected = document.querySelector('input[name="campaignRoute"]:checked');
  const fallback = campaignRouteInput?.value || "Route A";
  const name = selected?.value || fallback;
  const price = Number(selected?.getAttribute("data-price")) || ROUTES[name] || 0.03;
  return { name, price };
}

function updateRouteUI() {
  const route = getSelectedRoute();
  if (campaignRouteInput) campaignRouteInput.value = route.name;
  if (campaignSelectedRoute) campaignSelectedRoute.textContent = route.name;

  routeCards.forEach((card) => {
    const radio = card.querySelector('input[name="campaignRoute"]');
    card.classList.toggle("active", Boolean(radio?.checked));
  });

  updateCampaignCost();
}

routeRadios.forEach((radio) => radio.addEventListener("change", updateRouteUI));
routeCards.forEach((card) => {
  card.addEventListener("click", () => {
    const radio = card.querySelector('input[name="campaignRoute"]');
    if (radio) {
      radio.checked = true;
      updateRouteUI();
    }
  });
});

campaignRouteInput?.addEventListener("change", () => {
  const selected = campaignRouteInput.value;
  const radio = document.querySelector(`input[name="campaignRoute"][value="${selected}"]`);
  if (radio) radio.checked = true;
  updateRouteUI();
});

function parseInputNumbers(text) {
  if (!text) return [];
  return text
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value.replace(/\D/g, "").length >= 7);
}

function updateRecipientCount() {
  parsedCampaignNumbers = parseInputNumbers(campaignNumbersArea?.value || "");
  const count = parsedCampaignNumbers.length;
  if (recipientCount) recipientCount.textContent = `${count} recipient${count === 1 ? "" : "s"}`;
  if (recipientCountLarge) recipientCountLarge.textContent = String(count);
  updateCampaignCost();
}

campaignNumbersArea?.addEventListener("input", updateRecipientCount);

function calculateCampaignCost() {
  return parsedCampaignNumbers.length * getSelectedRoute().price;
}

function updateCampaignCost() {
  if (campaignEstimatedCost) campaignEstimatedCost.textContent = money(calculateCampaignCost());
}

function updateMessageCounter() {
  const length = mainMessageContent?.value.length || 0;
  if (wordsAndItemsCounter) wordsAndItemsCounter.textContent = `${length} / 160 characters`;
}

mainMessageContent?.addEventListener("input", updateMessageCounter);

if (btnTriggerUpload && bulkFileInput) {
  btnTriggerUpload.addEventListener("click", () => bulkFileInput.click());
  bulkFileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      if (campaignNumbersArea) campaignNumbersArea.value = String(loadEvent.target.result || "");
      updateRecipientCount();
      showToast(`${parsedCampaignNumbers.length} recipients loaded from ${file.name}.`, "success");
    };
    reader.onerror = () => showToast("Unable to read the selected file.", "error");
    reader.readAsText(file);
    bulkFileInput.value = "";
  });
}

function spendStorageKey() {
  return currentUser?.id ? `imessagehub_spend_${currentUser.id}` : null;
}

function getLocalSpend() {
  const key = spendStorageKey();
  if (!key) return 0;
  const value = Number.parseFloat(localStorage.getItem(key) || "0");
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function addLocalSpend(amount) {
  const key = spendStorageKey();
  if (!key) return;
  localStorage.setItem(key, (getLocalSpend() + (Number(amount) || 0)).toFixed(4));
}

async function calculateWalletBalance() {
  if (!currentUser) return 0;

  let approvedCredits = 0;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("topup_requests")
        .select("amount,status")
        .eq("user_id", currentUser.id)
        .in("status", ["paid", "approved", "completed"]);

      if (!error && Array.isArray(data)) {
        approvedCredits = data.reduce((total, item) => total + (Number(item.amount) || 0), 0);
      }
    } catch (error) {
      console.warn("Wallet lookup failed:", error);
    }
  }

  return Math.max(0, approvedCredits - getLocalSpend());
}

function renderWalletBalance(balance) {
  currentWalletBalance = Number(balance) || 0;
  const formatted = money(currentWalletBalance);
  if (walletBalance) walletBalance.textContent = formatted;
  if (walletBalanceTop) walletBalanceTop.textContent = formatted;
}

async function refreshWalletBalance() {
  renderWalletBalance(await calculateWalletBalance());
}

function startPaymentTimer() {
  if (countdownInterval) clearInterval(countdownInterval);
  let totalSeconds = 20 * 60;

  const updateTimer = () => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (usdtTimer) usdtTimer.textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    if (totalSeconds <= 0) {
      clearInterval(countdownInterval);
      if (usdtTimer) usdtTimer.textContent = "Expired";
      return;
    }
    totalSeconds--;
  };

  updateTimer();
  countdownInterval = setInterval(updateTimer, 1000);
}

function ensureCustomAmountUI() {
  if ($("customTopUpAmount")) return;
  const tierPills = document.querySelector(".tier-pills");
  if (!tierPills) return;

  const wrapper = document.createElement("div");
  wrapper.className = "form-section";
  wrapper.style.marginTop = "12px";
  wrapper.innerHTML = `
    <label for="customTopUpAmount" class="portal-label">Custom Amount</label>
    <div style="position:relative;display:flex;align-items:center;">
      <span style="position:absolute;left:13px;color:#7b8798;font-weight:800;">$</span>
      <input id="customTopUpAmount" class="portal-input" type="number" min="1" step="0.01" placeholder="Enter custom amount" style="padding-left:28px;" />
    </div>
    <div class="form-help">Enter any amount of $1.00 or more.</div>
  `;
  tierPills.insertAdjacentElement("afterend", wrapper);

  const input = $("customTopUpAmount");
  input?.addEventListener("input", () => {
    const amount = Number.parseFloat(input.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    selectedTopUpAmount = amount;
    $$(".tier-pill").forEach((pill) => pill.classList.remove("active"));
    if (usdtAmountDisplay) usdtAmountDisplay.textContent = money(selectedTopUpAmount);
  });
}

function ensurePaymentRequestModal() {
  if ($("paymentRequestSubmittedModal")) return;

  const modal = document.createElement("div");
  modal.id = "paymentRequestSubmittedModal";
  modal.className = "modal-overlay hidden";
  modal.innerHTML = `
    <div class="modal-card campaign-success-modal" style="max-width:470px;">
      <div class="success-animation"><div class="success-check">✓</div></div>
      <div class="modal-header success-modal-header">
        <span class="eyebrow">PAYMENT REQUEST SUBMITTED</span>
        <h2>Request received</h2>
        <p>Your payment request has been submitted for review. Please check Payment History for status updates.</p>
      </div>
      <div class="submission-summary-card" style="grid-template-columns:1fr 1fr;">
        <div><span>Amount</span><strong id="submittedPaymentAmount">$0.00</strong></div>
        <div><span>Status</span><strong style="font-size:13px;">PENDING</strong></div>
      </div>
      <div class="modal-actions success-modal-actions">
        <button id="btnPaymentHistoryFromConfirmation" class="btn-primary" type="button">View Payment History →</button>
        <button id="btnClosePaymentConfirmation" class="btn-secondary" type="button">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  $("btnClosePaymentConfirmation")?.addEventListener("click", () => closeModal(modal));
  $("btnPaymentHistoryFromConfirmation")?.addEventListener("click", async () => {
    closeModal(modal);
    await switchView("viewPaymentHistory");
  });
}

function openTopUpModal() {
  ensureCustomAmountUI();
  ensurePaymentRequestModal();
  openModal(topUpModal);
  if (usdtUserEmail && currentUser) usdtUserEmail.value = currentUser.email || "";
  startPaymentTimer();
}

[topbarBalanceBtn, btnSidebarTopUp, btnDashboardTopUp].forEach((button) => {
  button?.addEventListener("click", openTopUpModal);
});

btnOpenTopUpFromMenu?.addEventListener("click", () => {
  openTopUpModal();
  userDropdownMenu?.classList.add("hidden");
});

closeTopUpModal?.addEventListener("click", () => closeModal(topUpModal));
cancelTopUpBtn?.addEventListener("click", () => closeModal(topUpModal));

$$(".tier-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    $$(".tier-pill").forEach((item) => item.classList.remove("active"));
    pill.classList.add("active");
    selectedTopUpAmount = Number(pill.getAttribute("data-amount")) || 99;
    const custom = $("customTopUpAmount");
    if (custom) custom.value = "";
    if (usdtAmountDisplay) usdtAmountDisplay.textContent = money(selectedTopUpAmount);
  });
});

if (copyUsdtAddressBtn && usdtWalletAddress) {
  copyUsdtAddressBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(usdtWalletAddress.value);
      const original = copyUsdtAddressBtn.textContent;
      copyUsdtAddressBtn.textContent = "Copied";
      showToast("TRC20 wallet address copied.", "success");
      setTimeout(() => (copyUsdtAddressBtn.textContent = original || "Copy"), 1500);
    } catch {
      showToast("Could not copy wallet address.", "error");
    }
  });
}

btnSubmitPaid?.addEventListener("click", async () => {
  const txHash = usdtTxHash?.value.trim() || "";
  const customInput = $("customTopUpAmount");
  const customValue = Number.parseFloat(customInput?.value || "");

  if (Number.isFinite(customValue) && customValue > 0) selectedTopUpAmount = customValue;

  if (!Number.isFinite(selectedTopUpAmount) || selectedTopUpAmount < 1) {
    showToast("Please select or enter a valid top-up amount.", "error");
    customInput?.focus();
    return;
  }

  if (!txHash) {
    showToast("Please enter the TRC20 transaction hash.", "error");
    usdtTxHash?.focus();
    return;
  }

  if (!currentUser) {
    showToast("Your account session has expired.", "error");
    return;
  }

  btnSubmitPaid.disabled = true;
  btnSubmitPaid.textContent = "Submitting...";

  const newRequest = {
    user_id: currentUser.id,
    user_email: currentUser.email || "",
    amount: Number(selectedTopUpAmount.toFixed(2)),
    network: "TRC20",
    wallet_address: usdtWalletAddress?.value || "",
    tx_hash: txHash,
    status: "pending"
  };

  try {
    if (!supabase) throw new Error("Payment service is unavailable.");

    const { data, error } = await supabase
      .from("topup_requests")
      .insert([newRequest])
      .select()
      .single();

    if (error) throw error;

    closeModal(topUpModal);
    if (usdtTxHash) usdtTxHash.value = "";
    if (customInput) customInput.value = "";

    ensurePaymentRequestModal();
    if ($("submittedPaymentAmount")) $("submittedPaymentAmount").textContent = money(data?.amount || selectedTopUpAmount);
    openModal($("paymentRequestSubmittedModal"));

    await loadPaymentHistory();
  } catch (error) {
    console.error("Top-up submission error:", error);
    showToast(`Payment request could not be submitted: ${error.message}`, "error");
  } finally {
    btnSubmitPaid.disabled = false;
    btnSubmitPaid.textContent = "PAID";
  }
});

function renderPaymentHistory(records) {
  if (!paymentHistoryList) return;
  paymentHistoryList.innerHTML = "";

  if (!Array.isArray(records) || records.length === 0) {
    paymentHistoryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">$</div>
        <h3>No payments yet</h3>
        <p>Your submitted top-up requests will appear here.</p>
      </div>`;
    return;
  }

  records.forEach((record) => {
    const status = String(record.status || "pending").toLowerCase();
    const approved = ["paid", "approved", "completed"].includes(status);
    const item = document.createElement("div");
    item.className = "payment-history-item";
    item.innerHTML = `
      <div class="payment-history-main">
        <strong>${money(record.amount)}</strong>
        <span>USDT ${record.network || "TRC20"}</span>
      </div>
      <div class="payment-history-tx">
        <span>TxID</span>
        <code>${record.tx_hash || "—"}</code>
      </div>
      <div class="payment-history-date">${formatDateTime(record.created_at)}</div>
      <span class="status-pill ${approved ? "status-success" : ""}">${status.toUpperCase()}</span>`;
    paymentHistoryList.appendChild(item);
  });
}

async function loadPaymentHistory() {
  if (!supabase || !currentUser) {
    renderPaymentHistory([]);
    return;
  }

  try {
    const { data, error } = await supabase
      .from("topup_requests")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderPaymentHistory(Array.isArray(data) ? data : []);
  } catch (error) {
    console.warn("Payment history lookup failed:", error);
    renderPaymentHistory([]);
  }
}

function outboxStorageKey() {
  return currentUser?.id ? `imessagehub_outbox_${currentUser.id}` : "imessagehub_outbox_default";
}

function getLocalOutbox() {
  try {
    const value = JSON.parse(localStorage.getItem(outboxStorageKey()) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveCampaignRecordsToOutbox(recipients, route, sender) {
  const existing = getLocalOutbox();
  const now = new Date().toISOString();
  const batchId = Date.now().toString(36).toUpperCase();

  const newRecords = recipients.map((recipient, index) => ({
    id: `MSG-${batchId}-${String(index + 1).padStart(4, "0")}`,
    recipient,
    route: route.name,
    cost: route.price,
    sender,
    time: now,
    status: "Submitted"
  }));

  localStorage.setItem(outboxStorageKey(), JSON.stringify([...newRecords, ...existing]));
  return newRecords;
}

function renderOutboxRecords(records) {
  if (!outboxRecordsTbody) return;
  outboxRecordsTbody.innerHTML = "";

  if (!Array.isArray(records) || records.length === 0) {
    outboxNoDataNotice?.classList.remove("hidden");
    return;
  }

  outboxNoDataNotice?.classList.add("hidden");

  records.forEach((record) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="outbox-id">${record.id || "—"}</span></td>
      <td>Messaging</td>
      <td><strong>${record.route || "Route A"}</strong></td>
      <td>${money(record.cost)}</td>
      <td><span class="status-pill status-success">${record.status || "Submitted"}</span></td>
      <td><strong>${record.recipient || "—"}</strong></td>
      <td>${record.sender || "iMessage-Direct"}</td>
      <td>${formatDateTime(record.time || record.created_at)}</td>
      <td><span class="outbox-state">SUBMITTED</span></td>`;
    outboxRecordsTbody.appendChild(row);
  });
}

async function loadOutboxRecords() {
  renderOutboxRecords(getLocalOutbox());
}

async function submitCampaign() {
  parsedCampaignNumbers = parseInputNumbers(campaignNumbersArea?.value || "");
  const message = mainMessageContent?.value.trim() || "";

  if (parsedCampaignNumbers.length === 0) {
    showToast("Please enter or upload at least one recipient number.", "error");
    campaignNumbersArea?.focus();
    return;
  }

  if (!message) {
    showToast("Message content is required.", "error");
    mainMessageContent?.focus();
    return;
  }

  await refreshWalletBalance();

  const route = getSelectedRoute();
  const totalCost = calculateCampaignCost();

  if (currentWalletBalance < totalCost) {
    showToast(`Insufficient balance. Required ${money(totalCost)}, available ${money(currentWalletBalance)}.`, "error");
    return;
  }

  if (!btnSubmitCampaign) return;

  const originalText = btnSubmitCampaign.innerHTML;
  btnSubmitCampaign.disabled = true;
  btnSubmitCampaign.innerHTML = `<span class="button-loading-spinner"></span> Preparing submission...`;

  try {
    const sender = senderIdInput?.value.trim() || "iMessage-Direct";

    // Current platform workflow records the submission locally in Outbox.
    // A provider integration can replace this boundary later without changing the UI flow.
    saveCampaignRecordsToOutbox(parsedCampaignNumbers, route, sender);
    addLocalSpend(totalCost);
    await refreshWalletBalance();

    if (successRecipientCount) successRecipientCount.textContent = String(parsedCampaignNumbers.length);
    if (successRouteName) successRouteName.textContent = route.name;
    if (successCampaignCost) successCampaignCost.textContent = money(totalCost);

    openModal(campaignSuccessModal);
    await loadOutboxRecords();
  } catch (error) {
    console.error("Campaign submission error:", error);
    showToast("Unable to submit campaign.", "error");
  } finally {
    btnSubmitCampaign.disabled = false;
    btnSubmitCampaign.innerHTML = originalText;
  }
}

btnSubmitCampaign?.addEventListener("click", submitCampaign);
btnSuccessClose?.addEventListener("click", () => closeModal(campaignSuccessModal));
btnSuccessGoOutbox?.addEventListener("click", async () => {
  closeModal(campaignSuccessModal);
  await switchView("viewOutbox");
});

btnClearOutboxRecords?.addEventListener("click", async () => {
  if (!window.confirm("Clear all campaign records for this account?")) return;
  localStorage.removeItem(outboxStorageKey());
  await loadOutboxRecords();
  showToast("Outbox records cleared.", "success");
});

btnFilterSearch?.addEventListener("click", async () => {
  await loadOutboxRecords();
  showToast("Outbox refreshed.", "success");
});

profileButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openModal(accountModal);
    userDropdownMenu?.classList.add("hidden");
  });
});

closeAccountModal?.addEventListener("click", () => closeModal(accountModal));
closeAccountModalBtn?.addEventListener("click", () => closeModal(accountModal));

if (userMenuBtn && userDropdownMenu) {
  userMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    userDropdownMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", () => userDropdownMenu.classList.add("hidden"));
  userDropdownMenu.addEventListener("click", (event) => event.stopPropagation());
}

logoutButton?.addEventListener("click", async () => {
  try {
    await supabase?.auth.signOut();
  } finally {
    window.location.href = "index.html";
  }
});

async function initDashboard() {
  startLiveClock();
  ensureCustomAmountUI();
  ensurePaymentRequestModal();

  if (!supabase) {
    console.error("Supabase is not configured.");
    return;
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    const fullName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "User";

    const email = currentUser.email || "N/A";
    const uid = currentUser.id || "N/A";
    const role = currentUser.user_metadata?.role || currentUser.app_metadata?.role || "consumer";
    const accountCode = "0016C" + (uid.replace(/\D/g, "").slice(0, 3) || "136");

    if (welcomeName) welcomeName.textContent = fullName;
    if (welcomeEmail) welcomeEmail.textContent = email;
    if (accountRole) accountRole.textContent = role;
    if (headerName) headerName.textContent = accountCode;
    if (dashWelcomeId) dashWelcomeId.textContent = accountCode;
    if (dropdownUserTitle) dropdownUserTitle.textContent = accountCode;
    if (modalUserName) modalUserName.textContent = `${fullName} (${accountCode})`;
    if (modalUserEmail) modalUserEmail.textContent = email;
    if (usdtUserEmail) usdtUserEmail.value = email;
    if (headerAvatar) headerAvatar.textContent = fullName.charAt(0).toUpperCase();
    if (userId) userId.textContent = uid;
    if (createdAt) createdAt.textContent = formatDateTime(currentUser.created_at);
    if (accountStatus) accountStatus.textContent = "ACTIVE";

    await refreshWalletBalance();
    updateRecipientCount();
    updateMessageCounter();
    updateRouteUI();
    await loadOutboxRecords();
    await loadPaymentHistory();

    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" || !newSession) window.location.href = "index.html";
    });
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    if (dashboardMessage) {
      dashboardMessage.textContent = "Unable to load your account.";
      dashboardMessage.classList.remove("hidden");
    }
  }
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && currentUser) {
    refreshWalletBalance();
    loadPaymentHistory();
  }
});

initDashboard();
