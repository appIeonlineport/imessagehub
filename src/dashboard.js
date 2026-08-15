import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

const $ = (id) => document.getElementById(id);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  welcomeName: $("welcomeName"),
  welcomeEmail: $("welcomeEmail"),
  accountStatus: $("accountStatus"),
  walletBalance: $("walletBalance"),
  walletBalanceTop: $("walletBalanceTop"),
  accountRole: $("accountRole"),
  userId: $("userId"),
  createdAt: $("createdAt"),
  logoutButton: $("logoutButton"),
  dashboardMessage: $("dashboardMessage"),
  headerName: $("headerName"),
  headerAvatar: $("headerAvatar"),
  dashWelcomeId: $("dashWelcomeId"),
  dropdownUserTitle: $("dropdownUserTitle"),
  liveClockDisplay: $("liveClockDisplay"),
  btnGetStarted: $("btnGetStarted"),
  userMenuBtn: $("userMenuBtn"),
  userDropdownMenu: $("userDropdownMenu"),
  btnOpenTopUpFromMenu: $("btnOpenTopUpFromMenu"),
  topbarBalanceBtn: $("topbarBalanceBtn"),
  btnSidebarTopUp: $("btnSidebarTopUp"),
  btnDashboardTopUp: $("btnDashboardTopUp"),
  campaignNumbersArea: $("campaignNumbersArea"),
  bulkFileInput: $("bulkFileInput"),
  btnTriggerUpload: $("btnTriggerUpload"),
  senderIdInput: $("senderIdInput"),
  mainMessageContent: $("mainMessageContent"),
  wordsAndItemsCounter: $("wordsAndItemsCounter"),
  btnSubmitCampaign: $("btnSubmitCampaign"),
  campaignRouteInput: $("campaignRouteInput"),
  campaignSelectedRoute: $("campaignSelectedRoute"),
  campaignEstimatedCost: $("campaignEstimatedCost"),
  recipientCount: $("recipientCount"),
  recipientCountLarge: $("recipientCountLarge"),
  outboxRecordsTbody: $("outboxRecordsTbody"),
  outboxNoDataNotice: $("outboxNoDataNotice"),
  btnClearOutboxRecords: $("btnClearOutboxRecords"),
  btnFilterSearch: $("btnFilterSearch"),
  paymentHistoryList: $("paymentHistoryList"),
  topUpModal: $("topUpModal"),
  closeTopUpModal: $("closeTopUpModal"),
  cancelTopUpBtn: $("cancelTopUpBtn"),
  btnSubmitPaid: $("btnSubmitPaid"),
  copyUsdtAddressBtn: $("copyUsdtAddressBtn"),
  usdtWalletAddress: $("usdtWalletAddress"),
  usdtUserEmail: $("usdtUserEmail"),
  usdtTxHash: $("usdtTxHash"),
  usdtAmountDisplay: $("usdtAmountDisplay"),
  usdtTimer: $("usdtTimer"),
  accountModal: $("accountModal"),
  closeAccountModal: $("closeAccountModal"),
  closeAccountModalBtn: $("closeAccountModalBtn"),
  modalUserName: $("modalUserName"),
  modalUserEmail: $("modalUserEmail"),
  campaignSuccessModal: $("campaignSuccessModal"),
  successRecipientCount: $("successRecipientCount"),
  successRouteName: $("successRouteName"),
  successCampaignCost: $("successCampaignCost"),
  btnSuccessGoOutbox: $("btnSuccessGoOutbox"),
  btnSuccessClose: $("btnSuccessClose"),
  toastContainer: $("toastContainer")
};

const menuItems = $$('[data-view]');
const viewPanels = $$(".view-panel");
const profileButtons = $$('[id="btnShowProfile"]');
const routeCards = $$(".route-card");
const routeRadios = $$('input[name="campaignRoute"]');

let currentUser = null;
let currentProfile = null;
let currentWalletBalance = 0;
let selectedTopUpAmount = 99;
let countdownInterval = null;
let parsedCampaignNumbers = [];
let routeByDisplayName = new Map();
let routeById = new Map();

