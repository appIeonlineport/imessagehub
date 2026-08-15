import { createClient } from "@supabase/supabase-js";

// Retrieve environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// DOM Elements
const authMessage = document.getElementById("authMessage");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const loginSubmitBtn = document.getElementById("loginSubmitBtn");
const signupSubmitBtn = document.getElementById("signupSubmitBtn");

// Captcha & Password toggle elements
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

function generateRandomCode() {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return code;
}

function refreshCaptcha() {
  currentLoginCaptcha = generateRandomCode();
  currentSignupCaptcha = generateRandomCode();

  if (loginCaptchaDisplay) {
    loginCaptchaDisplay.textContent = currentLoginCaptcha.split("").join(" ");
  }
  if (signupCaptchaDisplay) {
    signupCaptchaDisplay.textContent = currentSignupCaptcha.split("").join(" ");
  }
}

if (btnRefreshCaptcha) btnRefreshCaptcha.addEventListener("click", refreshCaptcha);
if (btnRefreshSignupCaptcha) btnRefreshSignupCaptcha.addEventListener("click", refreshCaptcha);

if (toggleLoginPwd && loginPasswordInput) {
  toggleLoginPwd.addEventListener("click", () => {
    const isPassword = loginPasswordInput.type === "password";
    loginPasswordInput.type = isPassword ? "text" : "password";
    toggleLoginPwd.textContent = isPassword ? "🔒" : "👁";
  });
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

function setBtnLoading(button, isLoading, originalText = "") {
  if (!button) return;
  const textSpan = button.querySelector(".btn-text");
  const spinnerSpan = button.querySelector(".btn-spinner");

  button.disabled = isLoading;
  if (isLoading) {
    if (textSpan) textSpan.classList.add("hidden");
    if (spinnerSpan) spinnerSpan.classList.remove("hidden");
  } else {
    if (textSpan) {
      textSpan.classList.remove("hidden");
      if (originalText) textSpan.textContent = originalText;
    }
    if (spinnerSpan) spinnerSpan.classList.add("hidden");
  }
}

let supabase = null;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  showMessage(
    "Supabase configuration is missing. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set.",
    "warning"
  );
} else {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  } catch (err) {
    console.error("Supabase initialization error:", err);
    showMessage("Failed to initialize Supabase client.", "error");
  }
}

// Check existing session
async function checkCurrentSession() {
  if (!supabase) return;
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!error && session) {
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    console.error("Session lookup error:", err);
  }
}

// Tab Switching
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

// Handle Login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    if (!supabase) {
      showMessage("Supabase is not configured.", "error");
      return;
    }

    const email = document.getElementById("loginEmail")?.value?.trim();
    const password = document.getElementById("loginPassword")?.value;
    const enteredCaptcha = loginCaptchaInput?.value?.trim();

    if (!email || !password) {
      showMessage("Please fill in both email and password.", "error");
      return;
    }

    // Validate Captcha
    if (enteredCaptcha !== currentLoginCaptcha) {
      showMessage("Invalid security verification code. Please enter the 5 digits shown.", "error");
      refreshCaptcha();
      if (loginCaptchaInput) loginCaptchaInput.value = "";
      return;
    }

    setBtnLoading(loginSubmitBtn, true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showMessage(error.message, "error");
        setBtnLoading(loginSubmitBtn, false, "Sign In to Workspace");
        refreshCaptcha();
        return;
      }

      if (data?.session) {
        showMessage("Authentication successful. Redirecting to dashboard...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 500);
      } else {
        window.location.href = "dashboard.html";
      }
    } catch (err) {
      console.error("Login error:", err);
      showMessage(err.message || "An error occurred during login.", "error");
      setBtnLoading(loginSubmitBtn, false, "Sign In to Workspace");
      refreshCaptcha();
    }
  });
}

// Handle Signup
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMessage();

    if (!supabase) {
      showMessage("Supabase is not configured.", "error");
      return;
    }

    const fullName = document.getElementById("signupFullName")?.value?.trim();
    const email = document.getElementById("signupEmail")?.value?.trim();
    const password = document.getElementById("signupPassword")?.value;
    const confirmPassword = document.getElementById("signupConfirmPassword")?.value;
    const enteredCaptcha = signupCaptchaInput?.value?.trim();

    if (!fullName || !email || !password || !confirmPassword) {
      showMessage("Please fill in all fields.", "error");
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

    setBtnLoading(signupSubmitBtn, true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "User",
            wallet_balance: "$0.00",
          },
        },
      });

      if (error) {
        showMessage(error.message, "error");
        setBtnLoading(signupSubmitBtn, false, "Create Account");
        refreshCaptcha();
        return;
      }

      if (data?.session) {
        showMessage("Account created! Redirecting to dashboard...", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 800);
      } else if (data?.user && !data?.session) {
        showMessage(
          "Registration successful! Please check your email to verify your account.",
          "success"
        );
        setBtnLoading(signupSubmitBtn, false, "Create Account");
        signupForm.reset();
        refreshCaptcha();
      } else {
        showMessage("Account created successfully. You may now sign in.", "success");
        setBtnLoading(signupSubmitBtn, false, "Create Account");
        refreshCaptcha();
      }
    } catch (err) {
      console.error("Signup error:", err);
      showMessage(err.message || "An unexpected error occurred during registration.", "error");
      setBtnLoading(signupSubmitBtn, false, "Create Account");
      refreshCaptcha();
    }
  });
}

// Initial setup
refreshCaptcha();
checkCurrentSession();
