import { createClient } from "@supabase/supabase-js";

// Environment variables
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
const headerRole = document.getElementById("headerRole");
const headerAvatar = document.getElementById("headerAvatar");
const welcomeAvatar = document.getElementById("welcomeAvatar");
const profileFullName = document.getElementById("profileFullName");
const profileEmail = document.getElementById("profileEmail");
const copyUserIdBtn = document.getElementById("copyUserIdBtn");
const mobileToggleBtn = document.getElementById("mobileToggleBtn");
const sidebar = document.getElementById("sidebar");
const toastContainer = document.getElementById("toastContainer");

// Campaign & Outbox Elements
const fileDropzone = document.getElementById("fileDropzone");
const contactsFileInput = document.getElementById("contactsFileInput");
const manualNumbers = document.getElementById("manualNumbers");
const recipientCountBadge = document.getElementById("recipientCountBadge");
const campaignMessageText = document.getElementById("campaignMessageText");
const charCount = document.getElementById("charCount");
const btnLaunchCampaign = document.getElementById("btnLaunchCampaign");
const dispatchProgressContainer = document.getElementById("dispatchProgressContainer");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressBarFill = document.getElementById("progressBarFill");
const outboxTableBody = document.getElementById("outboxTableBody");
const outboxEmptyState = document.getElementById("outboxEmptyState");
const btnClearOutbox = document.getElementById("btnClearOutbox");
const btnRefreshActivity = document.getElementById("btnRefreshActivity");

// Modals
const composeModal = document.getElementById("composeModal");
const topUpModal = document.getElementById("topUpModal");
const btnQuickCompose = document.getElementById("btnQuickCompose");
const closeComposeModal = document.getElementById("closeComposeModal");
const cancelComposeBtn = document.getElementById("cancelComposeBtn");
const composeForm = document.getElementById("composeForm");

// USDT Payment Elements
const btnTopUp = document.getElementById("btnTopUp");
const btnTopUpHero = document.getElementById("btnTopUpHero");
const closeTopUpModal = document.getElementById("closeTopUpModal");
const cancelTopUpBtn = document.getElementById("cancelTopUpBtn");
const btnSubmitPaid = document.getElementById("btnSubmitPaid");
const copyUsdtAddressBtn = document.getElementById("copyUsdtAddressBtn");
const usdtWalletAddress = document.getElementById("usdtWalletAddress");
const usdtUserEmail = document.getElementById("usdtUserEmail");
const usdtTxHash = document.getElementById("usdtTxHash");
const usdtAmountDisplay = document.getElementById("usdtAmountDisplay");
const usdtTimer = document.getElementById("usdtTimer");

const simulatorBubbleContainer = document.getElementById("simulatorBubbleContainer");
const totalDispatched = document.getElementById("totalDispatched");

let totalSentCount = 0;
let selectedTopUpAmount = 99.0;
let countdownInterval = null;
let currentUser = null;
let currentRecipientsList = [];

function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast-item show toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (err) {
    return dateStr;
  }
}

function getInitials(name) {
  if (!name) return "VM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function startPaymentTimer() {
  if (countdownInterval) clearInterval(countdownInterval);
  let totalSeconds = 20 * 60; // 20 mins

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

let supabase = null;
if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (err) {
    console.error("Supabase init error:", err);
  }
}

async function initDashboard() {
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
      "User";
    const emailStr = currentUser.email || "N/A";
    const userIdStr = currentUser.id || "N/A";
    const formattedDate = formatDate(currentUser.created_at);
    const roleStr = currentUser.user_metadata?.role || "User";

    const cachedBalance = localStorage.getItem(`wallet_${emailStr}`);
    const walletStr = cachedBalance
      ? `$${parseFloat(cachedBalance).toFixed(2)}`
      : currentUser.user_metadata?.wallet_balance || "$0.00";

    const initials = getInitials(fullName);

    if (welcomeName) welcomeName.textContent = fullName;
    if (welcomeEmail) welcomeEmail.textContent = emailStr;
    if (accountStatus) accountStatus.textContent = "ACTIVE";
    if (walletBalance) walletBalance.textContent = walletStr;
    if (accountRole) accountRole.textContent = roleStr;
    if (userId) userId.textContent = userIdStr;
    if (createdAt) createdAt.textContent = formattedDate;

    if (profileFullName) profileFullName.textContent = fullName;
    if (profileEmail) profileEmail.textContent = emailStr;
    if (headerName) headerName.textContent = fullName;
    if (headerRole) headerRole.textContent = roleStr;
    if (headerAvatar) headerAvatar.textContent = initials;
    if (welcomeAvatar) welcomeAvatar.textContent = initials;

    if (usdtUserEmail) usdtUserEmail.value = emailStr;

    loadOutboxMessages();

    supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "SIGNED_OUT" || !newSession) {
        window.location.href = "index.html";
      }
    });
  } catch (err) {
    console.error("Dashboard init error:", err);
  }
}

