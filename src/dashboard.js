import { createClient } from "@supabase/supabase-js";

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
const headerAvatar = document.getElementById("headerAvatar");
const dashWelcomeId = document.getElementById("dashWelcomeId");
const dropdownUserTitle = document.getElementById("dropdownUserTitle");
const liveClockDisplay = document.getElementById("liveClockDisplay");

// View panels & Navigation
const menuItems = document.querySelectorAll("[data-view]");
const viewPanels = document.querySelectorAll(".view-panel");
const btnGetStarted = document.getElementById("btnGetStarted");

// User dropdown
const userMenuBtn = document.getElementById("userMenuBtn");
const userDropdownMenu = document.getElementById("userDropdownMenu");
const btnShowProfile = document.getElementById("btnShowProfile");
const btnOpenTopUpFromMenu = document.getElementById("btnOpenTopUpFromMenu");
const topbarBalanceBtn = document.getElementById("topbarBalanceBtn");
const btnSidebarTopUp = document.getElementById("btnSidebarTopUp");

// Campaign Elements
const mainCampaignForm = document.getElementById("mainCampaignForm");
const campaignNumbersArea = document.getElementById("campaignNumbersArea");
const bulkFileInput = document.getElementById("bulkFileInput");
const btnTriggerUpload = document.getElementById("btnTriggerUpload");
const senderIdInput = document.getElementById("senderIdInput");
const mainMessageContent = document.getElementById("mainMessageContent");
const wordsAndItemsCounter = document.getElementById("wordsAndItemsCounter");
const btnSubmitCampaign = document.getElementById("btnSubmitCampaign");
const campaignProgressBox = document.getElementById("campaignProgressBox");
const campaignProgressText = document.getElementById("campaignProgressText");
const campaignProgressPercent = document.getElementById("campaignProgressPercent");
const campaignProgressBarFill = document.getElementById("campaignProgressBarFill");

// Outbox Elements
const outboxRecordsTbody = document.getElementById("outboxRecordsTbody");
const outboxNoDataNotice = document.getElementById("outboxNoDataNotice");
const btnClearOutboxRecords = document.getElementById("btnClearOutboxRecords");
const btnFilterSearch = document.getElementById("btnFilterSearch");

// Modals
const topUpModal = document.getElementById("topUpModal");
const closeTopUpModal = document.getElementById("closeTopUpModal");
const cancelTopUpBtn = document.getElementById("cancelTopUpBtn");
const btnSubmitPaid = document.getElementById("btnSubmitPaid");
const copyUsdtAddressBtn = document.getElementById("copyUsdtAddressBtn");
const usdtWalletAddress = document.getElementById("usdtWalletAddress");
const usdtUserEmail = document.getElementById("usdtUserEmail");
const usdtTxHash = document.getElementById("usdtTxHash");
const usdtAmountDisplay = document.getElementById("usdtAmountDisplay");
const usdtTimer = document.getElementById("usdtTimer");

const accountModal = document.getElementById("accountModal");
const closeAccountModal = document.getElementById("closeAccountModal");
const closeAccountModalBtn = document.getElementById("closeAccountModalBtn");
const modalUserName = document.getElementById("modalUserName");
const modalUserEmail = document.getElementById("modalUserEmail");
const toastContainer = document.getElementById("toastContainer");

let currentUser = null;
let selectedTopUpAmount = 99.0;
let countdownInterval = null;
let parsedCampaignNumbers = [];

const PER_SMS_RATE = 0.030; // $0.030 USDT per SMS rate

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

// Live Clock Ticker
function startLiveClock() {
  function update() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (liveClockDisplay) liveClockDisplay.textContent = formatted;
  }
  update();
  setInterval(update, 1000);
}

// Switch Views
function switchView(targetViewId) {
  viewPanels.forEach((p) => p.classList.add("hidden"));
  const target = document.getElementById(targetViewId);
  if (target) target.classList.remove("hidden");

  menuItems.forEach((m) => {
    if (m.getAttribute("data-view") === targetViewId) {
      m.classList.add("active");
    } else {
      m.classList.remove("active");
    }
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

menuItems.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const viewId = btn.getAttribute("data-view");
    if (viewId) switchView(viewId);
  });
});

if (btnGetStarted) {
  btnGetStarted.addEventListener("click", () => switchView("viewNewCampaign"));
}

