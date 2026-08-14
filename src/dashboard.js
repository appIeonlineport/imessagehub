import { createClient } from "@supabase/supabase-js";
{ createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value ?? "";
  }
}

function showMessage(message, type = "info") {
  const box = document.getElementById("dashboardMessage");
  if (!box) return;
  box.textContent = message;
  box.className = `message ${type}`;
  box.classList.remove("hidden");
}

async function loadDashboard() {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    
    if (sessionError) throw sessionError;
    if (!session) {
      window.location.href = "/";
      return;
    }
    
    const user = session.user;

    // Supabase se asli Profile aur Wallet data fetch kar rahe hain
    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', user.id).single();
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single();

    setText("welcomeName", user.user_metadata?.full_name || "Welcome");
    setText("welcomeEmail", user.email || "");
    setText("userId", user.id || "");
    setText("createdAt", user.created_at ? new Date(user.created_at).toLocaleString() : "");
    
    // Real data show karega
    setText("accountRole", profile?.role === 'owner' ? 'Owner' : 'User');
    setText("accountStatus", (profile?.status || 'ACTIVE').toUpperCase());
    setText("walletBalance", wallet ? `$${Number(wallet.balance).toFixed(2)}` : "$0.00");

  } catch (error) {
    console.error("Dashboard error:", error);
    showMessage(error?.message || "Unable to load dashboard.", "error");
  }
}

const logoutButton = document.getElementById("logoutButton");
logoutButton?.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Signing out...";
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = "/";
  } catch (error) {
    console.error("Logout error:", error);
    showMessage(error?.message || "Unable to sign out.", "error");
    logoutButton.disabled = false;
    logoutButton.textContent = "Sign out";
  }
});

loadDashboard();