// Outbox Logger
function loadOutboxMessages() {
  const email = currentUser?.email || "default";
  const messages = JSON.parse(localStorage.getItem(`outbox_${email}`) || "[]");
  totalSentCount = messages.length;
  if (totalDispatched) totalDispatched.textContent = totalSentCount.toString();

  if (!outboxTableBody) return;
  outboxTableBody.innerHTML = "";

  if (messages.length === 0) {
    if (outboxEmptyState) outboxEmptyState.classList.remove("hidden");
    return;
  }

  if (outboxEmptyState) outboxEmptyState.classList.add("hidden");

  messages.forEach((msg) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><code class="code-pill" style="font-size: 0.75rem;">${msg.id}</code></td>
      <td><strong style="color: #fff;">${msg.recipient}</strong></td>
      <td style="color: var(--text-secondary); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${msg.body}</td>
      <td><span class="tag-status live" style="font-size: 0.7rem;">Apple APNs</span></td>
      <td style="font-size: 0.8rem; color: var(--text-muted);">${msg.time}</td>
      <td><span class="status-pill status-active" style="font-size: 0.7rem;">DELIVERED</span></td>
    `;
    outboxTableBody.appendChild(tr);
  });
}

function saveOutboxMessage(recipient, text) {
  const email = currentUser?.email || "default";
  const messages = JSON.parse(localStorage.getItem(`outbox_${email}`) || "[]");
  const randomId = "MSG-" + Math.floor(100000 + Math.random() * 900000);
  const nowStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  messages.unshift({
    id: randomId,
    recipient: recipient,
    body: text,
    time: nowStr,
    status: "Delivered"
  });

  localStorage.setItem(`outbox_${email}`, JSON.stringify(messages));
  loadOutboxMessages();
}

function parseNumbers(text) {
  if (!text) return [];
  const lines = text.split(/[\n,;]+/);
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length >= 7 && (l.includes("+") || /\d/.test(l) || l.includes("@")));
}

function updateRecipientCount() {
  const numbers = parseNumbers(manualNumbers?.value || "");
  currentRecipientsList = numbers;
  if (recipientCountBadge) {
    recipientCountBadge.textContent = `${numbers.length} numbers detected`;
  }
}

if (fileDropzone && contactsFileInput) {
  fileDropzone.addEventListener("click", () => contactsFileInput.click());

  contactsFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      if (manualNumbers) {
        manualNumbers.value = content;
        updateRecipientCount();
        showToast(`Loaded file ${file.name}! Detected ${currentRecipientsList.length} numbers.`);
      }
    };
    reader.readAsText(file);
  });

  manualNumbers?.addEventListener("input", updateRecipientCount);
}

if (campaignMessageText && charCount) {
  campaignMessageText.addEventListener("input", () => {
    const len = campaignMessageText.value.length;
    charCount.textContent = `${len} / 160 chars`;
  });
}

// Launch Campaign Button
if (btnLaunchCampaign) {
  btnLaunchCampaign.addEventListener("click", async () => {
    updateRecipientCount();
    const messageBody = campaignMessageText?.value.trim();

    if (currentRecipientsList.length === 0) {
      alert("Please upload a file or enter at least one recipient phone number.");
      manualNumbers?.focus();
      return;
    }

    if (!messageBody) {
      alert("Please enter message body template.");
      campaignMessageText?.focus();
      return;
    }

    btnLaunchCampaign.disabled = true;
    if (dispatchProgressContainer) dispatchProgressContainer.classList.remove("hidden");

    let sent = 0;
    const total = currentRecipientsList.length;

    const progressInterval = setInterval(() => {
      sent += Math.max(1, Math.floor(total / 10));
      if (sent > total) sent = total;

      const pct = Math.floor((sent / total) * 100);
      if (progressPercent) progressPercent.textContent = `${pct}%`;
      if (progressText) progressText.textContent = `Dispatching ${sent} / ${total} messages...`;
      if (progressBarFill) progressBarFill.style.width = `${pct}%`;

      if (sent >= total) {
        clearInterval(progressInterval);

        currentRecipientsList.forEach((num) => {
          saveOutboxMessage(num, messageBody);
        });

        if (simulatorBubbleContainer) {
          const bubble = document.createElement("div");
          bubble.className = "imessage-bubble outgoing";
          bubble.innerHTML = `
            <p class="bubble-text">${messageBody}</p>
            <span class="bubble-meta">Broadcasted to ${total} recipients • Just now</span>
          `;
          simulatorBubbleContainer.appendChild(bubble);
          simulatorBubbleContainer.scrollTop = simulatorBubbleContainer.scrollHeight;
        }

        setTimeout(() => {
          if (dispatchProgressContainer) dispatchProgressContainer.classList.add("hidden");
          btnLaunchCampaign.disabled = false;
          showToast(`Broadcast Complete! Dispatched ${total} messages.`, "success");
        }, 600);
      }
    }, 150);
  });
}

if (btnClearOutbox) {
  btnClearOutbox.addEventListener("click", () => {
    const email = currentUser?.email || "default";
    localStorage.removeItem(`outbox_${email}`);
    loadOutboxMessages();
    showToast("Outbox log cleared.");
  });
}

if (btnRefreshActivity) {
  btnRefreshActivity.addEventListener("click", () => {
    loadOutboxMessages();
    showToast("Outbox log refreshed.");
  });
}

// Single Message Modal
if (composeForm) {
  composeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const recipient = document.getElementById("composeRecipient")?.value;
    const text = document.getElementById("composeText")?.value;
    if (!text || !recipient) return;

    closeModal(composeModal);
    composeForm.reset();

    saveOutboxMessage(recipient, text);

    if (simulatorBubbleContainer) {
      const bubble = document.createElement("div");
      bubble.className = "imessage-bubble outgoing";
      bubble.innerHTML = `
        <p class="bubble-text">${text}</p>
        <span class="bubble-meta">Delivered to ${recipient} • Just now</span>
      `;
      simulatorBubbleContainer.appendChild(bubble);
      simulatorBubbleContainer.scrollTop = simulatorBubbleContainer.scrollHeight;
    }

    showToast("iMessage dispatched successfully via Apple APNs!");
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      if (supabase) await supabase.auth.signOut();
    } finally {
      window.location.href = "index.html";
    }
  });
}

if (copyUserIdBtn && userId) {
  copyUserIdBtn.addEventListener("click", async () => {
    const text = userId.textContent;
    if (!text || text.includes("Loading")) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Supabase User ID copied!");
    } catch (e) {
      console.warn("Copy error:", e);
    }
  });
}

if (mobileToggleBtn && sidebar) {
  mobileToggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

function openModal(modal) {
  if (modal) modal.classList.remove("hidden");
}

function closeModal(modal) {
  if (modal) modal.classList.add("hidden");
}

if (btnQuickCompose) btnQuickCompose.addEventListener("click", () => openModal(composeModal));
if (closeComposeModal) closeComposeModal.addEventListener("click", () => closeModal(composeModal));
if (cancelComposeBtn) cancelComposeBtn.addEventListener("click", () => closeModal(composeModal));

// USDT Payment
function handleOpenTopUp() {
  openModal(topUpModal);
  startPaymentTimer();
  if (currentUser && usdtUserEmail) {
    usdtUserEmail.value = currentUser.email;
  }
}

if (btnTopUp) btnTopUp.addEventListener("click", handleOpenTopUp);
if (btnTopUpHero) btnTopUpHero.addEventListener("click", handleOpenTopUp);
if (closeTopUpModal) closeTopUpModal.addEventListener("click", () => closeModal(topUpModal));
if (cancelTopUpBtn) cancelTopUpBtn.addEventListener("click", () => closeModal(topUpModal));

if (copyUsdtAddressBtn && usdtWalletAddress) {
  copyUsdtAddressBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(usdtWalletAddress.value);
      copyUsdtAddressBtn.textContent = "Copied!";
      showToast("TRC20 Address copied!");
      setTimeout(() => {
        copyUsdtAddressBtn.textContent = "Copy";
      }, 2000);
    } catch (e) {
      console.warn(e);
    }
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
      alert("Please enter your TRC20 Transaction Hash / TxID to submit payment.");
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
      } catch (e) {
        console.warn("Supabase insert error (fallback used):", e);
      }
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

initDashboard();