// 20-min USDT Countdown Timer
function startPaymentTimer() {
  if (countdownInterval) clearInterval(countdownInterval);
  let totalSeconds = 20 * 60;

  function updateDisplay() {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (usdtTimer) {
      usdtTimer.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    if (totalSeconds <= 0) {
      clearInterval(countdownInterval);
      if (usdtTimer) usdtTimer.textContent = "Expired";
    }
    totalSeconds--;
  }

  updateDisplay();
  countdownInterval = setInterval(updateDisplay, 1000);
}

// Supabase Init
let supabase = null;
if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (err) {
    console.error("Supabase init error:", err);
  }
}

async function initDashboard() {
  startLiveClock();
  injectiMessagePreviewContainer();

  if (!supabase) return;

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;
    const fullName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      currentUser.email?.split("@")[0] ||
      "0016C0136";
    const emailStr = currentUser.email || "N/A";
    const userIdStr = currentUser.id || "N/A";
    const roleStr = currentUser.user_metadata?.role || "consumer";

    const cachedBalance = localStorage.getItem(`wallet_${emailStr}`);
    const walletStr = cachedBalance
      ? `$${parseFloat(cachedBalance).toFixed(2)}`
      : currentUser.user_metadata?.wallet_balance || "$0.00";

    const accountCode = "0016C" + (userIdStr.replace(/\D/g, "").slice(0, 3) || "136");

    if (welcomeName) welcomeName.textContent = fullName;
    if (welcomeEmail) welcomeEmail.textContent = emailStr;
    if (walletBalance) walletBalance.textContent = walletStr;
    if (accountRole) accountRole.textContent = roleStr;
    if (headerName) headerName.textContent = accountCode;
    if (dashWelcomeId) dashWelcomeId.textContent = accountCode;
    if (dropdownUserTitle) dropdownUserTitle.textContent = accountCode;
    if (modalUserName) modalUserName.textContent = `${fullName} (${accountCode})`;
    if (modalUserEmail) modalUserEmail.textContent = emailStr;
    if (usdtUserEmail) usdtUserEmail.value = emailStr;

    loadOutboxRecords();

    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" || !newSession) {
        window.location.href = "index.html";
      }
    });
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

// Inject 4K iMessage Simulation Window into Campaign View
function injectiMessagePreviewContainer() {
  const campaignCard = document.querySelector(".ctitele-campaign-card");
  if (!campaignCard || document.getElementById("imessageSimulationBox")) return;

  const simBox = document.createElement("div");
  simBox.id = "imessageSimulationBox";
  simBox.className = "imessage-sim-container hidden";
  simBox.innerHTML = `
    <div class="imessage-sim-header">
      <div class="imessage-dots"><span></span><span></span><span></span></div>
      <span class="imessage-sim-title"> Apple iMessage 4K Relay Preview</span>
    </div>
    <div class="imessage-bubble-viewport" id="imessageViewport">
      <div class="imessage-bubble outgoing">
        <p id="simBubbleText">Type your message to preview...</p>
        <span class="imessage-status">Delivered • 4K Secure</span>
      </div>
    </div>
  `;
  campaignCard.parentNode.insertBefore(simBox, campaignCard.nextSibling);
}

// User Menu Toggle
if (userMenuBtn && userDropdownMenu) {
  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdownMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    userDropdownMenu.classList.add("hidden");
  });
}

function openModal(modal) {
  if (modal) modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (modal) modal.classList.add("hidden");
}

function handleOpenTopUp() {
  openModal(topUpModal);
  startPaymentTimer();
}

if (topbarBalanceBtn) topbarBalanceBtn.addEventListener("click", handleOpenTopUp);
if (btnSidebarTopUp) btnSidebarTopUp.addEventListener("click", handleOpenTopUp);
if (btnOpenTopUpFromMenu) btnOpenTopUpFromMenu.addEventListener("click", handleOpenTopUp);
if (closeTopUpModal) closeTopUpModal.addEventListener("click", () => closeModal(topUpModal));
if (cancelTopUpBtn) cancelTopUpBtn.addEventListener("click", () => closeModal(topUpModal));