function money(value, digits = 2) {
  return `$${(Number(value) || 0).toFixed(digits)}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function showToast(message, type = "info") {
  if (!els.toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast-item show toast-${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function openModal(modal) {
  modal?.classList.remove("hidden");
}

function closeModal(modal) {
  modal?.classList.add("hidden");
}

function startLiveClock() {
  const update = () => {
    if (!els.liveClockDisplay) return;
    els.liveClockDisplay.textContent = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
  };
  update();
  setInterval(update, 1000);
}

function normalizeRouteName(route) {
  if (route?.code === "US-A") return "Route A";
  if (route?.code === "US-B") return "Route B";
  return String(route?.name || route?.code || "Route");
}

async function switchView(targetViewId) {
  viewPanels.forEach((panel) => panel.classList.add("hidden"));
  $(targetViewId)?.classList.remove("hidden");

  menuItems.forEach((item) => {
    item.classList.toggle("active", item.getAttribute("data-view") === targetViewId);
  });

  els.userDropdownMenu?.classList.add("hidden");

  if (targetViewId === "viewDashboard") await refreshWalletBalance();
  if (targetViewId === "viewOutbox") await loadOutboxRecords();
  if (targetViewId === "viewPaymentHistory") {
    await Promise.all([loadPaymentHistory(), refreshWalletBalance()]);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

menuItems.forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    const view = item.getAttribute("data-view");
    if (view) switchView(view);
  });
});

els.btnGetStarted?.addEventListener("click", () => switchView("viewNewCampaign"));

async function loadRoutes() {
  if (!supabase) return;

  const { data, error } = await supabase
    .from("routes")
    .select("id,name,code,description,enabled,price_per_message,currency")
    .eq("enabled", true)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Route lookup error:", error);
    showToast("Unable to load messaging routes.", "error");
    return;
  }

  routeByDisplayName = new Map();
  routeById = new Map();

  (data || []).forEach((route) => {
    const normalized = {
      ...route,
      displayName: normalizeRouteName(route),
      price: Number(route.price_per_message) || 0
    };
    routeByDisplayName.set(normalized.displayName, normalized);
    routeById.set(normalized.id, normalized);
  });

  routeCards.forEach((card) => {
    const radio = card.querySelector('input[name="campaignRoute"]');
    if (!radio) return;

    const route = routeByDisplayName.get(radio.value);
    const priceLabel = card.querySelector("b");

    if (!route) {
      radio.disabled = true;
      card.style.opacity = "0.45";
      card.style.pointerEvents = "none";
      return;
    }

    radio.disabled = false;
    radio.dataset.routeId = route.id;
    radio.dataset.price = String(route.price);
    card.style.opacity = "1";
    card.style.pointerEvents = "";
    if (priceLabel) priceLabel.textContent = money(route.price, 3);
  });

  const selected = document.querySelector('input[name="campaignRoute"]:checked:not(:disabled)');
  if (!selected) {
    const first = document.querySelector('input[name="campaignRoute"]:not(:disabled)');
    if (first) first.checked = true;
  }

  updateRouteUI();
}

function getSelectedRoute() {
  const selected = document.querySelector('input[name="campaignRoute"]:checked:not(:disabled)');
  if (!selected) return null;

  const route = routeByDisplayName.get(selected.value);
  if (route) return route;

  const routeId = selected.dataset.routeId || "";
  const price = Number(selected.dataset.price) || 0;
  if (!routeId || price <= 0) return null;

  return {
    id: routeId,
    displayName: selected.value,
    price
  };
}

function updateRouteUI() {
  const route = getSelectedRoute();

  routeCards.forEach((card) => {
    const radio = card.querySelector('input[name="campaignRoute"]');
    card.classList.toggle("active", Boolean(radio?.checked && !radio.disabled));
  });

  if (route) {
    if (els.campaignRouteInput) els.campaignRouteInput.value = route.displayName;
    if (els.campaignSelectedRoute) els.campaignSelectedRoute.textContent = route.displayName;
  } else if (els.campaignSelectedRoute) {
    els.campaignSelectedRoute.textContent = "Unavailable";
  }

  updateCampaignCost();
}

routeRadios.forEach((radio) => radio.addEventListener("change", updateRouteUI));
routeCards.forEach((card) => {
  card.addEventListener("click", () => {
    const radio = card.querySelector('input[name="campaignRoute"]');
    if (!radio || radio.disabled) return;
    radio.checked = true;
    updateRouteUI();
  });
});

els.campaignRouteInput?.addEventListener("change", () => {
  const radio = document.querySelector(
    `input[name="campaignRoute"][value="${els.campaignRouteInput.value}"]`
  );
  if (radio && !radio.disabled) {
    radio.checked = true;
    updateRouteUI();
  }
});

function parseInputNumbers(text) {
  if (!text) return [];
  const unique = new Set();

  String(text)
    .split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (value.replace(/\D/g, "").length >= 7) unique.add(value);
    });

  return [...unique];
}

function updateRecipientCount() {
  parsedCampaignNumbers = parseInputNumbers(els.campaignNumbersArea?.value || "");
  const count = parsedCampaignNumbers.length;

  if (els.recipientCount) {
    els.recipientCount.textContent = `${count} recipient${count === 1 ? "" : "s"}`;
  }
  if (els.recipientCountLarge) els.recipientCountLarge.textContent = String(count);

  updateCampaignCost();
}

function calculateCampaignCost() {
  const route = getSelectedRoute();
  return route ? parsedCampaignNumbers.length * route.price : 0;
}

function updateCampaignCost() {
  if (els.campaignEstimatedCost) {
    els.campaignEstimatedCost.textContent = money(calculateCampaignCost());
  }
}

function updateMessageCounter() {
  const length = els.mainMessageContent?.value.length || 0;
  if (els.wordsAndItemsCounter) {
    els.wordsAndItemsCounter.textContent = `${length} / 160 characters`;
  }
}

els.campaignNumbersArea?.addEventListener("input", updateRecipientCount);
els.mainMessageContent?.addEventListener("input", updateMessageCounter);

if (els.btnTriggerUpload && els.bulkFileInput) {
  els.btnTriggerUpload.addEventListener("click", () => els.bulkFileInput.click());
  els.bulkFileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      if (els.campaignNumbersArea) {
        els.campaignNumbersArea.value = String(loadEvent.target?.result || "");
      }
      updateRecipientCount();
      showToast(`${parsedCampaignNumbers.length} recipients loaded.`, "success");
    };
    reader.onerror = () => showToast("Unable to read the selected file.", "error");
    reader.readAsText(file);
    els.bulkFileInput.value = "";
  });
}

async function refreshWalletBalance() {
  if (!supabase || !currentUser) return;

  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error("Wallet lookup error:", error);
    return;
  }

  currentWalletBalance = Number(data?.balance) || 0;
  const formatted = money(currentWalletBalance);
  if (els.walletBalance) els.walletBalance.textContent = formatted;
  if (els.walletBalanceTop) els.walletBalanceTop.textContent = formatted;
}

function startPaymentTimer() {
  if (countdownInterval) clearInterval(countdownInterval);
  let totalSeconds = 20 * 60;

  const update = () => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (els.usdtTimer) {
      els.usdtTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }
    if (totalSeconds <= 0) {
      clearInterval(countdownInterval);
      if (els.usdtTimer) els.usdtTimer.textContent = "Expired";
      return;
    }
    totalSeconds -= 1;
  };

  update();
  countdownInterval = setInterval(update, 1000);
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
    <div class="form-help">Enter any amount of $1.00 or more.</div>`;

  tierPills.insertAdjacentElement("afterend", wrapper);

  $("customTopUpAmount")?.addEventListener("input", (event) => {
    const amount = Number.parseFloat(event.target.value);
    if (!Number.isFinite(amount) || amount < 1) return;
    selectedTopUpAmount = amount;
    $$(".tier-pill").forEach((pill) => pill.classList.remove("active"));
    if (els.usdtAmountDisplay) els.usdtAmountDisplay.textContent = money(amount);
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
    </div>`;

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
  if (els.usdtUserEmail) els.usdtUserEmail.value = currentUser?.email || "";
  openModal(els.topUpModal);
  startPaymentTimer();
}

[els.topbarBalanceBtn, els.btnSidebarTopUp, els.btnDashboardTopUp].forEach((button) => {
  button?.addEventListener("click", openTopUpModal);
});

els.btnOpenTopUpFromMenu?.addEventListener("click", openTopUpModal);
els.closeTopUpModal?.addEventListener("click", () => closeModal(els.topUpModal));
els.cancelTopUpBtn?.addEventListener("click", () => closeModal(els.topUpModal));

$$(".tier-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    $$(".tier-pill").forEach((item) => item.classList.remove("active"));
    pill.classList.add("active");
    selectedTopUpAmount = Number(pill.dataset.amount) || 99;
    const custom = $("customTopUpAmount");
    if (custom) custom.value = "";
    if (els.usdtAmountDisplay) els.usdtAmountDisplay.textContent = money(selectedTopUpAmount);
  });
});

els.copyUsdtAddressBtn?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(els.usdtWalletAddress?.value || "");
    showToast("TRC20 wallet address copied.", "success");
  } catch {
    showToast("Could not copy wallet address.", "error");
  }
});

els.btnSubmitPaid?.addEventListener("click", async () => {
  if (!supabase || !currentUser) {
    showToast("Your account session has expired.", "error");
    return;
  }

  const customValue = Number.parseFloat($("customTopUpAmount")?.value || "");
  if (Number.isFinite(customValue) && customValue >= 1) selectedTopUpAmount = customValue;

  const txHash = els.usdtTxHash?.value.trim() || "";

  if (!Number.isFinite(selectedTopUpAmount) || selectedTopUpAmount < 1) {
    showToast("Enter a valid top-up amount.", "error");
    return;
  }

  if (!txHash) {
    showToast("Please enter the TRC20 transaction hash.", "error");
    els.usdtTxHash?.focus();
    return;
  }

  const originalText = els.btnSubmitPaid.textContent;
  els.btnSubmitPaid.disabled = true;
  els.btnSubmitPaid.textContent = "Submitting...";

  try {
    const { data, error } = await supabase
      .from("topup_requests")
      .insert({
        user_id: currentUser.id,
        user_email: currentUser.email || "",
        amount: Number(selectedTopUpAmount.toFixed(2)),
        note: "USDT TRC20 payment submitted from portal",
        network: "TRC20",
        wallet_address: els.usdtWalletAddress?.value || "",
        tx_hash: txHash,
        status: "pending"
      })
      .select("id,amount,status,created_at")
      .single();

    if (error) throw error;

    closeModal(els.topUpModal);
    if (els.usdtTxHash) els.usdtTxHash.value = "";
    const custom = $("customTopUpAmount");
    if (custom) custom.value = "";

    ensurePaymentRequestModal();
    if ($("submittedPaymentAmount")) {
      $("submittedPaymentAmount").textContent = money(data.amount);
    }
    openModal($("paymentRequestSubmittedModal"));
    await loadPaymentHistory();
  } catch (error) {
    console.error("Top-up submission error:", error);
    showToast(`Payment request could not be submitted: ${error.message}`, "error");
  } finally {
    els.btnSubmitPaid.disabled = false;
    els.btnSubmitPaid.textContent = originalText || "PAID";
  }
});

function renderPaymentHistory(records) {
  if (!els.paymentHistoryList) return;
  els.paymentHistoryList.innerHTML = "";

  if (!records?.length) {
    els.paymentHistoryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">$</div>
        <h3>No payments yet</h3>
        <p>Your submitted top-up requests will appear here.</p>
      </div>`;
    return;
  }

  records.forEach((record) => {
    const status = String(record.status || "pending").toLowerCase();
    const approved = status === "paid";
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
    els.paymentHistoryList.appendChild(item);
  });
}

async function loadPaymentHistory() {
  if (!supabase || !currentUser) return renderPaymentHistory([]);

  const { data, error } = await supabase
    .from("topup_requests")
    .select("id,amount,network,tx_hash,status,created_at,approved_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Payment history error:", error);
    showToast("Unable to load payment history.", "error");
    return;
  }

  renderPaymentHistory(data || []);
}

