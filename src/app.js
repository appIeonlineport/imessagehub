import { createClient } from "@supabase/supabase-js";

// =========================================================
// SUPABASE CONFIG
// =========================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;


// =========================================================
// DOM ELEMENTS
// =========================================================

const authMessage = document.getElementById("authMessage");

const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

const loginSubmitBtn =
  document.getElementById("loginSubmitBtn");

const signupSubmitBtn =
  document.getElementById("signupSubmitBtn");

const loginCaptchaDisplay =
  document.getElementById("loginCaptchaDisplay");

const signupCaptchaDisplay =
  document.getElementById("signupCaptchaDisplay");

const btnRefreshCaptcha =
  document.getElementById("btnRefreshCaptcha");

const btnRefreshSignupCaptcha =
  document.getElementById("btnRefreshSignupCaptcha");

const loginCaptchaInput =
  document.getElementById("loginCaptchaInput");

const signupCaptchaInput =
  document.getElementById("signupCaptchaInput");

const toggleLoginPwd =
  document.getElementById("toggleLoginPwd");

const loginPasswordInput =
  document.getElementById("loginPassword");


// =========================================================
// STATE
// =========================================================

let currentLoginCaptcha = "";
let currentSignupCaptcha = "";

let supabase = null;


// =========================================================
// CAPTCHA
// =========================================================

function generateRandomCode() {
  const digits = "0123456789";

  let code = "";

  for (let i = 0; i < 5; i++) {
    code += digits.charAt(
      Math.floor(Math.random() * digits.length)
    );
  }

  return code;
}


function refreshCaptcha() {

  currentLoginCaptcha =
    generateRandomCode();

  currentSignupCaptcha =
    generateRandomCode();


  if (loginCaptchaDisplay) {
    loginCaptchaDisplay.textContent =
      currentLoginCaptcha
        .split("")
        .join(" ");
  }


  if (signupCaptchaDisplay) {
    signupCaptchaDisplay.textContent =
      currentSignupCaptcha
        .split("")
        .join(" ");
  }


  if (loginCaptchaInput) {
    loginCaptchaInput.value = "";
  }


  if (signupCaptchaInput) {
    signupCaptchaInput.value = "";
  }
}


if (btnRefreshCaptcha) {
  btnRefreshCaptcha.addEventListener(
    "click",
    refreshCaptcha
  );
}


if (btnRefreshSignupCaptcha) {
  btnRefreshSignupCaptcha.addEventListener(
    "click",
    refreshCaptcha
  );
}


// =========================================================
// PASSWORD TOGGLE
// =========================================================

if (
  toggleLoginPwd &&
  loginPasswordInput
) {

  toggleLoginPwd.addEventListener(
    "click",
    () => {

      const isPassword =
        loginPasswordInput.type === "password";


      loginPasswordInput.type =
        isPassword
          ? "text"
          : "password";


      toggleLoginPwd.textContent =
        isPassword
          ? "🔒"
          : "👁";

    }
  );

}


// =========================================================
// MESSAGE
// =========================================================

function showMessage(
  message,
  type = "error"
) {

  if (!authMessage) return;

  authMessage.textContent = message;

  authMessage.className =
    `auth-alert ${type}`;

  authMessage.classList.remove(
    "hidden"
  );
}


function clearMessage() {

  if (!authMessage) return;

  authMessage.textContent = "";

  authMessage.className =
    "auth-alert hidden";
}


// =========================================================
// BUTTON LOADING
// =========================================================

function setButtonLoading(
  button,
  loading,
  originalText
) {

  if (!button) return;

  const textSpan =
    button.querySelector(".btn-text");

  const spinnerSpan =
    button.querySelector(".btn-spinner");


  button.disabled = loading;


  if (loading) {

    if (textSpan) {
      textSpan.classList.add("hidden");
    }

    if (spinnerSpan) {
      spinnerSpan.classList.remove(
        "hidden"
      );
    }

  } else {

    if (textSpan) {

      textSpan.classList.remove(
        "hidden"
      );

      if (originalText) {
        textSpan.textContent =
          originalText;
      }

    }

    if (spinnerSpan) {
      spinnerSpan.classList.add(
        "hidden"
      );
    }

  }
}