if (btnShowProfile) {
  btnShowProfile.addEventListener("click", () => openModal(accountModal));
}
if (closeAccountModal) closeAccountModal.addEventListener("click", () => closeModal(accountModal));
if (closeAccountModalBtn) closeAccountModalBtn.addEventListener("click", () => closeModal(accountModal));

// Copy USDT Address
if (copyUsdtAddressBtn && usdtWalletAddress) {
  copyUsdtAddressBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(usdtWalletAddress.value);
      copyUsdtAddressBtn.textContent = "Copied!";
      showToast("TRC20 Address copied!");
      setTimeout(() => {
        copyUsdtAddressBtn.textContent = "Copy";
      }, 2000);
    } catch (e) {}
  });
}

document.querySelectorAll(".tier-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".tier-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    selectedTopUpAmount = parseFloat(pill.getAttribute("data-amount"));
    if (usdtAmountDisplay) {
      usdtAmountDisplay.textContent = `$${selectedTopUpAmount.toFixed(2)}`;
    }
  });
});

if (btnSubmitPaid) {
  btnSubmitPaid.addEventListener("click", async () => {
    const txHash = usdtTxHash ? usdtTxHash.value.trim() : "";
    const email = usdtUserEmail ? usdtUserEmail.value.trim() : (currentUser?.email || "indiatryme@gmail.com");

    if (!txHash) {
      alert("Please enter your TRC20 Transaction Hash / TxID.");
      if (usdtTxHash) usdtTxHash.focus();
      return;
    }

    btnSubmitPaid.disabled = true;
    btnSubmitPaid.textContent = "Submitting...";

    const newRequest = {
      id: crypto.randomUUID ? crypto.randomUUID() : `req_${Date.now()}`,
      user_id: currentUser?.id || "anonymous",
      user_email: email,
      amount: selectedTopUpAmount,
      network: "TRC20",
      wallet_address: usdtWalletAddress?.value || "TWhUtsbWiR3gQE6yi9CirRQSR1zKAR9FJd",
      tx_hash: txHash,
      status: "pending",
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        await supabase.from("topup_requests").insert([newRequest]);
      } catch (e) {}
    }

    try {
      const existing = JSON.parse(localStorage.getItem("imessagehub_topups") || "[]");
      existing.unshift(newRequest);
      localStorage.setItem("imessagehub_topups", JSON.stringify(existing));
    } catch (e) {}

    closeModal(topUpModal);
    if (usdtTxHash) usdtTxHash.value = "";
    btnSubmitPaid.disabled = false;
    btnSubmitPaid.textContent = "PAID";

    showToast("Payment submitted! Awaiting Admin verification.", "success");
  });
}

// Campaign Numbers & File Handling
function parseInputNumbers(text) {
  if (!text) return [];
  const lines = text.split(/[\n,;]+/);
  return lines.map((l) => l.trim()).filter((l) => l.length >= 7);
}

if (campaignNumbersArea) {
  campaignNumbersArea.addEventListener("input", () => {
    parsedCampaignNumbers = parseInputNumbers(campaignNumbersArea.value);
  });
}

if (btnTriggerUpload && bulkFileInput) {
  btnTriggerUpload.addEventListener("click", () => bulkFileInput.click());

  bulkFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      if (campaignNumbersArea) {
        campaignNumbersArea.value = content;
        parsedCampaignNumbers = parseInputNumbers(content);
        showToast(`Loaded ${file.name} (${parsedCampaignNumbers.length} numbers detected)`);
      }
    };
    reader.readAsText(file);
  });
}

if (mainMessageContent && wordsAndItemsCounter) {
  mainMessageContent.addEventListener("input", () => {
    const len = mainMessageContent.value.length;
    const words = mainMessageContent.value.trim().split(/\s+/).filter(Boolean).length;
    wordsAndItemsCounter.textContent = `${words} / 160 words | 1 items (${len} chars)`;

    // Live update simulation text bubble
    const simBubble = document.getElementById("simBubbleText");
    const simBox = document.getElementById("imessageSimulationBox");
    if (mainMessageContent.value.trim().length > 0) {
      if (simBox) simBox.classList.remove("hidden");
      if (simBubble) simBubble.textContent = mainMessageContent.value;
    } else {
      if (simBox) simBox.classList.add("hidden");
    }
  });
}

