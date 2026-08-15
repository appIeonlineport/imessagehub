import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error("Supabase environment variables are missing.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

let currentUser = null;

function showMessage(message, type = "info") {
  const box = document.getElementById("contactMessage");
  if (!box) return;
  box.textContent = message;
  box.className = `message ${type}`;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 3000); // 3 second baad chupa dega
}

// 1. Load Current User & Contacts
async function initContacts() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    window.location.href = "/";
    return;
  }
  
  currentUser = session.user;
  fetchContacts();
}

// 2. Fetch and Display Contacts
async function fetchContacts() {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const tbody = document.getElementById("contactsTableBody");
    document.getElementById("contactCount").textContent = data.length;

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="padding: 12px 8px; color: var(--muted);">No contacts saved yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = "";
    data.forEach(contact => {
      const row = document.createElement("tr");
      row.style.borderBottom = "1px solid var(--border)";
      row.innerHTML = `
        <td style="padding: 12px 8px; font-weight: 600;">${contact.name}</td>
        <td style="padding: 12px 8px; color: var(--muted);">${contact.phone}</td>
        <td style="padding: 12px 8px; color: var(--muted);">${new Date(contact.created_at).toLocaleDateString()}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (error) {
    console.error("Error fetching contacts:", error);
  }
}

// 3. Add New Contact
document.getElementById("addContactForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("contactName").value.trim();
  const phone = document.getElementById("contactPhone").value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');

  if (!name || !phone) {
    showMessage("Please fill both fields.", "error");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Saving...";

  try {
    const { error } = await supabase
      .from('contacts')
      .insert([{ user_id: currentUser.id, name, phone }]);

    if (error) throw error;

    showMessage("Contact saved successfully!", "success");
    e.target.reset();
    fetchContacts(); // List update karega

  } catch (error) {
    console.error("Error adding contact:", error);
    showMessage(error.message || "Failed to save contact.", "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Save Contact";
  }
});

// 4. Logout
document.getElementById("logoutButton")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  window.location.href = "/";
});

// Start
initContacts();