// =========================================================
// SUPABASE INITIALIZATION
// =========================================================

function initializeSupabase() {

  if (
    !SUPABASE_URL ||
    !SUPABASE_PUBLISHABLE_KEY
  ) {

    showMessage(
      "Supabase configuration is missing. Please check Vercel Environment Variables.",
      "warning"
    );

    return false;
  }


  try {

    supabase = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    return true;

  } catch (error) {

    console.error(
      "Supabase initialization error:",
      error
    );

    showMessage(
      "Unable to initialize authentication service.",
      "error"
    );

    return false;
  }
}


// =========================================================
// SESSION CHECK
// =========================================================

async function checkCurrentSession() {

  if (!supabase) return;


  try {

    const {
      data,
      error
    } = await supabase.auth.getSession();


    if (error) {

      console.error(
        "Session lookup error:",
        error
      );

      return;
    }


    const session = data?.session;


    if (!session?.user) {
      return;
    }


    /*
      User is already authenticated.
      Don't show login again.
    */

    window.location.href =
      "dashboard.html";


  } catch (error) {

    console.error(
      "Session check failed:",
      error
    );

  }
}


// =========================================================
// TAB SWITCHING
// =========================================================

if (
  tabLogin &&
  tabSignup &&
  loginForm &&
  signupForm
) {

  tabLogin.addEventListener(
    "click",
    () => {

      tabLogin.classList.add(
        "active"
      );

      tabSignup.classList.remove(
        "active"
      );


      loginForm.classList.remove(
        "hidden"
      );

      signupForm.classList.add(
        "hidden"
      );


      clearMessage();

      refreshCaptcha();

    }
  );


  tabSignup.addEventListener(
    "click",
    () => {

      tabSignup.classList.add(
        "active"
      );

      tabLogin.classList.remove(
        "active"
      );


      signupForm.classList.remove(
        "hidden"
      );

      loginForm.classList.add(
        "hidden"
      );


      clearMessage();

      refreshCaptcha();

    }
  );

}


// =========================================================
// LOGIN
// =========================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      clearMessage();


      if (!supabase) {

        showMessage(
          "Authentication service is unavailable.",
          "error"
        );

        return;
      }


      const email =
        document
          .getElementById("loginEmail")
          ?.value
          ?.trim();


      const password =
        document
          .getElementById("loginPassword")
          ?.value || "";


      const enteredCaptcha =
        loginCaptchaInput
          ?.value
          ?.trim();


      // ---------------------------------------------------
      // Validation
      // ---------------------------------------------------

      if (!email || !password) {

        showMessage(
          "Please enter your email and password.",
          "error"
        );

        return;
      }


      if (
        enteredCaptcha !==
        currentLoginCaptcha
      ) {

        showMessage(
          "Invalid security verification code.",
          "error"
        );

        refreshCaptcha();

        return;
      }


      setButtonLoading(
        loginSubmitBtn,
        true
      );


      try {

        const {
          data,
          error
        } =
          await supabase.auth.signInWithPassword({
            email,
            password
          });


        if (error) {

          console.error(
            "Login error:",
            error
          );

          showMessage(
            error.message ||
              "Unable to sign in.",
            "error"
          );

          setButtonLoading(
            loginSubmitBtn,
            false,
            "Sign In to Workspace"
          );

          refreshCaptcha();

          return;
        }


        if (!data?.session) {

          showMessage(
            "Login completed, but no active session was created.",
            "error"
          );

          setButtonLoading(
            loginSubmitBtn,
            false,
            "Sign In to Workspace"
          );

          return;
        }


        showMessage(
          "Authentication successful. Opening dashboard...",
          "success"
        );


        /*
          Give Supabase a moment to persist
          the session before redirecting.
        */

        setTimeout(() => {

          window.location.href =
            "dashboard.html";

        }, 400);


      } catch (error) {

        console.error(
          "Unexpected login error:",
          error
        );

        showMessage(
          error?.message ||
            "An unexpected error occurred during login.",
          "error"
        );

        setButtonLoading(
          loginSubmitBtn,
          false,
          "Sign In to Workspace"
        );

        refreshCaptcha();

      }

    }
  );

}


