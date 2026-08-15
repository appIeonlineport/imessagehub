import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const authMessage = document.getElementById("authMessage");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");
const loginCaptchaDisplay = document.getElementById("loginCaptchaDisplay");
const signupCaptchaDisplay = document.getElementById("signupCaptchaDisplay");
const btnRefreshCaptcha = document.getElementById("btnRefreshCaptcha");
const btnRefreshSignupCaptcha = document.getElementById("btnRefreshSignupCaptcha");
const loginCaptchaInput = document.getElementById("loginCaptchaInput");
const signupCaptchaInput = document.getElementById("signupCaptchaInput");
const toggleLoginPwd = document.getElementById("toggleLoginPwd");
const loginPasswordInput = document.getElementById("loginPassword");

let currentLoginCaptcha = "";
let currentSignupCaptcha = "";
let supabase = null;

function generateRandomCode() {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join("");
}

function refreshCaptcha() {
  currentLoginCaptcha = generateRandomCode();
  currentSignupCaptcha = generateRandomCode();

  if (loginCaptchaDisplay) loginCaptchaDisplay.textContent = currentLoginCaptcha.split("").join(" ");
  if (signupCaptchaDisplay) signupCaptchaDisplay.textContent = currentSignupCaptcha.split("").join(" ");
  if (loginCaptchaInput) loginCaptchaInput.value = "";
  if (signupCaptchaInput) signupCaptchaInput.value = "";
}

function showMessage(message, type = "error") {
  if (!authMessage) return;
  authMessage.textContent = message;
  authMessage.className = `auth-alert ${type}`;
  authMessage.classList.remove("hidden");
}

function clearMessage() {
  if (!authMessage) return;
  authMessage.textContent = "";
  authMessage.className = "auth-alert hidden";
}

function setButtonLoading(button, loading, originalText) {
  if (!button) return;

  const textSpan = button.querySelector(".btn-text");
  const spinnerSpan = button.querySelector(".btn-spinner");
  button.disabled = loading;

  if (loading) {
    textSpan?.classList.add("hidden");
    spinnerSpan?.classList.remove("hidden");
    return;
  }

  textSpan?.classList.remove("hidden");
  spinnerSpan?.classList.add("hidden");
  if (textSpan && originalText) textSpan.textContent = originalText;
}

function initializeSupabase() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    showMessage("Supabase configuration is missing. Please check deployment environment variables.", "warning");
    return false;
  }

  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    return true;
  } catch (error) {
    console.error("Supabase initialization error:", error);
    showMessage("Unable to initialize authentication service.", "error");
    return false;
  }
}

async function checkCurrentSession() {
  if (!supabase) return;

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return;
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("Session check failed:", error);
  }
}

btnRefreshCaptcha?.addEventListener("click", refreshCaptcha);
btnRefreshSignupCaptcha?.addEventListener("click", refreshCaptcha);

if (toggleLoginPwd && loginPasswordInput) {
  toggleLoginPwd.addEventListener("click", () => {
    const show = loginPasswordInput.type === "password";
    loginPasswordInput.type = show ? "text" : "password";
    toggleLoginPwd.textContent = show ? "🔒" : "👁";
  });
}

if (tabLogin && tabSignup && loginForm && signupForm) {
  tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    clearMessage();
    refreshCaptcha();
  });

  tabSignup.addEventListener("click", () => {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    clearMessage();
    refreshCaptcha();
  });
}

loginForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  if (!supabase) {
    showMessage("Authentication service is unavailable.", "error");
    return;
  }

  const email = document.getElementById("loginEmail")?.value?.trim() || "";
  const password = document.getElementById("loginPassword")?.value || "";
  const enteredCaptcha = loginCaptchaInput?.value?.trim() || "";

  if (!email || !password) {
    showMessage("Please enter your email and password.", "error");
    return;
  }

  if (enteredCaptcha !== currentLoginCaptcha) {
    showMessage("Invalid security verification code.", "error");
    refreshCaptcha();
    return;
  }

  setButtonLoading(loginSubmitBtn, true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    if (!data?.session) throw new Error("No active session was created.");

    showMessage("Authentication successful. Opening dashboard...", "success");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 350);
  } catch (error) {
    console.error("Login error:", error);
    showMessage(error.message || "Unable to sign in.", "error");
    setButtonLoading(loginSubmitBtn, false, "Sign In to Workspace");
    refreshCaptcha();
  }
});

signupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessage();

  if (!supabase) {
    showMessage("Authentication service is unavailable.", "error");
    return;
  }

  const fullName = document.getElementById("signupFullName")?.value?.trim() || "";
  const email = document.getElementById("signupEmail")?.value?.trim() || "";
  const password = document.getElementById("signupPassword")?.value || "";
  const confirmPassword = document.getElementById("signupConfirmPassword")?.value || "";
  const enteredCaptcha = signupCaptchaInput?.value?.trim() || "";

  if (!fullName || !email || !password || !confirmPassword) {
    showMessage("Please complete all required fields.", "error");
    return;
  }

  if (enteredCaptcha !== currentSignupCaptcha) {
    showMessage("Invalid security verification code.", "error");
    refreshCaptcha();
    return;
  }

  if (password.length < 6) {
    showMessage("Password must be at least 6 characters long.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "error");
    return;
  }

  setButtonLoading(signupSubmitBtn, true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "agent"
        }
      }
    });

    if (error) throw error;

    if (data?.session) {
      showMessage("Account created successfully. Opening dashboard...", "success");
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
      return;
    }

    if (data?.user) {
      showMessage(
        "Account created. A verification email has been requested. Please check your inbox and spam folder, verify your email, then sign in.",
        "success"
      );
      signupForm.reset();
      setButtonLoading(signupSubmitBtn, false, "Create Account");
      refreshCaptcha();
      return;
    }

    showMessage("Account created. You may now sign in.", "success");
    setButtonLoading(signupSubmitBtn, false, "Create Account");
    refreshCaptcha();
  } catch (error) {
    console.error("Signup error:", error);
    showMessage(error.message || "Unable to create your account.", "error");
    setButtonLoading(signupSubmitBtn, false, "Create Account");
    refreshCaptcha();
  }
});

initializeSupabase();
refreshCaptcha();
checkCurrentSession();
