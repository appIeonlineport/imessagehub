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

// ---------- Captcha Logic ----------
let currentLoginCaptcha = "";
let currentSignupCaptcha = "";

function generateCaptcha(length = 5) {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function refreshCaptchas() {
  currentLoginCaptcha = generateCaptcha();
  currentSignupCaptcha = generateCaptcha();
  
  const loginDisplay = document.getElementById("loginCaptchaDisplay");
  const signupDisplay = document.getElementById("signupCaptchaDisplay");
  
  if (loginDisplay) loginDisplay.textContent = currentLoginCaptcha;
  if (signupDisplay) signupDisplay.textContent = currentSignupCaptcha;
  
  // Clear inputs on refresh
  const loginInput = document.getElementById("loginCaptchaInput");
  const signupInput = document.getElementById("signupCaptchaInput");
  if (loginInput) loginInput.value = "";
  if (signupInput) signupInput.value = "";
}

// Refresh buttons logic
document.getElementById("refreshLoginCaptcha")?.addEventListener("click", refreshCaptchas);
document.getElementById("refreshSignupCaptcha")?.addEventListener("click", refreshCaptchas);

// Initialize Captcha on page load
refreshCaptchas();


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
  refreshCaptchas(); // Reset captcha when switching views
}

// ---------- Login / Signup switching ----------
showSignupBtn?.addEventListener("click", () => setView("signup"));
showLoginBtn?.addEventListener("click", () => setView("login"));

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
  const captchaInput = document.getElementById("loginCaptchaInput")?.value.trim();
  
  if (!email || !password || !captchaInput) {
    showMessage("Please fill all fields.", "error");
    return;
  }

  // Verify Captcha Check
  if (captchaInput !== currentLoginCaptcha) {
    showMessage("Invalid verification code. Please try again.", "error");
    refreshCaptchas();
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
    refreshCaptchas(); // Refresh captcha on failure
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
  const captchaInput = document.getElementById("signupCaptchaInput")?.value.trim();
  
  if (!fullName || !email || !password || !confirmPassword || !captchaInput) {
    showMessage("Please complete all fields.", "error");
    return;
  }
  
  if (captchaInput !== currentSignupCaptcha) {
    showMessage("Invalid verification code. Please try again.", "error");
    refreshCaptchas();
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
    refreshCaptchas();
  } catch (error) {
    console.error("Signup error:", error);
    showMessage(error?.message || "Unable to create your account.", "error");
    refreshCaptchas();
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