// =========================================================
// SIGNUP
// =========================================================

if (signupForm) {

  signupForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      clearMessage();


      if (!supabase) {

        showMessage(
          "Authentication service is unavailable.",
          "error"
        );

        return;
      }


      const fullName =
        document
          .getElementById("signupFullName")
          ?.value
          ?.trim();


      const email =
        document
          .getElementById("signupEmail")
          ?.value
          ?.trim();


      const password =
        document
          .getElementById("signupPassword")
          ?.value || "";


      const confirmPassword =
        document
          .getElementById("signupConfirmPassword")
          ?.value || "";


      const enteredCaptcha =
        signupCaptchaInput
          ?.value
          ?.trim();


      // ---------------------------------------------------
      // Validation
      // ---------------------------------------------------

      if (
        !fullName ||
        !email ||
        !password ||
        !confirmPassword
      ) {

        showMessage(
          "Please complete all required fields.",
          "error"
        );

        return;
      }


      if (
        enteredCaptcha !==
        currentSignupCaptcha
      ) {

        showMessage(
          "Invalid security verification code.",
          "error"
        );

        refreshCaptcha();

        return;
      }


      if (password.length < 6) {

        showMessage(
          "Password must be at least 6 characters long.",
          "error"
        );

        return;
      }


      if (
        password !==
        confirmPassword
      ) {

        showMessage(
          "Passwords do not match.",
          "error"
        );

        return;
      }


      setButtonLoading(
        signupSubmitBtn,
        true
      );


      try {

        const {
          data,
          error
        } =
          await supabase.auth.signUp({

            email,
            password,

            options: {

              data: {

                full_name:
                  fullName,

                /*
                  Keep role consistent
                  with admin.js.
                */

                role:
                  "user",

                /*
                  Demo wallet only.
                  Actual balance remains
                  handled by the demo flow.
                */

                wallet_balance:
                  "0.00"

              }

            }

          });


        if (error) {

          console.error(
            "Signup error:",
            error
          );

          showMessage(
            error.message ||
              "Unable to create your account.",
            "error"
          );

          setButtonLoading(
            signupSubmitBtn,
            false,
            "Create Account"
          );

          refreshCaptcha();

          return;
        }


        // -------------------------------------------------
        // Signup WITH active session
        // -------------------------------------------------

        if (data?.session) {

          showMessage(
            "Account created successfully. Opening dashboard...",
            "success"
          );


          setTimeout(() => {

            window.location.href =
              "dashboard.html";

          }, 600);


          return;
        }


        // -------------------------------------------------
        // Signup WITHOUT session
        // Email verification enabled
        // -------------------------------------------------

        if (data?.user) {

          showMessage(
            "Account created. Please verify your email, then sign in.",
            "success"
          );

          signupForm.reset();

          setButtonLoading(
            signupSubmitBtn,
            false,
            "Create Account"
          );

          refreshCaptcha();

          return;
        }


        showMessage(
          "Account created. You may now sign in.",
          "success"
        );


        setButtonLoading(
          signupSubmitBtn,
          false,
          "Create Account"
        );

        refreshCaptcha();


      } catch (error) {

        console.error(
          "Unexpected signup error:",
          error
        );

        showMessage(
          error?.message ||
            "An unexpected error occurred during registration.",
          "error"
        );

        setButtonLoading(
          signupSubmitBtn,
          false,
          "Create Account"
        );

        refreshCaptcha();

      }

    }
  );

}


// =========================================================
// AUTH STATE LISTENER
// =========================================================

if (supabase) {

  supabase.auth.onAuthStateChange(
    (event, session) => {

      console.log(
        "Auth event:",
        event
      );


      if (
        event === "SIGNED_OUT"
      ) {

        /*
          Stay on login page after
          explicit sign out.
        */

        return;
      }


      if (
        event === "PASSWORD_RECOVERY"
      ) {

        return;
      }

    }
  );

}


// =========================================================
// INITIALIZE
// =========================================================

initializeSupabase();

refreshCaptcha();

checkCurrentSession();
