import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let currentUser = null;
let uploadedNumbersCount = 0;

function showMessage(message, type = "info") {
  const box = document.getElementById("campaignAlert");
  if (!box) return;
  box.textContent = message;
  box.className = `message ${type}`;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 5000);
}

// Session Check
async function init() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = "/";
    return;
  }
  currentUser = session.user;
}

// Handle File Upload (Simulated Count)
document.getElementById('campFile')?.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    // Basic simulation: Count lines in file
    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      const lines = text.split('\n').filter(line => line.trim().length > 5);
      uploadedNumbersCount = lines.length;
      document.getElementById('fileInfo').textContent = `File Loaded: ${file.name} (~${uploadedNumbersCount} numbers detected)`;
    };
    reader.readAsText(file);
  }
});

// Handle Campaign Submission
document.getElementById("campaignForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("campName").value.trim();
  const route = document.getElementById("campRoute").value;
  const manualNumbers = document.getElementById("campNumbers").value;
  const messageContent = document.getElementById("campMessage").value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  // Count manual numbers (split by comma or newline)
  let manualCount = 0;
  if (manualNumbers.trim().length > 0) {
    manualCount = manualNumbers.split(/[\n,]+/).filter(num => num.trim().length > 5).length;
  }

  const totalNumbers = manualCount + uploadedNumbersCount;

  if (totalNumbers === 0) {
    showMessage("Please enter numbers manually or upload a valid file.", "error");
    return;
  }

  if (!messageContent) {
    showMessage("Message content cannot be empty.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Processing...";

  try {
    // Basic Wallet Check Logic could go here later
    // Insert Campaign into Database
    const { error } = await supabase
      .from('campaigns')
      .insert([{ 
        user_id: currentUser.id, 
        campaign_name: name, 
        route: route,
        total_numbers: totalNumbers,
        message_content: messageContent,
        status: 'pending'
      }]);

    if (error) throw error;

    showMessage(`Campaign "${name}" launched successfully to ${totalNumbers} recipients!`, "success");
    e.target.reset();
    document.getElementById('fileInfo').textContent = "";
    uploadedNumbersCount = 0;

  } catch (error) {
    console.error("Campaign error:", error);
    showMessage(error.message || "Failed to launch campaign.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "🚀 Launch Campaign";
  }
});

// Logout
document.getElementById("logoutButton")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
});

init();
