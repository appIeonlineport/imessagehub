import "./styles.css";
import { createClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------- Helpers ----------
function showMessage(message, type = "info") {
  const box = document.getElementById("messageBox");
  if (!box) {
    console.log(message);
    return;
  }
  box.textContent = message;
  box.className = `message ${type}`;
  box.classList.remove("hidden");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value ?? "";
  }
}

// ---------- Load current admin ----------
async function loadAdmin() {
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

    // NEW SECURITY CHECK: Database se check karo ki ye user 'owner' hai ya nahi
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    
    if (profileError || !profile || profile.role !== 'owner') {
      // Agar user owner nahi hai, toh usko wapas dashboard par bhej do
      window.location.href = "/dashboard.html";
      return;
    }

    setText("adminEmail", user.email);
    setText("adminName", user.user_metadata?.full_name || "Administrator");
    setText("userId", user.id);
    setText("createdAt", user.created_at ? new Date(user.created_at).toLocaleString() : "");
    setText("accountRole", "Owner");
    setText("accountStatus", "ACTIVE");
    
  } catch (error) {
    console.error("Admin loading error:", error);
    showMessage(error?.message || "Unable to load admin information.", "error");
  }
}

// ---------- Sign out ----------
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

// ---------- Start ----------
loadAdmin();