// Launch Campaign with 4K Simulation & Success Notice
if (btnSubmitCampaign) {
  btnSubmitCampaign.addEventListener("click", async () => {
    parsedCampaignNumbers = parseInputNumbers(campaignNumbersArea?.value || "");
    const msg = mainMessageContent?.value.trim();

    if (parsedCampaignNumbers.length === 0) {
      alert("Please enter or upload at least one phone number.");
      campaignNumbersArea?.focus();
      return;
    }

    if (!msg) {
      alert("SMS Content is required.");
      mainMessageContent?.focus();
      return;
    }

    btnSubmitCampaign.disabled = true;
    if (campaignProgressBox) campaignProgressBox.classList.remove("hidden");

    // Reveal 4K iMessage animation viewport
    const simBox = document.getElementById("imessageSimulationBox");
    if (simBox) simBox.classList.remove("hidden");

    let sent = 0;
    const total = parsedCampaignNumbers.length;

    const progressInterval = setInterval(() => {
      sent += Math.max(1, Math.floor(total / 10));
      if (sent > total) sent = total;

      const pct = Math.floor((sent / total) * 100);
      if (campaignProgressPercent) campaignProgressPercent.textContent = `${pct}%`;
      if (campaignProgressText) campaignProgressText.textContent = `Dispatching 4K iMessage ${sent} / ${total}...`;
      if (campaignProgressBarFill) campaignProgressBarFill.style.width = `${pct}%`;

      if (sent >= total) {
        clearInterval(progressInterval);

        parsedCampaignNumbers.forEach((num) => {
          saveRecordToOutbox(num, msg);
        });

        setTimeout(() => {
          if (campaignProgressBox) campaignProgressBox.classList.add("hidden");
          btnSubmitCampaign.disabled = false;
          
          // EXACT SUCCESS TOAST REQUIREMENT
          showToast("Your SMS sent successfully!", "success");
          
          switchView("viewOutbox");
        }, 500);
      }
    }, 120);
  });
}

// Outbox Logger & Table (Using $0.030 USDT standard rate calculation)
function loadOutboxRecords() {
  const email = currentUser?.email || "default";
  const records = JSON.parse(localStorage.getItem(`outbox_${email}`) || "[]");

  if (!outboxRecordsTbody) return;
  outboxRecordsTbody.innerHTML = "";

  if (records.length === 0) {
    if (outboxNoDataNotice) outboxNoDataNotice.classList.remove("hidden");
    return;
  }

  if (outboxNoDataNotice) outboxNoDataNotice.classList.add("hidden");

  records.forEach((rec) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span style="font-family: var(--font-mono); color: #1890ff;">${rec.id}</span></td>
      <td>SMS</td>
      <td>Default</td>
      <td style="color: #00f0ff; font-weight: 700;">$${PER_SMS_RATE.toFixed(3)}</td>
      <td><span style="color: #52c41a; font-weight: 700;">Success / Delivered</span></td>
      <td><strong>${rec.recipient}</strong></td>
      <td>${senderIdInput?.value || "iMessage-Direct"}</td>
      <td style="color: #8c8c8c; font-size: 0.8rem;">${rec.time}</td>
      <td><span style="background: rgba(82,196,26,0.1); color: #52c41a; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;">SENT</span></td>
    `;
    outboxRecordsTbody.appendChild(tr);
  });
}

function saveRecordToOutbox(recipient, text) {
  const email = currentUser?.email || "default";
  const records = JSON.parse(localStorage.getItem(`outbox_${email}`) || "[]");
  const randomId = "1" + Math.floor(10000000 + Math.random() * 90000000);
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, "0");
  const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  records.unshift({
    id: randomId,
    recipient: recipient,
    body: text,
    time: timeStr,
    status: "Success"
  });

  localStorage.setItem(`outbox_${email}`, JSON.stringify(records));
  loadOutboxRecords();
}

if (btnClearOutboxRecords) {
  btnClearOutboxRecords.addEventListener("click", () => {
    const email = currentUser?.email || "default";
    localStorage.removeItem(`outbox_${email}`);
    loadOutboxRecords();
    showToast("Outbox records cleared.");
  });
}

if (btnFilterSearch) {
  btnFilterSearch.addEventListener("click", () => {
    loadOutboxRecords();
    showToast("Outbox records loaded.");
  });
}

// Sign out
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } finally {
      window.location.href = "index.html";
    }
  });
}

initDashboard();