function outboxStatusLabel(status) {
  const value = String(status || "pending").toLowerCase();
  if (value === "delivered") return "Delivered";
  if (value === "failed") return "Failed";
  return "Submitted";
}

function renderOutboxRecords(records) {
  if (!els.outboxRecordsTbody) return;
  els.outboxRecordsTbody.innerHTML = "";

  if (!records?.length) {
    els.outboxNoDataNotice?.classList.remove("hidden");
    return;
  }

  els.outboxNoDataNotice?.classList.add("hidden");

  records.forEach((record) => {
    const campaign = record.campaigns || {};
    const route = routeById.get(campaign.route_id);
    const routeName = route?.displayName || "Route";
    const totalRecipients = Number(campaign.total_recipients || campaign.recipient_count || 0);
    const perMessageCost = totalRecipients > 0 ? Number(campaign.total_cost || 0) / totalRecipients : 0;
    const label = outboxStatusLabel(record.status);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="outbox-id">${String(record.id || "—").slice(0, 12)}</span></td>
      <td>Messaging</td>
      <td><strong>${routeName}</strong></td>
      <td>${money(perMessageCost, 3)}</td>
      <td><span class="status-pill ${label === "Delivered" ? "status-success" : ""}">${label}</span></td>
      <td><strong>${record.phone || "—"}</strong></td>
      <td>${campaign.sender_id || "iMessage-Direct"}</td>
      <td>${formatDateTime(record.created_at)}</td>
      <td><span class="outbox-state">${label === "Failed" ? "FAILED" : label === "Delivered" ? "DELIVERED" : "SUBMITTED"}</span></td>`;
    els.outboxRecordsTbody.appendChild(row);
  });
}

async function loadOutboxRecords() {
  if (!supabase || !currentUser) return renderOutboxRecords([]);

  const { data, error } = await supabase
    .from("campaign_messages")
    .select(`
      id,
      campaign_id,
      phone,
      status,
      created_at,
      campaigns!inner (
        id,
        route_id,
        sender_id,
        total_cost,
        total_recipients,
        recipient_count,
        status,
        created_at
      )
    `)
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("Outbox lookup error:", error);
    showToast("Unable to load Outbox records.", "error");
    return;
  }

  renderOutboxRecords(data || []);
}

async function submitCampaign() {
  if (!supabase || !currentUser) {
    showToast("Your account session has expired.", "error");
    return;
  }

  parsedCampaignNumbers = parseInputNumbers(els.campaignNumbersArea?.value || "");
  const message = els.mainMessageContent?.value.trim() || "";
  const sender = els.senderIdInput?.value.trim() || "iMessage-Direct";
  const route = getSelectedRoute();

  if (!route?.id) {
    showToast("Please select an available messaging route.", "error");
    return;
  }

  if (!parsedCampaignNumbers.length) {
    showToast("Please enter or upload at least one recipient number.", "error");
    els.campaignNumbersArea?.focus();
    return;
  }

  if (!message) {
    showToast("Message content is required.", "error");
    els.mainMessageContent?.focus();
    return;
  }

  const estimatedCost = calculateCampaignCost();
  await refreshWalletBalance();

  if (currentWalletBalance < estimatedCost) {
    showToast(
      `Insufficient balance. Required ${money(estimatedCost)}, available ${money(currentWalletBalance)}.`,
      "error"
    );
    return;
  }

  const originalHtml = els.btnSubmitCampaign?.innerHTML || "Submit Campaign";
  if (els.btnSubmitCampaign) {
    els.btnSubmitCampaign.disabled = true;
    els.btnSubmitCampaign.innerHTML = `<span class="button-loading-spinner"></span> Submitting...`;
  }

  try {
    const campaignName = `Campaign ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;

    const { data, error } = await supabase.rpc("submit_campaign", {
      p_route_id: route.id,
      p_name: campaignName,
      p_sender_id: sender,
      p_message: message,
      p_recipients: parsedCampaignNumbers
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;
    currentWalletBalance = Number(result?.new_balance ?? currentWalletBalance - estimatedCost);
    const formattedBalance = money(currentWalletBalance);
    if (els.walletBalance) els.walletBalance.textContent = formattedBalance;
    if (els.walletBalanceTop) els.walletBalanceTop.textContent = formattedBalance;

    if (els.successRecipientCount) {
      els.successRecipientCount.textContent = String(result?.recipient_count || parsedCampaignNumbers.length);
    }
    if (els.successRouteName) els.successRouteName.textContent = route.displayName;
    if (els.successCampaignCost) {
      els.successCampaignCost.textContent = money(result?.total_cost ?? estimatedCost);
    }

    openModal(els.campaignSuccessModal);
    await loadOutboxRecords();
  } catch (error) {
    console.error("Campaign submission error:", error);
    showToast(error.message || "Unable to submit campaign.", "error");
  } finally {
    if (els.btnSubmitCampaign) {
      els.btnSubmitCampaign.disabled = false;
      els.btnSubmitCampaign.innerHTML = originalHtml;
    }
  }
}

els.btnSubmitCampaign?.addEventListener("click", submitCampaign);
els.btnSuccessClose?.addEventListener("click", () => closeModal(els.campaignSuccessModal));
els.btnSuccessGoOutbox?.addEventListener("click", async () => {
  closeModal(els.campaignSuccessModal);
  await switchView("viewOutbox");
});

els.btnFilterSearch?.addEventListener("click", async () => {
  await loadOutboxRecords();
  showToast("Outbox refreshed.", "success");
});

els.btnClearOutboxRecords?.addEventListener("click", async () => {
  if (!supabase || !currentUser) return;
  if (!window.confirm("Clear all Outbox records for this account?")) return;

  try {
    const { error: messagesError } = await supabase
      .from("campaign_messages")
      .delete()
      .eq("user_id", currentUser.id);
    if (messagesError) throw messagesError;

    const { error: campaignsError } = await supabase
      .from("campaigns")
      .delete()
      .eq("user_id", currentUser.id);
    if (campaignsError) throw campaignsError;

    await loadOutboxRecords();
    showToast("Outbox records cleared.", "success");
  } catch (error) {
    console.error("Outbox clear error:", error);
    showToast("Unable to clear Outbox records.", "error");
  }
});

profileButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openModal(els.accountModal);
    els.userDropdownMenu?.classList.add("hidden");
  });
});

