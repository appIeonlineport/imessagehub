import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------- Elements ----------
const loginView = document.getElementById("loginView");
const signupView = document.getElementById("signupView");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const showSignupBtn = document.getElementById("showSignupBtn");
const showLoginBtn = document.getElementById("showLoginBtn");
const messageBox = document.getElementById("messageBox");

// ---------- Helpers ----------
function showMessage(message, type = "info") {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
  messageBox.classList.remove("hidden");
}

function hideMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.className = "message hidden";
}

function setView(view) {
  if (view === "signup") {
    loginView?.classList.add("hidden");
    signupView?.classList.remove("hidden");
  } else {
    signupView?.classList.add("hidden");
    loginView?.classList.remove("hidden");
  }
  hideMessage();
}

// ---------- Login / Signup switching ----------
showSignupBtn?.addEventListener("click", () => {
  setView("signup");
});

showLoginBtn?.addEventListener("click", () => {
  setView("login");
});

// ---------- Password visibility ----------
document.querySelectorAll(".password-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;
    input.type = input.type === "password" ? "text" : "password";
  });
});

// ---------- Sign in ----------
loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;
  
  if (!email || !password) {
    showMessage("Please enter your email and password.", "error");
    return;
  }
  
  const submitButton = loginForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    if (!data.session) {
      throw new Error("Login session could not be created.");
    }
    
    window.location.href = "/dashboard.html";
  } catch (error) {
    console.error("Login error:", error);
    showMessage(error?.message || "Unable to sign in. Please try again.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Sign in";
    }
  }
});

// ---------- Create account ----------
signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideMessage();
  
  const fullName = document.getElementById("signupName")?.value.trim();
  const email = document.getElementById("signupEmail")?.value.trim();
  const password = document.getElementById("signupPassword")?.value;
  const confirmPassword = document.getElementById("signupConfirmPassword")?.value;
  
  if (!fullName || !email || !password || !confirmPassword) {
    showMessage("Please complete all fields.", "error");
    return;
  }
  
  if (password.length < 8) {
    showMessage("Password must contain at least 8 characters.", "error");
    return;
  }
  
  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "error");
    return;
  }
  
  const submitButton = signupForm.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";
  }
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    
    if (error) throw error;
    if (data.session) {
      window.location.href = "/dashboard.html";
      return;
    }
    
    showMessage("Account created. Please check your email to verify your account.", "success");
    signupForm.reset();
  } catch (error) {
    console.error("Signup error:", error);
    showMessage(error?.message || "Unable to create your account.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Create account";
    }
  }
});

// ---------- Existing session ----------
async function checkExistingSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      console.log("Active Supabase session detected.");
    }
  } catch (error) {
    console.error("Session check failed:", error);
  }
}

checkExistingSession();