els.closeAccountModal?.addEventListener("click", () => closeModal(els.accountModal));
els.closeAccountModalBtn?.addEventListener("click", () => closeModal(els.accountModal));

if (els.userMenuBtn && els.userDropdownMenu) {
  els.userMenuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    els.userDropdownMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", () => els.userDropdownMenu.classList.add("hidden"));
  els.userDropdownMenu.addEventListener("click", (event) => event.stopPropagation());
}

els.logoutButton?.addEventListener("click", async () => {
  try {
    await supabase?.auth.signOut();
  } finally {
    window.location.href = "index.html";
  }
});

async function loadProfile() {
  if (!supabase || !currentUser) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,email,role,status,created_at")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn("Profile lookup error:", error);
    return null;
  }

  return data;
}

function renderAccount() {
  const metadata = currentUser?.user_metadata || {};
  const fullName = currentProfile?.full_name || metadata.full_name || currentUser?.email?.split("@")[0] || "User";
  const email = currentProfile?.email || currentUser?.email || "N/A";
  const role = currentProfile?.role || "agent";
  const status = currentProfile?.status || "active";
  const uid = currentUser?.id || "N/A";
  const accountCode = "0016C" + (uid.replace(/\D/g, "").slice(0, 3) || "136");

  if (els.welcomeName) els.welcomeName.textContent = fullName;
  if (els.welcomeEmail) els.welcomeEmail.textContent = email;
  if (els.accountRole) els.accountRole.textContent = role;
  if (els.accountStatus) els.accountStatus.textContent = status.toUpperCase();
  if (els.headerName) els.headerName.textContent = accountCode;
  if (els.dashWelcomeId) els.dashWelcomeId.textContent = accountCode;
  if (els.dropdownUserTitle) els.dropdownUserTitle.textContent = accountCode;
  if (els.modalUserName) els.modalUserName.textContent = `${fullName} (${accountCode})`;
  if (els.modalUserEmail) els.modalUserEmail.textContent = email;
  if (els.usdtUserEmail) els.usdtUserEmail.value = email;
  if (els.headerAvatar) els.headerAvatar.textContent = fullName.charAt(0).toUpperCase();
  if (els.userId) els.userId.textContent = uid;
  if (els.createdAt) els.createdAt.textContent = formatDateTime(currentUser?.created_at);
}

function correctDecorativeStatusCopy() {
  const deliveryCheck = document.querySelector(".delivery-check");
  if (deliveryCheck) deliveryCheck.textContent = "✓ Submitted";

  const rightIncoming = document.querySelector(".phone-right .message-bubble.incoming");
  if (rightIncoming) rightIncoming.textContent = "Campaign queued";
}

async function initDashboard() {
  startLiveClock();
  ensureCustomAmountUI();
  ensurePaymentRequestModal();
  correctDecorativeStatusCopy();

  if (!supabase) {
    if (els.dashboardMessage) {
      els.dashboardMessage.textContent = "Supabase configuration is missing.";
      els.dashboardMessage.classList.remove("hidden");
    }
    return;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;
    currentProfile = await loadProfile();
    renderAccount();

    await loadRoutes();
    updateRecipientCount();
    updateMessageCounter();

    await Promise.all([
      refreshWalletBalance(),
      loadPaymentHistory(),
      loadOutboxRecords()
    ]);

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) window.location.href = "index.html";
    });
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    if (els.dashboardMessage) {
      els.dashboardMessage.textContent = "Unable to load your account.";
      els.dashboardMessage.classList.remove("hidden");
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
